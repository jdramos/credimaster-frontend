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
        <div class="grid">
          <div class="field">
            <div class="label">Código / ID</div>
            <div class="value">${text(customer.id)}</div>
          </div>
          <div class="field">
            <div class="label">Nombre completo</div>
            <div class="value">${text(customer.full_name || customer.name)}</div>
          </div>
          <div class="field">
            <div class="label">Identificación</div>
            <div class="value">${text(customer.identification || customer.identidad)}</div>
          </div>
          <div class="field">
            <div class="label">Teléfono</div>
            <div class="value">${text(customer.phone || customer.mobile)}</div>
          </div>

          <div class="field">
            <div class="label">Dirección</div>
            <div class="value">${text(customer.address)}</div>
          </div>
          <div class="field">
            <div class="label">Municipio</div>
            <div class="value">${text(customer.municipality_name || customer.municipio)}</div>
          </div>
          <div class="field">
            <div class="label">Departamento</div>
            <div class="value">${text(customer.province_name || customer.departamento)}</div>
          </div>
          <div class="field">
            <div class="label">Estado civil</div>
            <div class="value">${text(customer.marital_status_name || customer.estado_civil)}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">II. Información Económica</div>
        <div class="grid">
          <div class="field">
            <div class="label">Actividad económica</div>
            <div class="value">${text(customer.economic_activity_name)}</div>
          </div>
          <div class="field">
            <div class="label">Tipo de negocio</div>
            <div class="value">${text(customer.business_type_name)}</div>
          </div>
          <div class="field">
            <div class="label">Ingresos mensuales</div>
            <div class="value">C$ ${money(customer.monthly_income)}</div>
          </div>
          <div class="field">
            <div class="label">Egresos mensuales</div>
            <div class="value">C$ ${money(customer.monthly_expenses)}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">III. Datos del Crédito Solicitado</div>
        <div class="grid">
          <div class="field">
            <div class="label">No. Solicitud / Crédito</div>
            <div class="value">${text(loan.id)}</div>
          </div>
          <div class="field">
            <div class="label">Fecha solicitud</div>
            <div class="value">${loan.date ? dayjs(loan.date).format("DD/MM/YYYY") : "—"}</div>
          </div>
          <div class="field">
            <div class="label">Monto solicitado</div>
            <div class="value">C$ ${money(loan.amount)}</div>
          </div>
          <div class="field">
            <div class="label">Plazo</div>
            <div class="value">${text(loan.term)} meses</div>
          </div>

          <div class="field">
            <div class="label">Tasa interés</div>
            <div class="value">${money(loan.interest_rate)}%</div>
          </div>
          <div class="field">
            <div class="label">Tasa moratoria</div>
            <div class="value">${money(loan.defaulted_rate)}%</div>
          </div>
          <div class="field">
            <div class="label">Frecuencia</div>
            <div class="value">${text(loan.frequency_name || loan.frequency)}</div>
          </div>
          <div class="field">
            <div class="label">Destino</div>
            <div class="value">${text(loan.destination_name || loan.destino_credito)}</div>
          </div>

          <div class="field">
            <div class="label">Sucursal</div>
            <div class="value">${text(loan.branch_name)}</div>
          </div>
          <div class="field">
            <div class="label">Promotor</div>
            <div class="value">${text(loan.promoter_name)}</div>
          </div>
          <div class="field">
            <div class="label">Gestor / Cobrador</div>
            <div class="value">${text(loan.collector_name)}</div>
          </div>
          <div class="field">
            <div class="label">Estado</div>
            <div class="value">${text(loan.status)}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">IV. Garantías Presentadas</div>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Valor estimado</th>
              <th>Observación</th>
            </tr>
          </thead>
          <tbody>
            ${
              guarantees.length
                ? guarantees
                    .map(
                      (g) => `
                      <tr>
                        <td>${text(g.guarantee_type_name || g.type)}</td>
                        <td>${text(g.description)}</td>
                        <td>C$ ${money(g.estimated_value || g.amount)}</td>
                        <td>${text(g.observation)}</td>
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
        <div class="grid">
          <div class="field">
            <div class="label">Capacidad de pago</div>
            <div class="value">C$ ${money(evaluation.payment_capacity)}</div>
          </div>
          <div class="field">
            <div class="label">Cuota estimada</div>
            <div class="value">C$ ${money(evaluation.estimated_payment)}</div>
          </div>
          <div class="field">
            <div class="label">Nivel de endeudamiento</div>
            <div class="value">${money(evaluation.debt_ratio)}%</div>
          </div>
          <div class="field">
            <div class="label">Resultado</div>
            <div class="value">${text(evaluation.result || evaluation.status)}</div>
          </div>
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
