// Genera e imprime la Constancia de Retención (documento formal que el agente
// retenedor entrega al proveedor/persona retenida). Abre una ventana con el
// HTML y dispara la impresión.

const money = (v) =>
  Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (v) => {
  if (!v) return "";
  const s = String(v).slice(0, 10);
  const [y, m, d] = s.split("-");
  return y && m && d ? `${d}/${m}/${y}` : s;
};

const periodLabel = (period) => {
  const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const [y, m] = String(period || "").split("-");
  const mi = parseInt(m, 10) - 1;
  return MESES[mi] ? `${MESES[mi]} de ${y}` : period;
};

export function printRetentionCertificate({ company = {}, provider = {}, period, items = [], total = 0 }) {
  const companyName = company.legal_name || company.commercial_name || "";
  const companyRuc = company.tax_id || "";
  const today = new Date();
  const todayLabel = `${today.getDate()} de ${["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][today.getMonth()]} de ${today.getFullYear()}`;

  const rowsHtml = items.map((it) => `
    <tr>
      <td>${fmtDate(it.document_date)}</td>
      <td>${it.document_number || ""}</td>
      <td>${it.code_description || ""} (${it.retention_code || ""})</td>
      <td class="num">${money(it.base_amount)}</td>
      <td class="num">${it.rate == null ? "" : `${it.rate}%`}</td>
      <td class="num">${money(it.retained_amount)}</td>
    </tr>`).join("");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" />
  <title>Constancia de Retención - ${provider.name || ""}</title>
  <style>
    * { font-family: Arial, sans-serif; box-sizing: border-box; }
    body { margin: 40px; color: #111; font-size: 13px; }
    .header { text-align: center; margin-bottom: 8px; }
    .header h2 { margin: 0; font-size: 16px; }
    .header p { margin: 2px 0; font-size: 12px; }
    h1 { text-align: center; font-size: 16px; letter-spacing: 1px; margin: 24px 0 18px; }
    .row { margin: 4px 0; }
    .row b { display: inline-block; min-width: 150px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
    th, td { border: 1px solid #444; padding: 5px 7px; }
    th { background: #f0f0f0; }
    .num { text-align: right; }
    tfoot td { font-weight: bold; }
    .foot { margin-top: 50px; }
    .sign { margin-top: 60px; text-align: center; }
    .sign .line { border-top: 1px solid #111; width: 260px; margin: 0 auto; padding-top: 4px; }
    @media print { body { margin: 20px; } }
  </style></head><body>
    <div class="header">
      <h2>${companyName}</h2>
      ${companyRuc ? `<p>RUC: ${companyRuc}</p>` : ""}
      ${company.address ? `<p>${company.address}</p>` : ""}
    </div>

    <h1>CONSTANCIA DE RETENCIÓN EN LA FUENTE</h1>

    <div class="row"><b>Retenido a:</b> ${provider.name || ""}</div>
    <div class="row"><b>RUC / Cédula:</b> ${provider.ruc || ""}</div>
    <div class="row"><b>Período:</b> ${periodLabel(period)}</div>

    <p>Por este medio se hace constar que se efectuaron las siguientes retenciones en la fuente:</p>

    <table>
      <thead>
        <tr>
          <th>Fecha</th><th>Documento</th><th>Concepto (código)</th>
          <th>Base imponible</th><th>Alícuota</th><th>Retenido</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr><td colspan="5" class="num">Total retenido</td><td class="num">C$ ${money(total)}</td></tr>
      </tfoot>
    </table>

    <div class="foot">
      <p>Se extiende la presente constancia a los ${todayLabel}.</p>
    </div>

    <div class="sign">
      <div class="line">${companyName}<br/>Agente Retenedor</div>
    </div>

    <script>window.onload = function(){ window.print(); };</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
