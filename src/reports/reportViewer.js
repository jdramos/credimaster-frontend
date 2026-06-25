export const openReport = (html, autoPrint = true) => {
  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    alert("El navegador bloqueó la ventana del reporte.");
    return null;
  }

  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();

  reportWindow.onload = () => {
    reportWindow.focus();

    if (autoPrint) {
      reportWindow.print();
    }
  };

  return reportWindow;
};
