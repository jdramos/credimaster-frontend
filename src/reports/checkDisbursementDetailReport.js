// Detalle imprimible de un cheque de desembolso: los créditos que respaldan el
// cheque. El asiento contable consolida el monto a "Remesas en Tránsito"
// (1101.03) en una sola partida; este reporte muestra el desglose por crédito.
// Mismo patrón que loanApplicationReport.js (HTML + ventana de impresión).
import dayjs from "dayjs";
import { buildHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";

const money = (value) =>
  Number(value || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const text = (value) => (value === 0 || value ? value : "—");

const fmtDate = (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "—");

const field = (label, value, { span } = {}) => `
  <div class="report-field"${span ? ` style="grid-column: span ${span};"` : ""}>
    <div class="report-field-label">${label}</div>
    <div class="report-field-value">${text(value)}</div>
  </div>
`;

export const printCheckDisbursementDetail = ({ company = {}, user = {}, check = {}, loans = [], total = 0 }) => {
  const sym = check.currency_symbol || "C$";

  const rowsHtml = loans
    .map(
      (l, i) => `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${text(l.credit_code)}</td>
        <td>${text(l.customer_name)}</td>
        <td>${text(l.delivery_agent_name)}</td>
        <td style="text-align:right;">${sym} ${money(l.amount)}</td>
      </tr>`,
    )
    .join("");

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Detalle de cheque ${check.check_number || ""}</title>
      ${reportStyles}
    </head>
    <body>
      ${buildHeader({
        company,
        title: "DETALLE DE CHEQUE — DESEMBOLSO DE CRÉDITOS",
        subtitle: `Cheque No. ${check.check_number || "—"} | Fecha: ${fmtDate(check.issue_date)} | Usuario: ${user?.full_name || "—"}`,
      })}

      <div class="section">
        <div class="section-title">Datos del cheque</div>
        <div class="report-fields" style="grid-template-columns: repeat(3, 1fr);">
          ${field("Nº de cheque", check.check_number)}
          ${field("Beneficiario", check.beneficiary_name, { span: 2 })}
          ${field("Banco", check.bank_name)}
          ${field("Cuenta", check.account_alias || check.account_number)}
          ${field("Fecha de emisión", fmtDate(check.issue_date))}
          ${field("Sucursal", check.branch_name)}
          ${field("Créditos que respalda", loans.length)}
          ${field("Monto total del cheque", `${sym} ${money(total || check.amount)}`, { span: 3 })}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Créditos desembolsados con este cheque</div>
        <table class="report-table" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:center;">#</th>
              <th style="text-align:left;">Crédito</th>
              <th style="text-align:left;">Cliente</th>
              <th style="text-align:left;">Responsable de entrega</th>
              <th style="text-align:right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="5" style="text-align:center;">Sin créditos</td></tr>`}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right; font-weight:bold;">TOTAL</td>
              <td style="text-align:right; font-weight:bold;">${sym} ${money(total)}</td>
            </tr>
          </tfoot>
        </table>
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
