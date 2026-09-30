// src/reports/writtenOffLoansReport.js — impresión del listado de cartera
// saneada (créditos castigados), ver WrittenOffLoansList.jsx y
// api/loan/writtenOffLoansController.js.
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";
import { openReport } from "./reportViewer";

const text = (value) => value || "—";

const money = (value) =>
  `C$ ${Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "—");

export const printWrittenOffLoansReport = ({ company = {}, user = {}, rows = [] }) => {
  const total = rows.reduce((sum, r) => sum + Number(r.writeoff_original_amount || 0), 0);

  const html = `
  <html>
    <head>
      <title>Cartera Saneada</title>
      ${reportStyles}
    </head>

    <body>
      ${buildHeader({
        company,
        title: "CARTERA SANEADA",
        subtitle: `${rows.length} crédito${rows.length === 1 ? "" : "s"} saneado${rows.length === 1 ? "" : "s"}`,
        user,
      })}

      <div class="report-section">
        <table class="report-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Identificación</th>
              <th>Sucursal</th>
              <th class="right">Monto saneado</th>
              <th>Fecha de saneamiento</th>
              <th>Fecha de desembolso</th>
            </tr>
          </thead>
          <tbody>
            ${
              rows.length
                ? rows
                    .map(
                      (r) => `
                      <tr>
                        <td>${text(r.credit_code)}</td>
                        <td>${text(r.customer_name)}</td>
                        <td>${text(r.customer_identification)}</td>
                        <td>${text(r.branch_name)}</td>
                        <td class="right">${money(r.writeoff_original_amount)}</td>
                        <td>${formatDate(r.writeoff_date)}</td>
                        <td>${formatDate(r.disbursement_date)}</td>
                      </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="7" class="empty-row center">Sin créditos saneados</td></tr>`
            }
          </tbody>
          ${
            rows.length
              ? `
          <tfoot>
            <tr>
              <td colspan="4" class="total-label">Total</td>
              <td class="right total-label">${money(total)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>`
              : ""
          }
        </table>
      </div>

      <div class="report-footer">
        Reporte generado desde CrediMaster el ${dayjs().format("DD/MM/YYYY HH:mm")}
      </div>
    </body>
  </html>
  `;

  return openReport(html);
};
