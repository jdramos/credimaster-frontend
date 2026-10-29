import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import BankReconciliation from "./BankReconciliation";
import { UserContext } from "../../contexts/UserContext";
import API from "../../api";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ openReportPopup: jest.fn(), printAccountingReport: jest.fn() }));

const ACCOUNTS = [
  { id: 1, account_alias: "BAC - Cuenta Operativa", currency_symbol: "C$" },
  { id: 2, account_alias: "LAFISE - Cuenta corriente USD", currency_symbol: "$" },
];

const WORKSHEET = {
  ok: true,
  bank_account_id: 1,
  statement_date: "2026-10-20",
  book_basis: "SUBLEDGER",
  default_book_basis: "SUBLEDGER",
  book_balance: 10000,
  gl_book_balance: 2500000,
  subledger_book_balance: 10000,
  currency_symbol: "C$",
  gl_sharing: {
    gl_account: { id: 9, muc_code: "1102.01.01", account_name: "Depósitos en bancos" },
    period_start: "2026-09-30",
    other_bank_accounts: [{ id: 2, account_alias: "LAFISE - Cuenta corriente USD", currency_symbol: "$" }],
    other_modules: [{ source_module: "PAYMENTS", source_type: "PAYMENT", entries: 172, debit: 796642.77, credit: 0 }],
    is_shared: true,
  },
  outstanding_checks: [{ id: 30, check_number: "1017", issue_date: "2026-10-05", beneficiary_name: "Distribuidora", amount: "2500.00" }],
  transit_deposits: [
    { id: 40, movement_type: "INGRESO", deposit_date: "2026-10-03", description: "Depósito cobrador", amount: "1000.00" },
    { id: 41, movement_type: "INGRESO", deposit_date: "2026-10-19", description: "Depósito en tránsito", amount: "300.00" },
  ],
  transit_outflows: [],
  last_reconciliation_date: "2026-09-30",
  statement_import_enabled: true,
};

// Libros 10,000 = 11,200 inicial + depósito 1,000 - cheque 2,500 + depósito
// en tránsito 300. Banco 9,550 = 11,200 + 1,000 - 2,500 - comisión 150 que
// libros no tiene. Saldo banco ajustado 9,850 → diferencia -150 = comisión.
const WORKSPACE = {
  ok: true,
  enabled: true,
  lines: [
    {
      id: 501, txn_date: "2026-10-06", description: "CHEQUE PAGADO", reference: "1017", debit: "2500.00", credit: "0.00",
      match_type: "CHECK", match_id: 30, match_mode: "AUTO", resolution: "PENDIENTE",
      matched_item: { type: "CHECK", id: 30, date: "2026-10-05", label: "Cheque N° 1017 - Distribuidora", amount: "2500.00" },
    },
    {
      id: 502, txn_date: "2026-10-04", description: "DEPOSITO EFECTIVO", reference: "", debit: "0.00", credit: "1000.00",
      match_type: "DEPOSIT", match_id: 40, match_mode: "AUTO", resolution: "PENDIENTE",
      matched_item: { type: "DEPOSIT", id: 40, date: "2026-10-03", label: "Depósito cobrador", amount: "1000.00" },
    },
    {
      id: 503, txn_date: "2026-10-15", description: "COMISION MANEJO DE CUENTA", reference: "", debit: "150.00", credit: "0.00",
      match_type: null, match_id: null, match_mode: null, resolution: "PENDIENTE", matched_item: null,
    },
  ],
  imports: [],
  suggested_statement_balance: 9550,
  suggested_statement_balance_source: "Saldo del banco al 2026-10-15 según el estado de cuenta importado",
  lines_after_statement_date: 0,
};

let workspace;

const mockGets = () => {
  API.get.mockImplementation((url) => {
    if (url === "/api/banks/accounts") return Promise.resolve({ data: { ok: true, data: ACCOUNTS } });
    if (url === "/api/banks/reconciliation") return Promise.resolve({ data: { ok: true, data: [] } });
    if (url === "/api/banks/reconciliation/statement/imports") return Promise.resolve({ data: { ok: true, data: [] } });
    if (url === "/api/banks/reconciliation/worksheet") return Promise.resolve({ data: WORKSHEET });
    if (url === "/api/banks/reconciliation/statement/workspace") return Promise.resolve({ data: JSON.parse(JSON.stringify(workspace)) });
    if (url.startsWith("/api/accounting/accounts")) {
      return Promise.resolve({ data: [{ id: 910, muc_code: "5301.01.04", account_name: "Comisiones por Otros Servicios.", is_movement: 1 }] });
    }
    return Promise.resolve({ data: {} });
  });
};

const setup = (ctx = { role: 1, permissions: [] }) => render(
  <UserContext.Provider value={ctx}>
    <BankReconciliation />
  </UserContext.Provider>,
);

const chooseAccountAndLoad = async () => {
  fireEvent.mouseDown(screen.getByLabelText("Cuenta bancaria"));
  fireEvent.click(await screen.findByRole("option", { name: "BAC - Cuenta Operativa" }));
  fireEvent.change(screen.getByLabelText("Fecha de corte"), { target: { value: "2026-10-20" } });
  fireEvent.click(screen.getByRole("button", { name: "Cargar" }));
  await screen.findByText("Pareados con libros (2)");
};

describe("BankReconciliation con estado de cuenta importado", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    workspace = JSON.parse(JSON.stringify(WORKSPACE));
    mockGets();
    window.confirm = jest.fn(() => true);
  });

  test("toma el saldo del estado de cuenta, muestra pareados, solo en banco y la advertencia de cuenta compartida", async () => {
    setup();
    await chooseAccountAndLoad();

    expect(screen.getByLabelText("Saldo según banco").value).toBe("9550");
    expect(screen.getByText(/también la usa\(n\): LAFISE - Cuenta corriente USD \(\$\)/)).toBeTruthy();
    expect(screen.getByText(/Pagos de créditos \(172 asiento/)).toBeTruthy();
    expect(screen.getByText("2026-10-05 · Cheque N° 1017 - Distribuidora")).toBeTruthy();
    expect(screen.getByText("Solo en banco (1) — notas de débito/crédito, comisiones, intereses u otros no registrados en libros")).toBeTruthy();

    expect(screen.getByText("Saldo banco ajustado: C$ 9,850.00")).toBeTruthy();
    expect(screen.getByText("Diferencia: C$ -150.00")).toBeTruthy();
    expect(screen.getByText("Diferencia no explicada: C$ -150.00")).toBeTruthy();
    expect(screen.getByText(/1 movimiento\(s\) del banco sin explicar/)).toBeTruthy();
  });

  test("marca una partida conciliatoria y recarga el área de pareo", async () => {
    API.put.mockResolvedValue({ data: { ok: true, message: "Marcada como partida conciliatoria" } });
    setup();
    await chooseAccountAndLoad();

    fireEvent.click(screen.getByRole("button", { name: "Partida conciliatoria" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Explicación"), { target: { value: "Comisión a registrar en noviembre" } });
    workspace.lines[2].resolution = "PARTIDA_CONCILIATORIA";
    workspace.lines[2].resolution_notes = "Comisión a registrar en noviembre";
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(API.put).toHaveBeenCalledWith(
      "/api/banks/reconciliation/statement/lines/503/resolution",
      { resolution: "PARTIDA_CONCILIATORIA", notes: "Comisión a registrar en noviembre" },
    ));
    expect(await screen.findByText("Partidas conciliatorias: C$ -150.00")).toBeTruthy();
    expect(screen.getByText("Diferencia no explicada: C$ 0.00")).toBeTruthy();
  });

  test("genera el asiento de una nota de débito con la cuenta elegida", async () => {
    API.post.mockResolvedValue({ data: { ok: true, message: "Nota de débito registrada (comprobante CJ-1) y pareada" } });
    setup();
    await chooseAccountAndLoad();

    fireEvent.click(screen.getByRole("button", { name: "Generar asiento" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Registrar nota de débito del banco")).toBeTruthy();
    const input = within(dialog).getByLabelText("Cuenta de contrapartida");
    fireEvent.mouseDown(input);
    fireEvent.click(await screen.findByRole("option", { name: "5301.01.04 - Comisiones por Otros Servicios." }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(API.post).toHaveBeenCalledWith(
      "/api/banks/reconciliation/statement/lines/503/entry",
      { account_id: 910, description: "COMISION MANEJO DE CUENTA" },
    ));
  });

  test("guarda la conciliación con la base de libros y las partidas pareadas marcadas", async () => {
    API.post.mockResolvedValue({ data: { ok: true, data: { items_marked: 2 } } });
    setup();
    await chooseAccountAndLoad();

    // El cheque y el depósito pareados aparecen marcados y bloqueados.
    expect(screen.getByText("Banco 2026-10-06")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar conciliación" }));

    await waitFor(() => expect(API.post).toHaveBeenCalledWith("/api/banks/reconciliation", {
      bank_account_id: 1,
      statement_date: "2026-10-20",
      statement_balance: 9550,
      book_basis: "SUBLEDGER",
      cleared_check_ids: [30],
      cleared_deposit_ids: [40],
    }));
  });

  test("importa un archivo: vista previa con el mapeo sugerido y confirmación", async () => {
    API.post.mockImplementation((url) => {
      if (url === "/api/banks/reconciliation/statement/preview") {
        return Promise.resolve({
          data: {
            ok: true, file_name: "bac_octubre.xlsx", sheet_name: "Movimientos", sheet_names: ["Movimientos"],
            sample_rows: [["Fecha", "Referencia", "Descripción", "Débito", "Crédito", "Saldo"]],
            headers: ["Fecha", "Referencia", "Descripción", "Débito", "Crédito", "Saldo"],
            mapping: {
              header_row: 1, amount_mode: "DEBIT_CREDIT", date_format: "AUTO", decimal_separator: "AUTO",
              columns: { date: "Fecha", reference: "Referencia", description: "Descripción", debit: "Débito", credit: "Crédito", balance: "Saldo" },
            },
            mapping_source: "SUGERIDO",
            mapping_errors: [],
            parsed: {
              lines: [
                { line_no: 1, txn_date: "2026-10-04", reference: "", description: "DEPOSITO", debit: 0, credit: 1000, balance: 11000, fingerprint: "a", duplicate: false, closed_period: false },
                { line_no: 2, txn_date: "2026-10-06", reference: "1017", description: "CHEQUE", debit: 2500, credit: 0, balance: 8500, fingerprint: "b", duplicate: true, closed_period: false },
              ],
              summary: { line_count: 2, total_debits: 2500, total_credits: 1000, period_start: "2026-10-04", period_end: "2026-10-06", opening_balance: 10000, closing_balance: 8500 },
              warnings: [], skipped: [], duplicates: 1, closed_period: 0,
            },
          },
        });
      }
      if (url === "/api/banks/reconciliation/statement/import") {
        return Promise.resolve({ data: { ok: true, data: { id: 7, lines_imported: 1, skipped_duplicates: 1, auto_matched: 1, statement_date: "2026-10-06", warnings: [] } } });
      }
      return Promise.resolve({ data: {} });
    });

    setup();
    fireEvent.mouseDown(screen.getByLabelText("Cuenta bancaria"));
    fireEvent.click(await screen.findByRole("option", { name: "BAC - Cuenta Operativa" }));
    fireEvent.click(screen.getByRole("button", { name: "Importar estado de cuenta" }));

    const dialog = await screen.findByRole("dialog");
    const file = new File(["contenido"], "bac_octubre.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    fireEvent.change(within(dialog).getByTestId("statement-file-input"), { target: { files: [file] } });

    expect(await within(dialog).findByText("Mapeo sugerido por los encabezados")).toBeTruthy();
    expect(within(dialog).getByText("1 ya importado(s), se omitirán")).toBeTruthy();
    expect(within(dialog).getByLabelText("Saldo final según el banco").value).toBe("8500");

    fireEvent.click(within(dialog).getByRole("button", { name: "Importar 1 movimiento(s)" }));

    await waitFor(() => expect(API.post).toHaveBeenCalledWith(
      "/api/banks/reconciliation/statement/import", expect.any(FormData), { headers: { "Content-Type": "multipart/form-data" } },
    ));
    const fd = API.post.mock.calls.find((c) => c[0] === "/api/banks/reconciliation/statement/import")[1];
    expect(fd.get("bank_account_id")).toBe("1");
    expect(fd.get("statement_date")).toBe("2026-10-06");
    expect(fd.get("closing_balance")).toBe("8500");
    expect(fd.get("save_template")).toBe("1");
    expect(JSON.parse(fd.get("mapping")).columns.debit).toBe("Débito");
    expect(await screen.findByText(/Importados 1 movimiento\(s\), 1 pareado\(s\) automáticamente, 1 ya existían/)).toBeTruthy();
  });
});

describe("BankReconciliation: imprimir y Excel", () => {
  const HISTORY = [
    { id: 7, statement_date: "2026-09-30", book_basis: "SUBLEDGER", statement_balance: "11200.00", book_balance: "11200.00", difference: "0.00", unexplained_difference: null },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    workspace = JSON.parse(JSON.stringify(WORKSPACE));
    mockGets();
    const base = API.get.getMockImplementation();
    API.get.mockImplementation((url, opts) => (url === "/api/banks/reconciliation"
      ? Promise.resolve({ data: { ok: true, data: HISTORY } })
      : base(url, opts)));
    openReportPopup.mockImplementation(() => ({ document: { write: jest.fn(), open: jest.fn(), close: jest.fn() }, focus: jest.fn(), close: jest.fn() }));
    printAccountingReport.mockResolvedValue(undefined);
  });

  test("Excel de la hoja de conciliación lleva el resumen y las partidas con su marca", async () => {
    setup();
    expect(screen.getAllByRole("button", { name: "Excel" })[0].disabled).toBe(true);
    await chooseAccountAndLoad();

    fireEvent.click(screen.getAllByRole("button", { name: "Excel" })[0]);
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const def = exportReportToExcel.mock.calls[0][0];
    expect(def.title).toBe("Conciliación bancaria");
    expect(def.period).toBe("Al 2026-10-20");
    expect(def.columns.map((c) => c.label)).toEqual(["Partida", "Fecha", "Referencia / N°", "Descripción", "Monto", "Estado"]);
    const byConcept = Object.fromEntries(def.rows.filter((r) => !r.section && !r.estado).map((r) => [r.partida, r.monto]));
    expect(byConcept["Saldo según banco"]).toBe(9550);
    expect(byConcept["Saldo banco ajustado"]).toBe(9850);
    expect(byConcept["Diferencia"]).toBe(-150);
    expect(byConcept["Diferencia no explicada"]).toBe(-150);
    const comision = def.rows.find((r) => r.descripcion === "COMISION MANEJO DE CUENTA");
    expect(comision).toMatchObject({ partida: "Banco · Débito", monto: 150, estado: "Sin explicar" });
    // El cheque pareado con el banco sale como cobrado; el depósito no pareado, en tránsito.
    expect(def.rows.find((r) => r.partida === "Cheque")).toMatchObject({ referencia: "1017", monto: 2500, estado: "Cobrado" });
    expect(def.rows.find((r) => r.descripcion === "Depósito en tránsito")).toMatchObject({ monto: 300, estado: "En tránsito" });
    expect(def.rows.filter((r) => r.section).map((r) => r.partida)).toContain("Solo en libros — depósitos en tránsito");
  });

  test("Imprimir el historial manda las conciliaciones guardadas", async () => {
    setup();
    fireEvent.mouseDown(screen.getByLabelText("Cuenta bancaria"));
    fireEvent.click(await screen.findByRole("option", { name: "BAC - Cuenta Operativa" }));
    await screen.findByText("2026-09-30");

    const printButtons = screen.getAllByRole("button", { name: "Imprimir" });
    fireEvent.click(printButtons[printButtons.length - 1]);
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalledTimes(1));
    const def = printAccountingReport.mock.calls[0][0];
    expect(def.title).toBe("Historial de conciliaciones bancarias");
    expect(def.subtitle).toContain("BAC - Cuenta Operativa");
    expect(def.columns.map((c) => c.label)).toEqual(["Fecha de corte", "Base libros", "Saldo banco", "Saldo libros", "Diferencia", "No explicada"]);
    expect(def.rows).toEqual(HISTORY);
    expect(def.columns[1].value(HISTORY[0])).toBe("Cuenta bancaria");
    expect(def.columns[5].format(def.columns[5].value(HISTORY[0]))).toBe("—");
    expect(def.popup).toBeTruthy();
  });
});
