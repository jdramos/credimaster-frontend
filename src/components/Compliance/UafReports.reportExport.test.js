import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UafReports from "./UafReports";
import RosCasesList from "./RosCasesList";
import API from "../../api";
import fx from "./__fixtures__/uaf.demo.json";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ printAccountingReport: jest.fn(), openReportPopup: jest.fn() }));
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows }) => <table><tbody>{rows.map((r) => <tr key={r.id}><td>{r.case_number}</td></tr>)}</tbody></table>,
}));

const cell = (def, label, row) => {
  const col = def.columns.find((c) => c.label === label);
  const raw = col.value ? col.value(row) : row[col.field];
  return col.format ? col.format(raw) : raw;
};

// Fixture real del DEMO más una venta y un envío registrado para cubrir esas pestañas.
const sales = {
  ...fx.ventas,
  applicable: true,
  total_usd: 12500,
  sales: [{ id: 1, sale_date: "2026-09-10", asset_description: "Moto Honda", asset_type: "VEHICULO", former_owner: "Pedro Ruiz", former_owner_identification: "001-9", credit_code: "CR-10", sale_price: 460000, exchange_rate: 36.8, sale_price_usd: 12500 }],
};
const history = [{ id: 4, period: "2026-08-01", report_type: "RTE", records_count: 3, sent_at: "2026-09-08", sirel_receipt: "AC-77", file_name: "rte.xlsx", registered_by: "Ana" }];
const routes = {
  "/api/aml/uaf/control": fx.control,
  "/api/aml/uaf/rte": fx.rte,
  "/api/aml/uaf/inmovilizacion": fx.inmov,
  "/api/aml/uaf/ventas": sales,
  "/api/aml/uaf/submissions": history,
  "/api/aml/ros-cases": fx.ros,
};

describe("Reportes UAF — Imprimir / Excel", () => {
  let popup;
  beforeEach(() => {
    popup = { document: { write: jest.fn() }, close: jest.fn() };
    openReportPopup.mockImplementation(() => popup);
    printAccountingReport.mockResolvedValue(undefined);
    API.get.mockImplementation((url) => Promise.resolve({ data: routes[url] }));
  });

  test("control del mes: Excel con cada reporte, su estado y el RAII", async () => {
    render(<UafReports />);
    await screen.findByText("Reporte de Transacciones en Efectivo (RTE)");
    // El primero es el de la tabla; los de cada fila bajan el archivo de ese reporte.
    fireEvent.click(screen.getAllByRole("button", { name: "Excel" })[0]);
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const def = exportReportToExcel.mock.calls[0][0];
    expect(def.title).toBe("Reportes a la UAF — Control del mes");
    expect(def.subtitle).toContain("Sujeto obligado: Microfinanciera");
    expect(def.columns.map((c) => c.label)).toEqual(["Reporte", "Base legal", "Registros", "Plazo", "Estado", "Envío"]);
    expect(def.rows.map((r) => r.type)).toEqual(["ROS", "RTE", "INMOVILIZACION", "RAII"]);
    const raii = def.rows[3];
    expect(cell(def, "Registros", raii)).toBe("Procede");
    expect(cell(def, "Estado", raii)).toBe("Vencido");
    expect(cell(def, "Base legal", raii)).toBe("Art. 19 · sin información: Reporte de Operaciones Sospechosas (ROS)");
  });

  test("detección e inmovilización imprime secciones y resultados de búsqueda", async () => {
    render(<UafReports />);
    fireEvent.click(await screen.findByRole("tab", { name: "Detección e inmovilización" }));
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalledTimes(1));
    const def = printAccountingReport.mock.calls[0][0];
    expect(def.subtitle).toBe(`Consultas a listas: ${fx.inmov.screenings_total} · Resultados negativos: ${fx.inmov.screenings_negative} · Coincidencias: 1 · Barridos de cartera: ${fx.inmov.portfolio_scans.length}`);
    expect(def.rows.filter((r) => r.section).map((r) => r.person)).toEqual(["Personas inmovilizadas", "Coincidencias en listas"]);
    expect(def.rows[2].person).toBe(fx.inmov.matches[0].subject_label);
  });

  test("ventas imprime con el total en US$ y el historial exporta los envíos", async () => {
    render(<UafReports />);
    fireEvent.click(await screen.findByRole("tab", { name: "Ventas (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalledTimes(1));
    const ventas = printAccountingReport.mock.calls[0][0];
    expect(ventas.rows).toHaveLength(1);
    expect(cell(ventas, "Precio de venta", ventas.rows[0])).toBe("460,000.00");
    expect(ventas.totals[1]).toEqual({ value: "12,500.00", raw: 12500, numeric: true });

    fireEvent.click(screen.getByRole("tab", { name: "Historial de envíos" }));
    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const hist = exportReportToExcel.mock.calls[0][0];
    expect(hist.columns.map((c) => c.label)).toEqual(["Período", "Reporte", "Registros", "Enviado", "Acuse SIREL", "Archivo", "Registró"]);
    expect(cell(hist, "Período", hist.rows[0])).toBe("agosto 2026");
  });
});

describe("Casos ROS — Imprimir / Excel", () => {
  beforeEach(() => {
    API.get.mockImplementation((url) => Promise.resolve({ data: routes[url] }));
  });

  test("exporta los casos del estado filtrado con el plazo en texto", async () => {
    render(<RosCasesList />);
    await screen.findByText("ROS-2026-0001");
    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const def = exportReportToExcel.mock.calls[0][0];
    expect(def.subtitle).toBe("Estado: En análisis");
    expect(def.columns.map((c) => c.label)).toEqual(["N° Caso", "Cliente", "Identificación", "Apertura", "Estado", "Plazo UAF (30 días)", "Acuse SIREL", "Notas de análisis"]);
    expect(cell(def, "Estado", def.rows[0])).toBe("ROS enviado");
    expect(cell(def, "Plazo UAF (30 días)", def.rows[0])).toBe("Enviado en plazo");
    expect(def.totals[0].value).toBe("1 caso(s)");
  });
});
