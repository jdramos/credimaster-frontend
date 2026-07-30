import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { date, money, getPeriodText } from "./reportUtils";

// Listado de todas las líneas de deducción o de ingreso aplicadas en
// planillas (una fila por línea, no por empleado) — para revisión/auditoría
// filtrada por tipo específico y/o rango de fecha de pago.
export const printDeduccionesIngresosReport = ({
  company = {}, user = {}, type, conceptName, startDate, endDate, lines = [], total = 0,
}) => {
  const fmt = (value) => money(value, "C$");
  const label = type === "INGRESO" ? "Ingresos" : "Deducciones";
  const periodText = (startDate || endDate) ? getPeriodText({ dateFrom: startDate, dateTo: endDate }) : "Todo el historial";

  const html = createReport({
    company,
    user,
    title: `Reporte de ${label} de Planilla`,
    subtitle: `${conceptName || `Todos los tipos de ${label.toLowerCase()}`} · ${periodText}`,
    orientation: "landscape",

    summary: [
      { label: "Líneas", value: String(lines.length) },
      { label: `Total ${label.toLowerCase()}`, value: fmt(total) },
    ],

    sections: [
      {
        title: "Detalle",
        table: {
          rows: lines,
          emptyMessage: `Sin ${label.toLowerCase()} registrados con estos filtros.`,
          columns: [
            { title: "Fecha de pago", field: (row) => date(row.pay_date) },
            { title: "Comprobante", field: (row) => row.entry_no || "-" },
            { title: "Empleado", field: "employee_name" },
            { title: "Cédula", field: (row) => row.id_card || "-" },
            { title: "Concepto", field: "concept_name" },
            { title: "Detalle", field: (row) => row.detail || "" },
            { title: "Monto", field: "amount", formatter: (v) => fmt(v), total: true, width: "110px" },
          ],
          footer: { label: `Total ${label.toLowerCase()}`, autoTotals: true },
        },
      },
    ],
  });

  openReport(html);
};

export default printDeduccionesIngresosReport;
