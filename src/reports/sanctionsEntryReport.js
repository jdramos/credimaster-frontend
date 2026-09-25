// src/reports/sanctionsEntryReport.js — impresión de una consulta a las
// listas OFAC (SDN) / ONU (Consolidated List), ver
// credimaster_license.sanctions_entries y amlController.getSanctionsEntryDetail.
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";
import { openReport } from "./reportViewer";

const text = (value) => value || "—";

export const printSanctionsEntryReport = ({ company = {}, user = {}, entry = {} }) => {
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
            <div class="report-field-value">${text(entry.programs)}</div>
          </div>
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
        ${entry.remarks ? `<div class="note"><strong>Remarks:</strong> ${text(entry.remarks)}</div>` : ""}
      </div>

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

  return openReport(html);
};
