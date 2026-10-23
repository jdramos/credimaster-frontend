import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import BusinessDayAllBranches from "./BusinessDayAllBranches";
import { UserContext } from "../contexts/UserContext";
import API from "../api";

jest.mock("../api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("../hooks/useCachedFetch", () => () => ({
  data: [
    { id: 1, name: "Sucursal Managua" },
    { id: 2, name: "Sucursal León" },
    { id: 3, name: "Sucursal Estelí" },
    { id: 9, name: "Sucursal sin acceso" },
  ],
}));

const STATUS = {
  1: { pending_action: "OPEN", pending_date: "2026-10-23" },
  2: { pending_action: "CLOSE", pending_date: "2026-10-22" },
  3: { pending_action: "CLOSE", pending_date: "2026-10-22", is_backlog: true, days_behind: 1 },
};

const renderPanel = () =>
  render(
    <UserContext.Provider value={{ userBranches: [1, 2, 3] }}>
      <BusinessDayAllBranches />
    </UserContext.Provider>,
  );

describe("Día operativo de varias sucursales", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    API.get.mockImplementation((url) => Promise.resolve({ data: STATUS[url.split("/").pop()] }));
  });

  test("solo procesa las sucursales marcadas que tienen ese paso pendiente", async () => {
    API.post.mockResolvedValue({ data: { day_closed: true, loans_processed: 55 } });
    renderPanel();

    expect(await screen.findByText("Sucursal León")).toBeTruthy();
    expect(screen.queryByText("Sucursal sin acceso")).toBeNull();
    expect(await screen.findByRole("button", { name: /Cerrar \(2\)/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Aperturar \(1\)/ })).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Sucursal Estelí")); // desmarcar
    fireEvent.click(screen.getByRole("button", { name: /Cerrar \(1\)/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Sucursal León — 22\/10\/2026/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(API.post).toHaveBeenCalledTimes(1));
    expect(API.post).toHaveBeenCalledWith("/api/loans/balances", { branch_id: 2, balance_type: "FINAL", balance_date: "2026-10-22" });
    expect((await screen.findByTestId("resultado-2")).textContent).toContain("22/10/2026 cerrado · 55 crédito(s)");
  });

  test("si una sucursal falla, sigue con las demás y reporta cada resultado", async () => {
    API.post
      .mockRejectedValueOnce({ response: { data: { error: "Asiento de cierre descuadrado" } } })
      .mockResolvedValueOnce({ data: { day_closed: true, loans_processed: 76 } });
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /Cerrar \(2\)/ }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(API.post).toHaveBeenCalledTimes(2));
    expect(API.post.mock.calls.map((c) => c[1].branch_id)).toEqual([2, 3]);
    expect((await screen.findByTestId("resultado-2")).textContent).toContain("Asiento de cierre descuadrado");
    expect((await screen.findByTestId("resultado-3")).textContent).toContain("cerrado · 76 crédito(s)");
    expect(screen.getByText(/1 sucursal\(es\) procesada\(s\) correctamente · 1 con error/)).toBeTruthy();
  });
});
