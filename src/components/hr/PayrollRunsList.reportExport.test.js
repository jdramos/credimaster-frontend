import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PayrollRunsList from "./PayrollRunsList";
import API from "../../api";
import { exportReportToExcel, exportRowsToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ tenant: { name: "DEMO" } }) }));
jest.mock("../../reports/printColillaDePagoReport", () => ({ printColillaDePagoReport: jest.fn() }));
jest.mock("../../reports/printPlanillaReport", () => ({ printPlanillaReport: jest.fn() }));
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn(), exportRowsToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ printAccountingReport: jest.fn(), openReportPopup: jest.fn() }));
jest.mock("@mui/x-data-grid", () => ({ DataGrid: () => <div />, GridToolbar: () => null }));

const RUNS = [
  { id: 7, period_start: "2026-09-01T00:00:00", period_end: "2026-09-30T00:00:00", pay_date: "2026-09-30T00:00:00", branch_name: null, employee_count: 12, total_net: "154320.75", status: "APROBADA" },
  { id: 8, period_start: "2026-10-01T00:00:00", period_end: "2026-10-31T00:00:00", pay_date: "2026-10-31T00:00:00", branch_name: "León", employee_count: 4, total_net: 40000, status: "PENDIENTE_APROBACION" },
];

describe("PayrollRunsList — Imprimir", () => {
  let popup;
  beforeEach(() => {
    popup = { document: { write: jest.fn() }, close: jest.fn() };
    openReportPopup.mockImplementation(() => popup);
    printAccountingReport.mockResolvedValue(undefined);
    API.get.mockImplementation((url) => Promise.resolve(url === "/api/branches" ? { data: [] } : { data: { data: url === "/api/hr/payroll-runs" ? RUNS : [] } }));
  });

  it("imprime las planillas con las mismas columnas del Excel y estados traducidos", async () => {
    render(<PayrollRunsList />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Imprimir" }).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalled());
    const def = printAccountingReport.mock.calls[0][0];
    expect(def.title).toBe("Planillas");
    expect(def.orientation).toBe("landscape");
    expect(def.columns.map((c) => c.label)).toEqual(["#", "Período desde", "Período hasta", "Fecha de pago", "Sucursal", "Empleados", "Total neto", "Estado"]);
    const cells = (row) => def.columns.map((c) => {
      const raw = typeof c.value === "function" ? c.value(row) : row[c.field];
      return c.format ? c.format(raw) : raw;
    });
    expect(cells(def.rows[0])).toEqual([7, "2026-09-01", "2026-09-30", "2026-09-30", "Todas", "12", "154,320.75", "Aprobada"]);
    expect(cells(def.rows[1]).slice(-4)).toEqual(["León", "4", "40,000.00", "Pendiente de aprobación"]);
    // El botón Excel de la nueva definición no se agrega: queda el existente.
    expect(screen.queryByText("Excel")).toBeNull();
  });

  it("el Excel existente sigue exportando con su propio helper", async () => {
    render(<PayrollRunsList runKind="AGUINALDO" />);
    await waitFor(() => expect(API.get).toHaveBeenCalledWith("/api/hr/payroll-runs", { params: { run_kind: "AGUINALDO" } }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Imprimir" }).disabled).toBe(false));
    fireEvent.click(screen.getByText("Exportar Excel"));
    expect(exportRowsToExcel).toHaveBeenCalled();
    expect(exportRowsToExcel.mock.calls[0][1]).toBe("Aguinaldo");
    expect(exportReportToExcel).not.toHaveBeenCalled();
  });
});
