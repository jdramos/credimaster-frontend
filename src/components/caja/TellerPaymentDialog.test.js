import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TellerPaymentDialog, { computeTender, suggestedAmounts } from "./TellerPaymentDialog";
import { buildTellerReceiptHtml } from "../../reports/tellerReceiptReport";
import API from "../../api";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ tenant: { name: "DEMO" } }) }));
jest.mock("../../reports/reportViewer", () => ({ openReport: jest.fn() }));
// El selector de clientes y la ficha del crédito tienen sus propias pruebas.
jest.mock("../Customer/CustomerSelect", () => (props) => (
  <button type="button" onClick={() => props.onChange({ target: { value: 64, customer_name: "María López" } })}>Elegir cliente</button>
));
jest.mock("../LoanInfo", () => () => null);

const SESSION = { id: 21, register_name: "Caja Ventanilla 1", user_name: "Cajero DEMO" };
const RATES = { USD: { currency_code: "USD", buy_rate: 36.4, sell_rate: 36.8 }, EUR: { currency_code: "EUR", buy_rate: 39, sell_rate: 40 } };
const CURRENCIES = [
  { code: "USD", name: "Dólar estadounidense", symbol: "US$", denominations: [100, 20], is_active: true },
  { code: "EUR", name: "Euro", symbol: "€", denominations: [50, 20], is_active: true },
];
const LOAN = { id: 717, credit_code: "LEO-717", approved_amount: 15000, branch_id: 2, branch_name: "Sucursal León", customer_name: "María López" };

const field = (label) => screen.getByLabelText(label);
const type = (label, value) => fireEvent.change(field(label), { target: { value } });

const renderDialog = (props = {}) => {
  API.get.mockResolvedValue({ data: [LOAN] });
  return render(<TellerPaymentDialog open session={SESSION} currencies={CURRENCIES} rates={RATES} onClose={jest.fn()} {...props} />);
};

describe("Cálculo del recibo de ventanilla", () => {
  it("dólares al TC de compra, vuelto en dólares al TC de venta y el resto en córdobas", () => {
    expect(computeTender({ amount: 700, tenderedNio: "", tenderedFx: 20, changeFx: "", buyRate: 36.4, sellRate: 36.8 }))
      .toEqual({ received: 728, change: 28, changeFxValue: 0, changeNio: 28 });
    expect(computeTender({ amount: 700, tenderedNio: 1000, tenderedFx: 20, changeFx: 25, buyRate: 36.4, sellRate: 36.8 }))
      .toEqual({ received: 1728, change: 1028, changeFxValue: 920, changeNio: 108 });
  });
});

describe("Recibir pago en ventanilla", () => {
  beforeEach(() => jest.clearAllMocks());

  it("cobra un crédito de otra sucursal con dólares y muestra el vuelto a entregar", async () => {
    API.post.mockResolvedValue({ data: {
      payment_id: 9001,
      applied: { interest: 300, principal: 400 },
      tender: { payment_amount: 700, tendered_nio: 0, currency_code: "USD", currency_symbol: "US$", tendered_fx: 20, buy_rate: 36.4, received_total: 728, change_nio: 28, change_fx: 0 },
    } });
    renderDialog();

    fireEvent.click(screen.getByText("Elegir cliente"));
    await waitFor(() => expect(API.get).toHaveBeenCalledWith("/api/loans/customer/64", { params: { cash_session: 1 } }));
    // Un solo crédito: queda elegido.
    expect(await screen.findByText(/LEO-717 · C\$ 15,000.00 · Sucursal León/)).toBeTruthy();

    type("Monto a aplicar al crédito", "700");
    type("Efectivo en divisa", "20");
    expect(screen.getByText(/TC de compra 36.4000 = C\$ 728.00/)).toBeTruthy();
    expect(screen.getByTestId("received-total").textContent).toContain("C$ 728.00");
    expect(screen.getByTestId("change-total").textContent).toContain("C$ 28.00");

    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    await waitFor(() => expect(API.post).toHaveBeenCalledTimes(1));
    const params = API.post.mock.calls[0][1].params;
    expect(params).toMatchObject({
      loan_id: 717,
      branch_id: 2,
      payment_amount: 700,
      payment_method_id: 1,
      tender: { tendered_nio: 0, currency_code: "USD", tendered_fx: 20, change_fx: 0 },
    });
    expect(params.client_reference_id).toMatch(/^web-/);
    expect((await screen.findByTestId("change-to-give")).textContent).toContain("C$ 28.00");
  });

  it("parte del vuelto en dólares al TC de venta", async () => {
    renderDialog();
    fireEvent.click(screen.getByText("Elegir cliente"));
    await screen.findByText(/LEO-717/);
    type("Monto a aplicar al crédito", "700");
    type("Efectivo en córdobas", "1000");
    type("Efectivo en divisa", "20");
    type("Vuelto en USD (opcional)", "25");
    expect(screen.getByTestId("change-breakdown").textContent).toContain("Entregar C$ 108.00 + US$ 25.00");
  });

  it("no registra si lo entregado no alcanza", async () => {
    renderDialog();
    fireEvent.click(screen.getByText("Elegir cliente"));
    await screen.findByText(/LEO-717/);
    type("Monto a aplicar al crédito", "700");
    type("Efectivo en córdobas", "500");
    expect(screen.getByTestId("change-total").textContent).toContain("Faltan C$ 200.00");
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(await screen.findByText(/no alcanza para el pago/)).toBeTruthy();
    expect(API.post).not.toHaveBeenCalled();
  });

  it("sin TC de la institución no se reciben divisas", async () => {
    renderDialog({ rates: {} });
    expect(field("Efectivo en divisa").disabled).toBe(true);
    expect(screen.getByText(/Sin TC de compra del día/)).toBeTruthy();
  });

  it("paga con euros al TC de compra del euro", async () => {
    renderDialog();
    fireEvent.click(screen.getByText("Elegir cliente"));
    await screen.findByText(/LEO-717/);
    fireEvent.mouseDown(field("Divisa"));
    fireEvent.click(await screen.findByRole("option", { name: "EUR" }));
    type("Monto a aplicar al crédito", "700");
    type("Efectivo en divisa", "20");
    expect(screen.getByText(/TC de compra 39.0000 = C\$ 780.00/)).toBeTruthy();
    expect(screen.getByTestId("change-total").textContent).toContain("C$ 80.00");
  });
});

describe("Monto sugerido", () => {
  beforeEach(() => jest.clearAllMocks());

  const withProfile = (profile, loan = LOAN) => {
    API.get.mockImplementation((url) => {
      if (url === `/api/loans/${loan.id}/payment-profile`) return Promise.resolve({ data: { data: profile } });
      return Promise.resolve({ data: [loan] });
    });
    return render(<TellerPaymentDialog open session={SESSION} currencies={CURRENCIES} rates={RATES} onClose={jest.fn()} />);
  };

  it("cálculo: atraso = cuotas vencidas + moratorio; si no hay, la próxima cuota", () => {
    const profile = { delinquency: { overdue_amount: 2862.66 }, next_installment: { amount: 1431.33 } };
    expect(suggestedAmounts(profile, { defaulted_interest: "35.10" })).toEqual({ overdue: 2897.76, nextInstallment: 1431.33, suggested: 2897.76 });
    expect(suggestedAmounts({ delinquency: { overdue_amount: 0 }, next_installment: { amount: 1431.33 } }, {})).toEqual({ overdue: 0, nextInstallment: 1431.33, suggested: 1431.33 });
  });

  it("crédito al día: llena el monto con la próxima cuota", async () => {
    withProfile({ delinquency: { overdue_amount: 0 }, next_installment: { amount: 1431.33 } });
    fireEvent.click(screen.getByText("Elegir cliente"));
    await waitFor(() => expect(field("Monto a aplicar al crédito").value).toBe("1431.33"));
    expect(screen.getByText("Sugerido: la próxima cuota")).toBeTruthy();
    expect(screen.queryByText(/^Atrasado/)).toBeNull();
  });

  it("crédito atrasado: llena todo lo atrasado y deja cambiar a la próxima cuota", async () => {
    withProfile({ delinquency: { overdue_amount: 2862.66 }, next_installment: { amount: 1431.33 } }, { ...LOAN, defaulted_interest: "35.10" });
    fireEvent.click(screen.getByText("Elegir cliente"));
    await waitFor(() => expect(field("Monto a aplicar al crédito").value).toBe("2897.76"));
    expect(screen.getByText(/todo lo atrasado/)).toBeTruthy();
    fireEvent.click(screen.getByText("Próxima cuota C$ 1,431.33"));
    expect(field("Monto a aplicar al crédito").value).toBe("1431.33");
    fireEvent.click(screen.getByText("Atrasado C$ 2,897.76"));
    expect(field("Monto a aplicar al crédito").value).toBe("2897.76");
  });
});

describe("Recibo de caja", () => {
  it("muestra lo aplicado, lo entregado con TC y el vuelto", () => {
    const html = buildTellerReceiptHtml({
      session: SESSION,
      result: {
        payment_id: 9001,
        loan: LOAN,
        customer_name: "María <López>",
        applied: { interest: 300, principal: 400 },
        tender: { payment_amount: 700, tendered_nio: 1000, currency_code: "USD", currency_symbol: "US$", tendered_fx: 20, buy_rate: 36.4, received_total: 1728, change_nio: 108, change_fx: 25, sell_rate: 36.8 },
      },
    });
    expect(html).toContain("Recibo de Caja");
    expect(html).toContain("US$ 20.00 × 36.4000");
    expect(html).toContain("TC de venta 36.8000");
    expect(html).toContain("María &lt;López&gt;");
  });
});
