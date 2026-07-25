// src/reports/committeeMinutesReport.js
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";

const money = (value) =>
  Number(value || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const text = (value) => value || "—";

const dateText = (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "—");

const STATUS_LABEL = {
  APPROVED: "Aprobó",
  REJECTED: "Rechazó",
  PENDING: "Pendiente",
};

export const printCommitteeMinutesReport = ({
  company = {},
  user = {},
  loan = {},
  members = [],
}) => {
  const isApproved = String(loan.status).toUpperCase() === "APPROVED";
  const isRejected = String(loan.status).toUpperCase() === "REJECTED";
  const resolutionDate = isApproved ? loan.approval_date : loan.updated_at;

  const html = `
  <html>
    <head>
      <title>Acta de Comité de Crédito</title>
      ${reportStyles}
    </head>

    <body>
     ${buildHeader({
       company,
       title: "ACTA DE COMITÉ DE CRÉDITO",
       subtitle: `Crédito No. ${loan.id || "—"} | Fecha: ${dayjs().format(
         "DD/MM/YYYY",
       )} | Usuario: ${user?.full_name || "—"}`,
     })}

      <div class="section">
        <div class="section-title">I. Datos del Crédito Evaluado</div>
        <div class="grid">
          <div class="field">
            <div class="label">No. Crédito</div>
            <div class="value">${text(loan.id)}</div>
          </div>
          <div class="field">
            <div class="label">Cliente</div>
            <div class="value">${text(loan.customer_name)}</div>
          </div>
          <div class="field">
            <div class="label">Sucursal</div>
            <div class="value">${text(loan.branch_name)}</div>
          </div>
          <div class="field">
            <div class="label">Monto solicitado</div>
            <div class="value">C$ ${money(loan.amount)}</div>
          </div>

          <div class="field">
            <div class="label">Monto aprobado</div>
            <div class="value">${loan.approved_amount != null ? `C$ ${money(loan.approved_amount)}` : "—"}</div>
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
            <div class="label">Fecha de resolución</div>
            <div class="value">${dateText(resolutionDate)}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">II. Miembros del Comité y Decisiones</div>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Límite de aprobación</th>
              <th>Decisión</th>
              <th>Monto aprobado</th>
              <th>Fecha</th>
              <th>Comentario</th>
            </tr>
          </thead>
          <tbody>
            ${
              members.length
                ? members
                    .map(
                      (m) => `
                      <tr>
                        <td>${text(m.full_name)}</td>
                        <td>C$ ${money(m.approver_limit_amount)}</td>
                        <td>${STATUS_LABEL[String(m.status).toUpperCase()] || text(m.status)}</td>
                        <td>${m.approved_amount != null ? `C$ ${money(m.approved_amount)}` : "—"}</td>
                        <td>${dateText(m.decision_date)}</td>
                        <td>${text(m.comment)}</td>
                      </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="6" style="text-align:center;">No se registraron miembros del comité</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">III. Resolución del Comité</div>
        <div class="note">
          ${
            isApproved
              ? `El Comité de Crédito, de forma unánime, APROBÓ el crédito No. ${text(loan.id)} por un monto de C$ ${money(loan.approved_amount ?? loan.amount)}, a un plazo de ${text(loan.term)} meses y una tasa de interés anual de ${money(loan.interest_rate)}%.`
              : isRejected
                ? `El Comité de Crédito RECHAZÓ el crédito No. ${text(loan.id)}.${loan.rejection_reason ? ` Motivo: ${text(loan.rejection_reason)}.` : ""}`
                : `El Comité de Crédito no ha emitido una resolución final para el crédito No. ${text(loan.id)} (estado actual: ${text(loan.status)}).`
          }
        </div>
      </div>

      <div class="signatures">
        ${
          members.length
            ? members
                .map((m) => `<div class="signature">${text(m.full_name)}</div>`)
                .join("")
            : `<div class="signature">Miembro del Comité</div>`
        }
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
