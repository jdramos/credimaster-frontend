// src/reports/picReport.js — Perfil Integral del Cliente (PIC), Art. 10-11, 17
// de la Norma CD-CONAMI-070-01OCT07-2025.
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";
import { openReport } from "./reportViewer";

const text = (value) => value || "—";
const dateText = (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "—");

const RISK_CLASS = { BAJO: "success", MEDIO: "warning", ALTO: "danger" };

export const printPicReport = ({ company = {}, user = {}, customer = {}, screenings = [] }) => {
  const riskClass = RISK_CLASS[customer.risk_level] || "";
  const picOverdue = customer.next_pic_review_date && dayjs(customer.next_pic_review_date).isBefore(dayjs(), "day");

  const html = `
  <html>
    <head>
      <title>Perfil Integral del Cliente (PIC)</title>
      ${reportStyles}
    </head>

    <body>
     ${buildHeader({
       company,
       title: "PERFIL INTEGRAL DEL CLIENTE (PIC)",
       subtitle: `Cliente ${text(customer.customer_code)} — ${text(customer.customer_name)}`,
       user,
     })}

      <div class="report-section">
        <div class="section-header"><div class="section-title">I. Identificación del Cliente</div></div>
        <div class="report-fields" style="grid-template-columns: repeat(3, 1fr);">
          <div class="report-field">
            <div class="report-field-label">Código</div>
            <div class="report-field-value">${text(customer.customer_code)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Nombre completo</div>
            <div class="report-field-value">${text(customer.customer_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Identificación</div>
            <div class="report-field-value">${text(customer.identification)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Celular</div>
            <div class="report-field-value">${text(customer.cellphone)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Dirección</div>
            <div class="report-field-value">${text(customer.home_address)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Municipio / Departamento</div>
            <div class="report-field-value">${text(customer.municipality_name)} / ${text(customer.province_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">País de residencia</div>
            <div class="report-field-value">${text(customer.residence_country_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">País de nacimiento</div>
            <div class="report-field-value">${text(customer.birth_country_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Sexo</div>
            <div class="report-field-value">${text(customer.genre_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Estado civil</div>
            <div class="report-field-value">${text(customer.marital_status_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Nombre social</div>
            <div class="report-field-value">${text(customer.public_name)}</div>
          </div>
        </div>
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">II. Actividad Económica y Origen de Fondos</div></div>
        <div class="report-fields" style="grid-template-columns: repeat(2, 1fr);">
          <div class="report-field">
            <div class="report-field-label">Actividad económica</div>
            <div class="report-field-value">${text(customer.economic_activity_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Código CONAMI</div>
            <div class="report-field-value">${text(customer.conami_id_actividad_economica)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Ingreso mensual del negocio</div>
            <div class="report-field-value">${customer.business_monthly_income != null ? Number(customer.business_monthly_income).toLocaleString("es-NI", { style: "currency", currency: "NIO" }) : "—"}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Ingreso anual / ventas declaradas</div>
            <div class="report-field-value">${customer.business_annual_income != null ? Number(customer.business_annual_income).toLocaleString("es-NI", { style: "currency", currency: "NIO" }) : "—"}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Salario mensual</div>
            <div class="report-field-value">${customer.monthly_salary != null ? Number(customer.monthly_salary).toLocaleString("es-NI", { style: "currency", currency: "NIO" }) : "—"}</div>
          </div>
        </div>
        <div class="note"><strong>Origen de fondos declarado:</strong> ${text(customer.funds_source)}</div>
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">II.b Referencias</div></div>
        <div class="report-fields" style="grid-template-columns: repeat(2, 1fr);">
          <div class="report-field">
            <div class="report-field-label">Referencia 1</div>
            <div class="report-field-value">
              ${text(customer.reference_name)}${customer.reference_relationship ? ` (${text(customer.reference_relationship)})` : ""}<br/>
              ${text(customer.reference_telephone)} — ${text(customer.reference_address)}
            </div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Referencia 2</div>
            <div class="report-field-value">
              ${text(customer.reference2_name)}${customer.reference2_relationship ? ` (${text(customer.reference2_relationship)})` : ""}<br/>
              ${text(customer.reference2_telephone)} — ${text(customer.reference2_address)}
            </div>
          </div>
        </div>
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">III. Clasificación de Riesgo LA/FT/FP (Art. 29-30)</div></div>
        <div class="report-fields" style="grid-template-columns: repeat(4, 1fr);">
          <div class="report-field ${riskClass}">
            <div class="report-field-label">Nivel de riesgo</div>
            <div class="report-field-value">${text(customer.risk_level)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Puntaje</div>
            <div class="report-field-value">${customer.risk_score != null ? Number(customer.risk_score).toFixed(2) : "—"}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Calculado el</div>
            <div class="report-field-value">${customer.risk_calculated_at ? dayjs(customer.risk_calculated_at).format("DD/MM/YYYY HH:mm") : "—"}</div>
          </div>
          <div class="report-field ${picOverdue ? "danger" : ""}">
            <div class="report-field-label">Próxima actualización PIC</div>
            <div class="report-field-value">${dateText(customer.next_pic_review_date)}${picOverdue ? " (VENCIDO)" : ""}</div>
          </div>
        </div>
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">IV. Persona Expuesta Políticamente (PEP) — Art. 14</div></div>
        <div class="report-fields" style="grid-template-columns: repeat(2, 1fr);">
          <div class="report-field ${customer.is_pep ? "danger" : "success"}">
            <div class="report-field-label">¿Es PEP?</div>
            <div class="report-field-value">${customer.is_pep ? "SÍ" : "NO"}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Última declaración</div>
            <div class="report-field-value">${customer.pep_declared_at ? dayjs(customer.pep_declared_at).format("DD/MM/YYYY HH:mm") : "—"}</div>
          </div>
        </div>
        ${customer.is_pep && customer.pep_details ? `<div class="note"><strong>Detalle del cargo:</strong> ${text(customer.pep_details)}</div>` : ""}
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">V. Tamizaje contra Listas de Sanciones (Art. 16.3, 33.4-33.5)</div></div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Lista</th>
              <th>Resultado</th>
              <th>Notas</th>
              <th>Registrado por</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${
              screenings.length
                ? screenings
                    .map(
                      (s) => `
                      <tr>
                        <td>${text(s.list_name)}</td>
                        <td>${text(s.result)}</td>
                        <td>${text(s.notes)}</td>
                        <td>${text(s.screened_by)}</td>
                        <td>${s.screened_at ? dayjs(s.screened_at).format("DD/MM/YYYY HH:mm") : "—"}</td>
                      </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="5" class="empty-row center">Sin tamizajes registrados</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="note" style="margin-top: 16px;">
        <strong>Declaración (Art. 17.2 CD-CONAMI-070-01OCT07-2025):</strong> El cliente autoriza al
        Sujeto Obligado a verificar, actualizar y utilizar la información contenida en este Perfil
        Integral del Cliente (PIC) para efectos de la debida diligencia y el cumplimiento de la
        normativa de prevención de lavado de activos, financiamiento al terrorismo y financiamiento
        a la proliferación de armas de destrucción masiva.
      </div>

      <div class="signatures">
        <div class="signature">Firma del cliente</div>
        <div class="signature">Oficial de Cumplimiento</div>
        <div class="signature">Elaborado por</div>
      </div>

      <div class="report-footer">
        Documento generado desde CrediMaster el ${dayjs().format("DD/MM/YYYY HH:mm")} — Art. 10-11, 17 CD-CONAMI-070-01OCT07-2025
      </div>
    </body>
  </html>
  `;

  return openReport(html);
};
