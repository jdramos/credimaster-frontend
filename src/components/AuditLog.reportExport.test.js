import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuditLog from "./AuditLog";
import API from "../api";
import { exportReportToExcel } from "./accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "./accounting/printAccountingReport";

jest.mock("../api", () => ({ get: jest.fn() }));
jest.mock("./help/HelpButton", () => () => null);
jest.mock("./accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("./accounting/printAccountingReport", () => ({ openReportPopup: jest.fn(), printAccountingReport: jest.fn() }));

const event = (id) => ({ id, created_at: "2026-10-28 15:00:00", user_name: `usuario${id}`, action: "CANCEL_LOAN", entity: "loans", entity_id: id, ip_address: "10.0.0.1", details: {} });

describe("AuditLog: imprimir / Excel", () => {
  beforeEach(() => {
    // La pantalla pide 25 por página (una sola página); el reporte pide de 100
    // en 100 y recibe dos páginas.
    API.get.mockImplementation((url, { params }) => Promise.resolve({
      data: {
        data: params.page === 1 ? [event(1), event(2)] : [event(3)],
        pagination: { total: 3, total_pages: params.page_size === 100 ? 2 : 1 },
        filters: { actions: [], entities: [] },
      },
    }));
    openReportPopup.mockReturnValue({ document: { write: jest.fn() }, close: jest.fn() });
    printAccountingReport.mockResolvedValue();
  });

  test("Excel recorre todas las páginas del servidor con los filtros aplicados", async () => {
    render(<AuditLog />);
    expect(await screen.findByText("usuario1")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "anul" } });
    fireEvent.click(screen.getByText("Filtrar"));
    await waitFor(() => expect(API.get).toHaveBeenLastCalledWith("/api/audit", { params: expect.objectContaining({ search: "anul", page: 1 }) }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(false));

    fireEvent.click(screen.getByText("Excel"));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalled());
    const report = exportReportToExcel.mock.calls[0][0];
    const pageCalls = API.get.mock.calls.filter(([, { params }]) => params.page_size === 100);
    expect(pageCalls.map(([, { params }]) => [params.page, params.search])).toEqual([[1, "anul"], [2, "anul"]]);
    expect(report.title).toBe("Auditoría");
    expect(report.subtitle).toBe("Búsqueda: anul");
    expect(report.columns.map((c) => c.label)).toEqual(["Fecha", "Usuario", "Acción", "Descripción", "IP"]);
    expect(report.rows.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(report.columns[3].value(report.rows[2])).toBe("Se anuló el crédito No. 3.");
    expect(report.totals[0].value).toBe("Eventos: 3");
  });

  test("Imprimir abre la ventana en el clic y manda todas las filas", async () => {
    render(<AuditLog />);
    expect(await screen.findByText("usuario1")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("button", { name: "Imprimir" }).disabled).toBe(false));
    fireEvent.click(screen.getByText("Imprimir"));
    expect(openReportPopup).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalled());
    expect(printAccountingReport.mock.calls[0][0].rows).toHaveLength(3);
  });

  test("sin eventos los botones quedan deshabilitados", async () => {
    API.get.mockResolvedValue({ data: { data: [], pagination: { total: 0, total_pages: 0 }, filters: { actions: [], entities: [] } } });
    render(<AuditLog />);
    expect(await screen.findByText("No hay eventos para los filtros seleccionados.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Imprimir" }).disabled).toBe(true);
  });
});
