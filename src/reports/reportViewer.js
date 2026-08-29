export const openReport = (html, autoPrint = true) => {
  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    alert("El navegador bloqueó la ventana del reporte.");
    return null;
  }

  writeReportToWindow(reportWindow, html, autoPrint);

  return reportWindow;
};

// Abre una ventana en blanco de inmediato (debe llamarse síncronamente
// dentro del gesto del usuario — un clic — para que el navegador no la
// bloquee) y la llena después con writeReportToWindow una vez que el HTML
// esté listo. Necesario para reportes cuyo contenido depende de un fetch
// async (p.ej. plantillas editables en hr_document_templates) — si
// openReport se llamara recién después del await, el `window.open` ya no
// contaría como resultado directo del clic y el navegador lo bloquearía.
export const openBlankReportWindow = () => {
  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    alert("El navegador bloqueó la ventana del reporte.");
    return null;
  }

  reportWindow.document.write(
    '<p style="font-family: sans-serif; padding: 24px; color: #666;">Generando documento...</p>',
  );

  return reportWindow;
};

export const writeReportToWindow = (reportWindow, html, autoPrint = true) => {
  if (!reportWindow || reportWindow.closed) return;

  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();

  reportWindow.onload = () => {
    reportWindow.focus();

    if (autoPrint) {
      reportWindow.print();
    }
  };
};
