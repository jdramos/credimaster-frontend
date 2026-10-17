import { buildMucFormA } from "./mucReportModels";

const acct = (muc_code, nature, debit, credit) => ({
  muc_code,
  nature,
  is_movement: 1,
  total_debit: debit,
  total_credit: credit,
  balance: nature === "DEBIT" ? debit - credit : credit - debit,
});

const find = (rows, label) => rows.find((r) => r.label === label);

describe("Forma A (Estado de Situación Financiera)", () => {
  // Ejercicio anterior cerrado con pérdida: el cierre debita 3902.01 "Pérdida
  // del ejercicio", que en el catálogo del MUC figura como ACREEDORA; la
  // Asamblea la traslada luego a 3802 "Pérdidas acumuladas" (también acreedora).
  test("una pérdida cerrada o acumulada resta del patrimonio aunque la cuenta sea acreedora", () => {
    const closedLoss = [
      acct("1102.01.01", "DEBIT", 4600, 0),
      acct("3101.01.01", "CREDIT", 0, 6000),
      acct("3902.01", "CREDIT", 1400, 0),
    ];
    const formClosed = buildMucFormA(closedLoss, [], [], []);
    expect(find(formClosed, "Resultado del ejercicio").current).toBe(-1400);
    expect(find(formClosed, "Total Patrimonio").current).toBe(4600);
    expect(find(formClosed, "Total Pasivo y Patrimonio").current).toBe(find(formClosed, "Total Activos").current);

    const applied = [
      acct("1102.01.01", "DEBIT", 4600, 0),
      acct("3101.01.01", "CREDIT", 0, 6000),
      acct("3802.01.02", "CREDIT", 1400, 0),
    ];
    const formApplied = buildMucFormA(applied, [], [], []);
    expect(find(formApplied, "Resultados acumulados").current).toBe(-1400);
    expect(find(formApplied, "Total Pasivo y Patrimonio").current).toBe(4600);
  });

  test("también cuadra si el catálogo marca la pérdida como deudora", () => {
    const rows = [acct("1102.01.01", "DEBIT", 4600, 0), acct("3101.01.01", "CREDIT", 0, 6000), acct("3902.01", "DEBIT", 1400, 0)];
    const form = buildMucFormA(rows, [], [], []);
    expect(find(form, "Resultado del ejercicio").current).toBe(-1400);
    expect(find(form, "Total Pasivo y Patrimonio").current).toBe(4600);
  });
});
