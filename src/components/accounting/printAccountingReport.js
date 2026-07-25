import API from "../../api";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const SIGNATURE_SLOTS = [
  { nameKey: "reportes_firma_elabora_nombre", cargoKey: "reportes_firma_elabora_cargo", fallback: "Elaborado por" },
  { nameKey: "reportes_firma_revisa_nombre", cargoKey: "reportes_firma_revisa_cargo", fallback: "Revisado por" },
  { nameKey: "reportes_firma_autoriza_nombre", cargoKey: "reportes_firma_autoriza_cargo", fallback: "Autorizado por" },
];

export const printAccountingReport = async ({ title, subtitle, period, columns, rows, totals = [] }) => {
  const popup = window.open("", "_blank", "width=1100,height=800");
  if (!popup) throw new Error("El navegador bloqueó la ventana de impresión");
  popup.document.write("<!doctype html><html><body>Generando reporte...</body></html>");

  let signatures = {};
  try {
    const res = await API.get("/api/accounting/report-signatures");
    signatures = res.data?.data || {};
  } catch {
    // Si falla, se imprime el reporte igual con las etiquetas por defecto.
  }

  const readJson = (key) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") || {}; } catch { return {}; }
  };
  const session = readJson("session");
  const user = readJson("user");
  const company = session.tenant || user.tenant || {};
  const companyName = company.commercial_name || company.legal_name || company.company_name || company.name || "CrediMaster";
  const legalName = company.legal_name && company.legal_name !== companyName ? company.legal_name : "";
  const taxId = company.tax_id || company.ruc || "";
  const emittedBy = user.full_name || session.full_name || user.user_name || session.user_name || "";
  const emittedAt = new Intl.DateTimeFormat("es-NI", { dateStyle: "short", timeStyle: "short" }).format(new Date());

  const body = rows.map((row) => `<tr class="${row.section ? "section-row" : row.total ? "total-row" : ""}">${columns.map((column) => {
    const raw = typeof column.value === "function" ? column.value(row) : row[column.field];
    const value = column.format ? column.format(raw) : raw;
    return `<td class="${column.numeric ? "number" : ""}">${escapeHtml(value)}</td>`;
  }).join("")}</tr>`).join("");

  popup.document.open();
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page{size:portrait;margin:10mm} body{font-family:Arial,sans-serif;color:#111;font-size:10px}
      .institutional{display:grid;grid-template-columns:72px minmax(260px,1fr) minmax(330px,1fr);align-items:start;border-bottom:3px solid #075ca8;padding:0 0 7px;margin:0 0 8px}
      .logo{max-width:62px;max-height:48px}.company-name{font-size:16px;font-weight:900;color:#075ca8;line-height:1.05}.company-detail{font-size:9px;color:#263b59;line-height:1.2}
      .report-info{text-align:right;color:#263b59;line-height:1.2}.report-name{font-size:16px;font-weight:900;color:#0b1b35;text-transform:uppercase}.report-form{font-size:9px;font-weight:bold}.report-meta{font-size:9px}
      table{width:100%;border-collapse:collapse;margin-top:6px;page-break-inside:auto}th,td{border:1px solid #777;padding:4px}
      thead{display:table-header-group}tfoot{display:table-row-group}tr{page-break-inside:avoid}
      th{background:#e8eef7;text-align:left}.number{text-align:right}tfoot td,.total-row td{font-weight:bold;background:#f4f4f4}.section-row td{font-weight:900;background:#dbe8f7}.section-row td:not(:first-child){color:transparent}
      .actions{text-align:right;margin-bottom:8px}@media print{.actions{display:none}}
      .signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:60px;page-break-inside:avoid}
      .signature{text-align:center}.signature .line{border-top:1px solid #111;margin-top:35px;margin-bottom:4px}
      .signature .signer-name{font-weight:bold;min-height:12px}.signature .signer-role{font-size:9px;color:#444}
    </style></head><body><div class="actions"><button onclick="window.print()">Imprimir / PDF</button></div>
    <header class="institutional"><div>${company.logo_url ? `<img class="logo" src="${escapeHtml(company.logo_url)}" alt="Logo">` : ""}</div>
      <div><div class="company-name">${escapeHtml(companyName)}</div>${legalName ? `<div class="company-detail">${escapeHtml(legalName)}</div>` : ""}
      <div class="company-detail">${taxId ? `RUC: ${escapeHtml(taxId)}` : ""}${company.phone ? ` | Tel: ${escapeHtml(company.phone)}` : ""}</div>
      ${company.address ? `<div class="company-detail">${escapeHtml(company.address)}</div>` : ""}</div>
      <div class="report-info"><div class="report-name">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="report-form">${escapeHtml(subtitle)}</div>` : ""}
      ${period ? `<div class="report-meta">Período: ${escapeHtml(period)}</div>` : ""}
      <div class="report-meta">Fecha: ${escapeHtml(emittedAt)}${emittedBy ? `<br>Usuario: ${escapeHtml(emittedBy)}` : ""}</div></div></header>
    <table><thead><tr>
    ${columns.map((column) => `<th class="${column.numeric ? "number" : ""}">${escapeHtml(column.label)}</th>`).join("")}
    </tr></thead><tbody>${body || `<tr><td colspan="${columns.length}">Sin movimientos para el período.</td></tr>`}</tbody>
    ${totals.length ? `<tfoot><tr>${totals.map((total) => `<td class="${total.numeric ? "number" : ""}" colspan="${total.colspan || 1}">${escapeHtml(total.value)}</td>`).join("")}</tr></tfoot>` : ""}
    </table>
    <div class="signatures">
    ${SIGNATURE_SLOTS.map((slot) => `
      <div class="signature">
        <div class="line"></div>
        <div class="signer-name">${escapeHtml(signatures[slot.nameKey] || "")}</div>
        <div class="signer-role">${escapeHtml(signatures[slot.cargoKey] || slot.fallback)}</div>
      </div>`).join("")}
    </div>
    </body></html>`);
  popup.document.close();
  popup.focus();
};
