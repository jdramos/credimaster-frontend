import React, { useState } from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import API from "../../api";
import AliadosAdminPage, { buildSettlementReceipt } from "./AliadosAdminPage";
import TenantAliadoFields from "./TenantAliadoFields";
import {
  assignmentAction,
  assignmentFormFromCurrent,
  assignmentPayload,
  describeRule,
  effectiveRule,
  emptyAssignmentForm,
  totalsByCurrency,
} from "./aliados";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

const ALIADOS = [
  {
    id: 1, name: "Ana Aliada", id_number: "001-1", phone: "8888", email: "ana@example.com", payment_method: "TRANSFERENCIA",
    bank_name: "BAC", bank_account: "123", commission_type: "PERCENT", commission_value: "10.0000",
    impl_commission_type: "FIXED", impl_commission_value: "500.0000", status: "ACTIVE", active_tenants: 2,
    pending_by_currency: [{ currency: "USD", amount: 80 }],
  },
  {
    id: 2, name: "Beto Inactivo", payment_method: "EFECTIVO", commission_type: "FIXED", commission_value: "50.0000",
    status: "INACTIVE", active_tenants: 0, pending_by_currency: [],
  },
];

const COMMISSIONS = [
  { id: 11, aliado_id: 1, aliado_name: "Ana Aliada", tenant_id: 4, tenant_code: "T4", legal_name: "Empresa Cuatro", concept: "MENSUALIDAD", payment_date: "2026-10-05", payment_amount: "600.00", currency: "USD", commission_type: "PERCENT", commission_value: "10.0000", units: "1.0000", amount: "60.00", status: "PENDIENTE" },
  { id: 12, aliado_id: 1, aliado_name: "Ana Aliada", tenant_id: 4, tenant_code: "T4", legal_name: "Empresa Cuatro", concept: "IMPLEMENTACION", payment_date: "2026-10-06", payment_amount: "200.00", currency: "USD", commission_type: "PERCENT", commission_value: "10.0000", units: null, amount: "20.00", status: "PENDIENTE" },
  { id: 13, aliado_id: 1, aliado_name: "Ana Aliada", tenant_id: 4, tenant_code: "T4", legal_name: "Empresa Cuatro", concept: "MENSUALIDAD", payment_date: "2026-09-05", payment_amount: "600.00", currency: "USD", commission_type: "PERCENT", commission_value: "10.0000", units: "1.0000", amount: "60.00", status: "PAGADA", settlement_number: "LIQ-000001" },
];

const mockApi = () => {
  API.get.mockImplementation((url) => {
    if (url === "/api/superadmin/aliados") return Promise.resolve({ data: { ok: true, data: ALIADOS } });
    if (url === "/api/superadmin/tenants") return Promise.resolve({ data: { ok: true, data: [{ id: 4, tenant_code: "T4", legal_name: "Empresa Cuatro" }] } });
    if (url === "/api/superadmin/aliados/commissions") return Promise.resolve({ data: { ok: true, data: COMMISSIONS } });
    return Promise.resolve({ data: { ok: true, data: [] } });
  });
  API.post.mockResolvedValue({ data: { ok: true, message: "ok" } });
  API.put.mockResolvedValue({ data: { ok: true } });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockApi();
});

const pickOption = async (label, option) => {
  fireEvent.mouseDown(screen.getByLabelText(label));
  const listbox = await screen.findByRole("listbox");
  fireEvent.click(within(listbox).getByText(option));
};

describe("Aliados: helpers", () => {
  it("describe la regla", () => {
    expect(describeRule("PERCENT", "10.0000")).toBe("10 %");
    expect(describeRule("FIXED", "50")).toBe("50.00 fijo");
    expect(describeRule(null, null)).toBe("—");
  });

  it("la comisión propia de la empresa gana sobre la del aliado", () => {
    const row = { commission_type: null, commission_value: null, aliado_commission_type: "PERCENT", aliado_commission_value: "10", impl_commission_type: "FIXED", impl_commission_value: "300", aliado_impl_commission_type: null };
    expect(effectiveRule(row)).toEqual({ text: "10 %", own: false });
    expect(effectiveRule(row, "impl")).toEqual({ text: "300.00 fijo", own: true });
  });

  it("decide qué hacer con el aliado al guardar la empresa", () => {
    const current = assignmentFormFromCurrent({ aliado_id: 1, start_date: "2026-10-01T06:00:00.000Z", max_months: null, commission_value: "10.0000", commission_type: "PERCENT" });
    expect(current.start_date).toBe("2026-10-01");
    expect(current.commission_value).toBe("10");
    expect(assignmentAction(current, current)).toBe("none");
    expect(assignmentAction({ ...current, max_months: "12" }, current)).toBe("assign");
    expect(assignmentAction({ ...current, aliado_id: "" }, current)).toBe("end");
    const none = { ...emptyAssignmentForm(), start_date: "" };
    expect(assignmentAction(emptyAssignmentForm(), none)).toBe("none");
    expect(assignmentAction({ ...emptyAssignmentForm(), aliado_id: "2" }, none)).toBe("assign");
  });

  it("arma el payload sin valores sueltos", () => {
    expect(assignmentPayload({ ...emptyAssignmentForm(), aliado_id: "2", start_date: "2026-10-01", commission_value: "5", max_months: "" })).toEqual({
      aliado_id: 2, start_date: "2026-10-01", end_date: null, max_months: null, commission_type: null, commission_value: null,
      impl_commission_type: null, impl_commission_value: null, notes: null,
    });
  });

  it("suma por moneda", () => {
    expect(totalsByCurrency([{ currency: "USD", a: "1.10" }, { currency: "NIO", a: 5 }, { currency: "USD", a: 2.2 }], ["a"])).toEqual([
      { currency: "NIO", a: 5 },
      { currency: "USD", a: 3.3 },
    ]);
  });

  it("comprobante de liquidación con total", () => {
    const r = buildSettlementReceipt({ settlement_number: "LIQ-000002", aliado_name: "Ana", payment_method: "CHEQUE", reference: "CK-9", settlement_date: "2026-10-29", currency: "USD", total_amount: "80.00", items: [COMMISSIONS[0]] });
    expect(r.title).toBe("Comprobante de liquidación LIQ-000002");
    expect(r.subtitle).toContain("Cheque · Ref. CK-9");
    expect(r.totals[1]).toEqual({ value: "80.00", raw: "80.00", numeric: true });
  });
});

describe("Aliados: pantalla", () => {
  it("lista los aliados activos y crea uno nuevo", async () => {
    render(<AliadosAdminPage />);
    expect(await screen.findByText("Ana Aliada")).toBeTruthy();
    expect(screen.queryByText("Beto Inactivo")).toBeNull();
    expect(screen.getByText("10 %")).toBeTruthy();
    expect(screen.getByText("500.00 fijo")).toBeTruthy();

    fireEvent.click(screen.getByText("Nuevo aliado"));
    fireEvent.change(screen.getByLabelText(/Nombre o razón social/), { target: { value: "Carla" } });
    fireEvent.change(screen.getByLabelText(/Mensualidad: %/), { target: { value: "7.5" } });
    fireEvent.click(screen.getByText("Guardar"));
    await waitFor(() => expect(API.post).toHaveBeenCalled());
    const [url, body] = API.post.mock.calls[0];
    expect(url).toBe("/api/superadmin/aliados");
    expect(body).toMatchObject({ name: "Carla", commission_type: "PERCENT", commission_value: 7.5, impl_commission_type: null, impl_commission_value: null, status: "ACTIVE" });
  });

  it("liquida las comisiones pendientes seleccionadas de un aliado", async () => {
    render(<AliadosAdminPage />);
    await screen.findByText("Ana Aliada");
    fireEvent.click(screen.getByText("Comisiones"));
    await screen.findAllByText(/Empresa Cuatro/);

    const settleButton = () => screen.getByRole("button", { name: /Liquidar seleccionadas/ });
    expect(settleButton().disabled).toBe(true);
    const boxes = screen.getAllByRole("checkbox");
    // [todas, 11, 12, 13(pagada, deshabilitada)]
    expect(boxes[3].disabled).toBe(true);
    fireEvent.click(boxes[0]);
    expect(settleButton().disabled).toBe(false);

    fireEvent.click(settleButton());
    expect(await screen.findByText(/2 comisión\(es\) por USD 80.00/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Referencia/), { target: { value: "TRF-77" } });
    fireEvent.click(screen.getByText("Registrar pago al aliado"));
    await waitFor(() => expect(API.post).toHaveBeenCalled());
    const [url, body] = API.post.mock.calls[0];
    expect(url).toBe("/api/superadmin/aliados/settlements");
    expect(body).toMatchObject({ aliado_id: 1, commission_ids: [11, 12], reference: "TRF-77", payment_method: "TRANSFERENCIA" });
  });

  it("anular una comisión pide motivo", async () => {
    render(<AliadosAdminPage />);
    await screen.findByText("Ana Aliada");
    fireEvent.click(screen.getByText("Comisiones"));
    await screen.findAllByText(/Empresa Cuatro/);
    fireEvent.click(screen.getAllByLabelText("Anular comisión")[0]);
    fireEvent.click(await screen.findByText("Anular"));
    expect(API.post).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: "Pago duplicado" } });
    fireEvent.click(screen.getByText("Anular"));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith("/api/superadmin/aliados/commissions/11/void", { reason: "Pago duplicado" }));
  });
});

describe("Aliados: sección en el formulario de empresa", () => {
  function Harness({ onChange }) {
    const [value, setValue] = useState(emptyAssignmentForm());
    return <TenantAliadoFields value={value} aliados={ALIADOS} onChange={(v) => { setValue(v); onChange(v); }} />;
  }

  it("al elegir un aliado pide vigencia y muestra su comisión por defecto; los inactivos no se pueden elegir", async () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    expect(screen.queryByLabelText(/Comisiona desde/)).toBeNull();
    fireEvent.mouseDown(screen.getByLabelText("Aliado"));
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByRole("option", { name: /Beto Inactivo/ }).getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(within(listbox).getByText("Ana Aliada"));
    expect(screen.getByLabelText(/Comisiona desde/)).toBeTruthy();
    expect(screen.getByText(/mensualidad 10 %, implementación 500.00 fijo/)).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ aliado_id: "1" }));

    await pickOption("Mensualidad: tipo", "Monto fijo");
    fireEvent.change(screen.getByLabelText("Mensualidad: monto"), { target: { value: "40" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ commission_type: "FIXED", commission_value: "40" }));
  });

  it("sin la migración muestra el aviso", () => {
    render(<TenantAliadoFields value={emptyAssignmentForm()} aliados={[]} onChange={() => {}} unavailable />);
    expect(screen.getByText(/033_create_aliados/)).toBeTruthy();
  });
});
