// Escribe un documento HTML de reporte en una ventana emergente dentro de un
// iframe con sandbox SIN "allow-scripts".
//
// Por qué: la ventana abierta con window.open("") hereda el origen de la app, y
// los reportes interpolan datos que escribe cualquier usuario (nombre del
// cliente, direcciones, notas, garantías). Con document.write directo, un
// nombre como  <img src=x onerror=...>  se ejecutaba en el navegador del
// administrador que imprimía el reporte y podía leer su JWT de localStorage.
// En un iframe sandboxed sin allow-scripts el navegador no ejecuta ningún
// script ni manejador de eventos del contenido, aunque el HTML lo traiga.
// allow-same-origin se conserva solo para poder imprimir el contenido (sin
// allow-scripts no sirve para atacar); allow-modals permite el diálogo de
// impresión.
const titleOf = (html) => {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(html || ""));
  return match ? match[1].replace(/<[^>]*>/g, "").trim() : "Reporte";
};

export const writeSandboxedDocument = (win, html, { autoPrint = true } = {}) => {
  if (!win || win.closed) return null;

  win.document.open();
  win.document.write(
    '<!doctype html><html><head><meta charset="utf-8"><title></title>' +
      "<style>html,body{margin:0;height:100%;background:#fff}iframe{border:0;width:100%;height:100%;display:block}</style>" +
      "</head><body></body></html>",
  );
  win.document.close();
  win.document.title = titleOf(html);

  const iframe = win.document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-same-origin allow-modals");
  iframe.onload = () => {
    if (!autoPrint) return;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      // el usuario puede imprimir desde el menú del navegador
    }
  };
  iframe.srcdoc = String(html || "");
  win.document.body.appendChild(iframe);

  return iframe;
};
