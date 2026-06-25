import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { date, getPeriodText, money } from "./reportUtils";

const paymentTotal = (p = {}) =>
  Number(p.principal_payment || 0) +
  Number(p.interest_payment || 0) +
  Number(p.insurance_payment || 0) +
  Number(p.fee_payment || 0) +
  Number(p.other_charges_payment || 0) +
  Number(p.defaulted_interest || 0);

export const printPaymentsReceivedReport = ({
  company = {},
  user = {},
  rows = [],
  summary = {},
  filters = {},
}) => {
  const periodText = getPeriodText({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });

  let groups = [];
  let groupLabel = "Sin agrupación";

  if (!filters.branchId) {
    groups = [
      { field: "branch_name", title: "Sucursal" },
      { field: "collector_name", title: "Colector" },
    ];

    groupLabel = "Sucursal / Colector";
  } else if (!filters.collectorId) {
    groups = [{ field: "collector_name", title: "Colector" }];

    groupLabel = "Colector";
  }

  const html = createReport({
    company,
    user,
    title: "Pagos Recibidos",
    subtitle: `Período: ${periodText}`,
    orientation: "landscape",

    summary: [
      {
        label: "Cantidad de pagos",
        value: summary?.payments_count || 0,
      },
      {
        label: "Capital",
        value: money(summary?.total_principal),
      },
      {
        label: "Interés",
        value: money(summary?.total_interest),
      },
      {
        label: "Mora",
        value: money(summary?.total_defaulted_interest),
      },
      {
        label: "Total cobrado",
        value: money(summary?.total_collected),
      },
    ],

    sections: [
      {
        title: "Detalle de pagos recibidos",
        table: {
          className: "payments-table",
          rows,
          groups,
          showGroupTotals: true,
          emptyMessage:
            "No hay pagos para mostrar con los filtros seleccionados.",
          columns: [
            {
              title: "ID",
              field: "id",
              align: "center",
              nowrap: true,
              width: "45px",
            },
            {
              title: "Fecha",
              field: "payment_date",
              formatter: (value) => date(value, ""),
              align: "center",
              nowrap: true,
              width: "70px",
            },
            {
              title: "Crédito",
              field: (row) => row.credit_code || row.loan_id,
              align: "center",
              nowrap: true,
              width: "70px",
            },
            {
              title: "Cédula",
              field: "customer_identification",
              nowrap: true,
              width: "90px",
            },
            {
              title: "Cliente",
              field: "customer_name",
              className: "customer-cell",
            },
            {
              title: "Sucursal",
              field: "branch_name",
            },
            {
              title: "Colector",
              field: "collector_name",
            },
            {
              title: "Forma Pago",
              field: "forma_pago_name",
            },
            {
              title: "Capital",
              field: "principal_payment",
              format: "money",
              total: true,
              groupTotal: true,
            },
            {
              title: "Interés",
              field: "interest_payment",
              format: "money",
              total: true,
              groupTotal: true,
            },
            {
              title: "Mora",
              field: "defaulted_interest",
              format: "money",
              total: true,
              groupTotal: true,
            },
            {
              title: "Seguro",
              field: "insurance_payment",
              format: "money",
              total: true,
              groupTotal: true,
            },
            {
              title: "Comisión",
              field: "fee_payment",
              format: "money",
              total: true,
              groupTotal: true,
            },
            {
              title: "Otros",
              field: "other_charges_payment",
              format: "money",
              total: true,
              groupTotal: true,
            },
            {
              title: "Total",
              field: paymentTotal,
              format: "money",
              total: true,
              groupTotal: true,
            },
          ],
          footer: {
            label: `Totales (${summary?.payments_count || 0} pagos)`,
            values: {
              principal_payment: summary?.total_principal,
              interest_payment: summary?.total_interest,
              defaulted_interest: summary?.total_defaulted_interest,
              insurance_payment: summary?.total_insurance,
              fee_payment: summary?.total_fee,
              other_charges_payment: summary?.total_other_charges,
              Total: summary?.total_collected,
            },
          },
        },
      },
    ],
  });

  openReport(html);
};
