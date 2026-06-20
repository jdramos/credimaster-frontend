import dayjs from "dayjs";

const money = (value) =>
  `C$ ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`;

const buildReportHeader = ({ company = {}, title = "", subtitle = "" }) => `
  <div class="report-header">
    ${
      company?.logo_url
        ? `
          <div class="logo-box">
            <img src="${company.logo_url}" class="company-logo" />
          </div>
        `
        : ""
    }

    <div class="company-info">
      <div class="company-name">
        ${company?.commercial_name || company?.legal_name || ""}
      </div>

      ${
        company?.legal_name &&
        company?.commercial_name &&
        company.legal_name !== company.commercial_name
          ? `<div class="company-legal">${company.legal_name}</div>`
          : ""
      }

      <div class="company-line">
        ${company?.tax_id ? `RUC: ${company.tax_id}` : ""}
      </div>

      <div class="company-line">
        ${company?.address || ""}
      </div>

      <div class="company-line">
        ${company?.phone ? `Tel: ${company.phone}` : ""}
        ${company?.email ? ` · Email: ${company.email}` : ""}
      </div>
    </div>
  </div>

  <div class="report-title">${title}</div>

  ${
    subtitle
      ? `
        <div class="report-subtitle">
          ${subtitle}
        </div>
      `
      : ""
  }
`;

const buildReportFooter = ({ user = {} }) => `
  <div class="report-footer">
    Usuario: ${user?.full_name || user?.user_name || ""} ·
    Fecha impresión: ${dayjs().format("DD/MM/YYYY HH:mm")} ·
    Generado por CrediMaster
  </div>
`;

const buildReportLayout = ({
  company = {},
  user = {},
  title = "",
  subtitle = "",
  content = "",
  orientation = "landscape",
}) => `
  <html>
    <head>
      <title>${title}</title>

      <style>
        @page {
          size: ${orientation};
          margin: 12mm;
        }

        body {
          font-family: Arial, sans-serif;
          color: #0F172A;
          font-size: 11px;
          margin: 0;
        }

        .report-header {
          display: flex;
          align-items: center;
          gap: 14px;
          border-bottom: 3px solid #005AA7;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }

        .logo-box {
          width: 78px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .company-logo {
          max-width: 76px;
          max-height: 60px;
          object-fit: contain;
        }

        .company-info {
          flex: 1;
          line-height: 1.35;
        }

        .company-name {
          color: #005AA7;
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .company-legal {
          font-size: 11px;
          font-weight: 700;
          color: #334155;
        }

        .company-line {
          font-size: 10px;
          color: #475569;
        }

        .report-title {
          text-align: center;
          font-size: 16px;
          font-weight: 900;
          margin-top: 8px;
          text-transform: uppercase;
        }

        .report-subtitle {
          text-align: center;
          margin-top: 3px;
          margin-bottom: 12px;
          color: #475569;
          font-size: 11px;
        }

        .kpis {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .kpi {
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 6px 10px;
          min-width: 140px;
        }

        .kpi-label {
          font-size: 10px;
          color: #475569;
          font-weight: bold;
        }

        .kpi-value {
          font-size: 12px;
          font-weight: bold;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #005AA7;
          color: white;
          padding: 6px;
          border: 1px solid #CBD5E1;
          font-size: 10px;
        }

        td {
          padding: 5px;
          border: 1px solid #CBD5E1;
          font-size: 10px;
        }

        .branch {
          background: #DCEEFF;
          font-weight: bold;
        }

        .vendor {
          background: #F5F8FC;
          font-weight: bold;
        }

        .customer {
          background: white;
        }

        .indent1 {
          padding-left: 22px;
        }

        .indent2 {
          padding-left: 44px;
        }

        .right {
          text-align: right;
        }

        .center {
          text-align: center;
        }

        .report-footer {
          margin-top: 10px;
          padding-top: 6px;
          border-top: 1px solid #CBD5E1;
          font-size: 10px;
          color: #64748B;
          text-align: right;
        }
      </style>
    </head>

    <body>
      ${buildReportHeader({
        company,
        title,
        subtitle,
      })}

      ${content}

      ${buildReportFooter({
        user,
      })}

      <script>
        window.onload = function () {
          window.print();
        };
      </script>
    </body>
  </html>
`;

export const printCustomerBalanceReport = ({
  company = {},
  user = {},
  nodes = [],
  expandedKeys = {},
  date,
  balanceType,
  globalTotals = {},
}) => {
  const rows = [];

  nodes.forEach((branch) => {
    rows.push({
      level: "BRANCH",
      ...branch.data,
    });

    if (!expandedKeys[branch.key]) return;

    (branch.children || []).forEach((vendor) => {
      rows.push({
        level: "VENDOR",
        ...vendor.data,
      });

      if (!expandedKeys[vendor.key]) return;

      (vendor.children || []).forEach((customer) => {
        rows.push({
          level: "CUSTOMER",
          ...customer.data,
        });
      });
    });
  });

  const content = `
    <div class="kpis">
      <div class="kpi">
        <div class="kpi-label">Clientes</div>
        <div class="kpi-value">${globalTotals.count || 0}</div>
      </div>

      <div class="kpi">
        <div class="kpi-label">Saldo Capital</div>
        <div class="kpi-value">${money(globalTotals.capital)}</div>
      </div>

      <div class="kpi">
        <div class="kpi-label">Saldo Interés</div>
        <div class="kpi-value">${money(globalTotals.interest)}</div>
      </div>

      <div class="kpi">
        <div class="kpi-label">Capital en Mora</div>
        <div class="kpi-value">${money(globalTotals.defaulted)}</div>
      </div>

      <div class="kpi">
        <div class="kpi-label">Capital Vencido</div>
        <div class="kpi-value">${money(globalTotals.overdue)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Cliente / Grupo</th>
          <th>Identificación</th>
          <th>Crédito No.</th>
          <th>Saldo Capital</th>
          <th>Saldo Interés</th>
          <th>Capital Mora</th>
          <th>Capital Vencido</th>
          <th># Clientes</th>
        </tr>
      </thead>

      <tbody>
        ${rows
          .map((r) => {
            const cls =
              r.level === "BRANCH"
                ? "branch"
                : r.level === "VENDOR"
                  ? "vendor"
                  : "customer";

            const indent =
              r.level === "VENDOR"
                ? "indent1"
                : r.level === "CUSTOMER"
                  ? "indent2"
                  : "";

            return `
              <tr class="${cls}">
                <td class="${indent}">${r.name || ""}</td>
                <td class="center">${r.identification || ""}</td>
                <td class="center">${r.loan || ""}</td>
                <td class="right">${r.capital || ""}</td>
                <td class="right">${r.interest || ""}</td>
                <td class="right">${r.defaulted || ""}</td>
                <td class="right">${r.overdue || ""}</td>
                <td class="center">${r.count || ""}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;

  const html = buildReportLayout({
    company,
    user,
    title: "Consulta de Saldos por Cliente",
    subtitle: `Corte: ${dayjs(date).format("DD/MM/YYYY")} · Tipo: ${
      balanceType === "FINAL" ? "Saldo Final" : "Saldo Inicial"
    }`,
    content,
    orientation: "landscape",
  });

  const printWindow = window.open("", "_blank");

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
