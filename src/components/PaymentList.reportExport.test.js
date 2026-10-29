import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PaymentList from "./PaymentList";
import { UserContext } from "../contexts/UserContext";
import API from "../api";
import { exportReportToExcel } from "./accounting/exportReportToExcel";

jest.mock("../api", () => ({ get: jest.fn() }));
jest.mock("./accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("./accounting/printAccountingReport", () => ({ openReportPopup: jest.fn(), printAccountingReport: jest.fn() }));
jest.mock("../reports/printPaymentsReceivedReport", () => ({ printPaymentsReceivedReport: jest.fn() }));
jest.mock("./PaymentForm", () => () => null);
jest.mock("./PaymentCorrectionDialog", () => () => null);
jest.mock("./PaymentEvidenceDialog", () => () => null);
jest.mock("./help/HelpButton", () => () => null);
jest.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ tenant: { commercial_name: "Demo" }, user: null }) }));

const PAYMENTS = [
  { id: 10, payment_date: "2026-10-02", credit_code: "704", customer_identification: "001-1", customer_name: "Juan Pérez", branch_name: "Central", collector_name: "Douglas", forma_pago_name: "Efectivo", principal_payment: "100.50", interest_payment: 20, defaulted_interest: 5, insurance_payment: 1, fee_payment: 0, other_charges_payment: 0 },
  { id: 11, payment_date: "2026-10-03", loan_id: 705, customer_identification: "001-2", customer_name: "María López", branch_name: "Central", collector_name: "Douglas", forma_pago_name: "Banco", principal_payment: 200, interest_payment: 30, defaulted_interest: 0, insurance_payment: 0, fee_payment: 2, other_charges_payment: 3 },
];
const SUMMARY = { payments_count: 2, total_principal: 300.5, total_interest: 50, total_defaulted_interest: 5, total_insurance: 1, total_fee: 2, total_other_charges: 3, total_collected: 361.5 };

const setup = () =>
  render(
    <UserContext.Provider value={{ permissions: [], role: 1 }}>
      <PaymentList />
    </UserContext.Provider>,
  );

describe("PaymentList: Excel junto al Imprimir existente", () => {
  beforeEach(() => {
    API.get.mockImplementation(async (url) => {
      if (url === "/api/branches") return { data: [{ id: 1, name: "Central" }] };
      if (url === "/api/collectors") return { data: [{ id: 7, name: "Douglas" }] };
      return { data: { data: PAYMENTS, total: 2, summary: SUMMARY } };
    });
  });

  it("muestra un solo Imprimir (el reporte existente) y agrega Excel", async () => {
    setup();
    await screen.findByText("Juan Pérez");
    expect(screen.getAllByText("Imprimir")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(false);
  });

  it("Excel usa las mismas columnas y filtros del reporte impreso, con todas las filas y totales", async () => {
    setup();
    await screen.findByText("Juan Pérez");
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-10-31" } });
    fireEvent.click(screen.getByText("Excel"));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));

    const reportCall = API.get.mock.calls.map(([u]) => u).find((u) => u.includes("report=1"));
    expect(reportCall).toContain("dateFrom=2026-10-01");
    expect(reportCall).toContain("dateTo=2026-10-31");

    const report = exportReportToExcel.mock.calls[0][0];
    expect(report.title).toBe("Pagos recibidos");
    expect(report.period).toBe("Del 2026-10-01 al 2026-10-31");
    expect(report.fileName).toBe("pagos_2026-10-01_2026-10-31");
    expect(report.columns.map((c) => c.label)).toEqual([
      "ID", "Fecha", "Crédito", "Cédula", "Cliente", "Sucursal", "Colector", "Forma de pago",
      "Capital", "Interés", "Mora", "Seguro", "Comisión", "Otros", "Total",
    ]);
    expect(report.rows).toHaveLength(2);
    const value = (label, row) => report.columns.find((c) => c.label === label).value(row);
    expect(value("Capital", report.rows[0])).toBe(100.5);
    expect(value("Crédito", report.rows[1])).toBe(705);
    expect(value("Total", report.rows[1])).toBe(235);
    expect(report.totals[0].value).toBe("Totales (2 pagos)");
    expect(report.totals.slice(1).map((t) => t.raw)).toEqual([300.5, 50, 5, 1, 2, 3, 361.5]);
  });
});
