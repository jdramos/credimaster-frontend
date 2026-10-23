import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InstitutionRatesPage from "./InstitutionRatesPage";
import { UserContext } from "../../contexts/UserContext";
import API from "../../api";

jest.mock("../../api", () => ({ get: jest.fn(), put: jest.fn() }));

const CURRENCIES = [
  { code: "USD", name: "Dólar estadounidense", symbol: "US$", denominations: [100, 20], is_active: true },
  { code: "EUR", name: "Euro", symbol: "€", denominations: [50, 20], is_active: true },
];
const ROW = { rate_date: "2026-10-23", currency_code: "USD", buy_rate: 36.1, sell_rate: 37.1, uses: 2, updated_by_name: "Super Administrador" };

const renderPage = () => {
  API.get.mockResolvedValue({ data: { data: { rates: [ROW], currencies: CURRENCIES, official_today: 36.6243 } } });
  API.put.mockResolvedValue({ data: { data: { date_from: "2026-10-24", date_to: "2026-10-26", days: 3, replaced: 0 } } });
  return render(
    <UserContext.Provider value={{ permissions: ["caja.tc.gestionar"], role: 29 }}>
      <InstitutionRatesPage />
    </UserContext.Provider>,
  );
};

const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("Tipo de cambio de ventanilla", () => {
  beforeEach(() => jest.clearAllMocks());

  it("guarda el mismo TC para un rango de días", async () => {
    renderPage();
    expect(await screen.findByText("36.1000")).toBeTruthy();
    type("Desde", "2026-10-24");
    type("Hasta (opcional)", "2026-10-26");
    expect(screen.getByText("3 días")).toBeTruthy();
    type("Compra", "36.2");
    type("Venta", "37.2");
    fireEvent.click(screen.getByRole("button", { name: "Guardar TC" }));
    await waitFor(() => expect(API.put).toHaveBeenCalledWith("/api/caja/fx-rates/2026-10-24/USD", {
      buy_rate: 36.2, sell_rate: 37.2, notes: undefined, date_to: "2026-10-26",
    }));
    expect(await screen.findByText(/guardado del 2026-10-24 al 2026-10-26 \(3 días/)).toBeTruthy();
  });

  it("no deja un rango al revés", async () => {
    renderPage();
    await screen.findByText("36.1000");
    type("Desde", "2026-10-26");
    type("Hasta (opcional)", "2026-10-24");
    type("Compra", "36.2");
    fireEvent.click(screen.getByRole("button", { name: "Guardar TC" }));
    expect(await screen.findByText(/no puede ser anterior/)).toBeTruthy();
    expect(API.put).not.toHaveBeenCalled();
  });

  it("edita un registro y avisa que las operaciones ya hechas conservan su TC", async () => {
    API.put.mockResolvedValueOnce({ data: { data: { days: 1 } } });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Editar TC USD 2026-10-23" }));
    expect(screen.getByTestId("editing-notice").textContent).toContain("2 operación(es) de ventanilla con el TC anterior");
    expect(screen.getByLabelText("Fecha").disabled).toBe(true);
    expect(screen.queryByLabelText("Hasta (opcional)")).toBeNull();
    expect(screen.getByLabelText("Compra").value).toBe("36.1");
    type("Compra", "36.15");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(API.put).toHaveBeenCalledWith("/api/caja/fx-rates/2026-10-23/USD", {
      buy_rate: 36.15, sell_rate: 37.1, notes: undefined, date_to: undefined,
    }));
    expect(await screen.findByText(/del 2026-10-23 corregido/)).toBeTruthy();
  });
});
