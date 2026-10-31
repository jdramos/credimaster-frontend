import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoanList from "./LoanList";
import { UserContext } from "../contexts/UserContext";
import API from "../api";

jest.mock("../api", () => ({ get: jest.fn() }));
jest.mock("./help/HelpButton", () => () => null);
jest.mock("./LoanListDataTable", () => ({ data }) => (
  <div>filas: {data.map((r) => r.customer_name).join(", ")}</div>
));
jest.mock("./Loan/LoanModificationModal", () => () => null);
jest.mock("./BranchSelect", () => () => null);

const renderList = () =>
  render(
    <MemoryRouter>
      <UserContext.Provider value={{ permissions: [], role: 1, user: 1 }}>
        <LoanList />
      </UserContext.Provider>
    </MemoryRouter>,
  );

const searches = () =>
  API.get.mock.calls.map(([url]) => new URLSearchParams(url.split("?")[1]).get("search")).filter((s) => s !== null);

describe("LoanList: búsqueda", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it("consulta una sola vez cuando se deja de escribir, no por cada tecla", async () => {
    API.get.mockResolvedValue({ data: { data: [], total: 0 } });
    renderList();
    await act(async () => {});
    const field = screen.getByLabelText("Buscar por nombre o cédula");
    for (const text of ["M", "MA", "MAR", "MARI", "MARIA"]) {
      fireEvent.change(field, { target: { value: text } });
      act(() => jest.advanceTimersByTime(100));
    }
    expect(searches()).toEqual([]);
    await act(async () => jest.advanceTimersByTime(400));
    expect(searches()).toEqual(["MARIA"]);
  });

  it("una respuesta vieja que llega tarde no pisa la de la búsqueda actual", async () => {
    let resolveOld;
    API.get.mockImplementation((url) => {
      const search = new URLSearchParams(url.split("?")[1]).get("search");
      if (search === "ANA") return new Promise((r) => { resolveOld = r; });
      if (search === "LUIS") return Promise.resolve({ data: { data: [{ id: 2, customer_name: "LUIS" }], total: 1 } });
      return Promise.resolve({ data: { data: [], total: 0 } });
    });
    renderList();
    await act(async () => {});
    const field = screen.getByLabelText("Buscar por nombre o cédula");
    fireEvent.change(field, { target: { value: "ANA" } });
    await act(async () => jest.advanceTimersByTime(400));
    fireEvent.change(field, { target: { value: "LUIS" } });
    await act(async () => jest.advanceTimersByTime(400));
    await waitFor(() => expect(screen.getByText("filas: LUIS")).toBeTruthy());
    await act(async () => resolveOld({ data: { data: [{ id: 1, customer_name: "ANA" }], total: 1 } }));
    expect(screen.getByText("filas: LUIS")).toBeTruthy();
  });
});
