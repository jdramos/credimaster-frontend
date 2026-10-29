import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CustomerList from "./CustomerList";
import { UserContext } from "../../contexts/UserContext";
import API from "../../api";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn() }));
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ openReportPopup: jest.fn(), printAccountingReport: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ tenant: { commercial_name: "Demo", enabled_modules: ["compliance"] } }) }));

const customer = (id) => ({
  id,
  customer_code: `C-${id}`,
  identification: `001-${id}`,
  customer_name: `Cliente ${id}`,
  risk_level: id === 1 ? "ALTO" : null,
  customer_type: id === 2 ? "AMBOS" : "DEUDOR",
  is_frozen: id === 3 ? 1 : 0,
  identity_verified_at: id === 1 ? "2026-10-01T10:00:00" : null,
});

// 150 clientes: la pantalla pide 10 por página; el reporte recorre páginas de 100.
const ALL = Array.from({ length: 150 }, (_, i) => customer(i + 1));

const setup = () =>
  render(
    <MemoryRouter>
      <UserContext.Provider value={{ permissions: [], role: 1, user: 1 }}>
        <CustomerList />
      </UserContext.Provider>
    </MemoryRouter>,
  );

describe("CustomerList: imprimir y Excel (lista paginada en el servidor)", () => {
  let popup;
  beforeEach(() => {
    API.get.mockImplementation(async (url, { params }) => {
      const start = (params.page - 1) * params.pageSize;
      return { data: { data: { rows: ALL.slice(start, start + params.pageSize), total: ALL.length } } };
    });
    popup = { document: { write: jest.fn() }, close: jest.fn() };
    openReportPopup.mockReturnValue(popup);
    printAccountingReport.mockResolvedValue(undefined);
  });

  it("Excel trae todas las páginas con la búsqueda actual", async () => {
    setup();
    await screen.findByText("150 registros");
    fireEvent.change(screen.getByPlaceholderText("Buscar cliente..."), { target: { value: "Cliente" } });
    await waitFor(() =>
      expect(API.get).toHaveBeenCalledWith("/api/customers", expect.objectContaining({ params: expect.objectContaining({ search: "Cliente", pageSize: 10 }) })),
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(false));
    fireEvent.click(screen.getByText("Excel"));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const report = exportReportToExcel.mock.calls[0][0];
    expect(report.rows).toHaveLength(150);
    expect(report.subtitle).toBe("Búsqueda: Cliente");
    expect(report.columns.map((c) => c.label)).toEqual([
      "ID", "Código", "Identificación", "Cliente", "Riesgo LA/FT/FP", "Identidad verificada", "Tipo", "Inmovilización",
    ]);
    const pageCalls = API.get.mock.calls.filter(([, cfg]) => cfg.params.pageSize === 100);
    expect(pageCalls.map(([, cfg]) => cfg.params.page)).toEqual([1, 2]);
    expect(pageCalls.every(([, cfg]) => cfg.params.search === "Cliente" && cfg.params.sortBy === "id" && cfg.params.sortDir === "desc")).toBe(true);
    expect(report.totals[0].value).toBe("150 registros");
  });

  it("Imprimir traduce riesgo, tipo e inmovilización", async () => {
    setup();
    await screen.findByText("150 registros");
    fireEvent.click(screen.getByText("Imprimir"));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalledTimes(1));
    const report = printAccountingReport.mock.calls[0][0];
    expect(report.popup).toBe(popup);
    expect(report.orientation).toBe("landscape");
    const col = (label) => report.columns.find((c) => c.label === label);
    const cell = (label, row) => {
      const c = col(label);
      const raw = typeof c.value === "function" ? c.value(row) : row[c.field];
      return c.format ? c.format(raw) : raw;
    };
    expect(cell("Riesgo LA/FT/FP", ALL[0])).toBe("ALTO");
    expect(cell("Riesgo LA/FT/FP", ALL[1])).toBe("Sin calcular");
    expect(cell("Tipo", ALL[1])).toBe("Deudor/Fiador");
    expect(cell("Inmovilización", ALL[2])).toBe("Congelado");
    expect(cell("Identidad verificada", ALL[0])).toBe("Sí (2026-10-01)");
  });
});
