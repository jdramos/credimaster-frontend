// src/reports/boardReport.js — Informe de gestión mensual a la Junta
// Directiva: carta redactada (GET /api/dashboard/board-report, ver
// boardReportNarrative.js en el backend) más un anexo de cifras.
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";
import { openReport } from "./reportViewer";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const monthYear = (p) => {
  const [y, m] = String(p || "").slice(0, 7).split("-");
  return m ? `${MONTHS[Number(m) - 1]} de ${y}` : "";
};
const longDate = (d) => {
  const x = dayjs(d);
  return `${x.date()} de ${MONTHS[x.month()]} de ${x.year()}`;
};

const esc = (value) =>
  value == null
    ? ""
    : String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const money = (v) => {
  if (v == null) return "—";
  const x = Math.round(Number(v));
  return `${x < 0 ? "-" : ""}C$${Math.abs(x).toLocaleString("en-US")}`;
};
const pct = (v, dec = 1) => (v == null ? "—" : `${Number(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })}%`);
const int = (v) => (v == null ? "—" : Number(v).toLocaleString("en-US"));
const variation = (cur, prev) => {
  if (cur == null || prev == null || !Number(prev)) return "—";
  const v = ((Number(cur) - Number(prev)) / Math.abs(Number(prev))) * 100;
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
};
const pointsDelta = (cur, prev) => {
  if (cur == null || prev == null) return "—";
  const v = Number(cur) - Number(prev);
  return `${v > 0 ? "+" : ""}${v.toFixed(2)} pp`;
};

// Párrafos de texto libre escritos por quien firma (comentarios adicionales).
const freeText = (text) =>
  String(text || "")
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");

const keyFiguresTable = (d) => {
  const p = d.portfolio;
  const i = d.indicators;
  const rows = [
    ["Cartera bruta", money(p.gross), money(p.gross_prev), variation(p.gross, p.gross_prev)],
    ["Créditos vigentes", int(p.alive_loans), int(p.alive_loans_prev), variation(p.alive_loans, p.alive_loans_prev)],
    ["Clientes activos", int(d.customers.active), int(d.customers.active_prev), variation(d.customers.active, d.customers.active_prev)],
    ["Cartera en mora", money(p.mora), money(p.mora_prev), variation(p.mora, p.mora_prev)],
    ["Mora / cartera bruta", pct(i.mora.value, 2), pct(i.mora.previous, 2), pointsDelta(i.mora.value, i.mora.previous)],
    ["Provisiones", money(p.provisions), money(p.provisions_prev), variation(p.provisions, p.provisions_prev)],
    ["Colocación del mes", money(d.placement.amount), money(d.placement.prev_amount), variation(d.placement.amount, d.placement.prev_amount)],
    ["Créditos desembolsados", int(d.placement.loans), int(d.placement.prev_loans), variation(d.placement.loans, d.placement.prev_loans)],
    ["Recuperación del mes", money(d.collections.total), money(d.collections.prev_total), variation(d.collections.total, d.collections.prev_total)],
    ["Eficiencia de cobro", pct(d.collections.efficiency), pct(d.collections.prev_efficiency), pointsDelta(d.collections.efficiency, d.collections.prev_efficiency)],
  ];
  return `
    <table class="report-table annex">
      <thead><tr><th>Concepto</th><th class="right">${esc(monthYear(d.period))}</th><th class="right">${esc(monthYear(d.previous_period))}</th><th class="right">Variación</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td class="right"><strong>${r[1]}</strong></td><td class="right">${r[2]}</td><td class="right">${r[3]}</td></tr>`).join("")}</tbody>
    </table>`;
};

const placementTable = (d) => {
  const rows = d.placement.by_branch || [];
  if (!rows.length) return "";
  const total = rows.reduce((s, r) => ({ amount: s.amount + r.amount, loans: s.loans + r.loans, goal: s.goal + r.goal }), { amount: 0, loans: 0, goal: 0 });
  return `
    <div class="annex-title">Colocación por sucursal</div>
    <table class="report-table annex">
      <thead><tr><th>Sucursal</th><th class="right">Créditos</th><th class="right">Colocado</th><th class="right">Meta</th><th class="right">Cumplimiento</th></tr></thead>
      <tbody>
        ${rows.map((r) => `<tr><td>${esc(r.name)}</td><td class="right">${int(r.loans)}</td><td class="right">${money(r.amount)}</td><td class="right">${r.goal ? money(r.goal) : "—"}</td><td class="right">${pct(r.achievement)}</td></tr>`).join("")}
        <tr class="total"><td>Total</td><td class="right">${int(total.loans)}</td><td class="right">${money(total.amount)}</td><td class="right">${total.goal ? money(total.goal) : "—"}</td><td class="right">${total.goal ? pct((total.amount / total.goal) * 100) : "—"}</td></tr>
      </tbody>
    </table>`;
};

// Cartera por producto financiero (d.products, del auxiliar de cartera).
const productsTable = (d) => {
  const rows = (d.products?.rows || []).filter((r) => r.portfolio.capital || r.placement.loans || r.previous?.capital);
  if (!rows.length) return "";
  const t = d.products.totals;
  return `
    <div class="annex-title">Cartera por producto</div>
    <table class="report-table annex">
      <thead><tr><th>Producto</th><th class="right">Cartera</th><th class="right">Particip.</th><th class="right">Var. vs ${esc(monthYear(d.previous_period))}</th><th class="right">En riesgo</th><th class="right">PAR 30</th><th class="right">Colocado</th><th class="right">Créditos</th></tr></thead>
      <tbody>
        ${rows.map((r) => `<tr><td>${esc(r.code ? `${r.code} — ${r.name}` : r.name)}</td><td class="right">${money(r.portfolio.capital)}</td><td class="right">${pct(r.portfolio.share)}</td><td class="right">${variation(r.portfolio.capital, r.previous?.capital)}</td><td class="right">${pct(r.portfolio.overdue_pct, 2)}</td><td class="right">${pct(r.portfolio.par30_pct, 2)}</td><td class="right">${money(r.placement.amount)}</td><td class="right">${int(r.placement.loans)}</td></tr>`).join("")}
        <tr class="total"><td>Total</td><td class="right">${money(t.portfolio.capital)}</td><td class="right">100.0%</td><td class="right">${variation(t.portfolio.capital, t.previous?.capital)}</td><td class="right">${pct(t.portfolio.overdue_pct, 2)}</td><td class="right">${pct(t.portfolio.par30_pct, 2)}</td><td class="right">${money(t.placement.amount)}</td><td class="right">${int(t.placement.loans)}</td></tr>
      </tbody>
    </table>
    <div class="small">Saldo de capital según el auxiliar de cartera al último cierre del mes de cada sucursal; puede diferir de la cartera bruta contable. En riesgo (PAR 1): capital de créditos con al menos un día de atraso, distinto de la mora contable.</div>`;
};

const resultsTable = (d) => {
  const r = d.results;
  const b = d.budget?.has_lines ? d.budget : null;
  const rows = [
    ["Ingresos", money(r.income_month), money(r.income_ytd), b ? money(b.income_ytd_budget) : null],
    ["Gastos", money(r.expense_month), money(r.expense_ytd), b ? money(b.expense_ytd_budget) : null],
    ["Resultado", money(r.net_month), money(r.net_ytd), b ? money(b.income_ytd_budget - b.expense_ytd_budget) : null],
  ];
  return `
    <div class="annex-title">Resultados${b ? " y presupuesto" : ""}</div>
    <table class="report-table annex">
      <thead><tr><th>Concepto</th><th class="right">${d.is_partial ? "Mes (preliminar)" : "Mes"}</th><th class="right">Acumulado del año</th>${b ? '<th class="right">Presupuesto acumulado*</th>' : ""}</tr></thead>
      <tbody>${rows.map((x, idx) => `<tr${idx === 2 ? ' class="total"' : ""}><td>${x[0]}</td><td class="right">${x[1]}</td><td class="right">${x[2]}</td>${b ? `<td class="right">${x[3]}</td>` : ""}</tr>`).join("")}</tbody>
    </table>
    ${b ? '<div class="small">* Solo las cuentas incluidas en el presupuesto aprobado.</div>' : ""}`;
};

const indicatorsTable = (d) => {
  const i = d.indicators;
  const rows = [
    ["Mora / cartera bruta", i.mora],
    ["Autosuficiencia operativa", i.self_sufficiency],
    ["Rendimiento de la cartera", i.portfolio_yield],
    ["ROA", i.roa],
    ["ROE", i.roe],
    ["Fondos disponibles / activos", i.cash_to_assets],
    ["Gasto de personal / cartera", i.personnel_cost],
  ].filter(([, x]) => x && x.value != null);
  if (!rows.length) return "";
  const sector = Boolean(d.sector);
  return `
    <div class="annex-title">Indicadores financieros</div>
    <table class="report-table annex">
      <thead><tr><th>Indicador</th><th class="right">Institución</th><th class="right">Mes anterior</th>${sector ? '<th class="right">Mediana del sector</th>' : ""}</tr></thead>
      <tbody>${rows.map(([label, x]) => `<tr><td>${label}</td><td class="right"><strong>${pct(x.value, 2)}</strong></td><td class="right">${pct(x.previous, 2)}</td>${sector ? `<td class="right">${pct(x.sector_median, 2)}</td>` : ""}</tr>`).join("")}</tbody>
    </table>
    ${sector ? `<div class="small">Sector: reporte de indicadores de la CONAMI de ${esc(monthYear(d.sector.period))} (${int(d.sector.institutions_count)} instituciones).</div>` : ""}`;
};

export const buildBoardReportHtml = ({ company = {}, user = {}, data, signer = {}, comments = "", reportDate }) => {
  const n = data.narrative;
  const dateText = longDate(reportDate || dayjs());
  return `
  <html>
    <head>
      <title>Informe de gestión — ${esc(monthYear(data.period))}</title>
      ${reportStyles}
      <style>
        @page { size: letter; margin: 18mm 18mm 16mm; }
        .letter { font-family: Georgia, "Times New Roman", serif; font-size: 11.5px; line-height: 1.6; color: #1f2937; }
        .letter p { margin: 0 0 8px; text-align: justify; }
        .memo { display: grid; grid-template-columns: 70px 1fr; row-gap: 2px; margin: 10px 0 14px; font-family: Arial, sans-serif; font-size: 10.5px; border-top: 1px solid #CBD5E1; border-bottom: 1px solid #CBD5E1; padding: 6px 0; }
        .memo b { color: #334155; }
        .letter h3 { font-family: Arial, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: #0B3D91; margin: 14px 0 5px; }
        .letter ol { margin: 0 0 8px 18px; padding: 0; }
        .letter ol li { margin-bottom: 4px; text-align: justify; }
        .signature { margin-top: 28px; page-break-inside: avoid; }
        .signature .line { width: 220px; border-top: 1px solid #334155; margin-top: 42px; padding-top: 4px; font-family: Arial, sans-serif; font-size: 10.5px; }
        .annex { page-break-before: always; }
        .annex-page h2 { font-family: Arial, sans-serif; font-size: 13px; color: #0B3D91; margin: 0 0 4px; }
        .annex-title { font-family: Arial, sans-serif; font-weight: 800; font-size: 10px; color: #0B3D91; text-transform: uppercase; margin: 12px 0 4px; }
        table.annex td, table.annex th { font-size: 9.5px; }
        tr.total td { font-weight: 800; border-top: 1px solid #94A3B8; }
        .right { text-align: right; }
        .small { font-size: 8.5px; color: #64748B; margin-top: 2px; }
      </style>
    </head>
    <body>
      ${buildHeader({ company, title: "INFORME DE GESTIÓN", subtitle: `Junta Directiva · ${monthYear(data.period)}`, user })}

      <div class="letter">
        <div class="memo">
          <b>Para:</b><span>Junta Directiva${company.commercial_name || company.legal_name ? ` de ${esc(company.commercial_name || company.legal_name)}` : ""}</span>
          <b>De:</b><span>${esc([signer.name, signer.title].filter(Boolean).join(", ") || "Gerencia General")}</span>
          <b>Fecha:</b><span>${esc(dateText)}</span>
          <b>Asunto:</b><span>Informe de gestión de ${esc(monthYear(data.period))}${data.is_partial ? ` (cifras preliminares al ${esc(longDate(data.cut_date))})` : ""}</span>
        </div>

        <p>${esc(n.salutation)}</p>
        ${n.opening.map((p) => `<p>${esc(p)}</p>`).join("")}

        <h3>Resumen del mes</h3>
        ${n.highlights.map((p) => `<p>${esc(p)}</p>`).join("")}

        ${n.sections.map((s) => `<h3>${esc(s.title)}</h3><p>${s.paragraphs.map(esc).join(" ")}</p>`).join("")}

        ${comments && String(comments).trim() ? `<h3>Comentarios adicionales de la Gerencia</h3>${freeText(comments)}` : ""}

        <h3>Recomendaciones</h3>
        <ol>${n.recommendations.map((r) => `<li>${esc(r)}</li>`).join("")}</ol>

        <p>${esc(n.closing)}</p>

        <div class="signature">
          <p style="margin:0;">Atentamente,</p>
          <div class="line">
            <strong>${esc(signer.name || "")}</strong><br/>
            ${esc(signer.title || "Gerencia General")}
          </div>
        </div>
      </div>

      <div class="annex annex-page">
        <h2>Anexo: cifras del mes</h2>
        <div class="small">Corte contable al ${esc(longDate(data.cut_date))}. Cifras consolidadas de todas las sucursales.</div>
        <div class="annex-title">Cifras principales</div>
        ${keyFiguresTable(data)}
        ${placementTable(data)}
        ${productsTable(data)}
        ${resultsTable(data)}
        ${indicatorsTable(data)}
        <div class="report-footer">Generado desde CrediMaster el ${dayjs().format("DD/MM/YYYY HH:mm")}</div>
      </div>
    </body>
  </html>`;
};

export const printBoardReport = (params) => openReport(buildBoardReportHtml(params));
