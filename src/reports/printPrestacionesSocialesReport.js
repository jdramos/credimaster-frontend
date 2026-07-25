import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { date, money } from "./reportUtils";

// Pasivo laboral contingente: cuánto costaría liquidar a todo el personal
// activo a la fecha indicada. Reutiliza el mismo cálculo de la Fase 4
// (indemnización Art. 45, aguinaldo proporcional, vacaciones no gozadas),
// asumiendo el escenario que genera la obligación máxima (no asume de
// antemano un despido con causa justificada).
export const printPrestacionesSocialesReport = ({ company = {}, user = {}, asOfDate, employees = [], totals = {} }) => {
  const fmt = (value) => money(value, "C$");

  const html = createReport({
    company,
    user,
    title: "Reporte de Prestaciones Sociales Acumuladas",
    subtitle: `Pasivo laboral contingente al ${date(asOfDate)}`,
    orientation: "landscape",

    summary: [
      { label: "Empleados activos", value: String(employees.length) },
      { label: "Vacaciones acumuladas", value: fmt(totals.vacaciones_monto) },
      { label: "Aguinaldo proporcional", value: fmt(totals.aguinaldo_monto) },
      { label: "Indemnización estimada", value: fmt(totals.indemnizacion_monto) },
      { label: "Total acumulado", value: fmt(totals.total_acumulado) },
    ],

    sections: [
      {
        title: "Detalle por empleado",
        table: {
          rows: employees,
          emptyMessage: "Sin empleados activos.",
          columns: [
            { title: "Empleado", field: "full_name" },
            { title: "Puesto", field: (row) => row.position || "" },
            { title: "Ingreso", field: (row) => date(row.hire_date), width: "90px" },
            { title: "Años serv.", field: "years_of_service", width: "70px" },
            { title: "Vacaciones", field: "vacaciones_monto", formatter: (v) => fmt(v), total: true, width: "100px" },
            { title: "Aguinaldo", field: "aguinaldo_monto", formatter: (v) => fmt(v), total: true, width: "100px" },
            { title: "Indemnización", field: "indemnizacion_monto", formatter: (v) => fmt(v), total: true, width: "110px" },
            { title: "Total", field: "total_acumulado", formatter: (v) => fmt(v), total: true, width: "110px" },
          ],
          footer: { label: "Totales", autoTotals: true },
        },
      },
    ],
  });

  openReport(html);
};

export default printPrestacionesSocialesReport;
