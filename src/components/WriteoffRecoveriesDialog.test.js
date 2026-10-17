import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import WriteoffRecoveriesDialog from "./WriteoffRecoveriesDialog";
import { UserContext } from "../contexts/UserContext";
import API from "../api";

jest.mock("../api", () => ({ get: jest.fn(), post: jest.fn() }));

const LOAN = { id: 460, credit_code: "460", customer_name: "Cliente Saneado" };
const SUMMARY = {
  loan_id: 460, credit_code: "460", writeoff_date: "2026-08-11",
  writeoff_original_amount: 47056.16, total_recovered: 1500, principal_recovered: 1500, principal_pending: 45556.16,
};
const HISTORY = [
  {
    id: 7, recovery_date: "2026-10-16", amount: "1500.00", status: "ACTIVE", forma_pago_name: "Efectivo",
    collector_name: null, entry_no: "CJ-00009428", memo_entry_no: "CJ-00009429", memo_muc_code: "8204.02.18",
    created_by_name: "Super Administrador",
  },
];

const mockGets = () => {
  API.get.mockImplementation((url) => {
    if (url.startsWith("/api/writeoff-recoveries/summary/")) return Promise.resolve({ data: { ok: true, data: SUMMARY } });
    if (url === "/api/writeoff-recoveries") return Promise.resolve({ data: { ok: true, data: HISTORY } });
    if (url === "/api/payments/formas-pago") {
      return Promise.resolve({ data: { ok: true, data: [{ id: 1, name: "Efectivo", is_default: 1 }, { id: 3, name: "Transferencia", is_default: 0 }] } });
    }
    if (url === "/api/collectors") return Promise.resolve({ data: [{ id: 31, name: "Cobrador 1", active: 1 }, { id: 9, name: "Inactivo", active: 0 }] });
    return Promise.resolve({ data: {} });
  });
};

const setup = (ctx = { role: 1, permissions: [] }, props = {}) =>
  render(
    <UserContext.Provider value={ctx}>
      <WriteoffRecoveriesDialog open loan={LOAN} onClose={() => {}} onChanged={props.onChanged} startWithForm={props.startWithForm} />
    </UserContext.Provider>,
  );

describe("WriteoffRecoveriesDialog (recuperación de cartera saneada)", () => {
  beforeEach(() => {
    API.get.mockReset();
    API.post.mockReset();
    mockGets();
  });

  test("muestra el resumen y el historial del crédito", async () => {
    setup();
    expect(await screen.findByText("CJ-00009428")).toBeTruthy();
    expect(screen.getByText("C$ 47,056.16")).toBeTruthy();
    expect(screen.getByText("C$ 45,556.16")).toBeTruthy();
    expect(screen.getByText("Vigente")).toBeTruthy();
    expect(API.get).toHaveBeenCalledWith("/api/writeoff-recoveries", { params: { loan_id: 460 } });
  });

  test("registra una recuperación con su client_reference_id y recarga", async () => {
    const onChanged = jest.fn();
    API.post.mockResolvedValue({ data: { ok: true, data: { id: 8, amount: "250.00", entry_no: "CJ-00009500" } } });
    setup(undefined, { onChanged, startWithForm: true });
    await screen.findByText("CJ-00009428");
    fireEvent.change(screen.getByLabelText("Monto recuperado"), { target: { value: "250" } });
    fireEvent.change(screen.getByLabelText("Referencia (recibo, cheque, transferencia)"), { target: { value: "R-1" } });
    fireEvent.click(screen.getByText("Guardar recuperación"));
    await waitFor(() => expect(API.post).toHaveBeenCalled());
    const [url, body] = API.post.mock.calls[0];
    expect(url).toBe("/api/writeoff-recoveries");
    expect(body).toMatchObject({ loan_id: 460, amount: 250, id_forma_pago: 1, collector_id: null, document_reference: "R-1" });
    expect(body.client_reference_id).toMatch(/^web-/);
    expect(await screen.findByText(/Recuperación registrada por C\$ 250\.00 \(comprobante CJ-00009500\)/)).toBeTruthy();
    expect(onChanged).toHaveBeenCalled();
  });

  test("avisa cuando el monto excede el principal saneado pendiente", async () => {
    setup(undefined, { startWithForm: true });
    await screen.findByText("CJ-00009428");
    fireEvent.change(screen.getByLabelText("Monto recuperado"), { target: { value: "46000" } });
    expect(screen.getByText(/C\$ 443\.84 excede el principal saneado pendiente/)).toBeTruthy();
  });

  test("anula con motivo", async () => {
    API.post.mockResolvedValue({ data: { ok: true } });
    setup();
    await screen.findByText("CJ-00009428");
    fireEvent.click(screen.getByText("Anular"));
    const confirm = screen.getByText("Confirmar anulación");
    expect(confirm.closest("button").disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Motivo de la anulación"), { target: { value: "Cheque sin fondos" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(API.post).toHaveBeenCalledWith("/api/writeoff-recoveries/7/void", { reason: "Cheque sin fondos" }));
    expect(await screen.findByText("Recuperación de C$ 1,500.00 anulada.")).toBeTruthy();
  });

  test("sin permisos no muestra registrar ni anular", async () => {
    setup({ role: 4, permissions: ["creditos.ver"] });
    const row = (await screen.findByText("CJ-00009428")).closest("tr");
    expect(within(row).queryByText("Anular")).toBeNull();
    expect(screen.queryByText("Registrar recuperación")).toBeNull();
  });
});
