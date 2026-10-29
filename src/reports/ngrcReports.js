// src/reports/ngrcReports.js — Reportes de la Norma sobre Gestión de Riesgo
// Crediticio para IMF (Resolución CD-CONAMI-019-02MAY25-2023). Backend:
// /api/ngrc/reports/:type.
//
// Cada reporte se describe una sola vez (reportSpec): indicadores, notas y
// secciones con columnas tipadas. La misma especificación alimenta la
// pantalla (NgrcReportView), la impresión (buildNgrcReportHtml → PDF desde
// el navegador) y el Excel (buildNgrcWorkbook), para que los tres digan lo
// mismo.
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";
import { openReport } from "./reportViewer";

export const NORM_NAME = "Norma sobre Gestión de Riesgo Crediticio para Instituciones de Microfinanzas";
export const NORM_REF = "Resolución CD-CONAMI-019-02MAY25-2023";

export const REPORT_TYPES = {
  CLASIFICACION: {
    title: "Calificación de la cartera y provisiones",
    article: "Art. 9",
    dateLabel: "Fecha de corte",
    hint: "Base del Informe de Calificación de los Activos de Riesgo (semestral, a la CONAMI con el acta de Junta) y del dictamen del auditor interno al 31 de diciembre.",
  },
  EXPOSICION: {
    title: "Exposición al riesgo de crédito",
    article: "Art. 9",
    dateLabel: "Corte del trimestre",
    hint: "Reporte trimestral de la Gerencia General a la Junta Directiva: calidad de la cartera, concentración, migración de categorías y otros activos.",
  },
  ADJUDICADOS: {
    title: "Bienes recibidos en pago o adjudicados",
    article: "Art. 54",
    dateLabel: "Fecha de corte",
    hint: "Listado detallado semestral a la CONAMI con los montos contabilizados. Los inmuebles se mantienen en el listado mientras no se vendan.",
  },
  MODIFICADOS: {
    title: "Créditos prorrogados y reestructurados",
    article: "Art. 47",
    dateLabel: "Fecha de corte",
    needsFrom: true,
    hint: "Seguimiento semestral para la Junta Directiva. Se listan los créditos modificados vigentes al corte; la columna «En el período» marca los modificados entre las dos fechas.",
  },
  JUDICIAL: {
    title: "Créditos en cobro judicial",
    article: "Art. 50",
    dateLabel: "Fecha de corte",
    needsFrom: true,
    hint: "Base del informe mensual de los abogados (y trimestral a la Junta). Las columnas de situación y probabilidad de recuperación las completa el abogado.",
  },
  CLIENTES_DESACTUALIZADOS: {
    title: "Clientes con información desactualizada",
    article: "Art. 61",
    dateLabel: "Fecha de evaluación",
    allOption: true,
    hint: "Deudores con crédito vigente cuya información no se actualiza ni analiza desde hace 12 meses (o está por cumplirlos). Última actualización = la más reciente entre la ficha del cliente y su evaluación financiera.",
  },
  VALUACIONES: {
    title: "Valuaciones de garantías y bienes adjudicados",
    article: "Arts. 41 y 54",
    dateLabel: "Fecha de evaluación",
    allOption: true,
    hint: "Prendarias: avalúo al menos una vez al año. Hipotecarias: cada 3 años (salvo la excepción del Art. 41 para categorías A y B). Inmuebles adjudicados: cada 3 años, con perito inscrito en la CONAMI si valen más de US$25,000.",
  },
};

const MONEY = "money";
const INT = "int";
const PCT = "pct";
const DATE = "date";

const VALUATION_STATUS = {
  VENCIDA: "Vencida",
  POR_VENCER: "Por vencer",
  AL_DIA: "Al día",
  EXENTA: "Exenta (Art. 41)",
  SIN_TIPO: "Sin clasificar",
  NO_APLICA: "No aplica",
  REQUIERE_PERITO: "Requiere perito inscrito",
};
const CUSTOMER_STATUS = { VENCIDO: "Vencida", POR_VENCER: "Por vencer", AL_DIA: "Al día" };
const BEHAVIOR = { NORMAL: "Normal", IRREGULAR: "Irregular", DETERIORATED: "Deteriorado" };

export const fmtMoney = (v) =>
  v == null || v === "" ? "—" : `C$ ${Number(v).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtPct = (v) => (v == null || v === "" ? "—" : `${Number(v).toLocaleString("es-NI", { maximumFractionDigits: 2 })}%`);
export const fmtDate = (v) => {
  if (!v) return "—";
  const s = String(v).slice(0, 10);
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
};
const yesNo = (v) => (v == null ? "—" : v ? "Sí" : "No");

export const formatCell = (value, type) => {
  if (type === MONEY) return fmtMoney(value);
  if (type === PCT) return fmtPct(value);
  if (type === DATE) return fmtDate(value);
  if (type === INT) return value == null ? "—" : Number(value).toLocaleString("es-NI");
  return value == null || value === "" ? "—" : String(value);
};

const sum = (rows, key) => Math.round(rows.reduce((acc, r) => acc + Number(r[key] || 0), 0) * 100) / 100;

const letterColumns = [
  { key: "letter", label: "Categoría" },
  { key: "count", label: "Créditos", type: INT },
  { key: "capital", label: "Capital", type: MONEY },
  { key: "interest", label: "Interés corriente", type: MONEY },
  { key: "portfolio", label: "Base de provisión", type: MONEY },
  { key: "share", label: "% de la cartera", type: PCT },
  { key: "provision_required", label: "Provisión requerida", type: MONEY },
];

const letterTotals = (rows) => ({
  letter: "Total",
  count: sum(rows, "count"),
  capital: sum(rows, "capital"),
  interest: sum(rows, "interest"),
  portfolio: sum(rows, "portfolio"),
  share: rows.length ? 100 : 0,
  provision_required: sum(rows, "provision_required"),
});

const groupLetterRows = (groups) =>
  groups.map((g) => ({
    loan_group_name: g.loan_group_name,
    ...Object.fromEntries(["A", "B", "C", "D", "E"].flatMap((l) => [[`${l}_portfolio`, g[l].portfolio], [`${l}_provision`, g[l].provision]])),
    total_portfolio: g.total.portfolio,
    total_provision: g.total.provision,
  }));

const groupLetterColumns = [
  { key: "loan_group_name", label: "Agrupación" },
  ...["A", "B", "C", "D", "E"].flatMap((l) => [
    { key: `${l}_portfolio`, label: `${l} cartera`, type: MONEY },
    { key: `${l}_provision`, label: `${l} provisión`, type: MONEY },
  ]),
  { key: "total_portfolio", label: "Total cartera", type: MONEY },
  { key: "total_provision", label: "Total provisión", type: MONEY },
];

const loanDetailColumns = [
  { key: "credit_code", label: "Crédito" },
  { key: "customer_name", label: "Cliente" },
  { key: "identification", label: "Identificación" },
  { key: "branch_name", label: "Sucursal" },
  { key: "loan_group_name", label: "Agrupación" },
  { key: "situation_label", label: "Situación" },
  { key: "defaulted_days", label: "Días mora", type: INT },
  { key: "provission_code", label: "Cat." },
  { key: "capital_balance", label: "Capital", type: MONEY },
  { key: "portfolio", label: "Base provisión", type: MONEY },
  { key: "provission_percentage", label: "% prov.", type: PCT },
  { key: "provision_required", label: "Provisión", type: MONEY },
];

const scopeNote = (data) => (data?.scoped ? ["Reporte limitado a las sucursales asignadas al usuario: no use estas cifras como totales de la institución."] : []);

const cutsNote = (data) => {
  const cuts = (data?.balance_cuts || []).map((c) => c.cut_date).filter(Boolean);
  const distinct = [...new Set(cuts)];
  if (distinct.length > 1 || (distinct.length === 1 && distinct[0] !== data.cut)) {
    return [`Saldos tomados del último cierre de cada sucursal hasta la fecha de corte (${distinct.map(fmtDate).join(", ")}).`];
  }
  if (!cuts.length) return ["No hay saldos cerrados a la fecha de corte."];
  return [];
};

// ---------------------------------------------------------------------------
// Especificación por reporte
// ---------------------------------------------------------------------------

const SPECS = {
  CLASIFICACION: (d) => {
    const t = d.totals;
    const booked = d.booked_provision;
    return {
      subtitle: `Al ${fmtDate(d.cut)}`,
      kpis: [
        { label: "Cartera (base de provisión)", value: t.portfolio, type: MONEY },
        { label: "Créditos / deudores", value: `${t.loans} / ${t.customers}` },
        { label: "Provisión requerida", value: t.provision_required, type: MONEY },
        ...(booked ? [{ label: "Provisión contabilizada (1408 + 1409)", value: booked.total, type: MONEY }] : []),
      ],
      notes: [
        ...cutsNote(d),
        ...(booked
          ? [`Diferencia contabilizada − requerida: ${fmtMoney(booked.difference)}. ${booked.difference < 0 ? "Falta constituir provisión (Art. 27: en el mismo mes que se determina)." : ""}`.trim()]
          : []),
        "La base de provisión es capital más interés corriente; en créditos vencidos solo capital (Arts. 30-33).",
        ...scopeNote(d),
      ],
      sections: [
        { title: "Resumen por categoría", columns: letterColumns, rows: d.by_letter, totals: letterTotals(d.by_letter) },
        { title: "Por agrupación de crédito y categoría", columns: groupLetterColumns, rows: groupLetterRows(d.by_group), wide: true },
        {
          title: "Por situación de la cartera",
          columns: [
            { key: "label", label: "Situación" },
            { key: "count", label: "Créditos", type: INT },
            { key: "portfolio", label: "Base de provisión", type: MONEY },
            { key: "provision_required", label: "Provisión requerida", type: MONEY },
          ],
          rows: d.by_situation,
        },
        { title: "Anexo: detalle por crédito", columns: loanDetailColumns, rows: d.rows, annex: true, wide: true },
      ],
    };
  },

  EXPOSICION: (d) => {
    const t = d.totals;
    const migrationRows = d.migration.map((m) => ({ ...m, from: `De ${m.from}` }));
    return {
      subtitle: `Trimestre al ${fmtDate(d.cut)}${d.previous_cut ? ` · comparado con ${fmtDate(d.previous_cut)}` : ""}`,
      kpis: [
        { label: "Cartera", value: t.portfolio, type: MONEY },
        { label: "Crecimiento vs trimestre anterior", value: t.growth_pct, type: PCT },
        { label: "Mora > 30 días", value: t.mora_30_pct, type: PCT },
        { label: "Cartera en riesgo", value: t.at_risk_pct, type: PCT },
        { label: "Provisión requerida", value: t.provision_required, type: MONEY },
        { label: "Cobertura de mora > 30", value: t.provision_coverage_pct, type: PCT },
        { label: "20 mayores deudores", value: t.top20_share, type: PCT },
      ],
      notes: [
        `Créditos que empeoraron de categoría en el trimestre: ${t.downgraded}; que mejoraron: ${t.upgraded}.`,
        "Cartera en riesgo = mora mayor a 30 días + créditos prorrogados y reestructurados.",
        `Otros activos de riesgo: ${d.other_assets.adjudicated_count} bien(es) adjudicado(s) por ${fmtMoney(d.other_assets.adjudicated_value)}, provisión ${fmtMoney(d.other_assets.adjudicated_provision)}.`,
        `Cobro judicial: ${d.judicial.active} caso(s) activo(s), cartera ${fmtMoney(d.judicial.portfolio)}.`,
        ...cutsNote(d),
        ...scopeNote(d),
      ],
      sections: [
        {
          title: "Indicadores del trimestre",
          columns: [{ key: "label", label: "Indicador" }, { key: "value", label: "Valor" }],
          rows: [
            { label: "Cartera (base de provisión)", value: fmtMoney(t.portfolio) },
            { label: "Cartera al trimestre anterior", value: fmtMoney(t.previous_portfolio) },
            { label: "Créditos / deudores", value: `${t.loans} / ${t.customers}` },
            { label: "Cartera con atraso", value: fmtMoney(t.in_default) },
            { label: "Mora mayor a 30 días", value: `${fmtMoney(t.mora_30)} (${fmtPct(t.mora_30_pct)})` },
            { label: "Mora mayor a 90 días", value: `${fmtMoney(t.mora_90)} (${fmtPct(t.mora_90_pct)})` },
            { label: "Cartera en riesgo", value: `${fmtMoney(t.at_risk)} (${fmtPct(t.at_risk_pct)})` },
            { label: "Provisión requerida", value: fmtMoney(t.provision_required) },
            ...(d.booked_provision ? [{ label: "Provisión contabilizada", value: fmtMoney(d.booked_provision.total) }] : []),
          ],
        },
        { title: "Calidad de la cartera por categoría", columns: letterColumns, rows: d.by_letter, totals: letterTotals(d.by_letter) },
        {
          title: "Migración de categorías (créditos vigentes en ambos cortes)",
          columns: [{ key: "from", label: "Categoría anterior" }, ...["A", "B", "C", "D", "E"].map((l) => ({ key: l, label: `A ${l}`, type: INT }))],
          rows: migrationRows,
        },
        { title: "Por agrupación de crédito y categoría", columns: groupLetterColumns, rows: groupLetterRows(d.by_group), wide: true },
        {
          title: "Concentración: 20 mayores deudores",
          columns: [
            { key: "customer_name", label: "Deudor" },
            { key: "identification", label: "Identificación" },
            { key: "loans", label: "Créditos", type: INT },
            { key: "worst", label: "Peor cat." },
            { key: "portfolio", label: "Saldo", type: MONEY },
            { key: "share", label: "% cartera", type: PCT },
          ],
          rows: d.top_debtors,
        },
        {
          title: "Por sucursal",
          columns: [
            { key: "label", label: "Sucursal" },
            { key: "count", label: "Créditos", type: INT },
            { key: "portfolio", label: "Cartera", type: MONEY },
            { key: "share", label: "% cartera", type: PCT },
            { key: "mora_pct", label: "Mora > 30", type: PCT },
            { key: "provision_required", label: "Provisión", type: MONEY },
          ],
          rows: d.by_branch,
        },
        {
          title: "Por actividad económica (15 mayores)",
          columns: [
            { key: "label", label: "Actividad" },
            { key: "count", label: "Créditos", type: INT },
            { key: "portfolio", label: "Cartera", type: MONEY },
            { key: "share", label: "% cartera", type: PCT },
            { key: "mora_pct", label: "Mora > 30", type: PCT },
          ],
          rows: d.by_activity,
        },
      ],
    };
  },

  ADJUDICADOS: (d) => ({
    subtitle: `Al ${fmtDate(d.cut)}`,
    kpis: [
      { label: "Bienes", value: d.totals.assets, type: INT },
      { label: "Valor contabilizado", value: d.totals.adjudicated_value, type: MONEY },
      { label: d.accounting ? "Provisión contabilizada" : "Provisión mínima", value: d.accounting ? d.totals.provision_booked : d.totals.provision_required, type: MONEY },
      { label: "Valor neto", value: d.totals.net_value, type: MONEY },
    ],
    notes: [
      "Provisión mínima por antigüedad desde la adjudicación: 30% hasta 12 meses, 60% hasta 24, 75% hasta 36 y 100% después; nunca menor a la provisión trasladada al adjudicar.",
      d.exchange_rate ? `Tipo de cambio para el umbral de US$25,000: ${d.exchange_rate}.` : "No hay tipo de cambio registrado a la fecha: no se pudo evaluar el umbral de US$25,000.",
      ...scopeNote(d),
    ],
    sections: [
      {
        title: "Listado de bienes",
        wide: true,
        columns: [
          { key: "adjudication_date", label: "Adjudicado", type: DATE },
          { key: "credit_code", label: "Crédito" },
          { key: "customer_name", label: "Deudor" },
          { key: "asset_type", label: "Tipo" },
          { key: "asset_description", label: "Descripción" },
          { key: "appraisal_value", label: "Avalúo al adjudicar", type: MONEY },
          { key: "adjudicated_value", label: "Valor contabilizado", type: MONEY },
          { key: "months_held", label: "Meses", type: INT },
          { key: "provision_pct", label: "% mínimo", type: PCT },
          { key: "provision_required", label: "Provisión mínima", type: MONEY },
          ...(d.accounting ? [{ key: "provision_booked", label: "Provisión contabilizada", type: MONEY }] : []),
          { key: "net_value", label: "Valor neto", type: MONEY },
          { key: "last_valuation_date", label: "Última valuación", type: DATE },
          { key: "next_valuation_date", label: "Próxima valuación", type: DATE },
          { key: "valuation_status_label", label: "Estado valuación" },
        ],
        rows: d.rows.map((r) => ({ ...r, valuation_status_label: VALUATION_STATUS[r.valuation_status] || r.valuation_status })),
        totals: {
          adjudication_date: "Total",
          adjudicated_value: d.totals.adjudicated_value,
          provision_required: d.totals.provision_required,
          provision_booked: d.totals.provision_booked,
          net_value: d.totals.net_value,
        },
      },
    ],
  }),

  MODIFICADOS: (d) => ({
    subtitle: `Al ${fmtDate(d.cut)} · período desde ${fmtDate(d.from)}`,
    kpis: [
      { label: "Créditos modificados vigentes", value: d.totals.loans, type: INT },
      { label: "Modificados en el período", value: d.totals.in_period, type: INT },
      { label: "Saldo", value: d.totals.portfolio, type: MONEY },
      { label: "Con atraso al corte", value: d.totals.in_default ?? 0, type: INT },
      { label: "Empeoraron de categoría", value: d.totals.deteriorated, type: INT },
      { label: "Sin seguimiento registrado", value: d.totals.without_followup ?? 0, type: INT },
    ],
    notes: ["Responsabilidad del Gerente General: intensificar el monitoreo e informar a la Junta Directiva al menos semestralmente (Art. 47).", ...scopeNote(d)],
    sections: [
      {
        title: "Resumen por tipo",
        columns: [
          { key: "label", label: "Tipo" },
          { key: "count", label: "Créditos", type: INT },
          { key: "portfolio", label: "Saldo", type: MONEY },
          { key: "in_default", label: "Con atraso", type: INT },
        ],
        rows: d.by_type,
      },
      {
        title: "Detalle",
        wide: true,
        columns: [
          { key: "credit_code", label: "Crédito" },
          { key: "customer_name", label: "Cliente" },
          { key: "branch_name", label: "Sucursal" },
          { key: "modification_label", label: "Tipo" },
          { key: "applied_date", label: "Aplicada", type: DATE },
          { key: "in_period_label", label: "En el período" },
          { key: "previous_classification", label: "Cat. antes" },
          { key: "current_classification", label: "Cat. actual" },
          { key: "defaulted_days", label: "Días mora", type: INT },
          { key: "portfolio", label: "Saldo", type: MONEY },
          { key: "provision_required", label: "Provisión", type: MONEY },
          { key: "last_followup_date", label: "Último seguimiento", type: DATE },
          { key: "behavior_label", label: "Comportamiento" },
        ],
        rows: d.rows.map((r) => ({
          ...r,
          in_period_label: yesNo(r.in_period),
          behavior_label: r.last_followup_behavior ? `${BEHAVIOR[r.last_followup_behavior] || r.last_followup_behavior}${r.breached_plan ? " · incumplió plan" : ""}` : "—",
        })),
      },
    ],
  }),

  JUDICIAL: (d) => ({
    subtitle: `Al ${fmtDate(d.cut)} · movimientos desde ${fmtDate(d.from)}`,
    kpis: [
      { label: "Casos activos", value: d.totals.active, type: INT },
      { label: "Saldo en cobro judicial", value: d.totals.portfolio, type: MONEY },
      { label: "Monto demandado", value: d.totals.claim_amount, type: MONEY },
      { label: "Gastos legales", value: d.totals.expenses, type: MONEY },
      { label: "Expedientes sin movimiento en el período", value: d.totals.not_updated, type: INT },
    ],
    notes: [
      "El expediente judicial debe mantenerse actualizado mes a mes (Art. 50). «Actualizado» = el caso o la bitácora de cobranza judicial tuvo movimiento en el período.",
      "Las columnas «Situación actual» y «Probabilidad de recuperación» las completa el abogado responsable.",
      ...scopeNote(d),
    ],
    sections: [
      {
        title: "Casos",
        wide: true,
        columns: [
          { key: "credit_code", label: "Crédito" },
          { key: "customer_name", label: "Deudor" },
          { key: "case_number", label: "Expediente" },
          { key: "court", label: "Juzgado" },
          { key: "lawyer_name", label: "Abogado" },
          { key: "filed_date", label: "Presentada", type: DATE },
          { key: "status_label", label: "Estado" },
          { key: "defaulted_days", label: "Días mora", type: INT },
          { key: "classification", label: "Cat." },
          { key: "portfolio", label: "Saldo", type: MONEY },
          { key: "claim_amount", label: "Demandado", type: MONEY },
          { key: "total_expenses", label: "Gastos", type: MONEY },
          { key: "last_movement_date", label: "Último movimiento", type: DATE },
          { key: "updated_label", label: "Actualizado" },
          { key: "lawyer_status", label: "Situación actual (abogado)" },
          { key: "recovery_probability", label: "Probabilidad de recuperación" },
        ],
        rows: d.rows.map((r) => ({ ...r, updated_label: r.active ? yesNo(r.file_updated_in_period) : "—", lawyer_status: "", recovery_probability: "" })),
      },
    ],
  }),

  CLIENTES_DESACTUALIZADOS: (d) => ({
    subtitle: `Al ${fmtDate(d.as_of)}`,
    kpis: [
      { label: "Deudores con crédito vigente", value: d.totals.customers, type: INT },
      { label: "Información vencida (> 12 meses)", value: d.totals.overdue, type: INT },
      { label: "Por vencer", value: d.totals.due_soon, type: INT },
      { label: "Saldo de los vencidos", value: d.totals.overdue_balance, type: MONEY },
    ],
    notes: ["La información de los créditos debe estar actualizada y analizada con una periodicidad máxima de 12 meses (Art. 61).", ...scopeNote(d)],
    sections: [
      {
        title: "Clientes",
        columns: [
          { key: "customer_code", label: "Código" },
          { key: "customer_name", label: "Cliente" },
          { key: "identification", label: "Identificación" },
          { key: "branch_name", label: "Sucursal" },
          { key: "active_loans", label: "Créditos", type: INT },
          { key: "balance", label: "Saldo", type: MONEY },
          { key: "last_update", label: "Última actualización", type: DATE },
          { key: "last_update_source", label: "Fuente" },
          { key: "due_date", label: "Vence", type: DATE },
          { key: "status_label", label: "Estado" },
        ],
        rows: d.rows.map((r) => ({ ...r, status_label: CUSTOMER_STATUS[r.status] || r.status })),
      },
    ],
  }),

  VALUACIONES: (d) => ({
    subtitle: `Al ${fmtDate(d.as_of)}`,
    kpis: [
      { label: "Garantías de créditos vigentes", value: d.totals.guarantees, type: INT },
      { label: "Inmuebles adjudicados", value: d.totals.adjudicated, type: INT },
      { label: "Valuaciones vencidas", value: d.totals.overdue, type: INT },
      { label: "Por vencer", value: d.totals.due_soon, type: INT },
      { label: "Garantías sin clasificar", value: d.totals.without_kind, type: INT },
    ],
    notes: [
      ...(d.migrated === false ? ["Falta la migración del cumplimiento NGRC: no se pueden evaluar las garantías."] : []),
      "Sin avalúo registrado se toma como última valuación la de constitución de la garantía (o la de adjudicación del bien).",
      "Un crédito reestructurado requiere nueva valuación de su garantía (Art. 41 num. 1 y 2.3).",
      ...scopeNote(d),
    ],
    sections: [
      {
        title: "Garantías",
        wide: true,
        columns: [
          { key: "guarantee_id", label: "Garantía" },
          { key: "description", label: "Descripción" },
          { key: "kind_label", label: "Tipo" },
          { key: "credit_code", label: "Crédito" },
          { key: "customer_name", label: "Deudor" },
          { key: "classification", label: "Cat." },
          { key: "loan_balance", label: "Saldo del crédito", type: MONEY },
          { key: "last_valuation_value", label: "Último avalúo", type: MONEY },
          { key: "last_valuation_date", label: "Fecha avalúo", type: DATE },
          { key: "next_valuation_date", label: "Próxima valuación", type: DATE },
          { key: "status_label", label: "Estado" },
          { key: "note", label: "Observación" },
        ],
        rows: (d.guarantees || []).map((r) => ({ ...r, status_label: VALUATION_STATUS[r.status] || r.status })),
        assetType: "GARANTIA",
      },
      {
        title: "Inmuebles adjudicados",
        wide: true,
        columns: [
          { key: "adjudication_id", label: "Adjudicación" },
          { key: "description", label: "Descripción" },
          { key: "credit_code", label: "Crédito" },
          { key: "customer_name", label: "Deudor" },
          { key: "adjudicated_value", label: "Valor contable", type: MONEY },
          { key: "value_usd_label", label: "Valor US$" },
          { key: "last_valuation_value", label: "Último avalúo", type: MONEY },
          { key: "last_valuation_date", label: "Fecha avalúo", type: DATE },
          { key: "appraiser_name", label: "Perito" },
          { key: "next_valuation_date", label: "Próxima valuación", type: DATE },
          { key: "status_label", label: "Estado" },
          { key: "note", label: "Observación" },
        ],
        rows: (d.adjudicated || []).map((r) => ({
          ...r,
          value_usd_label: r.value_usd == null ? "Sin tipo de cambio" : `US$ ${Number(r.value_usd).toLocaleString("es-NI", { minimumFractionDigits: 2 })}`,
          status_label: VALUATION_STATUS[r.status] || r.status,
        })),
        assetType: "ADJUDICACION",
      },
    ],
  }),
};

export const reportSpec = (type, data) => {
  const meta = REPORT_TYPES[type];
  const build = SPECS[type];
  if (!meta || !build || !data) return null;
  return { type, title: meta.title, article: meta.article, ...build(data) };
};

// ---------------------------------------------------------------------------
// Impresión
// ---------------------------------------------------------------------------

const esc = (value) =>
  value == null ? "" : String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const isNumeric = (type) => type === MONEY || type === INT || type === PCT;

const tableHtml = (section) => {
  if (!section.rows.length) return `<p class="muted">Sin registros.</p>`;
  const head = section.columns.map((c) => `<th class="${isNumeric(c.type) ? "right" : ""}">${esc(c.label)}</th>`).join("");
  const body = section.rows
    .map((r) => `<tr>${section.columns.map((c) => `<td class="${isNumeric(c.type) ? "right" : ""}">${esc(formatCell(r[c.key], c.type))}</td>`).join("")}</tr>`)
    .join("");
  const totals = section.totals
    ? `<tr class="total">${section.columns.map((c) => `<td class="${isNumeric(c.type) ? "right" : ""}">${section.totals[c.key] == null ? "" : esc(formatCell(section.totals[c.key], c.type))}</td>`).join("")}</tr>`
    : "";
  return `<table class="report-table${section.wide ? " wide" : ""}"><thead><tr>${head}</tr></thead><tbody>${body}${totals}</tbody></table>`;
};

export const buildNgrcReportHtml = ({ company = {}, user = {}, spec }) => {
  const kpis = (spec.kpis || [])
    .map((k) => `<div class="kpi"><div class="v">${esc(k.type ? formatCell(k.value, k.type) : k.value)}</div><div class="l">${esc(k.label)}</div></div>`)
    .join("");
  const notes = (spec.notes || []).map((n) => `<li>${esc(n)}</li>`).join("");
  const sections = (spec.sections || [])
    .map((s) => `<div class="${s.annex ? "annex" : ""}"><h2>${esc(s.title)}</h2>${tableHtml(s)}</div>`)
    .join("");
  return `
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>${esc(spec.title)} ${esc(spec.subtitle || "")}</title>
      ${reportStyles}
      <style>
        @page { size: letter landscape; margin: 10mm; }
        h2 { font-size: 11.5px; color: #0B3D91; margin: 12px 0 4px; text-transform: uppercase; }
        .kpis { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 10px; }
        .kpi { flex: 1 1 140px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 6px 8px; }
        .kpi .v { font-size: 14px; font-weight: 800; color: #0B3D91; }
        .kpi .l { font-size: 8.5px; color: #475569; text-transform: uppercase; }
        ul.notes { margin: 4px 0 8px 16px; padding: 0; font-size: 9px; color: #334155; }
        table.report-table { width: 100%; border-collapse: collapse; }
        table.report-table th, table.report-table td { border: 1px solid #E2E8F0; padding: 3px 4px; font-size: 8.5px; vertical-align: top; }
        table.report-table.wide th, table.report-table.wide td { font-size: 7.5px; }
        table.report-table th { text-align: left; }
        tr.total td { font-weight: 800; background: #F8FAFC; }
        .right { text-align: right; }
        .muted { color: #64748B; font-size: 9px; }
        .annex { page-break-before: always; }
        .signatures { display: flex; gap: 40px; margin-top: 40px; }
        .signatures div { flex: 1; border-top: 1px solid #334155; padding-top: 4px; text-align: center; font-size: 9px; }
      </style>
    </head>
    <body>
      ${buildHeader({ company, title: spec.title.toUpperCase(), subtitle: `${spec.subtitle || ""} · ${spec.article} ${NORM_REF}`, user })}
      <div class="kpis">${kpis}</div>
      ${notes ? `<ul class="notes">${notes}</ul>` : ""}
      ${sections}
      <div class="signatures"><div>Elaborado por</div><div>Revisado por</div><div>Gerente General</div></div>
      <div class="report-footer">${esc(NORM_NAME)} (${esc(NORM_REF)}). Generado desde CrediMaster el ${dayjs().format("DD/MM/YYYY HH:mm")}.</div>
    </body>
  </html>`;
};

export const printNgrcReport = (params) => openReport(buildNgrcReportHtml(params));

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

const excelValue = (value, type) => {
  if (value == null || value === "") return "";
  if (type === MONEY || type === INT || type === PCT) return Number(value);
  if (type === DATE) return String(value).slice(0, 10);
  return String(value);
};

const sheetName = (title, used) => {
  let base = String(title).replace(/[\\/?*[\]:]/g, " ").slice(0, 28).trim() || "Hoja";
  let name = base;
  let i = 2;
  while (used.has(name)) name = `${base.slice(0, 25)} ${i++}`;
  used.add(name);
  return name;
};

export const buildNgrcWorkbook = (spec, { companyName = "" } = {}) => {
  const wb = XLSX.utils.book_new();
  const used = new Set();
  const summary = [
    [spec.title],
    [`${spec.article} ${NORM_REF}`],
    [companyName],
    [spec.subtitle || ""],
    [],
    ...(spec.kpis || []).map((k) => [k.label, k.type ? excelValue(k.value, k.type) : k.value]),
    [],
    ...(spec.notes || []).map((n) => [n]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), sheetName("Resumen", used));
  for (const s of spec.sections || []) {
    const header = s.columns.map((c) => c.label);
    const rows = s.rows.map((r) => s.columns.map((c) => excelValue(r[c.key], c.type)));
    if (s.totals) rows.push(s.columns.map((c) => excelValue(s.totals[c.key], c.type)));
    const aoa = rows.length ? [header, ...rows] : [header, ["Sin registros"]];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = s.columns.map((c) => ({ wch: isNumeric(c.type) ? 16 : c.type === DATE ? 12 : Math.min(40, Math.max(10, c.label.length + 4)) }));
    XLSX.utils.book_append_sheet(wb, ws, sheetName(s.title, used));
  }
  return wb;
};

export const exportNgrcExcel = (spec, { companyName, fileName } = {}) => {
  const wb = buildNgrcWorkbook(spec, { companyName });
  XLSX.writeFile(wb, fileName || `NGRC_${spec.type}_${dayjs().format("YYYYMMDD")}.xlsx`);
};

// ---------------------------------------------------------------------------
// Calendario de obligaciones (impresión / Excel)
// ---------------------------------------------------------------------------

export const OBLIGATION_STATUS = {
  CUMPLIDO: { label: "Cumplido", color: "success" },
  CUMPLIDO_TARDE: { label: "Cumplido fuera de plazo", color: "warning" },
  EN_PROCESO: { label: "En proceso", color: "info" },
  PENDIENTE: { label: "Pendiente", color: "default" },
  POR_VENCER: { label: "Por vencer", color: "warning" },
  VENCIDO: { label: "Vencido", color: "error" },
  NO_APLICA: { label: "No aplica", color: "default" },
  SIN_PENDIENTES: { label: "Al día", color: "success" },
};

const DUE_BASIS = {
  NORMA: "Plazo de la norma",
  INTERNO: "Plazo interno",
  ESTIMADO: "Estimado (falta registrar la sesión de Junta)",
  CONFIGURADO: "Día configurado del ICC",
  PRIMER_REGISTRO: "Sin registro previo: cierre del año",
};

export const obligationsSpec = (data) => ({
  type: "OBLIGACIONES",
  title: "Calendario de cumplimiento NGRC",
  article: "Arts. 4, 9, 10, 14, 27, 41, 47, 50, 54, 61, 62 y 81",
  subtitle: `Al ${fmtDate(data.as_of)}`,
  kpis: [
    { label: "Obligaciones vencidas", value: data.alerts.overdue, type: INT },
    { label: "Por vencer", value: data.alerts.due_soon, type: INT },
  ],
  notes: [
    `Aviso con ${data.settings.dias_aviso} días de anticipación. Plazo interno para reportes sin día fijado por la norma: ${data.settings.dias_plazo_interno} días tras el corte.`,
    ...(data.settings.cumplimiento_desde ? [`Seguimiento desde ${fmtDate(data.settings.cumplimiento_desde)}.`] : []),
  ],
  sections: [
    {
      title: "Obligaciones",
      wide: true,
      columns: [
        { key: "article", label: "Artículo" },
        { key: "title", label: "Obligación" },
        { key: "audience_label", label: "Destino" },
        { key: "period", label: "Período" },
        { key: "due_date", label: "Vence", type: DATE },
        { key: "basis", label: "Base del plazo" },
        { key: "status_text", label: "Estado" },
        { key: "done", label: "Último cumplimiento" },
      ],
      rows: data.obligations.map((o) => {
        // Período anterior al inicio del seguimiento: se muestra el próximo.
        const shown = o.status === "NO_APLICA" && o.next ? { ...o.next, period_label: `${o.next.period_label} (próximo)` } : o.current || {};
        return {
          article: o.article,
          title: o.title,
          audience_label: o.audience_label,
          period: shown.period_label || "",
          due_date: shown.due_date || o.due_date,
          basis: DUE_BASIS[shown.due_basis] || "",
          status_text: `${OBLIGATION_STATUS[o.status]?.label || o.status}${o.current?.overdue ? ` (${o.current.overdue} vencidos)` : ""}${o.current?.note ? ` · ${o.current.note}` : ""}`,
          done: o.current?.record?.completed_date ? fmtDate(o.current.record.completed_date) : o.history?.[0]?.completed_date ? fmtDate(o.history[0].completed_date) : "",
        };
      }),
    },
  ],
});

export { DUE_BASIS, VALUATION_STATUS };
