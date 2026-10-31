import dayjs from "dayjs";
import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { date, money, percent } from "./reportUtils";
import { installmentDays, installmentDaysLabel } from "../utils/installmentDays";

// Estado de mora y comportamiento de pago a la fecha de corte
// (GET /api/loans/:id/payment-profile?date=..., ver LoanPaymentProfile.jsx).
const avgDaysText = (behavior) => {
  if (!behavior || behavior.code === "SIN_HISTORIAL") return "Sin historial";
  const n = Math.round(Number(behavior.avg_days) * 10) / 10;
  if (n === 0) return "Puntual";
  return n > 0 ? `${n} días tarde` : `${Math.abs(n)} días antes`;
};

const paymentProfileSection = (profile) => {
  if (!profile) return null;
  const { delinquency: dq, next_installment: next, behavior: bh } = profile;
  const dqClass = dq.code === "AL_DIA" ? "success" : "danger";
  return {
    title: "Estado y comportamiento de pago",
    fields: {
      columns: 6,
      compact: true,
      items: [
        { label: "Estado de mora", value: dq.label, className: dqClass },
        { label: "Estado de cartera", value: dq.portfolio_status_label || "—" },
        { label: "Cuotas vencidas", value: dq.overdue_installments, align: "center", className: dq.overdue_installments ? "danger" : undefined },
        { label: "Monto vencido", value: money(dq.overdue_amount), align: "right", className: dq.overdue_amount ? "danger" : undefined },
        { label: "Próxima cuota", value: next ? `#${next.number} · ${date(next.date)}` : "—" },
        { label: "Monto próxima cuota", value: next ? money(next.amount) : "—", align: "right" },
        { label: "Comportamiento", value: bh.label, className: bh.code === "MALO" ? "danger" : bh.code === "EXCELENTE" || bh.code === "BUENO" ? "success" : undefined },
        { label: "Pago promedio", value: avgDaysText(bh) },
        { label: "Cuotas a tiempo", value: bh.on_time_pct == null ? "—" : percent(bh.on_time_pct, 0), align: "center" },
        { label: "Peor atraso", value: `${bh.max_days_late} días`, align: "center" },
        { label: "Último pago", value: bh.last_payment_date ? `${date(bh.last_payment_date)} · ${money(bh.last_payment_amount)}` : "Sin pagos" },
        { label: "Pagos registrados", value: bh.payments_count, align: "center" },
      ],
    },
  };
};

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
  paymentProfile = null,
  adjustments = [],
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
              value: `${header.approved_term || header.term} meses`,
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

      ...(paymentProfile ? [paymentProfileSection(paymentProfile)] : []),

      // Notas de crédito/débito aplicadas hasta la fecha de corte.
      ...(adjustments.length
        ? [
            {
              title: "Notas de crédito y débito",
              table: {
                columns: [
                  { title: "Fecha", field: "applied_date", format: "date", width: "70px" },
                  { title: "Tipo", field: (a) => (a.adjustment_type === "CREDIT" ? "Crédito" : "Débito"), width: "60px" },
                  { title: "Concepto", field: "concept_label" },
                  {
                    title: "Monto",
                    field: (a) => `${a.adjustment_type === "CREDIT" ? "-" : "+"}${money(a.total_amount)}`,
                    align: "right",
                  },
                  { title: "Motivo", field: "reason" },
                  { title: "Aprobó", field: (a) => a.approved_by_name || "—" },
                ],
                rows: adjustments,
              },
            },
          ]
        : []),

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
              // + días tarde / - días antes del vencimiento; vencidas sin
              // pagar: días que llevan vencidas a la fecha de corte.
              title: "Días",
              field: (row) =>
                row.payment_number === 0 ? "" : installmentDaysLabel(installmentDays(row, finalCutDate)),
              align: "center",
              width: "55px",
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
