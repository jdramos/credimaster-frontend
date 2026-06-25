const makeColumn =
  (defaults) =>
  (options = {}) => ({
    ...defaults,
    ...options,
  });

export const columns = {
  date: makeColumn({
    title: "Fecha",
    format: "date",
    align: "center",
    nowrap: true,
  }),

  datetime: makeColumn({
    title: "Fecha / Hora",
    format: "datetime",
    align: "center",
    nowrap: true,
  }),

  loan: makeColumn({
    title: "Crédito",
    field: "loan_id",
    align: "center",
    nowrap: true,
    width: "90px",
  }),

  customer: makeColumn({
    title: "Cliente",
    field: "customer_name",
    width: "220px",
  }),

  identification: makeColumn({
    title: "Identificación",
    field: "customer_identification",
    width: "120px",
  }),

  branch: makeColumn({
    title: "Sucursal",
    field: "branch_name",
    width: "130px",
  }),

  collector: makeColumn({
    title: "Colector",
    field: "collector_name",
    width: "160px",
  }),

  promoter: makeColumn({
    title: "Promotor",
    field: "promoter_name",
    width: "160px",
  }),

  vendor: makeColumn({
    title: "Oficial",
    field: "vendor_name",
    width: "160px",
  }),

  principal: makeColumn({
    title: "Capital",
    field: "principal_payment",
    format: "money",
    groupTotal: true,
    footerKey: "total_principal",
  }),

  interest: makeColumn({
    title: "Interés",
    field: "interest_payment",
    format: "money",
    groupTotal: true,
    footerKey: "total_interest",
  }),

  insurance: makeColumn({
    title: "Seguro",
    field: "insurance_payment",
    format: "money",
    groupTotal: true,
    footerKey: "total_insurance",
  }),

  fee: makeColumn({
    title: "Comisión",
    field: "fee_payment",
    format: "money",
    groupTotal: true,
    footerKey: "total_fee",
  }),

  defaultInterest: makeColumn({
    title: "Mora",
    field: "defaulted_interest",
    format: "money",
    groupTotal: true,
    footerKey: "total_defaulted_interest",
  }),

  otherCharges: makeColumn({
    title: "Otros",
    field: "other_charges_payment",
    format: "money",
    groupTotal: true,
    footerKey: "total_other_charges",
  }),
};
