// Helper de exportar a Excel compartido dentro de components/hr/ -- mismo
// cuerpo que el ya usado internamente por HrReports.jsx (no se toca ese
// archivo, sigue con su copia local). No existe un src/utils/ compartido en
// todo el frontend (cada módulo repite este mismo patrón inline), así que
// esto solo evita repetirlo una vez más dentro de RRHH.
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportToExcel = (rows, sheetName, fileName) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  saveAs(blob, fileName);
};
