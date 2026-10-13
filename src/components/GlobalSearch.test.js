import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import GlobalSearch from "./GlobalSearch";
import API from "../api";

jest.mock("../api", () => ({ get: jest.fn() }));
jest.mock("./Loan/detail/LoanDetailsModal", () => (props) => (
  <div data-testid="loan-modal">detalle crédito {props.loan?.id}</div>
));

const RESULTS = {
  groups: [
    {
      type: "customer",
      label: "Clientes",
      items: [{ id: 31, customer_name: "Silvia Chavarría Pérez", identification: "001-010190-0001A", cellphone: "82724516", active_loans: 2 }],
    },
    {
      type: "loan",
      label: "Créditos",
      items: [{ id: 669, credit_code: "669", customer_id: 31, status: "DISBURSED", current_balance: "11697.05", amount: "12589", customer_name: "Silvia Chavarría Pérez", identification: "001-010190-0001A" }],
    },
  ],
};

function Where() {
  const loc = useLocation();
  return <span data-testid="where">{loc.pathname + loc.search}</span>;
}

const setup = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <GlobalSearch />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const input = () => screen.getByLabelText("Búsqueda general");

describe("GlobalSearch", () => {
  beforeEach(() => {
    API.get.mockReset();
    API.get.mockImplementation((url) => {
      if (url === "/api/search") return Promise.resolve({ data: RESULTS });
      if (url === "/api/loans/669") return Promise.resolve({ data: { data: { id: 669 } } });
      return Promise.resolve({ data: [] });
    });
  });

  test("con menos de 2 caracteres no consulta", async () => {
    setup();
    fireEvent.change(input(), { target: { value: "s" } });
    await new Promise((r) => setTimeout(r, 400));
    expect(API.get).not.toHaveBeenCalled();
  });

  test("muestra resultados agrupados con su detalle", async () => {
    setup();
    fireEvent.change(input(), { target: { value: "silvia" } });
    expect(await screen.findByText("Clientes")).toBeTruthy();
    expect(API.get).toHaveBeenCalledWith("/api/search", { params: { q: "silvia" } });
    expect(screen.getByText("Créditos")).toBeTruthy();
    expect(screen.getByText(/Cédula 001-010190-0001A · Tel\. 82724516/)).toBeTruthy();
    expect(screen.getByText("2 crédito(s) activo(s)")).toBeTruthy();
    expect(screen.getByText("Desembolsado")).toBeTruthy();
  });

  test("Enter abre el cliente seleccionado", async () => {
    setup();
    fireEvent.change(input(), { target: { value: "silvia" } });
    await screen.findByText("Clientes");
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(screen.getByTestId("where").textContent).toBe("/clientes/ver/31");
  });

  test("flecha abajo + Enter abre el detalle del crédito", async () => {
    setup();
    fireEvent.change(input(), { target: { value: "silvia" } });
    await screen.findByText("Clientes");
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(await screen.findByTestId("loan-modal")).toBeTruthy();
    expect(API.get).toHaveBeenCalledWith("/api/loans/669");
  });

  test("sin resultados lo indica", async () => {
    API.get.mockResolvedValue({ data: { groups: [] } });
    setup();
    fireEvent.change(input(), { target: { value: "zzz" } });
    await waitFor(() => expect(screen.getByText(/Sin resultados para/)).toBeTruthy());
  });

  test("Ctrl+K enfoca el buscador", () => {
    setup();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(document.activeElement).toBe(input());
  });
});
