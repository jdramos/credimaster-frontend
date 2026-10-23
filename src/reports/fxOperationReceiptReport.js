import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { datetime, money } from "./reportUtils";

// Comprobante de compra o venta de divisas en ventanilla.
const esc = (value) =>
  value == null ? value : String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

export const buildFxOperationReceiptHtml = ({ company = {}, user = {}, session = {}, operation = {} }) => {
  const isPurchase = operation.operation_type === "COMPRA";
  const symbol = esc(operation.currency_symbol || operation.currency_code);
  return createReport({
    company,
    user,
    title: isPurchase ? "Comprobante de Compra de Divisas" : "Comprobante de Venta de Divisas",
    subtitle: `Operación No. ${operation.id || "—"} · ${esc(session.register_name) || ""}`,
    orientation: "portrait",
    sections: [
      {
        title: "Operación",
        fields: {
          columns: 2,
          compact: true,
          items: [
            { label: "Persona", value: esc(operation.person_name) },
            { label: "Identificación", value: esc(operation.person_identification) },
            { label: "Moneda", value: `${esc(operation.currency_name || operation.currency_code)} (${esc(operation.currency_code)})` },
            { label: isPurchase ? "TC de compra" : "TC de venta", value: Number(operation.rate || 0).toFixed(4) },
            { label: "Fecha", value: datetime(new Date()) },
            { label: "Cajero", value: esc(session.user_name) },
          ],
        },
      },
      {
        title: "Efectivo",
        table: {
          rows: isPurchase
            ? [
              { concept: "La institución recibe", amount: money(operation.fx_amount, symbol) },
              { concept: "La institución entrega", amount: money(operation.nio_amount, "C$") },
            ]
            : [
              { concept: "La institución recibe", amount: money(operation.nio_amount, "C$") },
              { concept: "La institución entrega", amount: money(operation.fx_amount, symbol) },
            ],
          columns: [
            { title: "Concepto", field: "concept" },
            { title: "Monto", field: "amount", width: "160px" },
          ],
        },
      },
      {
        title: "Firmas",
        fields: {
          columns: 2,
          items: [
            { label: "Cliente", value: "<br/><br/>______________________________" },
            { label: "Cajero", value: "<br/><br/>______________________________" },
          ],
        },
      },
    ],
  });
};

export const printFxOperationReceipt = (args) => openReport(buildFxOperationReceiptHtml(args));

export default printFxOperationReceipt;
