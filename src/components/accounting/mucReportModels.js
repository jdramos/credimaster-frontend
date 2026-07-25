const code = (row) => String(row.muc_code || "").replace(/[^0-9]/g, "");
const balance = (row) => Number(row.balance ?? 0);
const amount = (rows, prefixes = [], subtract = []) => rows.reduce((total, row) => {
  const current = code(row);
  if (subtract.some((prefix) => current.startsWith(prefix.replace(/[^0-9]/g, "")))) return total - balance(row);
  if (prefixes.some((prefix) => current.startsWith(prefix.replace(/[^0-9]/g, "")))) return total + balance(row);
  return total;
}, 0);

const row = (label, current, previous, options = {}) => ({ label, current, previous, ...options });
const section = (label) => row(label, "", "", { section: true });

export const buildMucFormA = (currentRows = [], previousRows = []) => {
  const value = (positive, negative = []) => [amount(currentRows, positive, negative), amount(previousRows, positive, negative)];
  const data = [section("ACTIVO")];
  const assetLines = [
    ["Fondos disponibles", ["1101", "1102", "1103", "1104", "1105"]],
    ["Inversiones negociables y a vencimiento, neto", ["1201", "1202", "1203", "1204", "1205", "1206"], ["1207", "1208", "1209"]],
    ["Cartera de créditos, neto", ["1401", "1402", "1403", "1404", "1405", "1406"], ["1408", "1409", "290301"]],
    ["Bienes recibidos en pago y adjudicados, neto", ["1501"], ["1509"]],
    ["Otras cuentas por cobrar, neto", ["1601", "1602", "1603"], ["1609"]],
    ["Inversiones permanentes", ["1701"]],
    ["Inmuebles, mobiliario y equipo, neto", ["1801", "1802", "1803", "1804", "1805", "1806", "1807", "1808"], ["1809"]],
    ["Otros activos, neto", ["1901", "1902", "1903", "1904", "1905", "1906", "1907", "1908", "1909", "1910", "1911"], ["190609", "190809", "191109", "2902"]],
  ];
  assetLines.forEach(([label, plus, minus]) => { const [c, p] = value(plus, minus); data.push(row(label, c, p)); });
  data.push(row("Total Activos", data.slice(1).reduce((s, x) => s + Number(x.current || 0), 0), data.slice(1).reduce((s, x) => s + Number(x.previous || 0), 0), { total: true }));

  data.push(section("PASIVO Y PATRIMONIO"), section("PASIVO"));
  const liabilityStart = data.length;
  const liabilityLines = [
    ["Obligaciones financieras", ["2101", "2102", "2103"]],
    ["Obligaciones con instituciones financieras y por otros financiamientos", ["2201", "2202", "2203", "2208"]],
    ["Otras cuentas por pagar", ["2601", "2602", "2603", "2604", "2605"]],
    ["Provisiones", ["2701", "2702", "2703", "2704"]],
    ["Otros pasivos", ["2901", "290302", "290303", "290309"]],
    ["Deudas subordinadas y obligaciones convertibles en acciones", ["2801", "2802", "2803", "2804"]],
  ];
  liabilityLines.forEach(([label, plus]) => { const [c, p] = value(plus); data.push(row(label, c, p)); });
  const liabilities = data.slice(liabilityStart);
  data.push(row("Total Pasivo", liabilities.reduce((s, x) => s + Number(x.current || 0), 0), liabilities.reduce((s, x) => s + Number(x.previous || 0), 0), { total: true }));

  data.push(section("PATRIMONIO"));
  const equityStart = data.length;
  [["Capital social / Aportes", ["3101", "3102"]], ["Capital adicional / Aporte adicional", ["3201", "3202"]],
    ["Ajustes al patrimonio", ["3401"]], ["Reservas", ["3501"]], ["Resultados acumulados", ["3801"], ["3802"]]]
    .forEach(([label, plus, minus]) => { const [c, p] = value(plus, minus); data.push(row(label, c, p)); });
  // "Resultado del ejercicio" = resultado ya cerrado formalmente (3901/3902,
  // solo existe tras Cierre de Ejercicio) + resultado del período todavía
  // abierto (ingresos clase 4 menos gastos clase 5, que el cierre formal
  // pone en cero al trasladarlos a 3901/3902 — por eso sumar ambos no
  // duplica nada, ni antes ni después de cerrar el ejercicio).
  const [closedC, closedP] = value(["3901"], ["3902"]);
  const openResultC = amount(currentRows, ["4"]) - amount(currentRows, ["5"]);
  const openResultP = amount(previousRows, ["4"]) - amount(previousRows, ["5"]);
  data.push(row("Resultado del ejercicio", closedC + openResultC, closedP + openResultP));
  const equity = data.slice(equityStart);
  const totalEquity = row("Total Patrimonio", equity.reduce((s, x) => s + Number(x.current || 0), 0), equity.reduce((s, x) => s + Number(x.previous || 0), 0), { total: true });
  data.push(totalEquity);
  const totalLiability = data.find((x) => x.label === "Total Pasivo");
  data.push(row("Total Pasivo y Patrimonio", totalLiability.current + totalEquity.current, totalLiability.previous + totalEquity.previous, { total: true }));
  const [contC, contP] = value(["7101", "7109"]); data.push(row("Cuentas contingentes", contC, contP));
  const [orderC, orderP] = value(["8101", "8102", "8103", "8104", "8105", "8106", "8107", "8108", "8201", "8202", "8203", "8204", "8205", "8206", "8207", "8208", "8209", "8210"]); data.push(row("Cuentas de orden", orderC, orderP));
  return data;
};

export const buildMucFormB = (currentRows = [], previousRows = []) => {
  const periodRows = (rows) => rows.map((item) => ({
    ...item,
    balance: item.nature === "CREDIT"
      ? Number(item.total_credit || 0) - Number(item.total_debit || 0)
      : Number(item.total_debit || 0) - Number(item.total_credit || 0),
  }));
  const val = (plus, minus = []) => [amount(periodRows(currentRows), plus, minus), amount(periodRows(previousRows), plus, minus)];
  const data = [section("Ingresos financieros, por:")];
  const add = (label, plus, minus, options) => { const [c, p] = val(plus, minus); const item = row(label, c, p, options); data.push(item); return item; };
  const income = [add("Disponibilidades", ["4101"]), add("Inversiones negociables y a vencimiento", ["4102", "4103", "4104"]), add("Utilidad en venta de inversiones en valores", ["4105"]), add("Cartera de créditos", ["4106", "4107", "4108", "4109", "4110"]), add("Diferencia cambiaria", ["45010101", "45010102", "45010103", "45010107", "45010108", "45010111", "45010112"]), add("Otros ingresos financieros", ["411302", "411303"])];
  const totalIncome = row("Total ingresos financieros", income.reduce((s,x)=>s+x.current,0), income.reduce((s,x)=>s+x.previous,0), { total:true }); data.push(totalIncome, section("Gastos financieros, por:"));
  const expense = [add("Obligaciones financieras", ["5101"]), add("Obligaciones con instituciones financieras y otros financiamientos", ["5103", "5104", "5105"]), add("Pérdida en venta de inversiones en valores", ["5106"]), add("Deudas subordinadas y obligaciones convertibles en acciones", ["5107", "5108"]), add("Diferencia cambiaria", ["55010101", "55010102", "55010103", "55010107", "55010108", "55010111", "55010112"]), add("Otros gastos financieros", ["5114"])];
  const totalExpense = row("Total gastos financieros", expense.reduce((s,x)=>s+x.current,0), expense.reduce((s,x)=>s+x.previous,0), { total:true }); data.push(totalExpense);
  const marginGross = row("Margen financiero bruto", totalIncome.current-totalExpense.current, totalIncome.previous-totalExpense.previous, { total:true }); data.push(marginGross);
  const provision = add("Gastos por provisión por incobrabilidad de la cartera de créditos directa", ["520101", "520202", "420301"]);
  const recovery = add("Ingresos por recuperación de la cartera de créditos directa saneada", ["420102"]);
  const deterioration = add("Gastos por deterioro de inversiones neto de recuperaciones", ["520201", "5203", "5204", "5205"], ["420101", "4202"]);
  const marginNet = row("Margen financiero neto", marginGross.current-provision.current+recovery.current-deterioration.current, marginGross.previous-provision.previous+recovery.previous-deterioration.previous, { total:true }); data.push(marginNet);
  const opIncome = add("Ingresos operativos diversos", ["4111", "411301", "420103", "420302", "420303", "4301", "4302", "4303", "45010104", "45010105", "45010106", "45010109", "45010110", "45010113"], ["5113"]);
  const opExpense = add("Gastos operativos diversos", ["5112", "520102", "520103", "520203", "5301", "5302", "530301", "530302", "530309", "55010104", "55010105", "55010106", "55010109", "55010110", "55010113"]);
  const operating = row("Resultado operativo bruto", marginNet.current+opIncome.current-opExpense.current, marginNet.previous+opIncome.previous-opExpense.previous, { total:true }); data.push(operating, section("Participación en resultados de asociadas"));
  const associatesIncome=add("Utilidades en asociadas",["4401"]), associatesExpense=add("Pérdidas en asociadas",["5701"]); data.push(section("Gastos de administración"));
  const admin=add("Gastos de administración y otros",["5401","5402","5403","5404","5405","5601"]), related=add("Gastos con personas vinculadas",["530303"]);
  const beforeTax=row("Resultado antes del impuesto a la renta",operating.current+associatesIncome.current-associatesExpense.current-admin.current-related.current,operating.previous+associatesIncome.previous-associatesExpense.previous-admin.previous-related.previous,{total:true}); data.push(beforeTax);
  const tax=add("Impuesto a la renta",["6201"]); data.push(row("Resultado del ejercicio",beforeTax.current-tax.current,beforeTax.previous-tax.previous,{total:true}));
  return data;
};

export const buildMucFormC = (currentRows = [], previousRows = [], currentYear = "Actual") => {
  const sum = (rows, prefixes, field) => rows.reduce((total, item) =>
    prefixes.some((prefix) => code(item).startsWith(prefix)) ? total + Number(item[field] || 0) : total, 0);
  const categories = [
    ["capital", ["31"]], ["additional", ["32"]], ["adjustments", ["34"]],
    ["reserves", ["35"]], ["results", ["38", "39"]],
  ];
  const make = (label, source, field) => {
    const item = { label };
    categories.forEach(([key, prefixes]) => { item[key] = sum(source, prefixes, field); });
    item.total = categories.reduce((total, [key]) => total + item[key], 0);
    return item;
  };
  const previousYear = Number(currentYear) - 1;
  return [
    make(`Saldo al 01 de enero de ${previousYear}`, previousRows, "opening_balance"),
    make(`Saldo al 31 de diciembre de ${previousYear}`, previousRows, "closing_balance"),
    make(`Saldo al 31 de diciembre de ${currentYear}`, currentRows, "closing_balance"),
  ];
};

// ==========================================
// FORMA D - Estado de Flujos de Efectivo (Cap. IV del MUC)
// ==========================================
// Método indirecto (NIC 7): parte del resultado neto del período y lo
// concilia con el movimiento de las demás cuentas de balance, clasificadas
// por actividad. Por instrucción expresa del MUC, la intermediación
// financiera (cartera de créditos y obligaciones/captaciones) se clasifica
// como actividad de FINANCIAMIENTO, no de operación.
//
// Simplificación deliberada: los ajustes puramente patrimoniales sin
// contrapartida en efectivo (3401 ajustes al patrimonio por valuación,
// 3501 reservas, 3801/3802 resultados acumulados, 3901/3902 resultado del
// ejercicio) se excluyen del cálculo — ya están representados por el
// "Resultado neto del ejercicio" con el que arranca el estado. Cuentas
// contingentes y de orden (clases 7 y 8) tampoco se incluyen: son
// registros fuera de balance.
const round2 = (value) => Number(Number(value || 0).toFixed(2));

const CASHFLOW_CASH_PREFIXES = ["1101", "1102", "1103", "1104", "1105"];
const CASHFLOW_EXCLUDED_EQUITY_PREFIXES = ["3401", "3501", "3801", "3802", "3901", "3902"];
const CASHFLOW_INVESTING_PREFIXES = [
  "1201", "1202", "1203", "1204", "1205", "1206", "1207", "1208", "1209",
  "1501", "1509", "1701",
  "1801", "1802", "1803", "1804", "1805", "1806", "1807", "1808", "1809",
];
const CASHFLOW_FINANCING_PREFIXES = [
  "1401", "1402", "1403", "1404", "1405", "1406", "1408", "1409",
  "2101", "2102", "2103", "2201", "2202", "2203", "2208", "2801", "2802", "2803", "2804",
  "3101", "3102", "3201", "3202",
];
const CASHFLOW_OPERATING_PREFIXES = [
  "1601", "1602", "1603", "1609",
  "1901", "1902", "1903", "1904", "1905", "1906", "1907", "1908", "1909", "1910", "1911",
  "2601", "2602", "2603", "2604", "2605", "2701", "2702", "2703", "2704", "2901",
];

const classifyCashFlowAccount = (item) => {
  const c = code(item);
  if (CASHFLOW_CASH_PREFIXES.some((p) => c.startsWith(p))) return "CASH";
  if (c.startsWith("4") || c.startsWith("5")) return "INCOME_STATEMENT";
  if (c.startsWith("6") || c.startsWith("7") || c.startsWith("8")) return "EXCLUDED";
  if (CASHFLOW_EXCLUDED_EQUITY_PREFIXES.some((p) => c.startsWith(p))) return "EXCLUDED";
  if (CASHFLOW_INVESTING_PREFIXES.some((p) => c.startsWith(p))) return "INVESTING";
  if (CASHFLOW_FINANCING_PREFIXES.some((p) => c.startsWith(p))) return "FINANCING";
  if (CASHFLOW_OPERATING_PREFIXES.some((p) => c.startsWith(p))) return "OPERATING";
  return "UNCLASSIFIED";
};

const summarizeCashFlow = (rows = []) => {
  const items = rows.map((item) => {
    const nature = item.nature;
    const opening = nature === "CREDIT"
      ? Number(item.opening_credit || 0) - Number(item.opening_debit || 0)
      : Number(item.opening_debit || 0) - Number(item.opening_credit || 0);
    const periodMovement = nature === "CREDIT"
      ? Number(item.period_credit || 0) - Number(item.period_debit || 0)
      : Number(item.period_debit || 0) - Number(item.period_credit || 0);
    // Aumento de activo = uso de efectivo (negativo); aumento de pasivo/
    // patrimonio/contra-cuenta (naturaleza CREDIT) = fuente de efectivo (positivo).
    const cashContribution = nature === "CREDIT" ? periodMovement : -periodMovement;
    return { ...item, opening, periodMovement, cashContribution };
  });

  const buckets = { CASH: [], INCOME_STATEMENT: [], OPERATING: [], INVESTING: [], FINANCING: [], EXCLUDED: [], UNCLASSIFIED: [] };
  items.forEach((item) => buckets[classifyCashFlowAccount(item)].push(item));

  const sumBucket = (name) => round2(buckets[name].reduce((sum, item) => sum + item.cashContribution, 0));

  const netIncome = sumBucket("INCOME_STATEMENT");
  const operating = round2(netIncome + sumBucket("OPERATING"));
  const investing = sumBucket("INVESTING");
  const financing = sumBucket("FINANCING");
  const netChange = round2(operating + investing + financing);

  const openingCash = round2(buckets.CASH.reduce((sum, item) => sum + item.opening, 0));
  const closingCash = round2(buckets.CASH.reduce((sum, item) => sum + item.opening + item.periodMovement, 0));

  return {
    netIncome, operating, investing, financing, netChange, openingCash, closingCash,
    unclassified: buckets.UNCLASSIFIED.map((i) => i.muc_code),
  };
};

export const buildMucFormD = (currentRows = [], previousRows = [], currentYear = "Actual") => {
  const current = summarizeCashFlow(currentRows);
  const previous = summarizeCashFlow(previousRows);

  const row = (label, cur, prev, options = {}) => ({ label, current: cur, previous: prev, ...options });
  const section = (label) => row(label, "", "", { section: true });

  const rows = [
    section("Flujos de efectivo de las actividades de operación"),
    row("Resultado neto del ejercicio", current.netIncome, previous.netIncome),
    row(
      "Variación neta de otras cuentas operativas de activo y pasivo",
      round2(current.operating - current.netIncome),
      round2(previous.operating - previous.netIncome),
    ),
    row("Efectivo neto de las actividades de operación", current.operating, previous.operating, { total: true }),
    section("Flujos de efectivo de las actividades de inversión"),
    row("Efectivo neto de las actividades de inversión", current.investing, previous.investing, { total: true }),
    section("Flujos de efectivo de las actividades de financiamiento"),
    row(
      "Efectivo neto de las actividades de financiamiento (incluye intermediación financiera)",
      current.financing,
      previous.financing,
      { total: true },
    ),
    row("Aumento (disminución) neto de efectivo y equivalentes", current.netChange, previous.netChange, { total: true }),
    row("Efectivo y equivalente de efectivo al inicio del año", current.openingCash, previous.openingCash),
    row(`Efectivo y equivalente de efectivo al final de ${currentYear}`, current.closingCash, previous.closingCash, { total: true }),
  ];

  return rows;
};

// Reconciliación: computedNetChange (suma de las 3 actividades) debe
// coincidir con actualCashMovement (variación real de Fondos Disponibles).
// Si no coincide, hay cuentas con movimiento sin clasificar (ver
// unclassifiedAccounts) que deben revisarse.
export const getCashFlowDiagnostics = (rows = []) => {
  const summary = summarizeCashFlow(rows);
  return {
    computedNetChange: summary.netChange,
    actualCashMovement: round2(summary.closingCash - summary.openingCash),
    unclassifiedAccounts: summary.unclassified,
  };
};
