import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InvoicesTab from "./InvoicesTab";
import API from "../../api";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("./PaymentDialog", () => () => null);
jest.mock("./StatementDialog", () => () => null);
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ printAccountingReport: jest.fn(), openReportPopup: jest.fn() }));

const INVOICES = [
  {
    id: 1, provider_id: 7, provider_name: "Ferretería Central", document_number: "F-100", document_date: "2026-10-01T00:00:00",
    due_date: "2026-10-31", amount: 1000, retention_amount: 20, balance: 980, paid_amount: 0, days_old: 28, status: "PENDING",
  },
  {
    id: 2, provider_id: 7, provider_name: "Ferretería Central", document_number: null, document_date: "2026-10-02",
    due_date: null, amount: 500.5, retention_amount: 0, balance: 0, paid_amount: 500.5, days_old: 27, status: "PAID",
  },
];

const popup = { document: { write: jest.fn() }, close: jest.fn() };

beforeEach(() => {
  API.get.mockImplementation((url) => {
    if (url === "/api/payables/invoices") {
      return Promise.resolve({ data: { data: INVOICES, summary: { count: 2, amount: 1500.5, balance: 980 } } });
    }
    if (url === "/api/providers") return Promise.resolve({ data: [{ id: 7, name: "Ferretería Central" }] });
    return Promise.resolve({ data: { data: [] } });
  });
  openReportPopup.mockReturnValue(popup);
  printAccountingReport.mockResolvedValue(undefined);
});

describe("Cuentas por pagar, facturas: Imprimir y Excel", () => {
  test("Excel exporta las facturas cargadas con encabezados en español y totales", async () => {
    render(<InvoicesTab />);
    await screen.findByText("F-100");

    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const report = exportReportToExcel.mock.calls[0][0];

    expect(report.title).toBe("Facturas de Proveedores");
    expect(report.orientation).toBe("landscape");
    expect(report.columns.map((c) => c.label)).toEqual(["Proveedor", "Factura", "Fecha", "Vence", "Monto", "Retención", "Saldo", "Días", "Estado"]);
    expect(report.rows).toEqual(INVOICES);
    const status = report.columns.find((c) => c.label === "Estado");
    expect(INVOICES.map((r) => status.format(r.status))).toEqual(["Pendiente", "Pagada"]);
    expect(report.columns.find((c) => c.label === "Factura").format(null)).toBe("—");
    expect(report.totals.map((t) => t.raw)).toEqual([undefined, 1500.5, 20, 980, undefined]);
    expect(report.totals[0].value).toBe("Facturas: 2");
  });

  test("Imprimir manda las mismas filas a la impresión", async () => {
    render(<InvoicesTab />);
    await screen.findByText("F-100");
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalledTimes(1));
    const report = printAccountingReport.mock.calls[0][0];
    expect(report.popup).toBe(popup);
    expect(report.rows).toHaveLength(2);
    expect(report.subtitle).toBe("");
  });
});
