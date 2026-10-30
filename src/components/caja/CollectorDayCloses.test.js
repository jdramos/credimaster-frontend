import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import CollectorDayCloses from "./CollectorDayCloses";
import { UserContext } from "../../contexts/UserContext";
import API from "../../api";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../../reports/reportViewer", () => ({ openReport: jest.fn() }));
jest.mock("../BranchSelect", () => () => null);
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ openReportPopup: jest.fn(), printAccountingReport: jest.fn() }));

const CLOSES = [
  {
    id: 7, collector_id: 27, branch_id: 1, collector_name: "Douglas Palacios", branch_name: "Sucursal Central", close_date: "2026-10-23",
    status: "PENDIENTE", expected_nio: 3000, counted_nio: 3200, difference_nio: 200, expected_usd: 20, counted_usd: 20, difference_usd: 0,
    submitted_by_name: "Cobrador DEMO", reviewed_by_name: null,
  },
];

const DETAIL = {
  ...CLOSES[0],
  non_cash_total: 0,
  payments_count: 1,
  notes: "Me sobraron dos billetes",
  created_at: "2026-10-23 17:30:00",
  denominations: { NIO: { 1000: 3, 100: 2 }, USD: { 20: 1 } },
  payments: [{ id: 5, credit_code: "710", customer_name: "Francisco Lira", forma_pago_name: "Efectivo", amount: 3000, foreign_amount: null, time: "10:05" }],
};

const renderPage = (ctx = { permissions: ["caja.arqueos.registrar"], role: 4 }) =>
  render(
    <UserContext.Provider value={ctx}>
      <CollectorDayCloses />
    </UserContext.Provider>,
  );

describe("CollectorDayCloses: revisión web de cierres de cobradores", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get.mockImplementation((url) => {
      if (url === "/api/caja/day-closes") return Promise.resolve({ data: { ok: true, data: CLOSES } });
      if (url === "/api/caja/day-closes/7") return Promise.resolve({ data: { ok: true, data: DETAIL } });
      return Promise.resolve({ data: {} });
    });
    API.put.mockResolvedValue({ data: { ok: true } });
    openReportPopup.mockImplementation(() => ({ document: { write: jest.fn(), open: jest.fn(), close: jest.fn() }, focus: jest.fn(), close: jest.fn() }));
    printAccountingReport.mockResolvedValue(undefined);
  });

  test("por defecto lista solo los pendientes", async () => {
    renderPage();
    await screen.findByText("Douglas Palacios");
    expect(API.get).toHaveBeenCalledWith("/api/caja/day-closes", { params: { status: "PENDIENTE" } });
  });

  test("el detalle muestra el conteo por denominación en C$ y US$ y los pagos del día", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("Douglas Palacios"));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Francisco Lira");
    expect(within(dialog).getByText("C$ 1000")).toBeTruthy();
    expect(within(dialog).getByText("US$ 20")).toBeTruthy();
    expect(within(dialog).getByText(/Nota del cobrador: Me sobraron dos billetes/)).toBeTruthy();
  });

  test("rechazar exige el motivo y no llama al servidor sin él", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("Douglas Palacios"));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Francisco Lira");
    fireEvent.click(within(dialog).getByRole("button", { name: "Rechazar" }));
    expect(await within(dialog).findByText("Indique el motivo del rechazo.")).toBeTruthy();
    expect(API.put).not.toHaveBeenCalled();
  });

  test("aprobar llama al servidor, cierra el detalle y recarga la lista", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("Douglas Palacios"));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Francisco Lira");
    fireEvent.click(within(dialog).getByRole("button", { name: "Aprobar" }));
    await waitFor(() => expect(API.put).toHaveBeenCalledWith("/api/caja/day-closes/7/approve", { notes: "" }));
    expect(await screen.findByText("Cierre #7 aprobado.")).toBeTruthy();
    await waitFor(() => expect(API.get.mock.calls.filter(([u]) => u === "/api/caja/day-closes").length).toBe(2));
  });

  test("sin permiso de arqueos no se ofrecen aprobar ni rechazar", async () => {
    renderPage({ permissions: ["caja.ver"], role: 4 });
    fireEvent.click(await screen.findByText("Douglas Palacios"));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Francisco Lira");
    expect(within(dialog).queryByRole("button", { name: "Aprobar" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Rechazar" })).toBeNull();
  });

  test("el Excel de la lista trae encabezados en español y totales; el del detalle, las denominaciones", async () => {
    renderPage();
    await screen.findByText("Douglas Palacios");
    fireEvent.click(screen.getAllByRole("button", { name: "Excel" })[0]);
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const list = exportReportToExcel.mock.calls[0][0];
    expect(list.title).toBe("Cierres del día de cobradores");
    expect(list.columns.map((c) => c.label)).toContain("Diferencia C$");
    expect(list.totals[0].value).toBe("Total (1 cierres)");

    fireEvent.click(screen.getByText("Douglas Palacios"));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Francisco Lira");
    fireEvent.click(within(dialog).getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(2));
    const detail = exportReportToExcel.mock.calls[1][0];
    expect(detail.rows.find((r) => r.concept === "C$ 1000 × 3")?.amount).toBe(3000);
    expect(detail.rows.find((r) => r.concept === "US$ 20 × 1")?.amount).toBe(20);
    expect(detail.rows.filter((r) => r.section).map((r) => r.concept)).toEqual([
      "Resumen", "Conteo por denominación (C$)", "Conteo por denominación (US$)", "Pagos del día",
    ]);
  });
});
