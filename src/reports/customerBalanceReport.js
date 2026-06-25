import dayjs from "dayjs";
import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { money } from "./reportUtils";

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
      name: branch.data?.name,
      count: branch.data?.count,
      capital: branch.data?.capital,
      interest: branch.data?.interest,
      defaulted: branch.data?.defaulted,
      overdue: branch.data?.overdue,
    });

    if (!expandedKeys[branch.key]) return;

    (branch.children || []).forEach((vendor) => {
      rows.push({
        level: "VENDOR",
        name: vendor.data?.name,
        count: vendor.data?.count,
        capital: vendor.data?.capital,
        interest: vendor.data?.interest,
        defaulted: vendor.data?.defaulted,
        overdue: vendor.data?.overdue,
      });

      if (!expandedKeys[vendor.key]) return;

      (vendor.children || []).forEach((customer) => {
        rows.push({
          level: "CUSTOMER",
          name: customer.data?.name,
          identification: customer.data?.identification,
          loan: customer.data?.loan,
          count: customer.data?.count,
          capital: customer.data?.capital,
          interest: customer.data?.interest,
          defaulted: customer.data?.defaulted,
          overdue: customer.data?.overdue,
        });
      });
    });
  });

  const html = createReport({
    company,
    user,
    title: "Consulta de Saldos por Cliente",
    subtitle: `Corte: ${dayjs(date).format("DD/MM/YYYY")} · Tipo: ${
      balanceType === "FINAL" ? "Saldo Final" : "Saldo Inicial"
    }`,
    orientation: "landscape",

    summary: [
      {
        label: "Clientes",
        value: globalTotals.count || 0,
      },
      {
        label: "Saldo Capital",
        value: money(globalTotals.capital),
      },
      {
        label: "Saldo Interés",
        value: money(globalTotals.interest),
      },
      {
        label: "Capital en Mora",
        value: money(globalTotals.defaulted),
      },
      {
        label: "Capital Vencido",
        value: money(globalTotals.overdue),
      },
    ],

    sections: [
      {
        title: "Detalle de saldos",
        table: {
          rows,
          rowClass: (row) => {
            if (row.level === "BRANCH") return "branch-row";
            if (row.level === "VENDOR") return "vendor-row";
            return "customer-row";
          },
          columns: [
            {
              title: "Cliente / Grupo",
              field: (row) => {
                if (row.level === "VENDOR")
                  return `&nbsp;&nbsp;&nbsp;${row.name || ""}`;
                if (row.level === "CUSTOMER")
                  return `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${row.name || ""}`;
                return row.name || "";
              },
            },
            {
              title: "Identificación",
              field: "identification",
              align: "center",
              nowrap: true,
            },
            {
              title: "Crédito No.",
              field: "loan",
              align: "center",
              nowrap: true,
            },
            {
              title: "Saldo Capital",
              field: "capital",
              format: "money",
              total: true,
            },
            {
              title: "Saldo Interés",
              field: "interest",
              format: "money",
              total: true,
            },
            {
              title: "Capital Mora",
              field: "defaulted",
              format: "money",
              total: true,
            },
            {
              title: "Capital Vencido",
              field: "overdue",
              format: "money",
              total: true,
            },
            {
              title: "# Clientes",
              field: "count",
              format: "integer",
              align: "center",
            },
          ],
          footer: {
            label: "Total general",
            autoTotals: true,
          },
        },
      },
    ],
  });

  openReport(html);
};
