import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyCashSession from "./MyCashSession";
import RegisterCashiersDialog from "./RegisterCashiersDialog";
import CloseCashSessionDialog from "./CloseCashSessionDialog";
import { countTotals, toPayload } from "./DenominationCounter";
import { buildCashSessionReportHtml } from "../../reports/cashSessionReport";
import { UserContext } from "../../contexts/UserContext";
import API from "../../api";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ tenant: { name: "DEMO" } }) }));
jest.mock("../../reports/reportViewer", () => ({ openReport: jest.fn() }));
// El formulario de ventanilla tiene sus propias pruebas
// (TellerPaymentDialog.test.js); aquí basta saber que Mi caja lo abre.
jest.mock("./TellerPaymentDialog", () => (props) => (props.open ? <div>Recepción de pago en {props.session?.register_name}</div> : null));

const REGISTER = {
  id: 4, name: "Caja Ventanilla 1", branch_id: 3, branch_name: "Sucursal León", currency_symbol: "C$",
  gl_account_id: 5, account_code: "1101.02", account_name: "CAJA OFICINAS",
};

const USD = { code: "USD", name: "Dólar estadounidense", symbol: "US$", denominations: [100, 50, 20, 10, 5, 1], is_active: true };
const EUR = { code: "EUR", name: "Euro", symbol: "€", denominations: [100, 50, 20, 10, 5], is_active: true };

const OPEN_SESSION = {
  id: 21, status: "ABIERTA", cash_register_id: 4, register_name: "Caja Ventanilla 1", branch_name: "Sucursal León",
  business_date: "2026-10-23", opened_at: "2026-10-23 08:01:00", user_id: 9, user_name: "Cajero DEMO", opening_amount: 5000,
  totals: {
    opening_amount: 5000, payments_total: 1250, payments_count: 2, ingresos_total: 0, ingresos_count: 0,
    egresos_total: 0, egresos_count: 0, disbursements_total: 0, disbursements_count: 0, arqueos_total: 0,
    arqueos_count: 0, voids_out_total: 0, voids_in_total: 0, expected_amount: 6250,
  },
  payments: [
    { id: 501, loan_id: 70, credit_code: "LEO-70", customer_name: "María López", amount: 1000, payment_status: "A", created_at: "2026-10-23 09:15:00" },
    { id: 502, loan_id: 71, credit_code: "LEO-71", customer_name: "José Pérez", amount: 250, payment_status: "A", created_at: "2026-10-23 09:40:00" },
  ],
  movements: [],
  arqueos: [],
};

const renderPage = (permissions = ["caja.turnos.operar", "caja.movimientos.registrar", "pagos.insertar"]) =>
  render(
    <MemoryRouter>
      <UserContext.Provider value={{ permissions, role: 4 }}>
        <MyCashSession />
      </UserContext.Provider>
    </MemoryRouter>,
  );

const qty = (labelText, value) => fireEvent.change(screen.getByLabelText(`Cantidad ${labelText}`), { target: { value } });

describe("Conteo por denominación", () => {
  it("suma córdobas y cada divisa a su tasa y arma el payload sin ceros", () => {
    const count = { NIO: { 1000: 2, 0.5: 3, 100: "" }, USD: { 20: 2 }, EUR: { 50: 1 } };
    expect(countTotals(count, { USD: 36.6243, EUR: 39 })).toEqual({
      nio: 2001.5, fx: { USD: 40, EUR: 50 }, fxValue: 3414.97, total: 5416.47, missingRate: false, missingCodes: [],
    });
    expect(countTotals({ EUR: { 5: 1 } }, { USD: 36 })).toMatchObject({ missingRate: true, missingCodes: ["EUR"] });
    expect(toPayload(count)).toEqual({ NIO: { 1000: 2, 0.5: 3 }, USD: { 20: 2 }, EUR: { 50: 1 } });
  });
});

describe("Mi caja", () => {
  beforeEach(() => jest.clearAllMocks());

  it("abre la caja con el fondo contado por denominación", async () => {
    API.get.mockImplementation((url) => {
      if (url === "/api/caja/sessions/mine") {
        return Promise.resolve({ data: { data: { enabled: true, session: null, registers: [REGISTER], currencies: [USD, EUR], policies: { require_for_payment: true } } } });
      }
      if (url === "/api/caja/sessions/opening-preview") {
        return Promise.resolve({ data: { data: {
          carry_over: null, institution_rates: { USD: { currency_code: "USD", buy_rate: 36.62, sell_rate: 36.9 } }, business_date: "2026-10-23", day_ready: true,
        } } });
      }
      if (url === "/api/caja/registers") return Promise.resolve({ data: { data: [REGISTER, { id: 1, name: "Bóveda Central" }] } });
      return Promise.resolve({ data: { data: [] } });
    });
    API.post.mockResolvedValue({ data: { ok: true } });

    renderPage();
    expect(await screen.findByText(/Para cobrar en efectivo en oficina debe tener su caja abierta/)).toBeTruthy();

    // Única caja disponible: queda preseleccionada.
    expect(await screen.findByText(/Primera apertura de esta caja/)).toBeTruthy();

    qty("C$1,000", "5");
    qty("US$20", "1");
    expect(screen.getByTestId("counted-total").textContent).toContain("C$ 5,000.00 + US$ 20.00 (equivale a C$ 5,732.40)");

    fireEvent.click(screen.getByRole("button", { name: "Abrir caja" }));
    await waitFor(() => expect(API.post).toHaveBeenCalledTimes(1));
    expect(API.post).toHaveBeenCalledWith("/api/caja/sessions", expect.objectContaining({
      cash_register_id: 4,
      denominations: { NIO: { 1000: 5 }, USD: { 20: 1 } },
      fund_source_cash_register_id: null,
      fund_amount: 0,
    }));
  });

  it("no abre si el fondo no coincide con lo que quedó en la caja hasta confirmar la diferencia", async () => {
    API.get.mockImplementation((url) => {
      if (url === "/api/caja/sessions/mine") {
        return Promise.resolve({ data: { data: { enabled: true, session: null, registers: [REGISTER], policies: {} } } });
      }
      if (url === "/api/caja/sessions/opening-preview") {
        return Promise.resolve({ data: { data: {
          carry_over: { last_session_id: 20, carry_over: 3000, out_of_shift_net: 0 }, exchange_rate: null, day_ready: true,
        } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();
    expect(await screen.findByText(/Quedó en la caja al cierre del turno #20/)).toBeTruthy();

    qty("C$1,000", "2");
    qty("C$500", "1");
    qty("C$100", "4");
    expect(screen.getByTestId("opening-difference").textContent).toContain("Faltante de C$ 100.00");

    fireEvent.click(screen.getByRole("button", { name: "Abrir caja" }));
    expect(await screen.findByText(/Revise el conteo o confirme la diferencia/)).toBeTruthy();
    expect(API.post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Confirmo la diferencia"));
    fireEvent.change(screen.getByLabelText("Nota de apertura"), { target: { value: "Faltó un billete de 100 del cierre anterior" } });
    API.post.mockResolvedValue({ data: { ok: true } });
    fireEvent.click(screen.getByRole("button", { name: "Abrir caja" }));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith("/api/caja/sessions", expect.objectContaining({
      accept_opening_difference: true,
      notes: "Faltó un billete de 100 del cierre anterior",
    })));
  });

  it("muestra la caja abierta con lo cobrado y el esperado", async () => {
    API.get.mockImplementation((url) => {
      if (url === "/api/caja/sessions/mine") return Promise.resolve({ data: { data: { enabled: true, session: OPEN_SESSION, registers: [] } } });
      return Promise.resolve({ data: { data: [] } });
    });
    renderPage();
    expect(await screen.findByText("Caja Ventanilla 1")).toBeTruthy();
    expect(screen.getByText("María López")).toBeTruthy();
    expect(screen.getByText("Esperado en córdobas").nextSibling.textContent).toContain("C$ 6,250.00");
    expect(screen.getByRole("button", { name: "Cerrar caja" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Recibir pago" }));
    expect(screen.getByText("Recepción de pago en Caja Ventanilla 1")).toBeTruthy();
  });

  it("sin permiso de registrar pagos no muestra Cobrar", async () => {
    API.get.mockImplementation((url) => {
      if (url === "/api/caja/sessions/mine") return Promise.resolve({ data: { data: { enabled: true, session: OPEN_SESSION, registers: [] } } });
      return Promise.resolve({ data: { data: [] } });
    });
    renderPage(["caja.turnos.operar"]);
    expect(await screen.findByText("Caja Ventanilla 1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Recibir pago" })).toBeNull();
  });

  it("preselecciona la caja asignada al cajero entre varias", async () => {
    const other = { ...REGISTER, id: 6, name: "Caja Ventanilla 2" };
    const mine = { ...REGISTER, id: 7, name: "Caja Ventanilla 3", assigned_to_me: true };
    API.get.mockImplementation((url, opts) => {
      if (url === "/api/caja/sessions/mine") {
        return Promise.resolve({ data: { data: { enabled: true, session: null, registers: [mine, other], policies: {} } } });
      }
      if (url === "/api/caja/sessions/opening-preview") {
        return Promise.resolve({ data: { data: { carry_over: null, exchange_rate: null, day_ready: true, register: opts?.params?.cash_register_id } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
    renderPage();
    expect(await screen.findByText(/Caja Ventanilla 3 — Sucursal León \(1101\.02\) · asignada a usted/)).toBeTruthy();
    await waitFor(() => expect(API.get).toHaveBeenCalledWith("/api/caja/sessions/opening-preview", { params: { cash_register_id: 7 } }));
  });

  it("avisa si los turnos no están habilitados para la empresa", async () => {
    API.get.mockResolvedValue({ data: { data: { enabled: false } } });
    renderPage();
    expect(await screen.findByText(/no están habilitados/)).toBeTruthy();
  });
});

describe("Cierre de caja", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get.mockImplementation((url) => {
      if (url === "/api/caja/sessions/opening-preview") return Promise.resolve({ data: { data: { exchange_rate: 36.62 } } });
      if (url === "/api/caja/registers") return Promise.resolve({ data: { data: [{ id: 1, name: "Bóveda Central" }, { id: 4, name: "Caja Ventanilla 1" }] } });
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it("exige nota cuando hay faltante y manda el conteo con el traslado a bóveda", async () => {
    const onClosed = jest.fn();
    API.post.mockResolvedValue({ data: { data: { id: 21, status: "CERRADA", difference: -50 } } });
    render(<CloseCashSessionDialog open session={OPEN_SESSION} currencies={[USD]} onClose={jest.fn()} onClosed={onClosed} />);

    qty("C$1,000", "6");
    qty("C$200", "1");
    expect(screen.getByTestId("close-difference").textContent).toContain("faltante de C$ 50.00");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar caja" }));
    expect(await screen.findByText(/explique la diferencia en la nota/)).toBeTruthy();
    expect(API.post).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Nota del cierre/), { target: { value: "Vuelto mal entregado" } });
    fireEvent.mouseDown(screen.getByLabelText("Trasladar a"));
    fireEvent.click(await screen.findByText("Bóveda / otra caja"));
    fireEvent.mouseDown(await screen.findByLabelText("Caja de destino"));
    fireEvent.click(await screen.findByText("Bóveda Central"));
    expect(screen.queryByText("Caja Ventanilla 1")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar caja" }));
    await waitFor(() => expect(onClosed).toHaveBeenCalled());
    expect(API.post).toHaveBeenCalledWith("/api/caja/sessions/21/close", {
      denominations: { NIO: { 1000: 6, 200: 1 } },
      notes: "Vuelto mal entregado",
      transfer: { type: "BOVEDA", cash_register_id: 1, amount_nio: 6200, amounts_fx: {} },
    });
  });
});

describe("Comprobante de cierre", () => {
  it("incluye el arqueo, el conteo y escapa las notas", () => {
    const html = buildCashSessionReportHtml({
      session: {
        ...OPEN_SESSION,
        status: "CERRADA",
        expected_amount: 6250,
        counted_amount: 6200,
        difference: -50,
        closing_entry_no: "CJ-00000999",
        closing_denominations: { NIO: { 1000: 6, 200: 1 } },
        closing_notes: "<b>vuelto</b>",
        transfer_type: "BOVEDA",
        transfer_amount: 6200,
        transfer_register_name: "Bóveda Central",
      },
    });
    expect(html).toContain("Comprobante de Cierre de Caja");
    expect(html).toContain("Faltante");
    expect(html).toContain("CJ-00000999");
    expect(html).toContain("Bóveda Central");
    expect(html).toContain("&lt;b&gt;vuelto&lt;/b&gt;");
    expect(html).not.toContain("<b>vuelto</b>");
  });
});

describe("Cajeros asignados a una caja", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra los cajeros elegibles, marca los asignados y guarda la selección", async () => {
    API.get.mockResolvedValue({ data: { data: {
      register: { id: 4, name: "Caja Ventanilla 1", branch_id: 3 },
      assigned: [{ id: 9, name: "Cajero DEMO" }],
      candidates: [
        { id: 9, name: "Cajero DEMO", user_name: "cajero1", role_name: "Cajero" },
        { id: 12, name: "Ana Ruiz", user_name: "aruiz", role_name: "Cajero" },
      ],
    } } });
    API.put.mockResolvedValue({ data: { data: { assigned: [{ id: 9, name: "Cajero DEMO" }, { id: 12, name: "Ana Ruiz" }] } } });
    const onSaved = jest.fn();
    render(<RegisterCashiersDialog open register={{ id: 4, name: "Caja Ventanilla 1", branch_id: 3 }} onClose={jest.fn()} onSaved={onSaved} />);

    const cajero = await screen.findByLabelText("Cajero DEMO (cajero1) — Cajero");
    expect(cajero.checked).toBe(true);
    const ana = screen.getByLabelText("Ana Ruiz (aruiz) — Cajero");
    expect(ana.checked).toBe(false);

    fireEvent.click(ana);
    fireEvent.click(screen.getByRole("button", { name: "Asignar 2 cajero(s)" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(API.put).toHaveBeenCalledWith("/api/caja/registers/4/cashiers", { user_ids: [9, 12] });
  });

  it("sin cajeros marcados deja la caja libre", async () => {
    API.get.mockResolvedValue({ data: { data: { assigned: [{ id: 9, name: "Cajero DEMO" }], candidates: [{ id: 9, name: "Cajero DEMO", user_name: "cajero1", role_name: "Cajero" }] } } });
    API.put.mockResolvedValue({ data: { data: { assigned: [] } } });
    render(<RegisterCashiersDialog open register={{ id: 4, name: "Caja Ventanilla 1", branch_id: 3 }} onClose={jest.fn()} onSaved={jest.fn()} />);
    fireEvent.click(await screen.findByLabelText("Cajero DEMO (cajero1) — Cajero"));
    fireEvent.click(screen.getByRole("button", { name: "Dejar libre" }));
    await waitFor(() => expect(API.put).toHaveBeenCalledWith("/api/caja/registers/4/cashiers", { user_ids: [] }));
  });
});
