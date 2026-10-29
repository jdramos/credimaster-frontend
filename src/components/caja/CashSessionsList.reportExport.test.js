import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import CashSessionsList from "./CashSessionsList";
import { UserContext } from "../../contexts/UserContext";
import API from "../../api";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ tenant: { name: "DEMO" } }) }));
jest.mock("../../reports/reportViewer", () => ({ openReport: jest.fn() }));
jest.mock("../BranchSelect", () => () => null);
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ openReportPopup: jest.fn(), printAccountingReport: jest.fn() }));

const SESSIONS = [
  {
    id: 21, branch_id: 3, branch_name: "Sucursal León", register_name: "Caja Ventanilla 1", user_name: "Cajero DEMO",
    business_date: "2026-10-23", status: "CERRADA", opening_amount: 5000, counted_amount: 6200, difference: -50,
    totals: { payments_total: 1250, expected_amount: 6250 },
  },
  {
    id: 22, branch_id: 3, branch_name: "Sucursal León", register_name: "Caja Ventanilla 2", user_name: "Cajera Dos",
    business_date: "2026-10-23", status: "ABIERTA", opening_amount: 2000, counted_amount: null, difference: null,
    totals: { payments_total: 300, expected_amount: 2300 },
  },
];

const DETAIL = {
  ...SESSIONS[0],
  totals: {
    opening_amount: 5000, payments_total: 1250, payments_count: 2, ingresos_total: 0, ingresos_count: 0,
    egresos_total: 0, egresos_count: 0, disbursements_total: 0, disbursements_count: 0, arqueos_total: 0,
    arqueos_count: 0, voids_out_total: 0, voids_in_total: 0, expected_amount: 6250,
  },
  counted_nio: 6200,
  payments: [
    { id: 501, loan_id: 70, credit_code: "LEO-70", customer_name: "María López", amount: 1000, payment_status: "A", created_at: "2026-10-23 09:15:00" },
    { id: 502, loan_id: 71, credit_code: "LEO-71", customer_name: "José Pérez", amount: 250, payment_status: "A", created_at: "2026-10-23 09:40:00" },
  ],
  movements: [{ id: 9, movement_type: "EGRESO", description: "Papelería", entry_no: "CJ-9", amount: 80, status: "REGISTRADO" }],
  arqueos: [],
};

const renderPage = () =>
  render(
    <UserContext.Provider value={{ permissions: ["caja.turnos.supervisar"], role: 4 }}>
      <CashSessionsList />
    </UserContext.Provider>,
  );

describe("CashSessionsList: imprimir y Excel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get.mockImplementation((url) => {
      if (url === "/api/caja/sessions") return Promise.resolve({ data: { ok: true, data: SESSIONS } });
      if (url === "/api/caja/sessions/21") return Promise.resolve({ data: { ok: true, data: DETAIL } });
      return Promise.resolve({ data: {} });
    });
    openReportPopup.mockImplementation(() => ({ document: { write: jest.fn(), open: jest.fn(), close: jest.fn() }, focus: jest.fn(), close: jest.fn() }));
    printAccountingReport.mockResolvedValue(undefined);
  });

  test("los botones esperan a que haya turnos", async () => {
    API.get.mockResolvedValue({ data: { ok: true, data: [] } });
    renderPage();
    await waitFor(() => expect(API.get).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Imprimir" }).disabled).toBe(true);
  });

  test("Imprimir lista los turnos del período con encabezados en español y totales", async () => {
    renderPage();
    await screen.findByText("Caja Ventanilla 2");
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalledTimes(1));
    const def = printAccountingReport.mock.calls[0][0];
    expect(def.title).toBe("Turnos de caja");
    expect(def.period).toMatch(/^Del \d{4}-\d{2}-\d{2} al \d{4}-\d{2}-\d{2}$/);
    expect(def.columns.map((c) => c.label)).toEqual([
      "Turno", "Sucursal", "Caja", "Cajero", "Día", "Estado", "Fondo", "Cobros", "Esperado", "Contado", "Diferencia",
    ]);
    expect(def.rows.map((r) => r.id)).toEqual([21, 22]);
    expect(def.columns[5].format(def.rows[1].status)).toBe("Abierta");
    // Turno abierto: aún sin contado ni diferencia.
    expect(def.columns[9].format(def.columns[9].value(def.rows[1]))).toBe("—");
    expect(def.totals[0].value).toBe("Total (2 turnos)");
    expect(def.totals.slice(1).map((t) => t.raw)).toEqual([7000, 1550, 8550, 6200, -50]);
  });

  test("Excel del detalle de un turno: resumen, cobros y movimientos", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("Caja Ventanilla 1"));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("María López");
    fireEvent.click(within(dialog).getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const def = exportReportToExcel.mock.calls[0][0];
    expect(def.title).toBe("Detalle de turno de caja");
    expect(def.subtitle).toContain("Turno #21");
    expect(def.columns.map((c) => c.label)).toEqual(["#", "Hora", "Concepto", "Crédito / comprobante", "Monto", "Estado"]);
    const amountOf = (concept) => def.rows.find((r) => r.concept === concept)?.amount;
    expect(amountOf("Esperado en córdobas")).toBe(6250);
    expect(amountOf("Contado en córdobas")).toBe(6200);
    expect(amountOf("Faltante")).toBe(50);
    expect(def.rows.find((r) => r.concept === "María López")).toMatchObject({ id: "#501", reference: "LEO-70", amount: 1000, status: "Activo" });
    expect(def.rows.find((r) => r.concept === "Egreso: Papelería")).toMatchObject({ reference: "CJ-9", amount: -80, status: "Registrado" });
    expect(def.rows.filter((r) => r.section).map((r) => r.concept)).toEqual(["Resumen", "Cobros en efectivo", "Movimientos de caja"]);
  });
});
