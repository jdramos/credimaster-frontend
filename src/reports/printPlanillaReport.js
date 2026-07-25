import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { date, money } from "./reportUtils";

// Planilla completa (todos los empleados de una corrida), formato apaisado.
export const printPlanillaReport = ({ company = {}, user = {}, run = {}, items = [] }) => {
  const fmt = (value) => money(value, "C$");

  const totalIncome = items.reduce((s, i) => s + Number(i.total_income || 0), 0);
  const totalDeductions = items.reduce((s, i) => s + Number(i.total_deductions || 0), 0);
  const totalNet = items.reduce((s, i) => s + Number(i.net_pay || 0), 0);

  const html = createReport({
    company,
    user,
    title: "Planilla de Pago",
    subtitle: `${date(run.period_start)} al ${date(run.period_end)} · Pago: ${date(run.pay_date)} · ${run.branch_name || "Todas las sucursales"}`,
    orientation: "landscape",

    summary: [
      { label: "Empleados", value: String(items.length) },
      { label: "Total ingresos", value: fmt(totalIncome) },
      { label: "Total deducciones", value: fmt(totalDeductions) },
      { label: "Total neto", value: fmt(totalNet) },
    ],

    sections: [
      {
        title: "Detalle por empleado",
        table: {
          rows: items,
          emptyMessage: "Sin empleados en esta corrida.",
          columns: [
            { title: "Empleado", field: "employee_name" },
            { title: "Puesto", field: (row) => row.position || "" },
            { title: "Salario mensual", field: "salario_mensual", formatter: (v) => fmt(v), width: "100px" },
            { title: "Salario quincenal", field: "salario_quincenal", formatter: (v) => fmt(v), width: "100px" },
            { title: "INSS", field: "inss_monto", formatter: (v) => fmt(v), total: true, width: "90px" },
            { title: "IR", field: "ir_monto", formatter: (v) => fmt(v), total: true, width: "90px" },
            { title: "Otras deducciones", field: "otras_deducciones_monto", formatter: (v) => fmt(v), total: true, width: "110px" },
            { title: "Salario neto", field: "net_pay", formatter: (v) => fmt(v), total: true, width: "100px" },
          ],
          footer: { label: "Totales de la planilla", autoTotals: true },
        },
      },
    ],
  });

  openReport(html);
};

export default printPlanillaReport;
