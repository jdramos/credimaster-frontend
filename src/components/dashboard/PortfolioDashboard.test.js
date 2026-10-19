import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import PortfolioDashboard from "./PortfolioDashboard";
import { UserContext } from "../../contexts/UserContext";
import * as api from "../../api/dashboardBalances";

jest.mock("../../api/dashboardBalances", () => ({
  getDashboardCatalogs: jest.fn(),
  getBalancesFastSummary: jest.fn(),
  getBalancesFastPortfolioByMonth: jest.fn(),
  getBalancesFastAging: jest.fn(),
  getBalancesFastPortfolioByBranch: jest.fn(),
  getBalancesFastRiskBreakdown: jest.fn(),
}));
jest.mock("./ManagementDashboard", () => () => null);
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
});
