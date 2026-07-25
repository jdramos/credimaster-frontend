import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { date, money, getPeriodText } from "./reportUtils";

const SOURCE_LABELS = {
  BANKS: "Bancos",
  LOANS: "Créditos",
  FIXED_ASSETS: "Activo Fijo",
  PAYMENTS: "Pagos",
  BUSINESS_DAY: "Cierre del día",
};

export const printBankAccountStatementReport = ({
  company = {},
  user = {},
  account = {},
  startDate,
  endDate,
  openingBalance = 0,
  movements = [],
  totalDebit = 0,
  totalCredit = 0,
  closingBalance = 0,
}) => {
  const currency = account.currency_symbol || "C$";
  const fmt = (value) => money(value, currency);

  const rows = [
    {
      entry_date: startDate,
      description: "SALDO INICIAL",
      balance: openingBalance,
      isOpening: true,
    },
    ...movements,
  ];

  const html = createReport({
    company,
    user,
    title: "Estado de Cuenta Bancaria",
    subtitle: `${account.bank_name || ""} - ${account.account_alias || ""} · ${getPeriodText({ dateFrom: startDate, dateTo: endDate })}`,
    orientation: "portrait",

    summary: [
      { label: "Saldo inicial", value: fmt(openingBalance) },
      { label: "Total débitos", value: fmt(totalDebit) },
      { label: "Total créditos", value: fmt(totalCredit) },
      { label: "Saldo final", value: fmt(closingBalance) },
    ],

    sections: [
      {
        title: "Cuenta bancaria",
        fields: {
          columns: 4,
          compact: true,
          items: [
            { label: "Banco", value: account.bank_name },
            { label: "N° de cuenta", value: account.account_number },
            { label: "Alias", value: account.account_alias },
            { label: "Tipo", value: account.account_type },
            {
              label: "Cuenta contable",
              value: account.gl_muc_code ? `${account.gl_muc_code} - ${account.gl_account_name}` : "",
              span: 2,
            },
            { label: "Moneda", value: `${account.currency_symbol || "C$"} ${account.currency_name || "CÓRDOBAS"}` },
            { label: "Fecha de apertura", value: date(account.opening_date) },
          ],
        },
      },
      {
        title: "Movimientos",
        table: {
          rows,
          emptyMessage: "No hay movimientos en el rango seleccionado.",
          rowClass: (row) => (row.isOpening ? "opening-row" : ""),
          columns: [
            { title: "Fecha", field: "entry_date", format: "date", width: "75px" },
            { title: "Comprobante", field: (row) => row.entry_no || "", width: "95px" },
            { title: "Origen", field: (row) => (row.source_module ? SOURCE_LABELS[row.source_module] || row.source_module : ""), width: "85px" },
            { title: "Descripción", field: "description" },
            {
              title: "Débito",
              field: "debit",
              formatter: (value) => (value ? fmt(value) : ""),
              total: true,
              width: "100px",
            },
            {
              title: "Crédito",
              field: "credit",
              formatter: (value) => (value ? fmt(value) : ""),
              total: true,
              width: "100px",
            },
            { title: "Saldo", field: "balance", formatter: (value) => fmt(value), width: "110px" },
          ],
          footer: {
            label: "Totales del período",
            autoTotals: true,
          },
        },
      },
    ],
  });

  openReport(html);
};

export default printBankAccountStatementReport;
