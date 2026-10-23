import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { datetime, money } from "./reportUtils";

// Recibo de caja de un pago recibido en ventanilla: lo aplicado, lo que
// entregó el cliente (C$ / divisa al TC de compra) y el vuelto (C$ / divisa
// al TC de venta).
const esc = (value) =>
  value == null ? value : String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

const rate = (value) => (value ? Number(value).toFixed(4) : "—");

export const buildTellerReceiptHtml = ({ company = {}, user = {}, session = {}, result = {} }) => {
  const t = result.tender || {};
  const applied = result.applied || {};
  const loan = result.loan || {};
  const rows = [
    { concept: "Capital", amount: applied.principal },
    { concept: "Interés corriente", amount: applied.interest },
    { concept: "Interés moratorio", amount: applied.defaulted_interest },
    { concept: "Seguro", amount: applied.insurance },
    { concept: "Comisión", amount: applied.fee },
    { concept: "Otros cargos", amount: applied.other_charges },
  ].filter((r) => Number(r.amount || 0) !== 0);

  const tenderRows = [
    { concept: "Efectivo en córdobas", amount: money(t.tendered_nio, "C$") },
    Number(t.tendered_fx) > 0
      ? { concept: `Efectivo en ${t.currency_code} (${esc(t.currency_symbol)} ${Number(t.tendered_fx).toFixed(2)} × ${rate(t.buy_rate)})`, amount: money(Number(t.tendered_fx) * Number(t.buy_rate), "C$") }
      : null,
    { concept: "Total recibido", amount: money(t.received_total, "C$") },
    { concept: "Monto aplicado", amount: money(t.payment_amount, "C$") },
    { concept: "Vuelto en córdobas", amount: money(t.change_nio, "C$") },
    Number(t.change_fx) > 0
      ? { concept: `Vuelto en ${t.currency_code} (TC de venta ${rate(t.sell_rate)})`, amount: money(t.change_fx, esc(t.currency_symbol)) }
      : null,
  ].filter(Boolean);

  return createReport({
    company,
    user,
    title: "Recibo de Caja",
    subtitle: `Pago No. ${result.payment_id || "—"} · ${esc(session.register_name) || ""}`,
    orientation: "portrait",
    sections: [
      {
        title: "Pago",
        fields: {
          columns: 2,
          compact: true,
          items: [
            { label: "Cliente", value: esc(result.customer_name || loan.customer_name) },
            { label: "Crédito", value: esc(loan.credit_code || loan.id) },
            { label: "Sucursal del crédito", value: esc(loan.branch_name) },
            { label: "Fecha", value: datetime(new Date()) },
            { label: "Cajero", value: esc(session.user_name) },
            { label: "Caja", value: esc(session.register_name) },
          ],
        },
      },
      {
        title: "Aplicación",
        table: {
          rows,
          columns: [
            { title: "Concepto", field: "concept" },
            { title: "Monto", field: "amount", formatter: (v) => money(v, "C$"), width: "140px" },
          ],
        },
      },
      {
        title: "Efectivo",
        table: {
          rows: tenderRows,
          columns: [
            { title: "Concepto", field: "concept" },
            { title: "Monto", field: "amount", width: "160px" },
          ],
        },
      },
    ],
  });
};

export const printTellerReceipt = (args) => openReport(buildTellerReceiptHtml(args));

export default printTellerReceipt;
