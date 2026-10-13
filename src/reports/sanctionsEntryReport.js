// src/reports/sanctionsEntryReport.js — impresión de una consulta a las
// listas OFAC (SDN) / ONU (Consolidated List), ver
// credimaster_license.sanctions_entries y amlController.getSanctionsEntryDetail.
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";
import { openReport } from "./reportViewer";

const text = (value) => value || "—";

// Los textos de la exclusión vienen de páginas externas (OFAC): se escapan antes de imprimir.
const escapeHtml = (value) =>
  value == null
    ? value
    : String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// "YYYY-MM-DD" -> fecha larga, armada en hora local para que no se corra un día.
export const formatListedOn = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-NI", { dateStyle: "long" });
};

const field = (label, valueHtml) => `
          <div class="report-field">
            <div class="report-field-label">${label}</div>
            <div class="report-field-value">${valueHtml}</div>
          </div>`;

const official = (en) => (en ? `<br/><small style="font-weight: 400; color: #555;">Texto oficial: ${escapeHtml(en)}</small>` : "");

// Sección "Motivo de la inclusión", igual que en el detalle en pantalla
// (SanctionsListingReason.jsx): programas en español, base legal (OFAC) o
// Comité (ONU), información publicada traducida y, en la OFAC, la acción
// publicada el día de la designación con sus comunicados de prensa.
// Ni la OFAC ni la ONU redactan en sus listas un motivo por persona.
export const listingReasonSection = (entry = {}, designationAction = null) => {
  const isUn = entry.source === "ONU Consolidada";
  const programs = entry.programs_info || [];
  const rows = [];

  if (programs.length) {
    rows.push(
      field(
        "Programa(s) de sanciones",
        programs
          .map(
            (p) =>
              `${escapeHtml(p.name_es ? `${p.code} — ${p.name_es}` : p.code)}${
                !isUn && p.definition_en ? `<br/><small style="font-weight: 400; color: #555;">Fundamento: ${escapeHtml(p.definition_en)}</small>` : ""
              }`,
          )
          .join("<br/>"),
      ),
    );
  }
  if (isUn) {
    if (entry.listed_decided_by) rows.push(field("Decisión de la inclusión", escapeHtml(entry.listed_decided_by)));
  } else if (entry.listed_legal_basis) {
    rows.push(field("Base legal de la designación", escapeHtml(entry.listed_legal_basis)));
  }
  if (entry.remarks_es || entry.remarks) {
    rows.push(
      field(
        `Información publicada por la ${isUn ? "ONU" : "OFAC"}${entry.remarks_es ? " (traducción automática)" : ""}`,
        `${escapeHtml(entry.remarks_es || entry.remarks)}${entry.remarks_es ? official(entry.remarks) : ""}`,
      ),
    );
  }

  const a = designationAction;
  if (!isUn && a && a.found) {
    const press = (a.press_releases || [])
      .map(
        (p) => `<li>${escapeHtml(p.title_es || p.title)}${p.title_es ? official(p.title) : ""}<br/><small style="font-weight: 400; color: #555;">${escapeHtml(p.url)}</small></li>`,
      )
      .join("");
    rows.push(
      field(
        "Acción de la OFAC el día de la designación (traducción automática)",
        `${escapeHtml(a.title_es || a.title_en)}${a.title_es ? official(a.title_en) : ""}${
          press ? `<ul style="margin: 4px 0 0 16px; padding: 0;">${press}</ul>` : ""
        }<br/><small style="font-weight: 400; color: #555;">Acciones publicadas por la OFAC ese día; si hubo varias, revise cuál corresponde a esta entrada. ${escapeHtml(a.url)}</small>`,
      ),
    );
  }

  if (!rows.length) return "";
  return `
      <div class="report-section">
        <div class="section-header"><div class="section-title">Motivo de la inclusión</div></div>
        <div class="report-fields" style="grid-template-columns: 1fr;">${rows.join("")}
        </div>
        ${
          isUn
            ? `<div class="note">El resumen oficial de los motivos de la inclusión está en el sitio del Comité de Sanciones de la ONU.</div>`
            : ""
        }
      </div>`;
};

// Sección "Motivo de la exclusión" para las entradas retiradas de la lista:
// fecha (oficial o detectada), programa(s) en que estaba, base legal de la
// designación retirada (OFAC), quién decidió el retiro (ONU) y el motivo
// publicado por la OFAC traducido, con el texto oficial y la fuente.
// La ONU no publica el motivo de sus retiros, solo la decisión del Comité.
export const delistingReasonSection = (entry = {}) => {
  if (entry.active) return "";
  const isUn = entry.source === "ONU Consolidada";
  const programs = entry.delisted_programs_info?.length
    ? entry.delisted_programs_info
    : String(entry.delisted_programs || "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((code) => ({ code }));
  const rows = [];

  rows.push(
    field(
      "Fecha de exclusión de la lista",
      entry.delisted_on
        ? `${escapeHtml(formatListedOn(entry.delisted_on))}${
            entry.delisted_detected
              ? `<br/><small style="font-weight: 400; color: #555;">Detectada por CrediMaster: fecha de la primera lista publicada en la que ya no aparece.</small>`
              : ""
          }`
        : "Retirada (fecha no disponible)",
    ),
  );
  if (programs.length) {
    rows.push(
      field(
        "Programa(s) en que estaba al excluirse",
        programs.map((p) => escapeHtml(p.name_es ? `${p.code} — ${p.name_es}` : p.code)).join("<br/>"),
      ),
    );
  }
  if (!isUn && entry.delisted_legal_basis) {
    rows.push(field("Base legal de la designación retirada", escapeHtml(entry.delisted_legal_basis)));
  }
  if (isUn && entry.delisted_decided_by) {
    rows.push(field("Retiro decidido por", escapeHtml(entry.delisted_decided_by)));
  }
  if (entry.delisted_reason_es || entry.delisted_reason) {
    rows.push(
      field(
        `Motivo de la exclusión${entry.delisted_reason_es ? " (traducción automática)" : ""}`,
        `${escapeHtml(entry.delisted_reason_es || entry.delisted_reason)}${entry.delisted_reason_es ? official(entry.delisted_reason) : ""}`,
      ),
    );
  } else {
    rows.push(
      field(
        "Motivo de la exclusión",
        isUn ? "La ONU no publica el motivo del retiro, solo la decisión del Comité." : "No disponible",
      ),
    );
  }
  if (entry.delisted_reference_url) {
    rows.push(
      field(
        isUn ? "Aviso oficial que confirma la decisión de la ONU" : "Acción publicada por la OFAC",
        `<small style="font-weight: 400;">${escapeHtml(entry.delisted_reference_url)}</small>`,
      ),
    );
  }

  return `
      <div class="report-section">
        <div class="section-header"><div class="section-title">Motivo de la exclusión</div></div>
        <div class="report-fields" style="grid-template-columns: 1fr;">${rows.join("")}
        </div>
      </div>`;
};

// HTML completo de la consulta (separado de abrir la ventana para poder
// usarlo con openBlankReportWindow cuando falta consultar algo antes).
export const buildSanctionsEntryReportHtml = ({ company = {}, user = {}, entry = {}, designationAction = null }) => {
  const identifications = Array.isArray(entry.identifications) ? entry.identifications : [];
  const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
  const addresses = Array.isArray(entry.addresses) ? entry.addresses : [];

  const html = `
  <html>
    <head>
      <title>Consulta de Lista de Sanciones</title>
      ${reportStyles}
    </head>

    <body>
      ${buildHeader({
        company,
        title: "CONSULTA DE LISTA DE SANCIONES",
        subtitle: text(entry.full_name),
        user,
      })}

      <div class="report-section">
        <div class="section-header"><div class="section-title">Detalles</div></div>
        <div class="report-fields" style="grid-template-columns: repeat(3, 1fr);">
          <div class="report-field">
            <div class="report-field-label">Nombre completo</div>
            <div class="report-field-value">${text(entry.full_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Apellido</div>
            <div class="report-field-value">${text(entry.last_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Nombre</div>
            <div class="report-field-value">${text(entry.first_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Tipo</div>
            <div class="report-field-value">${text(entry.entry_type)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Lista</div>
            <div class="report-field-value">${text(entry.source)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Título / Cargo</div>
            <div class="report-field-value">${text(entry.title)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Programa(s)</div>
            <div class="report-field-value">${text(escapeHtml(entry.programs))}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Fecha de inclusión en la lista</div>
            <div class="report-field-value">${text(formatListedOn(entry.listed_on))}</div>
          </div>
          ${
            entry.active
              ? ""
              : field(
                  "Fecha de exclusión de la lista",
                  `${text(formatListedOn(entry.delisted_on))}${entry.delisted_detected ? " (detectada por CrediMaster)" : ""}`,
                )
          }
          <div class="report-field">
            <div class="report-field-label">Nacionalidad</div>
            <div class="report-field-value">${text(entry.nationality)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Ciudadanía</div>
            <div class="report-field-value">${text(entry.citizenship)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Fecha de nacimiento</div>
            <div class="report-field-value">${text(entry.date_of_birth)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Lugar de nacimiento</div>
            <div class="report-field-value">${text(entry.place_of_birth)}</div>
          </div>
        </div>
      </div>

      ${listingReasonSection(entry, designationAction)}

      ${delistingReasonSection(entry)}

      <div class="report-section">
        <div class="section-header"><div class="section-title">Identificaciones</div></div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Número</th>
              <th>País</th>
            </tr>
          </thead>
          <tbody>
            ${
              identifications.length
                ? identifications
                    .map(
                      (i) => `
                      <tr>
                        <td>${text(i.type)}</td>
                        <td>${text(i.number)}</td>
                        <td>${text(i.country)}</td>
                      </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="3" class="empty-row center">Sin identificaciones registradas</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">Alias</div></div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Nombre</th>
            </tr>
          </thead>
          <tbody>
            ${
              aliases.length
                ? aliases
                    .map(
                      (a) => `
                      <tr>
                        <td>${text(a.type)}</td>
                        <td>${text(a.category)}</td>
                        <td>${text(a.name)}</td>
                      </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="3" class="empty-row center">Sin alias registrados</td></tr>`
            }
          </tbody>
        </table>
      </div>

      ${
        addresses.length
          ? `
      <div class="report-section">
        <div class="section-header"><div class="section-title">Direcciones</div></div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Dirección</th>
              <th>Ciudad</th>
              <th>País</th>
            </tr>
          </thead>
          <tbody>
            ${addresses
              .map(
                (a) => `
                <tr>
                  <td>${text(a.address)}</td>
                  <td>${text([a.city, a.state].filter(Boolean).join(", "))}</td>
                  <td>${text(a.country)}</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`
          : ""
      }

      <div class="report-footer">
        Consulta generada desde CrediMaster el ${dayjs().format("DD/MM/YYYY HH:mm")} — Fuente: ${text(entry.source)}
      </div>
    </body>
  </html>
  `;

  return html;
};

export const printSanctionsEntryReport = (params) => openReport(buildSanctionsEntryReportHtml(params));
