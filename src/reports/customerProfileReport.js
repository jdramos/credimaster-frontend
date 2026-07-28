// src/reports/customerProfileReport.js — Ficha del cliente (datos generales,
// actividad económica, garantías, referencias y evaluación financiera).
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";
import { openReport } from "./reportViewer";

const text = (value) => (value === null || value === undefined || value === "" ? "—" : value);
const dateText = (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "—");
const money = (value) =>
  value === null || value === undefined || value === ""
    ? "—"
    : Number(value).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const referenceBlock = (customer, prefix, title) => `
  <div class="report-fields" style="grid-template-columns: repeat(3, 1fr);">
    <div class="report-field">
      <div class="report-field-label">${title} — Nombre</div>
      <div class="report-field-value">${text(customer[`${prefix}_name`])}</div>
    </div>
    <div class="report-field">
      <div class="report-field-label">Identificación</div>
      <div class="report-field-value">${text(customer[`${prefix}_identity`])}</div>
    </div>
    <div class="report-field">
      <div class="report-field-label">Parentesco / Relación</div>
      <div class="report-field-value">${text(customer[`${prefix}_relationship`])}</div>
    </div>
    <div class="report-field">
      <div class="report-field-label">Dirección</div>
      <div class="report-field-value">${text(customer[`${prefix}_address`])}</div>
    </div>
    <div class="report-field">
      <div class="report-field-label">Lugar de trabajo</div>
      <div class="report-field-value">${text(customer[`${prefix}_workplace`])}</div>
    </div>
    <div class="report-field">
      <div class="report-field-label">Teléfono</div>
      <div class="report-field-value">${text(customer[`${prefix}_telephone`])}</div>
    </div>
    <div class="report-field">
      <div class="report-field-label">Tiempo de conocerlo(a)</div>
      <div class="report-field-value">${text(customer[`${prefix}_known_time`])}</div>
    </div>
  </div>
`;

export const printCustomerProfileReport = ({
  company = {},
  user = {},
  customer = {},
  guarantees = [],
  financialEvaluation = null,
  documents = [],
}) => {
  const isEmployee = Number(customer.economic_activity) === 2;
  const hasSpouse = Boolean(customer.spouse_name);
  const hasEvaluation = Boolean(financialEvaluation && financialEvaluation.id);

  const html = `
  <html>
    <head>
      <title>Ficha del Cliente</title>
      ${reportStyles}
    </head>

    <body>
     ${buildHeader({
       company,
       title: "FICHA DEL CLIENTE",
       subtitle: `${text(customer.customer_code || customer.id)} — ${text(customer.customer_name)}`,
       user,
     })}

      <div class="report-section">
        <div class="section-header"><div class="section-title">I. Datos Personales</div></div>
        <div class="report-fields" style="grid-template-columns: repeat(3, 1fr);">
          <div class="report-field">
            <div class="report-field-label">Nombre completo</div>
            <div class="report-field-value">${text(customer.customer_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Nombre conocido</div>
            <div class="report-field-value">${text(customer.public_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Género</div>
            <div class="report-field-value">${text(customer.genre_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Estado civil</div>
            <div class="report-field-value">${text(customer.marital_status_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Fecha de nacimiento</div>
            <div class="report-field-value">${dateText(customer.birth_date)} (${text(customer.age)} años)</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">País / Nacionalidad</div>
            <div class="report-field-value">${text(customer.birth_country_name)} / ${text(customer.nationality_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Celular</div>
            <div class="report-field-value">${text(customer.cellphone)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Teléfono fijo</div>
            <div class="report-field-value">${text(customer.telephone)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Correo electrónico</div>
            <div class="report-field-value">${text(customer.email)}</div>
          </div>
        </div>
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">II. Identificación</div></div>
        <div class="report-fields" style="grid-template-columns: repeat(3, 1fr);">
          <div class="report-field">
            <div class="report-field-label">Tipo de documento</div>
            <div class="report-field-value">${text(customer.identity_type_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Número de identificación</div>
            <div class="report-field-value">${text(customer.identification)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">País de emisión</div>
            <div class="report-field-value">${text(customer.identity_issue_country_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Fecha de emisión</div>
            <div class="report-field-value">${dateText(customer.identity_issue_date)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Fecha de vencimiento</div>
            <div class="report-field-value">${dateText(customer.identity_expiration_date)}</div>
          </div>
        </div>
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">III. Domicilio</div></div>
        <div class="report-fields" style="grid-template-columns: repeat(3, 1fr);">
          <div class="report-field" style="grid-column: span 2;">
            <div class="report-field-label">Dirección de habitación</div>
            <div class="report-field-value">${text(customer.home_address)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">País de residencia</div>
            <div class="report-field-value">${text(customer.residence_country_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Departamento</div>
            <div class="report-field-value">${text(customer.province_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Municipio</div>
            <div class="report-field-value">${text(customer.municipality_name)}</div>
          </div>
        </div>
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">IV. Actividad Económica${isEmployee ? " — Asalariado" : " — Negocio Propio"}</div></div>
        <div class="report-fields" style="grid-template-columns: repeat(3, 1fr);">
          <div class="report-field" style="grid-column: span 2;">
            <div class="report-field-label">Actividad económica (CONAMI)</div>
            <div class="report-field-value">${text(customer.economic_activity_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Código CONAMI</div>
            <div class="report-field-value">${text(customer.conami_id_actividad_economica)}</div>
          </div>
          ${
            isEmployee
              ? `
          <div class="report-field">
            <div class="report-field-label">Ocupación</div>
            <div class="report-field-value">${text(customer.occupation)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Empresa</div>
            <div class="report-field-value">${text(customer.company)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Teléfono laboral</div>
            <div class="report-field-value">${text(customer.job_telephone)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Fecha de ingreso</div>
            <div class="report-field-value">${dateText(customer.job_start_day)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Salario mensual</div>
            <div class="report-field-value">C$ ${money(customer.monthly_salary)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Salario anual</div>
            <div class="report-field-value">C$ ${money(customer.annual_salary)}</div>
          </div>
          `
              : `
          <div class="report-field" style="grid-column: span 2;">
            <div class="report-field-label">Nombre del negocio</div>
            <div class="report-field-value">${text(customer.business_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Tipo de negocio</div>
            <div class="report-field-value">${text(customer.business_type_name)}</div>
          </div>
          <div class="report-field" style="grid-column: span 2;">
            <div class="report-field-label">Dirección del negocio</div>
            <div class="report-field-value">${text(customer.business_address)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Teléfono del negocio</div>
            <div class="report-field-value">${text(customer.business_telephone)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Inventario</div>
            <div class="report-field-value">C$ ${money(customer.business_inventory)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Cuentas por cobrar</div>
            <div class="report-field-value">C$ ${money(customer.business_receivables)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Ingreso mensual del negocio</div>
            <div class="report-field-value">C$ ${money(customer.business_monthly_income)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Ingreso anual del negocio</div>
            <div class="report-field-value">C$ ${money(customer.business_annual_income)}</div>
          </div>
          `
          }
          <div class="report-field">
            <div class="report-field-label">Otros ingresos</div>
            <div class="report-field-value">C$ ${money(customer.other_incomes)}</div>
          </div>
        </div>
        <div class="note"><strong>Origen de fondos declarado:</strong> ${text(customer.funds_source)}</div>
      </div>

      ${
        hasSpouse
          ? `
      <div class="report-section">
        <div class="section-header"><div class="section-title">V. Cónyuge</div></div>
        <div class="report-fields" style="grid-template-columns: repeat(3, 1fr);">
          <div class="report-field">
            <div class="report-field-label">Nombre</div>
            <div class="report-field-value">${text(customer.spouse_name)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Teléfono</div>
            <div class="report-field-value">${text(customer.spouse_telephone)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Ocupación</div>
            <div class="report-field-value">${text(customer.spouse_position)}</div>
          </div>
          <div class="report-field" style="grid-column: span 2;">
            <div class="report-field-label">Dirección</div>
            <div class="report-field-value">${text(customer.spouse_address)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Empresa donde labora</div>
            <div class="report-field-value">${text(customer.spouse_job_company)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Teléfono laboral</div>
            <div class="report-field-value">${text(customer.spouse_job_telephone)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Salario</div>
            <div class="report-field-value">C$ ${money(customer.spouse_job_salary)}</div>
          </div>
        </div>
      </div>
      `
          : ""
      }

      <div class="report-section">
        <div class="section-header"><div class="section-title">VI. Referencias Personales</div></div>
        ${referenceBlock(customer, "reference", "Referencia 1")}
        <div style="margin-top: 4px;"></div>
        ${referenceBlock(customer, "reference2", "Referencia 2")}
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">VII. Garantías Declaradas</div></div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Artículo</th>
              <th>Serie</th>
              <th>Marca</th>
              <th class="right">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${
              guarantees.length
                ? guarantees
                    .map(
                      (g) => `
                      <tr>
                        <td>${text(g.article)}</td>
                        <td>${text(g.series)}</td>
                        <td>${text(g.brand)}</td>
                        <td class="right">C$ ${money(g.value)}</td>
                      </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="4" class="empty-row center">Sin garantías registradas</td></tr>`
            }
          </tbody>
        </table>
      </div>

      ${
        hasEvaluation
          ? `
      <div class="report-section">
        <div class="section-header"><div class="section-title">VIII. Evaluación Financiera</div></div>
        <div class="report-fields" style="grid-template-columns: repeat(4, 1fr);">
          <div class="report-field">
            <div class="report-field-label">Fecha de evaluación</div>
            <div class="report-field-value">${dateText(financialEvaluation.evaluation_date)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Metodología</div>
            <div class="report-field-value">${text(financialEvaluation.methodology)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Resultado de referencias</div>
            <div class="report-field-value">${text(financialEvaluation.references_result)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Resultado de central de riesgo</div>
            <div class="report-field-value">${text(financialEvaluation.bureau_result)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Ingreso del negocio</div>
            <div class="report-field-value">C$ ${money(financialEvaluation.business_income)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Ingreso por salario</div>
            <div class="report-field-value">C$ ${money(financialEvaluation.salary_income)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Otros ingresos</div>
            <div class="report-field-value">C$ ${money(financialEvaluation.other_income)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Cuota propuesta</div>
            <div class="report-field-value">C$ ${money(financialEvaluation.proposed_installment)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Gastos del negocio</div>
            <div class="report-field-value">C$ ${money(financialEvaluation.business_expenses)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Gastos familiares</div>
            <div class="report-field-value">C$ ${money(financialEvaluation.family_expenses)}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Cuotas de otras deudas</div>
            <div class="report-field-value">C$ ${money(financialEvaluation.other_debts_installments)}</div>
          </div>
        </div>
        ${financialEvaluation.analyst_comment ? `<div class="note"><strong>Comentario del analista:</strong> ${text(financialEvaluation.analyst_comment)}</div>` : ""}
      </div>
      `
          : ""
      }

      <div class="report-section">
        <div class="section-header"><div class="section-title">IX. Documentos Entregados</div></div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Sección</th>
              <th>Documento</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Archivo</th>
            </tr>
          </thead>
          <tbody>
            ${
              documents.length
                ? documents
                    .map((d) => {
                      const hasDocument =
                        d.has_document === true ||
                        Number(d.uploaded_count || 0) > 0 ||
                        Boolean(d.document_id);
                      const statusUpper = String(d.status || "").toUpperCase();
                      const isValidated =
                        d.is_validated === true || ["OK", "VALIDATED", "COMPLETED"].includes(statusUpper);
                      const isMandatory = Number(d.is_mandatory) === 1 || d.is_mandatory === true;
                      const estado = !hasDocument ? "Faltante" : isValidated ? "Validado" : "Entregado";
                      const rowStyle = !hasDocument && isMandatory ? ' style="background:#FEE2E2;"' : "";
                      return `
                      <tr${rowStyle}>
                        <td>${text(d.section)}</td>
                        <td>${text(d.title)}</td>
                        <td>${isMandatory ? "Obligatorio" : "Opcional"}</td>
                        <td>${estado}</td>
                        <td>${text(d.document_name)}</td>
                      </tr>`;
                    })
                    .join("")
                : `<tr><td colspan="5" class="empty-row center">Sin checklist documental configurado</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="signatures">
        <div class="signature">Firma del cliente</div>
        <div class="signature">Elaborado por</div>
      </div>

      <div class="report-footer">
        Documento generado desde CrediMaster el ${dayjs().format("DD/MM/YYYY HH:mm")}
      </div>
    </body>
  </html>
  `;

  return openReport(html);
};
