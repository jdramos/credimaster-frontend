import dayjs from "dayjs";
import { buildReportHeader } from "./reportHeader";
import { reportStyles } from "./reportStyles";

const money = (value) =>
  Number(value || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const text = (value) => value || "—";

export const printPortfolioReport = ({
  company = {},
  user = {},
  filters = {},
  summary = {},
  by_status = [],
  by_aging = [],
  details = [],
}) => {
  const html = `
  <html>
    <head>
      <title>Reporte de Cartera</title>
      ${reportStyles}
    </head>

    <body>
      ${buildReportHeader({
        company,
        title: "REPORTE DE CARTERA",
        subtitle: `Fecha: ${
          filters?.balance_date
            ? dayjs(filters.balance_date).format("DD/MM/YYYY")
            : dayjs().format("DD/MM/YYYY")
        } | Tipo: ${filters?.balance_type || "FINAL"} | Usuario: ${
          user?.full_name || "—"
        }`,
      })}

      <div class="section">
        <div class="section-title">Resumen Ejecutivo</div>
        <div class="grid">
          <div class="field">
            <div class="label">Créditos Activos</div>
            <div class="value">${text(summary.active_loans)}</div>
          </div>
          <div class="field">
            <div class="label">Clientes Activos</div>
            <div class="value">${text(summary.active_customers)}</div>
          </div>
          <div class="field">
            <div class="label">Saldo Capital</div>
            <div class="value">C$ ${money(summary.capital_balance)}</div>
          </div>
          <div class="field">
            <div class="label">Interés por Cobrar</div>
            <div class="value">C$ ${money(summary.interest_balance)}</div>
          </div>

          <div class="field">
            <div class="label">Saldo en Mora</div>
            <div class="value">C$ ${money(summary.delinquent_balance)}</div>
          </div>
          <div class="field">
            <div class="label">Cartera Total</div>
            <div class="value">C$ ${money(summary.total_balance)}</div>
          </div>
          <div class="field">
            <div class="label">Sucursal</div>
            <div class="value">${text(filters.branch_id || "Todas")}</div>
          </div>
          <div class="field">
            <div class="label">Gestor</div>
            <div class="value">${text(filters.collector_id || "Todos")}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Cartera por Estado</div>
        <table>
          <thead>
            <tr>
              <th>Estado</th>
              <th style="text-align:right;">Créditos</th>
              <th style="text-align:right;">Saldo</th>
            </tr>
          </thead>
          <tbody>
            ${
              by_status.length
                ? by_status
                    .map(
                      (row) => `
                      <tr>
                        <td>${text(row.status)}</td>
                        <td align="right">${text(row.loans)}</td>
                        <td align="right">C$ ${money(row.balance)}</td>
                      </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="3" align="center">Sin datos</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Cartera por Antigüedad de Mora</div>
        <table>
          <thead>
            <tr>
              <th>Rango</th>
              <th style="text-align:right;">Créditos</th>
              <th style="text-align:right;">Saldo</th>
            </tr>
          </thead>
          <tbody>
            ${
              by_aging.length
                ? by_aging
                    .map(
                      (row) => `
                      <tr>
                        <td>${text(row.aging_range)}</td>
                        <td align="right">${text(row.loans)}</td>
                        <td align="right">C$ ${money(row.balance)}</td>
                      </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="3" align="center">Sin datos</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Detalle de Cartera</div>
        <table>
          <thead>
            <tr>
              <th>Crédito</th>
              <th>Cliente</th>
              <th>Sucursal</th>
              <th>Gestor</th>
              <th style="text-align:right;">Días Mora</th>
              <th style="text-align:right;">Capital</th>
              <th style="text-align:right;">Interés</th>
              <th style="text-align:right;">Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${
              details.length
                ? details
                    .map(
                      (row) => `
                      <tr>
                        <td>${text(row.loan_id)}</td>
                        <td>${text(row.customer_name || row.customer_identification)}</td>
                        <td>${text(row.branch_name)}</td>
                        <td>${text(row.collector_name)}</td>
                        <td align="right">${text(row.defaulted_days)}</td>
                        <td align="right">C$ ${money(row.capital_balance)}</td>
                        <td align="right">C$ ${money(row.interest_balance)}</td>
                        <td align="right">C$ ${money(row.total_balance)}</td>
                        <td>${text(row.loan_status)}</td>
                      </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="9" align="center">Sin datos</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="footer">
        Generado desde CrediMaster el ${dayjs().format("DD/MM/YYYY HH:mm")}
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
