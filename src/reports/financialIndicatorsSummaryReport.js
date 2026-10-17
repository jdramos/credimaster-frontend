// src/reports/financialIndicatorsSummaryReport.js — impresión del resumen
// ejecutivo de los Indicadores financieros (formato CONAMI), con la tabla de
// los 28 indicadores. Datos: GET /api/accounting/financial-indicators (ver
// components/accounting/FinancialIndicators.jsx).
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";
import { openReport } from "./reportViewer";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const periodLabel = (p) => {
  if (!p) return "";
  const [y, m] = String(p).slice(0, 7).split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
};

const esc = (value) =>
  value == null
    ? ""
    : String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Misma escala que la pantalla: porcentajes tal cual; "veces" vienen x100.
const fmt = (v, unit) => {
  if (v == null) return "—";
  if (unit === "veces") return `${(v / 100).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} x`;
  return `${v.toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

export const LEVELS = {
  FUERTE: { label: "Fuerte", color: "#166534", bg: "#DCFCE7" },
  FAVORABLE: { label: "Favorable", color: "#1E40AF", bg: "#DBEAFE" },
  OBSERVACION: { label: "En observación", color: "#92400E", bg: "#FEF3C7" },
  DEBIL: { label: "Débil", color: "#991B1B", bg: "#FEE2E2" },
};

const levelChip = (ind) => {
  const l = LEVELS[ind.level];
  if (!l) return `<span style="color:#64748B;">${ind.polarity === "neutral" ? "Estructura" : "—"}</span>`;
  return `<span style="display:inline-block;padding:1px 6px;border-radius:8px;background:${l.bg};color:${l.color};font-weight:800;white-space:nowrap;">${l.label}</span>`;
};

const list = (items) =>
  items?.length ? `<ul style="margin:2px 0 0 14px;padding:0;">${items.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : `<div style="color:#64748B;">—</div>`;

export const buildFinancialIndicatorsSummaryHtml = ({ company = {}, user = {}, data }) => {
  const counts = { FUERTE: 0, FAVORABLE: 0, OBSERVACION: 0, DEBIL: 0 };
  (data.indicators || []).forEach((i) => {
    if (i.level) counts[i.level] += 1;
  });
  const comparing = Boolean(data.compare_institution);
  const warnings = data.summary?.data_warnings || [];

  const indicatorRows = (data.groups || [])
    .map((g) => {
      const items = data.indicators.filter((i) => i.group === g.key);
      if (!items.length) return "";
      return `
        <tr><td colspan="${comparing ? 6 : 5}" style="background:#E8EEF8;font-weight:800;">${esc(g.label)}</td></tr>
        ${items
          .map(
            (i) => `
          <tr>
            <td>${esc(i.label)}</td>
            <td class="right nowrap"><strong>${fmt(i.value, i.unit)}</strong></td>
            <td class="right nowrap">${fmt(i.previous, i.unit)}</td>
            <td class="right nowrap">${fmt(i.sector?.median, i.unit)}</td>
            ${comparing ? `<td class="right nowrap">${fmt(i.compare_value, i.unit)}</td>` : ""}
            <td class="center">${levelChip(i)}</td>
          </tr>`,
          )
          .join("")}`;
    })
    .join("");

  return `
  <html>
    <head>
      <title>Indicadores financieros — Resumen ejecutivo ${esc(periodLabel(data.period))}</title>
      ${reportStyles}
      <style>
        .right { text-align: right; }
        .center { text-align: center; }
        .pillar { margin-top: 5px; }
        .pillar-title { font-size: 9px; font-weight: 800; color: #0057B8; text-transform: uppercase; letter-spacing: .3px; }
        .pillar-text { line-height: 1.45; text-align: justify; }
        .three-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 6px; }
        .three-cols > div { border: 1px solid #D8E2F0; padding: 5px; }
        .warn { border: 1px solid #F59E0B; background: #FFFBEB; padding: 6px; margin-top: 6px; }
      </style>
    </head>
    <body>
      ${buildHeader({
        company,
        title: "INDICADORES FINANCIEROS — RESUMEN EJECUTIVO",
        subtitle: `Período: ${periodLabel(data.period)} (corte contable ${data.cut_date})`,
        user,
      })}

      <div class="report-summary">
        ${Object.entries(LEVELS)
          .map(
            ([k, l]) => `
          <div class="summary-item" style="border-color:${l.color}33;background:${l.bg};">
            <div class="summary-label" style="color:${l.color};">${l.label}</div>
            <div class="summary-value" style="color:${l.color};">${counts[k]} indicador${counts[k] === 1 ? "" : "es"}</div>
          </div>`,
          )
          .join("")}
      </div>

      <div class="note" style="padding:0 0 2px;">
        ${
          data.sector
            ? `Comparado con el sector según el reporte de Indicadores Financieros de la CONAMI de ${esc(periodLabel(data.sector.period))} (${esc(data.sector.institutions_count)} instituciones).`
            : "Sin reporte de la CONAMI cargado para comparar con el sector."
        }
        ${comparing ? ` Comparación adicional con: <strong>${esc(data.compare_institution)}</strong>.` : ""}
        ${data.sector_period_mismatch ? ` El reporte del sector es de un mes distinto al período consultado.` : ""}
      </div>

      ${
        warnings.length
          ? `<div class="warn"><strong>Revise la contabilidad antes de interpretar los indicadores:</strong>${list(warnings)}</div>`
          : ""
      }

      <div class="report-section">
        <div class="section-header"><div class="section-title">Resumen ejecutivo para la Junta Directiva</div></div>
        ${data.summary?.overview ? `<div class="pillar"><div class="pillar-text">${esc(data.summary.overview)}</div></div>` : ""}
        ${(data.summary?.paragraphs || [])
          .map(
            (p) => `
          <div class="pillar">
            <div class="pillar-title">${esc(p.pillar)}</div>
            <div class="pillar-text">${esc(p.text)}</div>
          </div>`,
          )
          .join("")}
        ${data.summary?.conclusion ? `<div class="pillar"><div class="pillar-text"><strong>${esc(data.summary.conclusion)}</strong></div></div>` : ""}
        <div class="three-cols">
          <div><div class="pillar-title" style="color:#166534;">Fortalezas</div>${list(data.summary?.strengths)}</div>
          <div><div class="pillar-title" style="color:#991B1B;">Alertas</div>${list(data.summary?.alerts)}</div>
          <div><div class="pillar-title" style="color:#92400E;">En observación</div>${list(data.summary?.watch)}</div>
        </div>
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">Indicadores</div></div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Indicador</th>
              <th>Su institución</th>
              <th>Mes anterior</th>
              <th>Mediana sector</th>
              ${comparing ? `<th>${esc(data.compare_institution)}</th>` : ""}
              <th>Nivel</th>
            </tr>
          </thead>
          <tbody>${indicatorRows}</tbody>
        </table>
      </div>

      <div class="note" style="color:#64748B;font-size:8.5px;margin-top:6px;">
        Calculado con los asientos contabilizados hasta la fecha de corte, según las cuentas del Manual Único de Cuentas.
        El nivel compara el resultado con los cuartiles de las IMF del reporte de la CONAMI; las referencias generales
        (por ejemplo, mora mayor a 10%) son criterios prudenciales de microfinanzas, no límites normativos.
      </div>

      <div class="report-footer">
        Generado desde CrediMaster el ${dayjs().format("DD/MM/YYYY HH:mm")}
      </div>
    </body>
  </html>`;
};

export const printFinancialIndicatorsSummary = (params) => openReport(buildFinancialIndicatorsSummaryHtml(params));
