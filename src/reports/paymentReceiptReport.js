import dayjs from "dayjs";
import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { money, empty } from "./reportUtils";

const getPaymentTotal = (payment = {}) =>
  Number(payment.principal || 0) +
  Number(payment.interest || 0) +
  Number(payment.insurance || 0) +
  Number(payment.fee || 0) +
  Number(payment.other_charges || 0) +
  Number(payment.defaulted_interest || 0);

export const printPaymentReceiptReport = ({
  company = {},
  user = {},
  payment = {},
  loan = {},
  customer = {},
}) => {
  const total = getPaymentTotal(payment);

  const receiptDate = payment?.payment_date
    ? dayjs(payment.payment_date).format("DD/MM/YYYY")
    : dayjs().format("DD/MM/YYYY");

  const html = createReport({
    company,
    user,
    title: "Recibo de Pago",
    subtitle: `Recibo No. ${payment?.id || "—"} | Fecha: ${receiptDate}`,
    orientation: "portrait",

    sections: [
      {
        title: "Datos del cliente",
        html: `
          <div class="report-fields">
            <div class="report-field">
              <div class="report-field-label">Cliente</div>
              <div class="report-field-value">
                ${empty(customer.full_name || customer.name)}
              </div>
            </div>

            <div class="report-field">
              <div class="report-field-label">Identificación</div>
              <div class="report-field-value">
                ${empty(customer.identification || customer.identidad)}
              </div>
            </div>

            <div class="report-field">
              <div class="report-field-label">No. Crédito</div>
              <div class="report-field-value">
                ${empty(loan.id || payment.loan_id)}
              </div>
            </div>

            <div class="report-field">
              <div class="report-field-label">Sucursal</div>
              <div class="report-field-value">
                ${empty(loan.branch_name || payment.branch_name)}
              </div>
            </div>
          </div>
        `,
      },

      {
        title: "Detalle del pago",
        table: {
          rows: [
            { concept: "Capital", amount: payment.principal },
            { concept: "Interés corriente", amount: payment.interest },
            {
              concept: "Interés moratorio",
              amount: payment.defaulted_interest,
            },
            { concept: "Seguro", amount: payment.insurance },
            { concept: "Comisión / Fee", amount: payment.fee },
            { concept: "Otros cargos", amount: payment.other_charges },
          ],
          columns: [
            {
              title: "Concepto",
              field: "concept",
            },
            {
              title: "Monto",
              field: "amount",
              format: "money",
              width: "140px",
            },
          ],
          footer: {
            label: "Total recibido",
            values: {
              amount: total,
            },
          },
        },
      },

      {
        title: "Información de registro",
        html: `
          <div class="report-fields">
            <div class="report-field">
              <div class="report-field-label">Forma de pago</div>
              <div class="report-field-value">
                ${empty(payment.payment_method_name || payment.forma_pago)}
              </div>
            </div>

            <div class="report-field">
              <div class="report-field-label">Lugar de pago</div>
              <div class="report-field-value">
                ${empty(payment.payment_place_name || payment.lugar_pago)}
              </div>
            </div>

            <div class="report-field">
              <div class="report-field-label">Usuario</div>
              <div class="report-field-value">
                ${empty(user.full_name || user.name)}
              </div>
            </div>

            <div class="report-field">
              <div class="report-field-label">Hora impresión</div>
              <div class="report-field-value">
                ${dayjs().format("DD/MM/YYYY HH:mm")}
              </div>
            </div>
          </div>
        `,
      },

      {
        html: `
          <div class="signatures">
            <div class="signature">Recibí conforme</div>
            <div class="signature">Cajero / Gestor</div>
            <div class="signature">Autorizado</div>
          </div>

          <div class="receipt-note">
            Este recibo es válido únicamente con firma y sello de la institución.
          </div>
        `,
      },
    ],
  });

  openReport(html);
};
