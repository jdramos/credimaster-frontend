// src/reports/annualRiskReport.js — Informe Anual de Evaluaciones Individuales
// de Riesgo, Art. 42.3.1 / Art. 29 CD-CONAMI-070-01OCT07-2025.
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";
import { openReport } from "./reportViewer";

const text = (value) => value || "—";

export const printAnnualRiskReport = ({ company = {}, user = {}, report = {} }) => {
  const customers = Array.isArray(report.customers) ? report.customers : [];
  const porNivel = report.por_nivel || { BAJO: 0, MEDIO: 0, ALTO: 0 };

  const html = `
  <html>
    <head>
      <title>Informe Anual de Evaluaciones Individuales de Riesgo</title>
      ${reportStyles}
    </head>

    <body>
      ${buildHeader({
        company,
        title: "INFORME ANUAL DE EVALUACIONES INDIVIDUALES DE RIESGO",
        subtitle: `Año ${text(report.year)} — Art. 42.3.1 / Art. 29 CD-CONAMI-070-01OCT07-2025`,
        user,
      })}

      <div class="report-summary">
        <div class="summary-item">
          <div class="summary-label">BAJO</div>
          <div class="summary-value">${porNivel.BAJO || 0}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">MEDIO</div>
          <div class="summary-value">${porNivel.MEDIO || 0}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">ALTO</div>
          <div class="summary-value">${porNivel.ALTO || 0}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Total evaluados</div>
          <div class="summary-value">${report.total_evaluados || 0}</div>
        </div>
      </div>

      <div class="report-section">
        <div class="section-header"><div class="section-title">Detalle de clientes evaluados</div></div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Identificación</th>
              <th>Nivel de riesgo</th>
              <th>Puntaje</th>
              <th>Fecha de evaluación</th>
            </tr>
          </thead>
          <tbody>
            ${
              customers.length
                ? customers
                    .map(
                      (c) => `
                      <tr>
                        <td>${text(c.customer_code)}</td>
                        <td>${text(c.customer_name)}</td>
                        <td>${text(c.identification)}</td>
                        <td>${text(c.risk_level)}</td>
                        <td class="right">${c.risk_score != null ? Number(c.risk_score).toFixed(2) : "—"}</td>
                        <td>${c.risk_calculated_at ? dayjs(c.risk_calculated_at).format("DD/MM/YYYY") : "—"}</td>
                      </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="6" class="empty-row center">Sin clientes evaluados en este período</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="signatures">
        <div class="signature">Oficial de Cumplimiento</div>
        <div class="signature">Gerencia General</div>
      </div>

      <div class="report-footer">
        Documento generado desde CrediMaster el ${dayjs().format("DD/MM/YYYY HH:mm")} — vencimiento de remisión: ${text(report.deadline)}
      </div>
    </body>
  </html>
  `;

  return openReport(html);
};
