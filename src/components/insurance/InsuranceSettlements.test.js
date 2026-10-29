import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import InsuranceSettlements from "./InsuranceSettlements";
import { UserContext } from "../../contexts/UserContext";
import API from "../../api";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ openReportPopup: jest.fn(), printAccountingReport: jest.fn() }));

const PROVIDERS = [
  { id: 1, name: "Seguros América S.A.", commission_rate: "10.0000", is_default: 0 },
  { id: 2, name: "Seguros Nicaragüenses, S.A.", commission_rate: null, is_default: 0 },
];
const SOURCES = {
  bank_accounts: [{ id: 1, account_alias: "BAC - Cuenta Operativa", muc_code: "1102.01.01", next_check_number: "000125" }],
  cash_registers: [{ id: 1, name: "Caja Principal", muc_code: "1101.01" }],
};
const PENDING = {
  providers: [
    { provider_id: 1, provider_name: "Seguros América S.A.", commission_rate: 10, is_default: false, payments_count: 9, loans_count: 7, premium: 257.02, first_payment_date: "2026-09-24", last_payment_date: "2026-10-17" },
    { provider_id: 2, provider_name: "Seguros Nicaragüenses, S.A.", commission_rate: null, is_default: false, payments_count: 0, loans_count: 0, premium: 0, first_payment_date: null, last_payment_date: null },
  ],
  unassigned: { payments_count: 2494, loans_count: 268, premium: 53468.51, first_payment_date: "2025-04-13", last_payment_date: "2026-10-17" },
  total_premium: 53725.53,
};
const PENDING_ITEMS = {
  items: [{ payment_id: 11, premium: 157.02 }, { payment_id: 12, premium: 100 }],
  premium: 257.02,
  commission_computed: 25.7,
};
const SETTLEMENTS = [
  { id: 2, settlement_date: "2026-10-20", provider_name: "Seguros América S.A.", period_from: "2026-09-01", period_to: "2026-10-17", premium_amount: "257.02", compensated_amount: "25.70", net_amount: "231.32", payment_method: "TRANSFERENCIA", entry_no: "CJ-00018403", status: "ACTIVE" },
  { id: 3, settlement_date: "2026-10-20", provider_name: "Seguros Nicaragüenses, S.A.", period_from: "2026-10-01", period_to: "2026-10-17", premium_amount: "55.64", compensated_amount: "0.00", net_amount: "55.64", payment_method: "CAJA", entry_no: "CJ-00018405", status: "VOID" },
];
const RECON = {
  as_of: "2026-10-20",
  accounts: { payableMucCode: "2601.07", receivableMucCode: "1601.06" },
  providers: [
    { provider_id: 1, provider_name: "Seguros América S.A.", collected: 257.02, settled: 257.02, pending: 0, commission_accrued: 25.7, commission_collected: 25.7, commission_receivable: 0 },
    { provider_id: null, provider_name: "Sin aseguradora asignada", collected: 53524.15, settled: 0, pending: 53524.15, commission_accrued: 0, commission_collected: 0, commission_receivable: 0 },
  ],
  totals: { collected: 53781.17, settled: 257.02, pending: 53524.15 },
  gl_payable: 53524.15,
  voided_after_posting: 0,
  other_movements: 0,
  difference: 0,
  commissions: { receivable: 0, gl_receivable: 0, difference: 0 },
};

const mockGets = () => {
  API.get.mockImplementation((url) => {
    if (url === "/api/insurance/providers") return Promise.resolve({ data: { ok: true, data: PROVIDERS } });
    if (url === "/api/insurance/settlements/funding-sources") return Promise.resolve({ data: { ok: true, data: SOURCES } });
    if (url === "/api/insurance/settlements/pending") return Promise.resolve({ data: { ok: true, data: PENDING } });
    if (url === "/api/insurance/settlements/pending/items") return Promise.resolve({ data: { ok: true, data: PENDING_ITEMS } });
    if (url === "/api/insurance/settlements/reconciliation") return Promise.resolve({ data: { ok: true, data: RECON } });
    if (url === "/api/insurance/settlements") return Promise.resolve({ data: { ok: true, data: SETTLEMENTS } });
    if (url === "/api/insurance/commissions") return Promise.resolve({ data: { ok: true, data: [] } });
    return Promise.resolve({ data: {} });
  });
};

const setup = (ctx = { role: 1, permissions: [] }) =>
  render(
    <UserContext.Provider value={ctx}>
      <InsuranceSettlements />
    </UserContext.Provider>,
  );

describe("InsuranceSettlements (liquidación de microseguros)", () => {
  beforeEach(() => {
    API.get.mockReset();
    API.post.mockReset();
    mockGets();
  });

  test("muestra lo pendiente por aseguradora y el grupo sin aseguradora", async () => {
    setup();
    expect(await screen.findByText("C$ 257.02")).toBeTruthy();
    expect(screen.getByText("Sin aseguradora asignada")).toBeTruthy();
    expect(screen.getByText("C$ 53,725.53")).toBeTruthy();
    expect(screen.getByText(/no tienen aseguradora/)).toBeTruthy();
    // Solo se ofrece liquidar a quien tiene primas pendientes.
    expect(screen.getAllByText("Liquidar")).toHaveLength(1);
  });

  test("liquida con comisión compensada: envía el neto esperado y el client_reference_id", async () => {
    API.post.mockResolvedValue({ data: { ok: true, data: { id: 9, premium_amount: "257.02", net_amount: "231.32", entry_no: "CJ-00018500" } } });
    setup();
    fireEvent.click(await screen.findByText("Liquidar"));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/2 pago\(s\) con prima pendiente/)).toBeTruthy();
    expect(API.get).toHaveBeenCalledWith("/api/insurance/settlements/pending/items", {
      params: { provider_id: 1, date_from: "2026-09-24", date_to: "2026-10-17" },
    });
    fireEvent.click(within(dialog).getByLabelText("Compensar (pagar neto)"));
    expect(within(dialog).getByText("C$ 231.32")).toBeTruthy();

    fireEvent.mouseDown(within(dialog).getByLabelText("Cuenta bancaria"));
    fireEvent.click(await screen.findByText("BAC - Cuenta Operativa (1102.01.01)"));
    fireEvent.click(within(dialog).getByText("Registrar liquidación"));

    await waitFor(() => expect(API.post).toHaveBeenCalled());
    const [url, body] = API.post.mock.calls[0];
    expect(url).toBe("/api/insurance/settlements");
    expect(body).toMatchObject({
      provider_id: 1,
      date_from: "2026-09-24",
      date_to: "2026-10-17",
      payment_method: "TRANSFERENCIA",
      bank_account_id: 1,
      cash_register_id: null,
      expected_premium: 257.02,
      commission: { accrue: true, amount: 25.7, compensate: true },
      compensate_commission_ids: [],
    });
    expect(body.client_reference_id).toMatch(/^web-/);
    expect(await screen.findByText(/neto pagado C\$ 231\.32 \(comprobante CJ-00018500\)/)).toBeTruthy();
  });

  test("lista liquidaciones y anula con motivo", async () => {
    API.post.mockResolvedValue({ data: { ok: true } });
    setup();
    fireEvent.click(await screen.findByText("Liquidaciones"));
    expect(await screen.findByText("CJ-00018403")).toBeTruthy();
    expect(screen.getByText("Anulada")).toBeTruthy();
    // La anulada no ofrece anular otra vez.
    expect(screen.queryByLabelText("Anular liquidación 3")).toBeNull();

    fireEvent.click(screen.getByLabelText("Anular liquidación 2"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByText("Anular"));
    expect(await within(dialog).findByText("Indique el motivo de la anulación.")).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText("Motivo de la anulación"), { target: { value: "Transferencia rechazada" } });
    fireEvent.click(within(dialog).getByText("Anular"));
    await waitFor(() =>
      expect(API.post).toHaveBeenCalledWith("/api/insurance/settlements/2/void", { reason: "Transferencia rechazada" }),
    );
  });

  test("conciliación: pendiente por aseguradora contra el saldo de 2601.07", async () => {
    setup();
    fireEvent.click(await screen.findByText("Conciliación 2601.07"));
    expect(await screen.findByText("Cuenta 2601.07 — primas por liquidar")).toBeTruthy();
    expect(screen.getAllByText("C$ 53,524.15").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Cuadra")).toHaveLength(2);
  });

  test("sin permiso de liquidar ni anular: solo consulta", async () => {
    setup({ role: 5, permissions: ["seguros.ver"] });
    await screen.findByText("C$ 257.02");
    expect(screen.queryByText("Nueva liquidación")).toBeNull();
    expect(screen.queryByText("Liquidar")).toBeNull();
    fireEvent.click(screen.getByText("Liquidaciones"));
    await screen.findByText("CJ-00018403");
    expect(screen.queryByLabelText("Anular liquidación 2")).toBeNull();
  });
});

describe("InsuranceSettlements: imprimir y Excel por pestaña", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGets();
    openReportPopup.mockImplementation(() => ({ document: { write: jest.fn(), open: jest.fn(), close: jest.fn() }, focus: jest.fn(), close: jest.fn() }));
    printAccountingReport.mockResolvedValue(undefined);
  });

  test("Excel de pendiente incluye el grupo sin aseguradora y el total pendiente", async () => {
    setup();
    await screen.findByText("C$ 257.02");
    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const def = exportReportToExcel.mock.calls[0][0];
    expect(def.title).toBe("Primas pendientes de liquidar");
    expect(def.columns.map((c) => c.label)).toEqual(["Aseguradora", "% comisión", "Pagos", "Créditos", "Desde", "Hasta", "Primas pendientes"]);
    expect(def.rows.map((r) => r.provider_name)).toEqual(["Seguros América S.A.", "Seguros Nicaragüenses, S.A.", "Sin aseguradora asignada"]);
    expect(def.columns[6].value(def.rows[2])).toBe(53468.51);
    expect(def.totals[1]).toMatchObject({ raw: 53725.53, numeric: true });
  });

  test("Imprimir liquidaciones: filas de la tabla y total sin las anuladas", async () => {
    setup();
    fireEvent.click(await screen.findByText("Liquidaciones"));
    await screen.findByText("CJ-00018403");
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalledTimes(1));
    const def = printAccountingReport.mock.calls[0][0];
    expect(def.title).toBe("Liquidaciones de seguros");
    expect(def.columns.map((c) => c.label)).toEqual([
      "#", "Fecha", "Aseguradora", "Período", "Primas", "Comisión compensada", "Neto pagado", "Forma de pago", "Comprobante", "Estado",
    ]);
    expect(def.rows).toHaveLength(2);
    expect(def.columns[9].format(def.rows[1].status)).toBe("Anulada");
    expect(def.totals[0].value).toBe("Total vigentes (1)");
    expect(def.totals.slice(1, 4).map((t) => t.raw)).toEqual([257.02, 25.7, 231.32]);
  });

  test("Excel de conciliación: aseguradoras, total y cuadre de 2601.07 / 1601.06", async () => {
    setup();
    fireEvent.click(await screen.findByText("Conciliación 2601.07"));
    await screen.findByText("Cuenta 2601.07 — primas por liquidar");
    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const def = exportReportToExcel.mock.calls[0][0];
    expect(def.period).toMatch(/^Saldos al \d{4}-\d{2}-\d{2}$/);
    const total = def.rows.find((r) => r.total);
    expect(total).toMatchObject({ provider_name: "Total", collected: 53781.17, pending: 53524.15 });
    expect(def.rows.filter((r) => r.section).map((r) => r.provider_name)).toEqual([
      "Cuenta 2601.07 — primas por liquidar",
      "Cuenta 1601.06 — comisiones por cobrar",
    ]);
    expect(def.rows.find((r) => r.provider_name === "Saldo contable").pending).toBe(53524.15);
  });
});
