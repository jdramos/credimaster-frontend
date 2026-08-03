// src/reports/loanApplicationReport.js
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";

const money = (value) =>
  Number(value || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const text = (value) => value || "—";

const field = (label, value, { span } = {}) => `
  <div class="report-field"${span ? ` style="grid-column: span ${span};"` : ""}>
    <div class="report-field-label">${label}</div>
    <div class="report-field-value">${text(value)}</div>
  </div>
`;

export const printLoanApplicationReport = ({
  company = {},
  user = {},
  loan = {},
  customer = {},
  guarantees = [],
  evaluation = {},
}) => {
  const html = `
  <html>
    <head>
      <title>Solicitud de Crédito</title>
      ${reportStyles}
    </head>

    <body>
     ${buildHeader({
       company,
       title: "SOLICITUD DE CRÉDITO",
       subtitle: `Solicitud No. ${loan?.id || "—"} | Fecha: ${dayjs().format(
         "DD/MM/YYYY",
       )} | Usuario: ${user?.full_name || "—"}`,
     })}

      <div class="section">
        <div class="section-title">I. Datos del Cliente</div>
        <div class="report-fields" style="grid-template-columns: repeat(3, 1fr);">
          ${field("Código / ID", customer.id)}
          ${field("Nombre completo", customer.full_name || customer.name, { span: 2 })}
          ${field("Identificación", customer.identification || customer.identidad)}
          ${field("Teléfono", customer.phone || customer.mobile)}
          ${field("Dirección", customer.address, { span: 2 })}
          ${field("Municipio", customer.municipality_name || customer.municipio)}
          ${field("Departamento", customer.province_name || customer.departamento)}
          ${field("Estado civil", customer.marital_status_name || customer.estado_civil)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">II. Información Económica</div>
        <div class="report-fields" style="grid-template-columns: repeat(4, 1fr);">
          ${field("Actividad económica", customer.economic_activity_name)}
          ${field("Tipo de negocio", customer.business_type_name)}
          ${field("Ingresos mensuales", `C$ ${money(customer.monthly_income)}`)}
          ${field("Egresos mensuales", `C$ ${money(customer.monthly_expenses)}`)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">III. Datos del Crédito Solicitado</div>
        <div class="report-fields" style="grid-template-columns: repeat(4, 1fr);">
          ${field("No. Solicitud / Crédito", loan.id)}
          ${field("Fecha solicitud", loan.date ? dayjs(loan.date).format("DD/MM/YYYY") : "")}
          ${field("Monto solicitado", `C$ ${money(loan.amount)}`)}
          ${field("Plazo", loan.term ? `${loan.term} meses` : "")}

          ${field("Tasa interés", `${money(loan.interest_rate)}%`)}
          ${field("Tasa moratoria", `${money(loan.defaulted_rate)}%`)}
          ${field("Frecuencia", loan.frequency_name || loan.frequency)}
          ${field("Destino", loan.destination_name || loan.destino_credito)}

          ${field("Sucursal", loan.branch_name)}
          ${field("Promotor", loan.promoter_name)}
          ${field("Gestor / Cobrador", loan.collector_name)}
          ${field("Estado", loan.status)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">IV. Garantías Presentadas</div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Artículo</th>
              <th>N° de serie</th>
              <th>Valor estimado</th>
              <th>Marca/Modelo</th>
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
                        <td>C$ ${money(g.value)}</td>
                        <td>${text(g.brand)}</td>
                      </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="4" style="text-align:center;">No se registraron garantías</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">V. Evaluación Crediticia</div>
        <div class="report-fields" style="grid-template-columns: repeat(4, 1fr);">
          ${field("Flujo disponible", `C$ ${money(evaluation.available_cash_flow)}`)}
          ${field("Cuota estimada", `C$ ${money(evaluation.proposed_installment)}`)}
          ${field("Nivel de endeudamiento", `${money(Number(evaluation.indebtedness_ratio || 0) * 100)}%`)}
          ${field("Resultado", evaluation.recommendation || evaluation.risk_level)}
        </div>

        <div class="note">
          <strong>Observaciones:</strong><br/>
          ${text(evaluation.observations)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">VI. Declaración del Solicitante</div>
        <div class="note">
          Declaro que la información proporcionada en esta solicitud es verdadera, completa y verificable.
          Autorizo a la institución a validar mis datos personales, económicos, comerciales y crediticios,
          así como a realizar las consultas necesarias para el análisis, aprobación, seguimiento y recuperación
          del crédito solicitado.
        </div>
      </div>

      <div class="signatures">
        <div class="signature">
          Firma del Cliente
        </div>
        <div class="signature">
          Oficial de Crédito
        </div>
        <div class="signature">
          Aprobador / Responsable
        </div>
      </div>

      <div class="footer">
        Documento generado desde CrediMaster el ${dayjs().format("DD/MM/YYYY HH:mm")}
      </div>
    </body>
  </html>
  `;

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("No se pudo abrir la ventana de impresión.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};
