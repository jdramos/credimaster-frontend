import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CollectedInterestReport from "./CollectedInterestReport";
import API from "../api";
import { exportReportToExcel } from "./accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "./accounting/printAccountingReport";

jest.mock("../api", () => ({ get: jest.fn() }));
jest.mock("./accounting/ReportBranchFilter", () => () => null);
jest.mock("./accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("./accounting/printAccountingReport", () => ({ openReportPopup: jest.fn(), printAccountingReport: jest.fn() }));

const DAY_ROWS = [
  { payment_date: "2026-11-05", payments_count: 1, interest: 125, default_interest: 0, fee: 0, other_charges: 0, insurance: 0, principal: 375, income_total: 125, collected_total: 500 },
  { payment_date: "2026-11-20", payments_count: 1, interest: 370.24, default_interest: 4.77, fee: 0, other_charges: 0, insurance: 0, principal: 2124.99, income_total: 375.01, collected_total: 2500 },
];
const DAY_TOTALS = { payments_count: 2, interest: 495.24, default_interest: 4.77, fee: 0, other_charges: 0, insurance: 0, principal: 2499.99, income_total: 500.01, collected_total: 3000 };

const LOAN_ROWS = [
  { customer_id: 8, customer_name: "QA Flat Dos", customer_identification: "001-290190-0002B", loan_id: 5, credit_code: "5", payments_count: 2, interest: 495.24, default_interest: 4.77, fee: 0, other_charges: 0, insurance: 0, principal: 2499.99, income_total: 500.01, collected_total: 3000 },
];

describe("Intereses cobrados", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    openReportPopup.mockReturnValue({ document: { write: jest.fn() }, close: jest.fn() });
    printAccountingReport.mockResolvedValue();
  });

  test("consulta /api/reports (no /api/accounting) y exporta a Excel con mora y totales", async () => {
    API.get.mockResolvedValue({ data: { ok: true, data: DAY_ROWS, totals: DAY_TOTALS } });
    render(<CollectedInterestReport />);
    expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(true);

    fireEvent.click(screen.getByText("Generar"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(false));
    expect(API.get).toHaveBeenCalledWith("/api/reports/collected-interest", expect.objectContaining({
      params: expect.objectContaining({ group_by: "day", branch_id: "" }),
    }));
    expect(screen.getByTestId("collected-interest-totals").textContent).toContain("Interés moratorio: C$ 4.77");

    fireEvent.click(screen.getByText("Excel"));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalled());
    const report = exportReportToExcel.mock.calls[0][0];
    expect(report.title).toBe("Intereses Cobrados por Día");
    expect(report.columns.map((c) => c.label)).toEqual([
      "Fecha", "Pagos", "Interés corriente", "Interés moratorio", "Comisión", "Otros cargos",
      "Total ingresos", "Seguro (no es ingreso)", "Capital", "Total cobrado",
    ]);
    expect(report.rows).toHaveLength(2);
    expect(report.totals).toHaveLength(report.columns.length);
    expect(report.totals[3]).toEqual(expect.objectContaining({ raw: 4.77, value: "4.77" }));
    expect(report.totals[6]).toEqual(expect.objectContaining({ raw: 500.01 }));
  });

  test("detalle por cliente: imprime con cliente y crédito", async () => {
    API.get.mockResolvedValue({ data: { ok: true, data: LOAN_ROWS, totals: { ...DAY_TOTALS, payments_count: 2 } } });
    render(<CollectedInterestReport />);
    fireEvent.click(screen.getByText("Detalle por cliente"));
    fireEvent.click(screen.getByText("Generar"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Imprimir" }).disabled).toBe(false));
    expect(API.get.mock.calls[0][1].params.group_by).toBe("loan");

    fireEvent.click(screen.getByText("Imprimir"));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalled());
    const report = printAccountingReport.mock.calls[0][0];
    expect(report.title).toBe("Intereses Cobrados por Cliente");
    expect(report.columns.slice(0, 4).map((c) => c.label)).toEqual(["Cliente", "Identificación", "Crédito", "Pagos"]);
    expect(report.totals[0]).toEqual({ value: "Totales", colspan: 3 });
    expect(report.totals).toHaveLength(report.columns.length - 2);
  });

  test("sin pagos avisa y deja los botones deshabilitados", async () => {
    API.get.mockResolvedValue({ data: { ok: true, data: [], totals: {} } });
    render(<CollectedInterestReport />);
    fireEvent.click(screen.getByText("Generar"));
    await waitFor(() => expect(screen.getByText("No hay pagos registrados en el período.")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(true);
  });
});
