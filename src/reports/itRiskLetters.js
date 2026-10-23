// src/reports/itRiskLetters.js — Riesgo Tecnológico (Norma CD-CONAMI-017-
// 01AGO21-2014): los dos escritos del Art. 28 al Presidente Ejecutivo de
// CONAMI (aviso inicial inmediato y detalle a 24 h) y el informe de la
// autoevaluación anual (Art. 16) para la Junta Directiva. Se imprimen a PDF
// desde el navegador (openReport) o se descargan como Word (.doc con HTML,
// que Word abre y permite editar antes de firmar).
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";
import { openReport } from "./reportViewer";

export const NORM_NAME = "Norma sobre Gestión de Riesgo Tecnológico para Instituciones de Microfinanzas";
export const NORM_REF = "Resolución CD-CONAMI-017-01AGO21-2014";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const esc = (value) =>
  value == null
    ? ""
    : String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Texto libre en párrafos, respetando los saltos de línea de quien lo escribió.
const paragraphs = (value) =>
  String(value || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");

export const longDate = (value) => {
  const d = dayjs(String(value || "").slice(0, 10));
  return d.isValid() ? `${d.date()} de ${MONTHS[d.month()]} de ${d.year()}` : "";
};

export const longDateTime = (value) => {
  if (!value) return "";
  const s = String(value).replace("T", " ");
  return `${longDate(s)}, ${s.slice(11, 16)} h`;
};

const money = (v) =>
  `C$ ${Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (v) => (v == null ? "—" : `${Number(v).toLocaleString("es-NI", { maximumFractionDigits: 1 })}%`);

const hoursBetween = (a, b) => {
  const x = dayjs(String(a).replace(" ", "T"));
  const y = dayjs(String(b).replace(" ", "T"));
  if (!x.isValid() || !y.isValid()) return null;
  const minutes = y.diff(x, "minute");
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
};

const companyName = (company = {}) => company.legal_name || company.commercial_name || "la institución";

const affectedCriteria = (incident) =>
  [
    incident.affects_confidentiality ? "confidencialidad" : null,
    incident.affects_integrity ? "integridad" : null,
    incident.affects_availability ? "disponibilidad" : null,
  ].filter(Boolean);

const letterStyles = `
  <style>
    @page { size: letter; margin: 22mm 22mm 20mm; }
    body { font-family: Georgia, "Times New Roman", serif; font-size: 12px; line-height: 1.55; color: #111827; }
    .letterhead { border-bottom: 2px solid #0B3D91; padding-bottom: 6px; margin-bottom: 18px; font-family: Arial, sans-serif; }
    .letterhead .name { font-size: 15px; font-weight: 800; color: #0B3D91; }
    .letterhead .line { font-size: 10px; color: #475569; }
    .place-date { text-align: right; margin-bottom: 14px; }
    .ref { font-family: Arial, sans-serif; font-size: 11px; margin-bottom: 12px; }
    .recipient { margin-bottom: 14px; }
    .recipient div { margin: 0; }
    .subject { font-weight: 700; margin: 10px 0 14px; }
    p { margin: 0 0 9px; text-align: justify; }
    h3 { font-family: Arial, sans-serif; font-size: 11.5px; text-transform: uppercase; letter-spacing: .3px; color: #0B3D91; margin: 14px 0 5px; }
    table.facts { width: 100%; border-collapse: collapse; margin: 6px 0 12px; font-family: Arial, sans-serif; font-size: 11px; }
    table.facts th { text-align: left; width: 34%; background: #F1F5F9; vertical-align: top; }
    table.facts th, table.facts td { border: 1px solid #CBD5E1; padding: 5px 7px; }
    .signature { margin-top: 42px; page-break-inside: avoid; }
    .signature .line { width: 260px; border-top: 1px solid #111827; margin-top: 50px; padding-top: 4px; }
    .footer-note { margin-top: 26px; font-family: Arial, sans-serif; font-size: 9px; color: #64748B; }
  </style>`;

const letterhead = (company = {}) => `
  <div class="letterhead">
    <div class="name">${esc(company.legal_name || company.commercial_name || "")}</div>
    ${company.legal_name && company.commercial_name && company.legal_name !== company.commercial_name ? `<div class="line">${esc(company.commercial_name)}</div>` : ""}
    <div class="line">${[company.tax_id ? `RUC ${esc(company.tax_id)}` : "", company.phone ? `Tel. ${esc(company.phone)}` : "", esc(company.address || "")].filter(Boolean).join(" · ")}</div>
  </div>`;

const recipientBlock = (settings = {}) => `
  <div class="recipient">
    ${settings.recipient_name ? `<div><strong>${esc(settings.recipient_name)}</strong></div>` : ""}
    <div>${esc(settings.recipient_title || "Presidente Ejecutivo")}</div>
    <div>${esc(settings.recipient_entity || "Comisión Nacional de Microfinanzas (CONAMI)")}</div>
    ${settings.recipient_address ? `<div>${esc(settings.recipient_address)}</div>` : ""}
    <div>Su despacho.</div>
  </div>`;

const salutation = (settings = {}) =>
  `Estimado(a) ${esc(settings.recipient_title || "Presidente Ejecutivo")}${settings.recipient_name ? ` ${esc(settings.recipient_name)}` : ""}:`;

const signatureBlock = (settings = {}, company = {}) => `
  <div class="signature">
    <p style="margin:0;">Atentamente,</p>
    <div class="line">
      <strong>${esc(settings.signer_name || "")}</strong><br/>
      ${esc(settings.signer_title || "Representante Legal")}<br/>
      ${esc(companyName(company))}
    </div>
  </div>`;

const factsTable = (rows) => `
  <table class="facts"><tbody>
    ${rows.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join("")}
  </tbody></table>`;

const typeInfo = (catalog, incident) => catalog?.incident_types?.[incident.incident_type] || {};

const pageShell = (title, body) => `
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>${esc(title)}</title>
      ${letterStyles}
    </head>
    <body>${body}</body>
  </html>`;

// Aviso inicial (Art. 28, "por escrito y de manera inmediata").
export const buildInitialNoticeHtml = ({ incident, settings = {}, company = {}, catalog = {}, reference = "", letterDate }) => {
  const type = typeInfo(catalog, incident);
  const criteria = affectedCriteria(incident);
  const date = letterDate || dayjs().format("YYYY-MM-DD");
  return pageShell(`Aviso inicial a CONAMI — ${incident.incident_number || ""}`, `
    ${letterhead(company)}
    <div class="place-date">${esc(settings.city || "Managua")}, ${esc(longDate(date))}</div>
    ${reference ? `<div class="ref">Ref.: ${esc(reference)}</div>` : ""}
    ${recipientBlock(settings)}
    <div class="subject">Asunto: Aviso de evento de tecnología de información — Art. 28 de la ${NORM_NAME}</div>
    <p>${salutation(settings)}</p>
    <p>En cumplimiento del artículo 28 de la ${NORM_NAME} (${NORM_REF}), ${esc(companyName(company))} le informa por este medio, de manera inmediata, la ocurrencia del siguiente evento:</p>
    ${factsTable([
      ["No. de registro interno", esc(incident.incident_number)],
      ["Tipo de evento", `${esc(type.label || incident.incident_type)}${type.article ? ` (${esc(type.article)})` : ""}`],
      ["Fecha y hora de ocurrencia", esc(longDateTime(incident.occurred_at))],
      ["Fecha y hora de detección", esc(longDateTime(incident.detected_at))],
      ["Sistemas afectados", esc(incident.affected_systems)],
      criteria.length ? ["Información afectada", `${esc(criteria.join(", "))} de la información de clientes`] : null,
      ["Clientes afectados (estimado)", esc(Number(incident.affected_customers_count || 0).toLocaleString("es-NI"))],
      ["Descripción", esc(incident.description)],
      incident.corrective_actions ? ["Medidas adoptadas a la fecha", esc(incident.corrective_actions)] : null,
    ].filter(Boolean))}
    <p>Conforme al mismo artículo, dentro de las veinticuatro (24) horas siguientes presentaremos el detalle del resultado y de las acciones tomadas para corregir el evento.</p>
    <p>Quedamos a su disposición para cualquier información adicional.</p>
    ${signatureBlock(settings, company)}
    <div class="footer-note">Generado desde CrediMaster — registro ${esc(incident.incident_number)}.</div>
  `);
};

// Informe de detalle (Art. 28, "dentro de las posteriores 24 horas").
export const buildDetailNoticeHtml = ({ incident, settings = {}, company = {}, catalog = {}, reference = "", letterDate }) => {
  const type = typeInfo(catalog, incident);
  const criteria = affectedCriteria(incident);
  const initial = (incident.notices || []).find((n) => n.notice_type === "INICIAL" && !n.voided_at);
  const date = letterDate || dayjs().format("YYYY-MM-DD");
  const causeLabel = catalog?.causes?.[incident.cause_category] || incident.cause_category || "";
  const statusLabel = catalog?.incident_statuses?.[incident.status] || incident.status;
  const loss = Number(incident.economic_loss || 0);
  const lostProfit = Number(incident.lost_profit || 0);
  return pageShell(`Informe de detalle a CONAMI — ${incident.incident_number || ""}`, `
    ${letterhead(company)}
    <div class="place-date">${esc(settings.city || "Managua")}, ${esc(longDate(date))}</div>
    ${reference ? `<div class="ref">Ref.: ${esc(reference)}</div>` : ""}
    ${recipientBlock(settings)}
    <div class="subject">Asunto: Informe de detalle del evento de tecnología de información ${esc(incident.incident_number)} — Art. 28 de la ${NORM_NAME}</div>
    <p>${salutation(settings)}</p>
    <p>${initial
      ? `En seguimiento a nuestro aviso del ${esc(longDateTime(initial.sent_at))} (ref. ${esc(initial.reference)}), y en`
      : "En"} cumplimiento del artículo 28 de la ${NORM_NAME} (${NORM_REF}), ${esc(companyName(company))} presenta el detalle del resultado y de las acciones tomadas para corregir el evento: ${esc(type.label || incident.incident_type)}.</p>

    <h3>1. Descripción del evento</h3>
    ${factsTable([
      ["No. de registro interno", esc(incident.incident_number)],
      ["Tipo de evento", `${esc(type.short || incident.incident_type)}${type.article ? ` (${esc(type.article)})` : ""}`],
      ["Ocurrencia", esc(longDateTime(incident.occurred_at))],
      ["Detección", esc(longDateTime(incident.detected_at))],
      ["Solución", incident.ended_at ? `${esc(longDateTime(incident.ended_at))} (duración ${esc(hoursBetween(incident.occurred_at, incident.ended_at))})` : "En proceso"],
    ])}
    ${paragraphs(incident.description)}

    <h3>2. Sistemas y clientes afectados</h3>
    ${factsTable([
      ["Sistemas afectados", esc(incident.affected_systems)],
      criteria.length ? ["Información afectada", `${esc(criteria.join(", "))} de la información de clientes`] : null,
      ["Clientes afectados", esc(Number(incident.affected_customers_count || 0).toLocaleString("es-NI"))],
      incident.affected_customers_detail ? ["Detalle", esc(incident.affected_customers_detail)] : null,
    ].filter(Boolean))}

    <h3>3. Causa</h3>
    <p><strong>${esc(causeLabel)}.</strong> ${esc(incident.cause || "")}</p>

    <h3>4. Resultado e impacto</h3>
    ${factsTable([
      ["Estado", esc(statusLabel)],
      ["Pérdida económica", esc(money(loss))],
      ["Frustración de ganancia", esc(money(lostProfit))],
      ["Impacto total estimado", `<strong>${esc(money(loss + lostProfit))}</strong>`],
    ])}

    <h3>5. Acciones tomadas para corregirlo</h3>
    ${paragraphs(incident.corrective_actions) || "<p>Las acciones correctivas se encuentran en ejecución; se informará su resultado.</p>"}

    <h3>6. Responsable</h3>
    <p>${esc(incident.responsible_name)}</p>

    <p>Quedamos a su disposición para ampliar cualquier aspecto de este informe.</p>
    ${signatureBlock(settings, company)}
    <div class="footer-note">Generado desde CrediMaster — registro ${esc(incident.incident_number)}.</div>
  `);
};

export const buildNoticeHtml = (noticeType, params) =>
  noticeType === "DETALLE" ? buildDetailNoticeHtml(params) : buildInitialNoticeHtml(params);

// ---------------------------------------------------------------------------
// Informe de la autoevaluación anual para la Junta Directiva (Art. 16).
// ---------------------------------------------------------------------------
const STATUS_LABELS = {
  PENDIENTE: "Sin evaluar", CUMPLE: "Cumple", PARCIAL: "Parcial", NO_CUMPLE: "No cumple", NO_APLICA: "No aplica",
};
const CATEGORY_LABELS = { GRAVE: "Grave", MODERADA: "Moderada", LEVE: "Leve" };
const EXPOSURE_LABELS = { BAJO: "Bajo", MODERADO: "Moderado", ALTO: "Alto", MUY_ALTO: "Muy alto" };

export const buildAssessmentReportHtml = ({ company = {}, user = {}, report }) => {
  const a = report.assessment;
  const s = report.summary;
  const losses = report.losses;
  const presented = a.status === "PRESENTADA";
  const gapsRows = s.gaps.map((g) => `
    <tr>
      <td>${esc(g.item_code)}</td>
      <td>${esc(g.requirement)}</td>
      <td>${esc(CATEGORY_LABELS[g.infraction_category])}<br/><span class="small">${esc(g.infraction_ref)}</span></td>
      <td>${esc(STATUS_LABELS[g.status])}</td>
      <td>${esc(g.improvement_plan || "")}</td>
      <td>${esc(g.responsible || "")}</td>
      <td>${esc(g.due_date ? dayjs(g.due_date).format("DD/MM/YYYY") : "")}</td>
    </tr>`).join("");
  const articleRows = s.by_article.map((r) => `
    <tr><td>${esc(r.article)}</td><td class="right">${r.total}</td><td class="right">${r.CUMPLE}</td><td class="right">${r.PARCIAL}</td>
    <td class="right">${r.NO_CUMPLE}</td><td class="right">${r.NO_APLICA}</td><td class="right">${r.PENDIENTE}</td><td class="right"><strong>${pct(r.compliance_pct)}</strong></td></tr>`).join("");
  const categoryRows = s.by_category.map((r) => `
    <tr><td>${esc(CATEGORY_LABELS[r.key])}</td><td class="right">${r.total}</td><td class="right">${r.CUMPLE}</td><td class="right">${r.PARCIAL}</td>
    <td class="right">${r.NO_CUMPLE}</td><td class="right">${r.NO_APLICA}</td><td class="right">${r.PENDIENTE}</td><td class="right"><strong>${pct(r.compliance_pct)}</strong></td></tr>`).join("");
  const lossRows = losses.by_type.map((t) => `
    <tr><td>${esc(t.label)}</td><td class="right">${t.count}</td><td class="right">${esc(money(t.economic_loss))}</td><td class="right">${esc(money(t.lost_profit))}</td><td class="right">${esc(money(t.total_impact))}</td><td class="right">${esc(money(t.max_impact))}</td></tr>`).join("");
  const annexRows = report.items.map((i) => `
    <tr>
      <td>${esc(i.item_code)}</td><td>${esc(i.article)}</td><td>${esc(i.requirement)}</td>
      <td>${esc(CATEGORY_LABELS[i.infraction_category])}</td><td>${esc(STATUS_LABELS[i.status])}</td>
      <td>${esc(i.evidence_notes || "")}${(i.evidence || []).filter((e) => !e.voided_at).length ? `<br/><span class="small">Adjuntos: ${esc(i.evidence.filter((e) => !e.voided_at).map((e) => e.file_name).join(", "))}</span>` : ""}</td>
      <td>${esc(i.responsible || "")}</td>
    </tr>`).join("");

  return `
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Autoevaluación de riesgo tecnológico ${esc(a.year)}</title>
      ${reportStyles}
      <style>
        @page { size: letter landscape; margin: 14mm; }
        body { font-family: Arial, sans-serif; color: #1f2937; }
        h2 { font-size: 13px; color: #0B3D91; margin: 14px 0 5px; text-transform: uppercase; }
        p { font-size: 11px; line-height: 1.5; margin: 0 0 7px; text-align: justify; }
        .kpis { display: flex; gap: 10px; margin: 8px 0 12px; }
        .kpi { flex: 1; border: 1px solid #CBD5E1; border-radius: 6px; padding: 7px 9px; }
        .kpi .v { font-size: 17px; font-weight: 800; color: #0B3D91; }
        .kpi .l { font-size: 9.5px; color: #475569; text-transform: uppercase; }
        table.report-table td, table.report-table th { font-size: 9.5px; vertical-align: top; }
        .right { text-align: right; }
        .small { font-size: 8.5px; color: #64748B; }
        .annex { page-break-before: always; }
      </style>
    </head>
    <body>
      ${buildHeader({ company, title: "AUTOEVALUACIÓN DE RIESGO TECNOLÓGICO", subtitle: `Año ${a.year} · Informe a la Junta Directiva (Art. 16)`, user })}

      <p>En cumplimiento del artículo 16 de la ${NORM_NAME} (${NORM_REF}), se presentan a la Junta Directiva de ${esc(companyName(company))} los resultados de la autoevaluación de ${esc(a.year)} y la evaluación del nivel de exposición al riesgo tecnológico. La lista de verificación cubre los artículos 5 a 18 y el aviso de eventos del artículo 28; cada requisito indica la categoría de infracción del artículo 21 que corresponde si no se cumple, para priorizar las brechas.</p>
      <p>Fecha de la autoevaluación: ${esc(longDate(a.assessment_date))}${a.coordinator ? `. Coordinó: ${esc(a.coordinator)}` : ""}.${presented ? ` Presentada a la Junta Directiva el ${esc(longDate(a.presented_to_board_at))}, acta ${esc(a.board_minutes_ref)}.` : " Documento en borrador, pendiente de presentación a la Junta Directiva."}</p>
      ${a.scope_notes ? paragraphs(a.scope_notes) : ""}

      <div class="kpis">
        <div class="kpi"><div class="v">${pct(s.compliance_pct)}</div><div class="l">Cumplimiento ponderado</div></div>
        <div class="kpi"><div class="v">${s.counts.NO_CUMPLE}</div><div class="l">Requisitos no cumplidos</div></div>
        <div class="kpi"><div class="v">${s.counts.PARCIAL}</div><div class="l">Cumplidos parcialmente</div></div>
        <div class="kpi"><div class="v">${s.by_category.find((c) => c.key === "GRAVE")?.NO_CUMPLE ?? 0}</div><div class="l">Brechas de categoría grave</div></div>
        <div class="kpi"><div class="v">${esc(a.exposure_level ? EXPOSURE_LABELS[a.exposure_level] : "—")}</div><div class="l">Nivel de exposición</div></div>
      </div>
      <p class="small">Cumplimiento ponderado = (cumple + 0.5 × parcial) / requisitos aplicables. Los requisitos sin evaluar cuentan como no cumplidos.</p>

      ${a.conclusions ? `<h2>Conclusiones</h2>${paragraphs(a.conclusions)}` : ""}

      <h2>Resultado por categoría de infracción (Art. 21)</h2>
      <table class="report-table"><thead><tr><th>Categoría</th><th class="right">Requisitos</th><th class="right">Cumple</th><th class="right">Parcial</th><th class="right">No cumple</th><th class="right">No aplica</th><th class="right">Sin evaluar</th><th class="right">Cumplimiento</th></tr></thead>
      <tbody>${categoryRows}</tbody></table>

      <h2>Resultado por artículo</h2>
      <table class="report-table"><thead><tr><th>Artículo</th><th class="right">Requisitos</th><th class="right">Cumple</th><th class="right">Parcial</th><th class="right">No cumple</th><th class="right">No aplica</th><th class="right">Sin evaluar</th><th class="right">Cumplimiento</th></tr></thead>
      <tbody>${articleRows}</tbody></table>

      <h2>Brechas y planes de mejora (priorizadas por gravedad)</h2>
      ${s.gaps.length ? `<table class="report-table"><thead><tr><th>Req.</th><th>Requisito</th><th>Categoría</th><th>Estado</th><th>Plan de mejora</th><th>Responsable</th><th>Fecha compromiso</th></tr></thead><tbody>${gapsRows}</tbody></table>` : "<p>No hay brechas: todos los requisitos aplicables se cumplen.</p>"}

      <h2>Eventos de pérdida por riesgo tecnológico (Art. 18 num. 1)</h2>
      <p>Del ${esc(longDate(losses.from))} al ${esc(longDate(losses.to))}: ${losses.total.count} evento(s) registrados, impacto total ${esc(money(losses.total.total_impact))} (pérdida ${esc(money(losses.total.economic_loss))} y frustración de ganancia ${esc(money(losses.total.lost_profit))}); frecuencia anualizada ${losses.total.annual_frequency} evento(s) por año.</p>
      <table class="report-table"><thead><tr><th>Tipo de evento</th><th class="right">Eventos</th><th class="right">Pérdida</th><th class="right">Frustración de ganancia</th><th class="right">Impacto total</th><th class="right">Mayor impacto</th></tr></thead>
      <tbody>${lossRows}</tbody></table>

      <div class="annex">
        <h2>Anexo: lista de verificación completa</h2>
        <table class="report-table"><thead><tr><th>Req.</th><th>Artículo</th><th>Requisito</th><th>Categoría</th><th>Estado</th><th>Evidencia</th><th>Responsable</th></tr></thead>
        <tbody>${annexRows}</tbody></table>
        <div class="report-footer">Generado desde CrediMaster el ${dayjs().format("DD/MM/YYYY HH:mm")}</div>
      </div>
    </body>
  </html>`;
};

export const printHtml = (html) => openReport(html);

// Word abre un HTML con extensión .doc y lo deja editar antes de firmar.
export const wordDocumentFromHtml = (html) =>
  html.replace(
    "<html>",
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
  );

export const downloadWord = (html, fileName) => {
  const blob = new Blob(["﻿", wordDocumentFromHtml(html)], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".doc") ? fileName : `${fileName}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
