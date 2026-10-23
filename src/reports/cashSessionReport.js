import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { date, datetime, money } from "./reportUtils";

// Comprobante de apertura/cierre de un turno de caja de ventanilla, con el
// desglose del esperado, el conteo por denominación y el traslado.
const fmt = (value) => money(value, "C$");

// buildFields no escapa: los textos libres (notas, nombres) se escapan aquí.
const esc = (value) =>
  value == null ? value : String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

const denominationRows = (denominations) => {
  const rows = [];
  for (const [currency, symbol] of [["NIO", "C$"], ["USD", "US$"]]) {
    const byValue = denominations?.[currency] || {};
    Object.keys(byValue)
      .map(Number)
      .sort((a, b) => b - a)
      .forEach((value) => {
        const qty = Number(byValue[String(value)] || 0);
        rows.push({ denomination: `${symbol} ${value < 1 ? value.toFixed(2) : value}`, qty, total: money(value * qty, symbol) });
      });
  }
  return rows;
};

export const buildCashSessionReportHtml = ({ company = {}, user = {}, session = {} }) => {
  const t = session.totals || {};
  const closed = session.status === "CERRADA";
  const difference = Number(session.difference || 0);
  const transferText = session.transfer_type === "BOVEDA"
    ? `${fmt(session.transfer_amount)} a ${session.transfer_register_name || "bóveda"}`
    : session.transfer_type === "BANCO"
      ? `${fmt(session.transfer_amount)} a ${session.transfer_bank_name || "banco"} ${session.transfer_bank_account_number || ""}`
      : "Sin traslado (queda en caja)";

  const breakdown = [
    { concept: "Fondo de apertura", amount: t.opening_amount },
    ...(Number(t.fx_operations_count || 0)
      ? [{ concept: `Compraventa de divisas (${t.fx_operations_count}), neto en C$`, amount: Number(t.fx_operations_nio || 0) }]
      : []),
    ...Object.entries(t.currencies || {})
      .filter(([, c]) => Number(c.payments_in) || Number(c.payments_out) || Number(c.bought) || Number(c.sold) || Number(c.opening_qty))
      .map(([code, c]) => ({
        concept: `${code}: fondo ${Number(c.opening_qty || 0).toFixed(2)} + recibido ${Number(c.payments_in || 0).toFixed(2)} − vuelto ${Number(c.payments_out || 0).toFixed(2)} + comprado ${Number(c.bought || 0).toFixed(2)} − vendido ${Number(c.sold || 0).toFixed(2)} = ${Number(c.expected_qty || 0).toFixed(2)} (costo C$ ${Number(c.value || 0).toFixed(2)})`,
        amount: null,
      })),
    { concept: `Cobros en efectivo (${t.payments_count || 0})`, amount: t.payments_total },
    { concept: `Ingresos de caja (${t.ingresos_count || 0})`, amount: t.ingresos_total },
    { concept: `Arqueos de cobradores recibidos (${t.arqueos_count || 0})`, amount: t.arqueos_total },
    { concept: `Egresos de caja (${t.egresos_count || 0})`, amount: -Number(t.egresos_total || 0) },
    { concept: `Desembolsos en efectivo (${t.disbursements_count || 0})`, amount: -Number(t.disbursements_total || 0) },
  ];
  if (Number(t.fx_gain)) breakdown.push({ concept: "Ganancia en divisas (vuelto y ventas, a 4301.02)", amount: Number(t.fx_gain) });
  if (Number(t.voids_out_total)) breakdown.push({ concept: "Anulaciones de turnos anteriores (salida)", amount: -Number(t.voids_out_total) });
  if (Number(t.voids_in_total)) breakdown.push({ concept: "Anulaciones de turnos anteriores (entrada)", amount: Number(t.voids_in_total) });

  // Resumen como sección propia: buildSummary (reportSummary.js) no pinta nada.
  const fxClose = t.fx_close || {};
  const withFx = (nio, field) =>
    `${fmt(nio)}${Object.entries(fxClose).filter(([, c]) => Number(c[field])).map(([code, c]) => ` + ${code} ${Number(c[field]).toFixed(2)}`).join("")}`;
  const resumen = closed
    ? [
      { label: "Esperado", value: withFx(session.expected_nio ?? session.expected_amount, "expected_qty") },
      { label: "Contado", value: withFx(session.counted_nio ?? session.counted_amount, "counted_qty") },
      { label: difference < 0 ? "Faltante" : difference > 0 ? "Sobrante" : "Diferencia", value: fmt(Math.abs(difference)) },
      { label: "Comprobante contable", value: session.closing_entry_no || "Sin diferencia" },
    ]
    : [
      { label: "Fondo contado", value: fmt(session.opening_amount) },
      { label: "Esperado actual", value: fmt(t.expected_amount) },
    ];

  const sections = [
    { title: "Resumen", fields: { columns: 4, items: resumen } },
    {
      title: "Turno",
      fields: {
        columns: 4,
        compact: true,
        items: [
          { label: "Caja", value: esc(session.register_name), span: 2 },
          { label: "Cuenta contable", value: session.register_account_code ? `${session.register_account_code} - ${session.register_account_name}` : "", span: 2 },
          { label: "Sucursal", value: esc(session.branch_name) },
          { label: "Cajero", value: esc(session.user_name) },
          { label: "Día operativo", value: date(session.business_date) },
          { label: "Estado", value: closed ? "Cerrada" : "Abierta" },
          { label: "Apertura", value: datetime(session.opened_at) },
          { label: "Cierre", value: closed ? datetime(session.closed_at) : "—" },
          { label: "Cerrada por", value: closed ? esc(session.closed_by_name) : "—" },
          { label: "Traslado", value: closed ? esc(transferText) : "—" },
        ],
      },
    },
    {
      title: "Arqueo",
      table: {
        rows: breakdown,
        columns: [
          { title: "Concepto", field: "concept" },
          { title: "Monto", field: "amount", formatter: (v) => (v == null ? "" : fmt(v)), width: "140px" },
        ],
      },
    },
  ];

  if (closed) {
    sections.push({
      title: "Conteo de cierre por denominación",
      table: {
        rows: denominationRows(session.closing_denominations),
        emptyMessage: "Caja contada en cero.",
        columns: [
          { title: "Denominación", field: "denomination" },
          { title: "Cantidad", field: "qty", width: "90px" },
          { title: "Total", field: "total", width: "140px" },
        ],
      },
    });
  }

  if (Number(session.opening_difference || 0) !== 0 || session.opening_notes || session.closing_notes) {
    sections.push({
      title: "Observaciones",
      fields: {
        columns: 1,
        items: [
          Number(session.opening_difference || 0) !== 0
            ? { label: "Diferencia en el fondo de apertura", value: `${fmt(session.opening_difference)} (comprobante ${session.opening_entry_no || "—"})` }
            : null,
          session.opening_notes ? { label: "Nota de apertura", value: esc(session.opening_notes) } : null,
          session.closing_notes ? { label: "Nota de cierre", value: esc(session.closing_notes) } : null,
        ].filter(Boolean),
      },
    });
  }

  sections.push({
    title: "Firmas",
    fields: {
      columns: 2,
      items: [
        { label: "Cajero", value: "<br/><br/>______________________________" },
        { label: "Supervisor / recibe", value: "<br/><br/>______________________________" },
      ],
    },
  });

  return createReport({
    company,
    user,
    title: closed ? "Comprobante de Cierre de Caja" : "Comprobante de Apertura de Caja",
    subtitle: `${esc(session.register_name) || ""} · Turno #${session.id || ""}`,
    orientation: "portrait",
    sections,
  });
};

export const printCashSessionReport = (args) => openReport(buildCashSessionReportHtml(args));

export default printCashSessionReport;
