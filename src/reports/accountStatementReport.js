import dayjs from "dayjs";
import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { date, money, percent } from "./reportUtils";

const getTotals = (header = {}) => ({
  approvedAmount: Number(header.approved_amount || header.amount || 0),
  capitalBalance: Number(header.capital_balance || 0),
  interestBalance: Number(header.interest_balance || 0),
  insuranceBalance: Number(header.insurance_balance || 0),
  feeBalance: Number(header.fee_balance || 0),
  totalBalance: Number(header.total_balance || 0),
  defaultedDays: Number(header.defaulted_days || 0),
  paidInstallments: Number(header.paid_installments || 0),
  pendingInstallments: Number(header.pending_installments || 0),
  paymentProgress: Number(header.payment_progress || 0),
});

export const printAccountStatementReport = ({
  company = {},
  user = {},
  loanId,
  header = {},
  rows = [],
  customerName = "",
  identification = "",
  cutDate,
}) => {
  const totals = getTotals(header);
  const finalCutDate =
    header.cut_date || cutDate || dayjs().format("YYYY-MM-DD");

  const html = createReport({
    company,
    user,
    title: "Estado de Cuenta",
    subtitle: `Crédito #${loanId} · Corte ${date(finalCutDate)}`,
    orientation: "landscape",

    summary: [
      { label: "Saldo capital", value: money(totals.capitalBalance) },
      { label: "Saldo interés", value: money(totals.interestBalance) },
      {
        label: "Seguro / Comisión",
        value: money(totals.insuranceBalance + totals.feeBalance),
      },
      { label: "Total adeudado", value: money(totals.totalBalance) },
      { label: "Días mora", value: totals.defaultedDays },
      { label: "% pagado", value: percent(totals.paymentProgress, 0) },
      { label: "Cuotas pagadas", value: totals.paidInstallments },
      { label: "Cuotas pendientes", value: totals.pendingInstallments },
    ],

    sections: [
      {
        title: "Información del crédito",
        fields: {
          columns: 6,
          compact: true,
          items: [
            {
              label: "Cliente",
              value: header.customer_name || customerName,
              span: 2, // <-- ocupa dos columnas
            },
            {
              label: "Identificación",
              value: header.customer_identification || identification,
              spane: 1,
            },
            {
              label: "Estado",
              value: header.loan_status || "Vigente",
              className: "success",
            },
            {
              label: "Sucursal",
              value: header.branch_name,
            },
            {
              label: "Promotor",
              value: header.promoter_name,
            },

            {
              label: "Solicitud",
              value: date(header.date),
            },
            {
              label: "Aprobación",
              value: date(header.approval_date),
            },
            {
              label: "Desembolso",
              value: date(header.disbursement_date),
            },
            {
              label: "Vencimiento",
              value: date(header.due_date),
            },
            {
              label: "Plazo",
              value: `${header.approved_term || header.term} cuotas`,
              align: "center",
            },
            {
              label: "Frecuencia",
              value: header.frequency_name || header.frequency,
            },
            {
              label: "Monto aprobado",
              value: money(totals.approvedAmount),
              align: "right",
            },
            {
              label: "Saldo Capital",
              value: money(totals.capitalBalance),
              align: "right",
              className: "primary",
            },
            {
              label: "Saldo Interés",
              value: money(totals.interestBalance),
              align: "right",
              className: "primary",
            },
            {
              label: "Saldo Total",
              value: money(totals.totalBalance),
              align: "right",
              className: "danger",
            },
            {
              label: "Tasa",
              value: percent(header.approved_rate || header.interest_rate),
              align: "center",
            },
          ],
        },
      },

      {
        title: "Detalle de cuotas",
        table: {
          className: "account-statement-table",
          rows,
          emptyMessage: "No hay cuotas para mostrar.",
          columns: [
            {
              title: "Cuota",
              field: "payment_number",
              align: "center",
              width: "45px",
            },
            {
              title: "Fecha",
              field: "payment_date",
              format: "date",
              width: "70px",
            },
            {
              title: "Pagado el",
              field: "paid_at",
              format: "date",
              width: "70px",
            },
            {
              title: "Estado",
              field: (row) => row.status_label || row.status,
              align: "center",
            },

            {
              title: "Capital",
              field: "payment_principal",
              format: "money",
              total: true,
            },
            {
              title: "Interés",
              field: "payment_interest",
              format: "money",
              total: true,
            },
            {
              title: "Seguro",
              field: "payment_insurance",
              format: "money",
              total: true,
            },
            {
              title: "Comisión",
              field: "payment_fee",
              format: "money",
              total: true,
            },
            {
              title: "Otros",
              field: "payment_other_charges",
              format: "money",
              total: true,
            },
            {
              title: "Cuota total",
              field: "installment_total",
              format: "money",
              total: true,
            },

            {
              title: "Pagado",
              field: "paid_total",
              format: "money",
              total: true,
            },
            {
              title: "Pendiente",
              field: "pending_total",
              format: "money",
              total: true,
            },
          ],
          footer: {
            label: "Totales",
            autoTotals: true,
          },
        },
      },
    ],
  });

  openReport(html);
};
