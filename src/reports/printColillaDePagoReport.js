import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { date, money } from "./reportUtils";

// Colilla individual de un empleado dentro de una corrida de planilla —
// incluye el desglose de préstamo ("Cuota N de M, Saldo C$ X") y el saldo
// de vacaciones resultante, tal como pidió el usuario explícitamente.
export const printColillaDePagoReport = ({ company = {}, user = {}, run = {}, item = {}, concepts = [] }) => {
  const fmt = (value) => money(value, "C$");

  const incomeConcepts = concepts.filter((c) => c.type === "INGRESO");
  const deductionConcepts = concepts.filter((c) => c.type === "DEDUCCION");

  const html = createReport({
    company,
    user,
    title: "Colilla de Pago",
    subtitle: `${date(run.period_start)} al ${date(run.period_end)} · Pago: ${date(run.pay_date)}`,
    orientation: "portrait",

    summary: [
      { label: "Total ingresos", value: fmt(item.total_income) },
      { label: "Total deducciones", value: fmt(item.total_deductions) },
      { label: "Neto a pagar", value: fmt(item.net_pay) },
      { label: "Saldo de vacaciones", value: `${Number(item.vacation_balance_after || 0).toFixed(2)} días` },
    ],

    sections: [
      {
        title: "Empleado",
        fields: {
          columns: 3,
          compact: true,
          items: [
            { label: "Nombre", value: item.employee_name, span: 2 },
            { label: "Cédula", value: item.id_card || "-" },
            { label: "Puesto", value: item.position || "-" },
            { label: "Sucursal", value: item.branch_name || "-" },
            { label: "Comprobante", value: run.entry_no || "-" },
          ],
        },
      },
      {
        title: "Ingresos",
        table: {
          rows: incomeConcepts,
          emptyMessage: "Sin ingresos adicionales.",
          columns: [
            { title: "Concepto", field: "name" },
            { title: "Detalle", field: (row) => row.detail || "" },
            { title: "Monto", field: "amount", formatter: (v) => fmt(v), total: true, width: "110px" },
          ],
          footer: { label: "Total ingresos", autoTotals: true },
        },
      },
      {
        title: "Deducciones",
        table: {
          rows: deductionConcepts,
          emptyMessage: "Sin deducciones.",
          columns: [
            { title: "Concepto", field: "name" },
            { title: "Detalle", field: (row) => row.detail || "" },
            { title: "Monto", field: "amount", formatter: (v) => fmt(v), total: true, width: "110px" },
          ],
          footer: { label: "Total deducciones", autoTotals: true },
        },
      },
    ],
  });

  openReport(html);
};

export default printColillaDePagoReport;
