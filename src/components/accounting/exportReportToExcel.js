import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { getReportContext } from "./printAccountingReport";

// Exportación a Excel con la misma definición de reporte que
// printAccountingReport ({ title, subtitle, period, columns, rows, totals }),
// así cada pantalla describe sus columnas una sola vez para imprimir y
// exportar. Las columnas numéricas van como número (no como texto
// formateado) para que se puedan sumar en Excel.

const cellValue = (column, row) => {
  const raw = typeof column.value === "function" ? column.value(row) : row[column.field];
  if (column.numeric) {
    if (raw === null || raw === undefined || raw === "") return "";
    const n = Number(raw);
    return Number.isFinite(n) ? n : String(raw);
  }
  const value = column.format ? column.format(raw, row) : raw;
  return value === null || value === undefined ? "" : String(value);
};

// Un total puede traer `raw` (número sin formato); si no, se intenta leer el
// texto formateado ("1,234.50").
const totalValue = (total) => {
  if (total.raw !== undefined && total.raw !== null) return Number(total.raw);
  if (!total.numeric) return total.value ?? "";
  const n = Number(String(total.value ?? "").replace(/,/g, ""));
  return total.value !== "" && Number.isFinite(n) ? n : total.value ?? "";
};

// Filas (arreglo de arreglos) de la hoja: encabezado institucional, títulos
// de columna, datos y fila de totales. Separado para poder probarlo.
export const buildReportSheetData = ({ title, subtitle, period, columns, rows = [], totals = [] }, context = getReportContext()) => {
  const header = [[context.companyName]];
  if (context.legalName) header.push([context.legalName]);
  if (context.taxId) header.push([`RUC: ${context.taxId}`]);
  header.push([title]);
  if (subtitle) header.push([subtitle]);
  if (period) header.push([`Período: ${period}`]);
  header.push([`Fecha: ${context.emittedAt}${context.emittedBy ? ` · Usuario: ${context.emittedBy}` : ""}`]);
  header.push([]);

  const body = rows.map((row) => columns.map((column) => cellValue(column, row)));

  const footer = [];
  if (totals.length) {
    const line = [];
    totals.forEach((total) => {
      line.push(totalValue(total));
      for (let i = 1; i < (total.colspan || 1); i += 1) line.push("");
    });
    footer.push(line);
  }

  return { aoa: [...header, columns.map((column) => column.label), ...body, ...footer], headerRows: header.length };
};

const safeSheetName = (name) => String(name || "Reporte").replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Reporte";

export const safeFileName = (name) => {
  const base = String(name || "reporte")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return /\.xlsx$/i.test(base) ? base : `${base || "reporte"}.xlsx`;
};

export const exportReportToExcel = ({ fileName, sheetName, ...report }) => {
  const { aoa, headerRows } = buildReportSheetData(report);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const sample = aoa.slice(headerRows, headerRows + 200);
  ws["!cols"] = report.columns.map((_, index) => ({
    wch: Math.min(45, Math.max(10, ...sample.map((line) => String(line[index] ?? "").length + 2))),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheetName || report.title));
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buffer], { type: "application/octet-stream" }), safeFileName(fileName || report.title));
};

// Variante simple: arreglo de objetos {"Encabezado": valor}. Es la que ya
// usaba RRHH (hrExcelExport.js la reexporta).
export const exportRowsToExcel = (rows, sheetName, fileName) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheetName));
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buffer], { type: "application/octet-stream" }), fileName);
};
