import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FxOperationDialog from "./FxOperationDialog";
import { buildFxOperationReceiptHtml } from "../../reports/fxOperationReceiptReport";
import API from "../../api";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ tenant: { name: "DEMO" } }) }));
jest.mock("../../reports/reportViewer", () => ({ openReport: jest.fn() }));
jest.mock("../Customer/CustomerSelect", () => (props) => (
  <button type="button" onClick={() => props.onChange({ target: { value: 64 } })}>Elegir cliente</button>
));

const CURRENCIES = [
  { code: "USD", name: "Dólar estadounidense", symbol: "US$", denominations: [100, 20], is_active: true },
  { code: "EUR", name: "Euro", symbol: "€", denominations: [50, 20], is_active: true },
];
const RATES = { USD: { buy_rate: 36.4, sell_rate: 36.8 }, EUR: { buy_rate: 39, sell_rate: 40 } };
const SESSION = { id: 21, register_name: "Caja Ventanilla 1", user_name: "Cajero DEMO", totals: { currencies: { EUR: { expected_qty: 150 } } } };

const field = (label) => screen.getByLabelText(label);
const type = (label, value) => fireEvent.change(field(label), { target: { value } });

const renderDialog = () =>
  render(<FxOperationDialog open session={SESSION} currencies={CURRENCIES} rates={RATES} onClose={jest.fn()} />);

describe("Compra / venta de divisas", () => {
  beforeEach(() => jest.clearAllMocks());

  it("compra dólares a una persona identificada y muestra lo que se le entrega", async () => {
    API.post.mockResolvedValue({ data: { data: {
      id: 31, operation_type: "COMPRA", currency_code: "USD", currency_symbol: "US$", fx_amount: 100, rate: 36.4, nio_amount: 3640,
      person_name: "Juan Pérez", person_identification: "001-010180-0001A",
    } } });
    renderDialog();
    type("Monto en USD", "100");
    expect(screen.getByTestId("fx-equivalent").textContent).toContain("recibe C$ 3,640.00");

    fireEvent.click(screen.getByRole("button", { name: "Registrar compra" }));
    expect(await screen.findByText(/Identifique a la persona/)).toBeTruthy();
    expect(API.post).not.toHaveBeenCalled();

    type("Nombre completo", "Juan Pérez");
    type("Identificación", "001-010180-0001A");
    fireEvent.click(screen.getByRole("button", { name: "Registrar compra" }));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith("/api/caja/sessions/21/fx-operations", {
      operation_type: "COMPRA",
      currency_code: "USD",
      fx_amount: 100,
      customer_id: undefined,
      person_name: "Juan Pérez",
      person_identification: "001-010180-0001A",
    }));
    expect((await screen.findByTestId("fx-result")).textContent).toContain("C$ 3,640.00");
  });

  it("vende euros a un cliente registrado al TC de venta", async () => {
    API.post.mockResolvedValue({ data: { data: { id: 32, operation_type: "VENTA", currency_code: "EUR", currency_symbol: "€", fx_amount: 50, rate: 40, nio_amount: 2000 } } });
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Vender divisas/ }));
    fireEvent.mouseDown(field("Moneda"));
    fireEvent.click(await screen.findByRole("option", { name: "EUR — Euro" }));
    type("Monto en EUR", "50");
    expect(screen.getByText(/TC de venta 40.0000 · en caja: € 150.00/)).toBeTruthy();
    expect(screen.getByTestId("fx-equivalent").textContent).toContain("paga C$ 2,000.00");
    fireEvent.click(screen.getByRole("button", { name: "Cliente registrado" }));
    fireEvent.click(screen.getByText("Elegir cliente"));
    fireEvent.click(screen.getByRole("button", { name: "Registrar venta" }));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith("/api/caja/sessions/21/fx-operations", expect.objectContaining({
      operation_type: "VENTA", currency_code: "EUR", fx_amount: 50, customer_id: 64,
    })));
  });

  it("muestra el rechazo del tamizaje de listas", async () => {
    API.post.mockRejectedValue({ response: { data: { message: '"Juan Pérez" coincide con listas de riesgo (OFAC SDN).' } } });
    renderDialog();
    type("Monto en USD", "100");
    type("Nombre completo", "Juan Pérez");
    type("Identificación", "X1");
    fireEvent.click(screen.getByRole("button", { name: "Registrar compra" }));
    expect(await screen.findByText(/coincide con listas de riesgo/)).toBeTruthy();
  });

  it("comprobante con lo que recibe y entrega la institución", () => {
    const html = buildFxOperationReceiptHtml({
      session: SESSION,
      operation: { id: 32, operation_type: "VENTA", currency_code: "EUR", currency_name: "Euro", currency_symbol: "€", fx_amount: 50, rate: 40, nio_amount: 2000, person_name: "Ana <Ruiz>", person_identification: "X" },
    });
    expect(html).toContain("Comprobante de Venta de Divisas");
    expect(html).toContain("C$ 2,000.00");
    expect(html).toContain("€ 50.00");
    expect(html).toContain("Ana &lt;Ruiz&gt;");
  });
});
