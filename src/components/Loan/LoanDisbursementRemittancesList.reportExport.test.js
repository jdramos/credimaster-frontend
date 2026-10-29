import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoanDisbursementRemittancesList from "./LoanDisbursementRemittancesList";
import { loanApi } from "../../api/loanApi";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn() }));
jest.mock("../../api/loanApi", () => ({ loanApi: { listRemittances: jest.fn(), getDeliveryImageUrl: jest.fn() } }));
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ user: {}, tenant: {} }) }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ openReportPopup: jest.fn(), printAccountingReport: jest.fn() }));

const ROWS = [
  { id: 7, credit_code: "C-007", customer_name: "Juan Pérez", branch_name: "Central", disbursement_method: "CHEQUE", bank_account_alias: "BANPRO 01", amount: "1500.50", status: "EN_TRANSITO", created_at: "2026-10-27 14:00:00" },
  { id: 8, credit_code: "C-008", customer_name: "María López", branch_name: "León", disbursement_method: "EFECTIVO", cash_register_name: "Caja 1", amount: 2500, status: "DESEMBOLSADO", delivered_at: "2026-10-28 10:00:00", created_at: "2026-10-27 15:00:00" },
];

describe("Remesas de desembolso: imprimir / Excel", () => {
  beforeEach(() => {
    loanApi.listRemittances.mockResolvedValue({ data: ROWS, pending_total: 1500.5 });
    openReportPopup.mockReturnValue({ document: { write: jest.fn() }, close: jest.fn() });
    printAccountingReport.mockResolvedValue();
  });

  test("Excel exporta las remesas del filtro con columnas en español y el total", async () => {
    render(<LoanDisbursementRemittancesList />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(false));
    expect(loanApi.listRemittances).toHaveBeenCalledWith({ status: "EN_TRANSITO" });
    fireEvent.click(screen.getByText("Excel"));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalled());
    const report = exportReportToExcel.mock.calls[0][0];
    expect(report.title).toBe("Remesas de desembolso");
    expect(report.subtitle).toBe("Estado: En tránsito · Saldo en remesas en tránsito (1101.03): 1,500.50");
    expect(report.columns.map((c) => c.label)).toEqual([
      "ID", "Crédito", "Cliente", "Sucursal", "Forma", "Cuenta / Caja", "Monto", "Estado", "Responsable de entrega", "Entregado", "Fecha", "Motivo devolución",
    ]);
    expect(report.rows).toHaveLength(2);
    const estado = report.columns.find((c) => c.label === "Estado");
    expect(report.rows.map(estado.value)).toEqual(["En tránsito", "Entregado"]);
    const cuenta = report.columns.find((c) => c.label === "Cuenta / Caja");
    expect(report.rows.map(cuenta.value)).toEqual(["BANPRO 01", "Caja 1"]);
    expect(report.totals[0].value).toBe("Total (2 remesas)");
    expect(report.totals[1]).toEqual(expect.objectContaining({ raw: 4000.5, value: "4,000.50" }));
  });

  test("Imprimir usa la misma definición", async () => {
    render(<LoanDisbursementRemittancesList />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Imprimir" }).disabled).toBe(false));
    fireEvent.click(screen.getByText("Imprimir"));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalled());
    const report = printAccountingReport.mock.calls[0][0];
    expect(report.orientation).toBe("landscape");
    expect(report.rows.map((r) => r.customer_name)).toEqual(["Juan Pérez", "María López"]);
  });

  test("sin remesas los botones quedan deshabilitados", async () => {
    loanApi.listRemittances.mockResolvedValue({ data: [], pending_total: 0 });
    render(<LoanDisbursementRemittancesList />);
    await waitFor(() => expect(loanApi.listRemittances).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(true));
    expect(screen.getByRole("button", { name: "Imprimir" }).disabled).toBe(true);
  });
});
