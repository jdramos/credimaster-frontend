import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import JournalList from "./JournalList";
import { UserContext } from "../../contexts/UserContext";
import API from "../../api";
import { exportReportToExcel } from "./exportReportToExcel";
import { openReportPopup, printAccountingReport } from "./printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn(), put: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("./ReportBranchFilter", () => () => null);
jest.mock("./JournalForm", () => () => null);
jest.mock("./JournalDetailDialog", () => () => null);
jest.mock("./exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("./printAccountingReport", () => ({ printAccountingReport: jest.fn(), openReportPopup: jest.fn() }));

// 501 comprobantes: la primera página del reporte trae 500 y la segunda 1.
const ALL = Array.from({ length: 501 }, (_, i) => ({
  id: i + 1,
  entry_no: `CD-${String(i + 1).padStart(4, "0")}`,
  entry_date: "2026-10-05T00:00:00",
  description: `Asiento ${i + 1}`,
  source_module: i === 0 ? "BANKS" : "MANUAL",
  total_debit: 10,
  total_credit: 10,
  status: i === 1 ? "VOID" : "POSTED",
}));

const popup = { document: { write: jest.fn() }, close: jest.fn() };

beforeEach(() => {
  API.get.mockImplementation((url, { params } = {}) => {
    const start = (params.page - 1) * params.limit;
    const data = ALL.slice(start, start + params.limit);
    return Promise.resolve({
      data: { data, pagination: { page: params.page, limit: params.limit, total: ALL.length, totalPages: Math.ceil(ALL.length / params.limit) } },
    });
  });
  openReportPopup.mockReturnValue(popup);
  printAccountingReport.mockResolvedValue(undefined);
});

const setup = () => render(
  <UserContext.Provider value={{ role: 1, permissions: [] }}>
    <JournalList />
  </UserContext.Provider>,
);

describe("Libro diario: Imprimir y Excel", () => {
  test("Excel recorre todas las páginas del servidor con los filtros aplicados", async () => {
    setup();
    await screen.findByText("CD-0001");

    fireEvent.change(screen.getByLabelText("Buscar comprobante o descripción"), { target: { value: "Asiento" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(API.get).toHaveBeenLastCalledWith(
      "/api/accounting/journal",
      expect.objectContaining({ params: { page: 1, limit: 25, search: "Asiento" } }),
    ));

    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));

    const reportCalls = API.get.mock.calls.filter(([, opts]) => opts.params.limit === 500);
    expect(reportCalls.map(([, opts]) => opts.params)).toEqual([
      { page: 1, limit: 500, search: "Asiento" },
      { page: 2, limit: 500, search: "Asiento" },
    ]);

    const report = exportReportToExcel.mock.calls[0][0];
    expect(report.title).toBe("Libro Diario");
    expect(report.subtitle).toBe("Sucursal: Todas · Búsqueda: Asiento");
    expect(report.columns.map((c) => c.label)).toEqual(["Comprobante", "Fecha", "Descripción", "Origen", "Débito", "Crédito", "Estado"]);
    expect(report.rows).toHaveLength(501);
    const fmt = (field, row) => report.columns.find((c) => c.field === field).format(row[field]);
    expect(fmt("source_module", report.rows[0])).toBe("Bancos");
    expect(fmt("source_module", report.rows[2])).toBe("Manual");
    expect(fmt("status", report.rows[1])).toBe("Anulado");
    expect(fmt("entry_date", report.rows[0])).toBe("2026-10-05");
    expect(report.totals[0].value).toBe("Comprobantes: 501");
    expect(report.totals[1].raw).toBe(5010);
    expect(report.totals[2].raw).toBe(5010);
  });

  test("Imprimir abre la ventana y manda todas las filas", async () => {
    setup();
    await screen.findByText("CD-0001");
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalledTimes(1));
    const report = printAccountingReport.mock.calls[0][0];
    expect(report.popup).toBe(popup);
    expect(report.rows).toHaveLength(501);
    expect(report.subtitle).toBe("Sucursal: Todas");
  });
});
