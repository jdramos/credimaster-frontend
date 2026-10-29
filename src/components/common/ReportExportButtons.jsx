import React, { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";
import { exportReportToExcel } from "../accounting/exportReportToExcel";

// Botones "Imprimir" y "Excel" de las pantallas de consulta y reportes.
// `report` es la definición de printAccountingReport
// ({ title, subtitle, period, columns, rows, totals, orientation, fileName })
// o una función (puede ser async) que la devuelve: así una lista paginada en
// el servidor puede traer todas las filas con los filtros actuales.
const ReportExportButtons = ({ report, disabled = false, size, print = true, excel = true, sx }) => {
  const [busy, setBusy] = useState(null);

  const resolve = async () => (typeof report === "function" ? report() : report);

  const handlePrint = async () => {
    // La ventana se abre en el clic; si se abre después de traer los datos el
    // navegador la bloquea.
    const popup = openReportPopup();
    if (!popup) {
      window.alert("El navegador bloqueó la ventana de impresión. Permita las ventanas emergentes para este sitio.");
      return;
    }
    popup.document.write("<!doctype html><html><body>Generando reporte...</body></html>");
    setBusy("print");
    try {
      const definition = await resolve();
      await printAccountingReport({ ...definition, popup });
    } catch (error) {
      popup.close();
      window.alert(error?.message || "No se pudo generar el reporte.");
    } finally {
      setBusy(null);
    }
  };

  const handleExcel = async () => {
    setBusy("excel");
    try {
      exportReportToExcel(await resolve());
    } catch (error) {
      window.alert(error?.message || "No se pudo exportar a Excel.");
    } finally {
      setBusy(null);
    }
  };

  const spinner = <CircularProgress size={16} />;
  return (
    <>
      {print && (
        <Button variant="outlined" size={size} sx={{ textTransform: "none", ...sx }} startIcon={busy === "print" ? spinner : <PrintIcon />}
          onClick={handlePrint} disabled={disabled || Boolean(busy)}>
          Imprimir
        </Button>
      )}
      {excel && (
        <Button variant="outlined" size={size} sx={{ textTransform: "none", ...sx }} startIcon={busy === "excel" ? spinner : <FileDownloadIcon />}
          onClick={handleExcel} disabled={disabled || Boolean(busy)}>
          Excel
        </Button>
      )}
    </>
  );
};

export default ReportExportButtons;
