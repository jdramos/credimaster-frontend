import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import PortfolioDashboard from "./PortfolioDashboard";
import { UserContext } from "../../contexts/UserContext";
import * as api from "../../api/dashboardBalances";
import { exportReportToExcel } from "../accounting/exportReportToExcel";

jest.mock("../../api/dashboardBalances", () => ({
  getDashboardCatalogs: jest.fn(),
  getBalancesFastSummary: jest.fn(),
  getBalancesFastPortfolioByMonth: jest.fn(),
  getBalancesFastAging: jest.fn(),
  getBalancesFastPortfolioByBranch: jest.fn(),
  getBalancesFastRiskBreakdown: jest.fn(),
}));
jest.mock("./ManagementDashboard", () => () => null);
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ openReportPopup: jest.fn(), printAccountingReport: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
// recharts usa ResizeObserver, que jsdom no trae.
jest.mock("recharts", () => {
  const Mock = ({ children }) => <div>{children}</div>;
  const Null = () => null;
  return new Proxy({ ResponsiveContainer: Mock }, { get: (t, k) => t[k] || (k === "__esModule" ? false : Null) });
});

const renderAs = (user) =>
  render(
    <MemoryRouter>
      <UserContext.Provider value={user}>
        <PortfolioDashboard />
      </UserContext.Provider>
    </MemoryRouter>,
  );

const SaldosProbe = () => {
  const { search } = useLocation();
  return <div data-testid="saldos-search">{search}</div>;
};

const USER = { role: 3, permissions: ["balances.ver"] };

describe("PortfolioDashboard: alcance de sucursales", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    api.getDashboardCatalogs.mockResolvedValue({
      ok: true,
      data: { branches: [{ id: 2, name: "Sucursal León" }], promoters: [], vendors: [], collectors: [] },
    });
    api.getBalancesFastSummary.mockResolvedValue({ ok: true, data: null });
    api.getBalancesFastPortfolioByMonth.mockResolvedValue({ ok: true, data: [] });
    api.getBalancesFastAging.mockResolvedValue({ ok: true, data: [] });
    api.getBalancesFastPortfolioByBranch.mockResolvedValue({ ok: true, data: [] });
    api.getBalancesFastRiskBreakdown.mockResolvedValue({ ok: true, data: [] });
  });

  test("el selector de sucursal ofrece solo las sucursales que devuelve el backend", async () => {
    renderAs(USER);
    // "Actualizado HH:mm:ss" aparece cuando termina la carga (catálogos incluidos).
    await screen.findByText(/^Actualizado/);
    fireEvent.mouseDown(screen.getByLabelText("Sucursal"));
    const listbox = await screen.findByRole("listbox");
    const options = within(listbox).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Todas", "Sucursal León"]);
  });

  test("un 403 del backend se muestra como mensaje en pantalla", async () => {
    const forbidden = Object.assign(new Error("Request failed with status code 403"), {
      response: { status: 403, data: { ok: false, message: "No tiene acceso a la sucursal seleccionada." } },
    });
    api.getBalancesFastSummary.mockRejectedValue(forbidden);
    jest.spyOn(console, "error").mockImplementation(() => {});
    renderAs(USER);
    expect(await screen.findByText("No tiene acceso a la sucursal seleccionada.")).toBeTruthy();
    console.error.mockRestore();
  });

  test("Ver detalle por crédito abre Saldos con el mismo corte y sucursal", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/saldos"]}>
        <UserContext.Provider value={USER}>
          <Routes>
            <Route path="/dashboard/saldos" element={<PortfolioDashboard />} />
            <Route path="/saldos" element={<SaldosProbe />} />
          </Routes>
        </UserContext.Provider>
      </MemoryRouter>,
    );
    await screen.findByText(/^Actualizado/);
    fireEvent.mouseDown(screen.getByLabelText("Sucursal"));
    fireEvent.click(within(await screen.findByRole("listbox")).getByText("Sucursal León"));
    fireEvent.click(screen.getByRole("button", { name: /Ver detalle por crédito/ }));
    const params = new URLSearchParams((await screen.findByTestId("saldos-search")).textContent);
    expect(params.get("date")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.get("branch_id")).toBe("2");
  });

  test("Excel exporta los KPI y las tablas de los gráficos", async () => {
    api.getBalancesFastSummary.mockResolvedValue({
      ok: true,
      data: { total_portfolio: 1000, overdue_capital: 80, overdue_interest: 20, total_capital: 900, total_interest: 100, estimated_provision: 50, total_customers: 12, total_loans: 15 },
    });
    api.getBalancesFastAging.mockResolvedValue({ ok: true, data: [{ bucket: "Al día", total_balance: 750 }, { bucket: "1-15", total_balance: 250 }] });
    api.getBalancesFastPortfolioByBranch.mockResolvedValue({ ok: true, data: [{ branch_name: "Sucursal León", total_portfolio: 1000, total_loans: 15 }] });
    api.getBalancesFastRiskBreakdown.mockResolvedValue({ ok: true, data: [{ risk_code: "A", total_portfolio: 600 }, { risk_code: "D", total_portfolio: 400 }] });
    renderAs(USER);
    await screen.findByText(/^Actualizado/);
    fireEvent.click(screen.getByText("Excel"));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalled());
    const report = exportReportToExcel.mock.calls[0][0];
    expect(report.title).toBe("Dashboard de Saldos");
    expect(report.subtitle).toBe("Tipo: FINAL");
    expect(report.columns.map((c) => c.label)).toEqual(["Concepto", "Monto (C$)", "Cantidad", "%", "Var. vs. período anterior (%)"]);
    const byConcept = (concept) => report.rows.find((r) => r.concept === concept);
    expect(byConcept("Mora (capital + interés vencidos)").amount).toBe(100);
    expect(byConcept("% Mora").percent).toBe(10);
    expect(byConcept("Cartera vigente").amount).toBe(900);
    expect(byConcept("Clientes").count).toBe(12);
    expect(byConcept("1-15")).toEqual(expect.objectContaining({ amount: 250, percent: 25 }));
    expect(byConcept("Sucursal León")).toEqual(expect.objectContaining({ amount: 1000, count: 15, percent: 100 }));
    expect(byConcept("Cartera Deteriorada (D-E)")).toEqual(expect.objectContaining({ amount: 400, percent: 40 }));
  });
});
