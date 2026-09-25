// src/reports/monthlyReport.js — Informe Mensual PLA/FT/FP a CONAMI,
// Art. 42.1 CD-CONAMI-070-01OCT07-2025.
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";
import { openReport } from "./reportViewer";

const text = (value) => value || "—";

export const printMonthlyReport = ({ company = {}, user = {}, report = {} }) => {
  const rosSent = Array.isArray(report.ros_sent) ? report.ros_sent : [];

  const html = `
  <html>
    <head>
      <title>Informe Mensual PLA/FT/FP a CONAMI</title>
      ${reportStyles}
    </head>

    <body>
      ${buildHeader({
        company,
        title: "INFORME MENSUAL PLA/FT/FP A CONAMI",
        subtitle: `Período ${text(report.period)} — Art. 42.1 CD-CONAMI-070-01OCT07-2025`,
        user,
      })}

      <div class="report-summary">
        <div class="summary-item">
          <div class="summary-label">ROS enviados (42.1.1)</div>
          <div class="summary-value">${report.ros_sent_count ?? 0}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">RAII (42.1.2)</div>
          <div class="summary-value">${report.raii_flag ? "SÍ" : "NO"}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Actualizaciones ONU (42.1.3)</div>
          <div class="summary-value">${report.onu_list_updates?.length ?? 0}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Cartera escaneada</div>
          <div class="summary-value">${report.onu_list_attended ? "SÍ" : "—"}</div>
        </div>
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">Detalle de ROS enviados</div></div>
        <table class="report-table">
          <thead>
            <tr>
              <th>N° Caso</th>
              <th>Cliente</th>
              <th>Fecha de envío</th>
            </tr>
          </thead>
          <tbody>
            ${
              rosSent.length
                ? rosSent
                    .map(
                      (r) => `
                      <tr>
                        <td>${text(r.case_number)}</td>
                        <td>${text(r.customer_name)}</td>
                        <td>${r.ros_sent_at ? dayjs(r.ros_sent_at).format("DD/MM/YYYY HH:mm") : "—"}</td>
                      </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="3" class="empty-row center">Sin ROS enviados en este período</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">Conteos registrados manualmente (42.1.4-1.7)</div></div>
        <div class="report-fields" style="grid-template-columns: repeat(4, 1fr);">
          <div class="report-field">
            <div class="report-field-label">Solicitudes rechazadas (42.1.4)</div>
            <div class="report-field-value">${report.apps_rejected_count ?? 0}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">De esas, con ROS (42.1.5)</div>
            <div class="report-field-value">${report.ros_from_rejected_apps ?? 0}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">Relaciones cerradas (42.1.6)</div>
            <div class="report-field-value">${report.relationships_closed_count ?? 0}</div>
          </div>
          <div class="report-field">
            <div class="report-field-label">De esas, con ROS (42.1.7)</div>
            <div class="report-field-value">${report.ros_from_closed_relationships ?? 0}</div>
          </div>
        </div>
      </div>

      <div class="signatures">
        <div class="signature">Oficial de Cumplimiento</div>
        <div class="signature">Gerencia General</div>
      </div>

      <div class="report-footer">
        Documento generado desde CrediMaster el ${dayjs().format("DD/MM/YYYY HH:mm")} — remisión dentro de los primeros 5 días del mes siguiente.
      </div>
    </body>
  </html>
  `;

  return openReport(html);
};
