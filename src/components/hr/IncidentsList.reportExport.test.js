import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import IncidentsList from "./IncidentsList";
import API from "../../api";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn(), exportRowsToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ printAccountingReport: jest.fn(), openReportPopup: jest.fn() }));
// La grilla real necesita medidas de layout que jsdom no da.
jest.mock("@mui/x-data-grid", () => ({ DataGrid: () => <div />, GridToolbar: () => null }));

const INCIDENTS = [
  { id: 1, employee_name: "Ana Ruiz", incident_type: "AUSENCIA_INJUSTIFICADA", start_date: "2026-10-01T00:00:00", end_date: "2026-10-02T00:00:00", notes: "Sin aviso", computed_amount: "850.5", status: "APLICADA" },
  { id: 2, employee_name: "Luis Mora", incident_type: "HORAS_EXTRA", start_date: "2026-10-05T00:00:00", end_date: "2026-10-05T00:00:00", hours: 3, notes: null, computed_amount: null, status: "PENDIENTE" },
];

const mockApi = (incidents) => {
  API.get.mockImplementation((url) => Promise.resolve({ data: { data: url === "/api/hr/incidents" ? incidents : [] } }));
};

const cellsOf = (report, row) => report.columns.map((c) => {
  const raw = typeof c.value === "function" ? c.value(row) : row[c.field];
  return c.format ? c.format(raw) : raw;
});

describe("IncidentsList — Imprimir y Excel", () => {
  let popup;
  beforeEach(() => {
    popup = { document: { write: jest.fn() }, close: jest.fn() };
    openReportPopup.mockImplementation(() => popup);
    printAccountingReport.mockResolvedValue(undefined);
    mockApi(INCIDENTS);
  });

  it("Excel exporta las incidencias con encabezados en español y montos crudos", async () => {
    render(<IncidentsList />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalled());
    const report = exportReportToExcel.mock.calls[0][0];
    expect(report.title).toBe("Incidencias");
    expect(report.columns.map((c) => c.label)).toEqual(["Empleado", "Tipo", "Fecha/Período", "Notas", "Monto aplicado", "Estado"]);
    expect(report.rows).toHaveLength(2);
    expect(cellsOf(report, report.rows[0])).toEqual(["Ana Ruiz", "Ausencia injustificada", "2026-10-01 a 2026-10-02", "Sin aviso", "850.50", "Aplicada"]);
    expect(cellsOf(report, report.rows[1])).toEqual(["Luis Mora", "Horas extra", "2026-10-05 (3h)", "", "", "Pendiente"]);
    expect(report.columns.find((c) => c.label === "Monto aplicado").numeric).toBe(true);
  });

  it("Imprimir abre la ventana y manda la misma definición", async () => {
    render(<IncidentsList />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Imprimir" }).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalled());
    const def = printAccountingReport.mock.calls[0][0];
    expect(def.popup).toBe(popup);
    expect(def.rows.map((r) => r.employee_name)).toEqual(["Ana Ruiz", "Luis Mora"]);
  });

  it("sin incidencias los botones quedan deshabilitados", async () => {
    mockApi([]);
    render(<IncidentsList />);
    await waitFor(() => expect(API.get).toHaveBeenCalledWith("/api/hr/incidents"));
    expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Imprimir" }).disabled).toBe(true);
  });
});
