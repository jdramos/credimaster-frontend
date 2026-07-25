import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { date, money, getPeriodText } from "./reportUtils";

const SOURCE_LABELS = {
  CAJA: "Caja",
  BANKS: "Bancos",
  LOANS: "Créditos",
  FIXED_ASSETS: "Activo Fijo",
  PAYMENTS: "Pagos",
  BUSINESS_DAY: "Cierre del día",
};

export const printCashRegisterStatementReport = ({
  company = {},
  user = {},
  cashRegister = {},
  startDate,
  endDate,
  openingBalance = 0,
  movements = [],
  totalDebit = 0,
  totalCredit = 0,
  closingBalance = 0,
}) => {
  const currency = cashRegister.currency_symbol || "C$";
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
    title: "Estado de Cuenta de Caja",
    subtitle: `${cashRegister.name || ""} · ${getPeriodText({ dateFrom: startDate, dateTo: endDate })}`,
    orientation: "portrait",

    summary: [
      { label: "Saldo inicial", value: fmt(openingBalance) },
      { label: "Total débitos", value: fmt(totalDebit) },
      { label: "Total créditos", value: fmt(totalCredit) },
      { label: "Saldo final", value: fmt(closingBalance) },
    ],

    sections: [
      {
        title: "Caja",
        fields: {
          columns: 4,
          compact: true,
          items: [
            { label: "Nombre", value: cashRegister.name, span: 2 },
            {
              label: "Cuenta contable",
              value: cashRegister.gl_muc_code ? `${cashRegister.gl_muc_code} - ${cashRegister.gl_account_name}` : "",
              span: 2,
            },
            { label: "Moneda", value: `${cashRegister.currency_symbol || "C$"} ${cashRegister.currency_name || "CÓRDOBAS"}` },
            { label: "Fecha de apertura", value: date(cashRegister.opening_date) },
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

export default printCashRegisterStatementReport;
