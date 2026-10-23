import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AccountIntegration from "./AccountReconciliation";
import { UserContext } from "../../contexts/UserContext";
import API from "../../api";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("xlsx", () => ({ utils: { json_to_sheet: jest.fn(() => ({})), book_new: jest.fn(() => ({})), book_append_sheet: jest.fn() }, writeFile: jest.fn() }));

const ACCOUNTS = [
  { id: 171, muc_code: "1401.01.01", account_name: "Créditos vigentes", is_movement: 1 },
  { id: 9, muc_code: "1102.01.01", account_name: "Depósitos en cuenta corriente", is_movement: 1 },
  { id: 900, muc_code: "1902.01", account_name: "Otros activos", is_movement: 1 },
];
const INTEGRABLE = [
  { account_id: 171, kind: "PORTFOLIO", status: "VIGENTE" },
  { account_id: 9, kind: "BANK" },
];
const PORTFOLIO = {
  account: { id: 171, muc_code: "1401.01.01", account_name: "Créditos vigentes" },
  as_of: "2026-09-30",
  kind: "PORTFOLIO",
  kind_label: "Cartera de créditos por crédito (cartera vigente)",
  gl_balance: 10469629.02,
  columns: [
    { field: "label", header: "Crédito" },
    { field: "sublabel", header: "Cliente" },
    { field: "amount", header: "Principal", type: "money" },
  ],
  rows: [
    { key: "loan-1", label: "C-001", sublabel: "Ana López", amount: 11000000 },
    { key: "loan-2", label: "C-002", sublabel: "Luis Pérez", amount: 142969.91 },
  ],
  reconciling: [{ label: "Pagos de créditos de otro estado acreditados en esta cuenta", amount: -673340.89 }],
  notes: ["Principal = desembolsado − principal pagado − aplicado por adjudicación, por crédito, a la fecha de corte."],
  subledger_total: 11142969.91,
  reconciling_total: -673340.89,
  expected_gl: 10469629.02,
  difference: 0,
  integrable: true,
};

const mockGets = (overrides = {}) => {
  API.get.mockImplementation((url) => {
    if (url.startsWith("/api/accounting/accounts")) return Promise.resolve({ data: { data: ACCOUNTS } });
    if (url === "/api/accounting/integration/accounts") return Promise.resolve({ data: { ok: true, data: INTEGRABLE } });
    if (url === "/api/accounting/reconciliation") return Promise.resolve({ data: { ok: true, data: overrides.history || [] } });
    if (url === "/api/accounting/integration") return Promise.resolve({ data: { ok: true, data: overrides.integration || PORTFOLIO } });
    if (url === "/api/accounting/reconciliation/worksheet") {
      return Promise.resolve({ data: { book_balance: 1500, open_items: [], last_reconciliation_date: null } });
    }
    if (url === "/api/accounting/integration/summary") {
      return Promise.resolve({ data: { ok: true, data: { as_of: "2026-09-30", accounts: [
        { account: PORTFOLIO.account, kind: "PORTFOLIO", kind_label: PORTFOLIO.kind_label, gl_balance: 10469629.02, subledger_total: 11142969.91, reconciling_total: -673340.89, difference: 0 },
        { account: { id: 238, muc_code: "1406.01.01", account_name: "Intereses vigentes" }, kind: "INTEREST", kind_label: "Intereses", gl_balance: 121591.08, subledger_total: 271874.37, reconciling_total: -71593.15, difference: -78690.14 },
      ] } } });
    }
    return Promise.resolve({ data: {} });
  });
};

const setup = (ctx = { role: 1, permissions: [] }) =>
  render(
    <MemoryRouter>
      <UserContext.Provider value={ctx}>
        <AccountIntegration />
      </UserContext.Provider>
    </MemoryRouter>,
  );

const chooseAccount = async (label) => {
  const input = screen.getByLabelText("Cuenta contable");
  fireEvent.mouseDown(input);
  fireEvent.change(input, { target: { value: label.slice(0, 7) } });
  fireEvent.click(await screen.findByText(label));
};

describe("Integración de cuentas", () => {
  beforeEach(() => {
    API.get.mockReset();
    API.post.mockReset();
  });

  test("muestra el detalle por crédito, las partidas conciliatorias y guarda la integración", async () => {
    mockGets();
    API.post.mockResolvedValue({ data: { ok: true, data: { id: 3 } } });
    setup();
    expect(await screen.findByText("Integración de cuentas")).toBeTruthy();
    await waitFor(() => expect(API.get).toHaveBeenCalledWith("/api/accounting/integration/accounts"));
    await chooseAccount("1401.01.01 - Créditos vigentes");
    fireEvent.change(screen.getByLabelText("Fecha de corte"), { target: { value: "2026-09-30" } });
    fireEvent.click(screen.getByText("Cargar"));

    expect(await screen.findByText("Ana López")).toBeTruthy();
    expect(API.get).toHaveBeenCalledWith("/api/accounting/integration", { params: { account_id: 171, as_of: "2026-09-30" } });
    expect(screen.getByText("Pagos de créditos de otro estado acreditados en esta cuenta")).toBeTruthy();
    expect(screen.getByText("Diferencia sin explicar: cuadra")).toBeTruthy();

    // Filtro del detalle
    fireEvent.change(screen.getByLabelText("Buscar en el detalle"), { target: { value: "luis" } });
    expect(screen.queryByText("Ana López")).toBeNull();
    expect(screen.getByText("Luis Pérez")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Notas (opcional)"), { target: { value: "Cierre septiembre" } });
    fireEvent.click(screen.getByText("Guardar integración"));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith("/api/accounting/integration", {
      account_id: 171, as_of: "2026-09-30", notes: "Cierre septiembre",
    }));
    expect(await screen.findByText(/Integración de 1401\.01\.01 al 30\/09\/2026 guardada/)).toBeTruthy();
  });

  test("bancos remite a la Conciliación Bancaria", async () => {
    mockGets({
      integration: {
        account: ACCOUNTS[1], as_of: "2026-10-20", gl_balance: 0, kind: "BANK", integrable: false, redirect: "/bancos/conciliacion",
        bank_accounts: [{ id: 1, account_alias: "BAC" }, { id: 2, account_alias: "LAFISE USD" }],
      },
    });
    setup();
    await waitFor(() => expect(API.get).toHaveBeenCalledWith("/api/accounting/integration/accounts"));
    await chooseAccount("1102.01.01 - Depósitos en cuenta corriente");
    fireEvent.click(screen.getByText("Cargar"));
    expect(await screen.findByText(/se concilia contra el estado de cuenta del banco/)).toBeTruthy();
    expect(screen.getByText(/la comparten 2 cuentas bancarias \(BAC, LAFISE USD\)/)).toBeTruthy();
    expect(screen.getByText("Ir a Conciliación Bancaria")).toBeTruthy();
    expect(screen.queryByText("Guardar integración")).toBeNull();
  });

  test("cuenta sin auxiliar: conciliación manual contra fuente externa", async () => {
    mockGets({ integration: { account: ACCOUNTS[2], as_of: "2026-10-20", gl_balance: 1500, kind: null, integrable: false } });
    setup();
    await waitFor(() => expect(API.get).toHaveBeenCalledWith("/api/accounting/integration/accounts"));
    await chooseAccount("1902.01 - Otros activos");
    fireEvent.click(screen.getByText("Cargar"));
    expect(await screen.findByText(/no tiene auxiliar en el sistema/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Saldo según fuente externa"), { target: { value: "1500" } });
    expect(screen.getByText("Diferencia: cuadra")).toBeTruthy();
    expect(screen.getByText("Guardar conciliación")).toBeTruthy();
  });

  test("resumen: todas las cuentas con auxiliar y su diferencia", async () => {
    mockGets();
    setup();
    fireEvent.click(await screen.findByText("Resumen de cuentas con auxiliar"));
    fireEvent.click(screen.getByText("Calcular"));
    const table = await screen.findByRole("table");
    expect(within(table).getByText("1406.01.01 - Intereses vigentes")).toBeTruthy();
    expect(within(table).getByText("Dif.: cuadra")).toBeTruthy();
    expect(within(table).getByText("Dif.: C$ -78,690.14")).toBeTruthy();
  });

  test("sin permiso de gestionar: consulta sin guardar", async () => {
    mockGets();
    setup({ role: 5, permissions: ["contabilidad.ver"] });
    await waitFor(() => expect(API.get).toHaveBeenCalledWith("/api/accounting/integration/accounts"));
    await chooseAccount("1401.01.01 - Créditos vigentes");
    fireEvent.click(screen.getByText("Cargar"));
    await screen.findByText("Ana López");
    expect(screen.queryByText("Guardar integración")).toBeNull();
    expect(screen.getByText("Exportar a Excel")).toBeTruthy();
  });
});
