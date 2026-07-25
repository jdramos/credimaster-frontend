import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { money, getPeriodText } from "./reportUtils";

// Reporte de apoyo para la Declaración/Anexo de Retenciones IR Laboral
// ante la DGI. NO es el archivo con el formato exacto que exige la DGI —
// es un reporte tabular completo con los campos legalmente requeridos,
// para transcripción manual o como respaldo/soporte (ver nota de diseño en
// credimasterweb_hr_payroll_module.md).
export const printRentasDelTrabajoReport = ({ company = {}, user = {}, startDate, endDate, employees = [], totals = {} }) => {
  const fmt = (value) => money(value, "C$");

  const html = createReport({
    company,
    user,
    title: "Reporte de Rentas del Trabajo",
    subtitle: `Soporte para Declaración de Retenciones IR Laboral (DGI) · ${getPeriodText({ dateFrom: startDate, dateTo: endDate })}`,
    orientation: "landscape",

    summary: [
      { label: "Empleados", value: String(employees.length) },
      { label: "Total ingresos gravables", value: fmt(totals.total_ingresos) },
      { label: "Total IR retenido", value: fmt(totals.total_ir) },
      { label: "Total INSS laboral retenido", value: fmt(totals.total_inss_laboral) },
    ],

    sections: [
      {
        title: "Detalle por empleado",
        table: {
          rows: employees,
          emptyMessage: "Sin ingresos registrados en el período.",
          columns: [
            { title: "Empleado", field: "full_name" },
            { title: "Cédula", field: (row) => row.id_card || "" },
            { title: "Puesto", field: (row) => row.position || "" },
            { title: "Ingresos gravables", field: "total_ingresos", formatter: (v) => fmt(v), total: true, width: "120px" },
            { title: "IR retenido", field: "total_ir", formatter: (v) => fmt(v), total: true, width: "110px" },
            { title: "INSS laboral retenido", field: "total_inss_laboral", formatter: (v) => fmt(v), total: true, width: "130px" },
            { title: "Neto pagado", field: "total_neto", formatter: (v) => fmt(v), total: true, width: "120px" },
          ],
          footer: { label: "Totales del período", autoTotals: true },
        },
      },
    ],
  });

  openReport(html);
};

export default printRentasDelTrabajoReport;
