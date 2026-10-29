import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TrialBalance from "./TrialBalance";
import API from "../../api";
import { exportReportToExcel } from "./exportReportToExcel";
import { printAccountingReport } from "./printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("./ReportBranchFilter", () => () => null);
jest.mock("./ReportSignaturesDialog", () => () => null);
jest.mock("./AccountMovementsDialog", () => () => null);
jest.mock("./exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("./printAccountingReport", () => ({ printAccountingReport: jest.fn(), openReportPopup: jest.fn() }));

const ROWS = [
  { id: 1, muc_code: "1101", account_name: "Caja", is_movement: 0, previous_balance: 100, total_debit: 50, total_credit: 20, balance: 130 },
  { id: 2, muc_code: "1101.01", account_name: "Caja general", is_movement: 1, previous_balance: 100, total_debit: 50, total_credit: 20, balance: 130 },
];

beforeEach(() => {
  API.get.mockImplementation((url) => {
    if (url === "/api/accounting/trial-balance") {
      return Promise.resolve({ data: { ok: true, data: { rows: ROWS }, totals: { debit: 50, credit: 20, difference: 30 } } });
    }
    return Promise.resolve({ data: { data: [] } });
  });
});

describe("Balance de comprobación: Imprimir y Excel", () => {
  test("Excel usa la misma definición que la impresión", async () => {
    render(<TrialBalance />);
    expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Generar" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(false));

    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    expect(printAccountingReport).toHaveBeenCalledTimes(1);

    const excelReport = exportReportToExcel.mock.calls[0][0];
    const printed = printAccountingReport.mock.calls[0][0];
    expect(excelReport.title).toBe("Balance de Comprobación de Saldos");
    expect(excelReport.subtitle).toBe(printed.subtitle);
    expect(excelReport.subtitle).toContain("Sucursal: Todas");
    expect(excelReport.columns.map((c) => c.label)).toEqual(["Código", "Denominación", "Saldo anterior", "Cargos", "Abonos", "Saldo actual"]);
    expect(printed.columns.map((c) => c.label)).toEqual(excelReport.columns.map((c) => c.label));
    expect(excelReport.rows.map((r) => r.muc_code)).toEqual(["1101", "1101.01"]);
    expect(printed.rows).toEqual(excelReport.rows);
    expect(excelReport.fileName).toBe("balance_comprobacion_inicio_corte");
  });
});
