// Helper de exportar a Excel de RRHH. Ahora vive junto al de impresión de
// reportes (components/accounting/exportReportToExcel.js) para que todo el
// frontend use uno solo; se reexporta aquí para no tocar a quienes lo importan.
export { exportRowsToExcel as exportToExcel } from "../accounting/exportReportToExcel";
