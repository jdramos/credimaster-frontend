import {
  productViolations,
  productPrefill,
  insurancePremium,
  lockedFieldsFor,
  productAllowsBranch,
} from "./loanProductLimits";

const product = (over = {}) => ({
  id: 7,
  code: "MIC",
  status: "ACTIVE",
  loan_group_id: 1,
  conami_tipo_credito_id: 2,
  currency_id: null,
  min_amount: "5000.00",
  max_amount: "50000.00",
  min_term_months: "3.00",
  max_term_months: "18.00",
  min_interest_rate: "2.00",
  max_interest_rate: "3.00",
  default_interest_rate: "2.50",
  late_interest_rate: "0.50",
  fee_percentage: "1.50",
  other_charges_percentage: null,
  allowed_frequencies: ["M", "Q"],
  branch_ids: [1],
  insurance_product_id: 1,
  insurance_premium_type: "PORCENTAJE_MONTO",
  insurance_premium_value: 1,
  ...over,
});

describe("Límites del producto financiero en la solicitud", () => {
  test("dentro de los límites no hay errores", () => {
    const loan = { amount: "20000", term: 12, interest_rate: "2.5", frequency_id: "M", defaulted_rate: "0.5", branch_id: 1 };
    expect(productViolations(product(), loan)).toEqual({});
  });

  test("marca cada campo fuera de rango", () => {
    const loan = { amount: "60000", term: 24, interest_rate: "3.5", frequency_id: "S", defaulted_rate: "1", branch_id: 2 };
    const v = productViolations(product(), loan);
    expect(Object.keys(v).sort()).toEqual(["amount", "defaulted_rate", "frequency_id", "interest_rate", "product_id", "term"]);
    expect(v.amount).toMatch(/máximo del producto MIC/);
  });

  test("sin producto o sin límites propios no hay errores", () => {
    expect(productViolations(null, { amount: 1 })).toEqual({});
    const libre = product({ min_amount: null, max_amount: null, allowed_frequencies: [], branch_ids: [] });
    expect(productViolations(libre, { amount: 999999, frequency_id: "D", branch_id: 9, term: 12, interest_rate: 2.5 })).toEqual({});
  });

  test("prellena tasa, mora, comisión %, seguro, plazo/monto mínimos y campos fijos", () => {
    const next = productPrefill(product(), { amount: "1.00", term: 0 });
    expect(next).toMatchObject({
      interest_rate: "2.50",
      defaulted_rate: "0.50",
      fee_mode: "percentage",
      fee_percentage: "1.50",
      term: 3,
      amount: "5000.00",
      id_tipo_agrupacion_credito: 1,
      id_tipo_credito: 2,
    });
    expect(next.other_charges_mode).toBeUndefined();
    expect(next.id_moneda).toBeUndefined();
  });

  test("seguro: porcentaje del monto o prima fija", () => {
    expect(insurancePremium(product(), 20000)).toBe(200);
    expect(insurancePremium(product({ insurance_premium_type: "FIJO", insurance_premium_value: 350 }), 20000)).toBe(350);
    expect(insurancePremium(product({ insurance_product_id: null }), 20000)).toBeNull();
  });

  test("campos bloqueados y sucursales", () => {
    expect(lockedFieldsFor(product())).toEqual(["id_tipo_agrupacion_credito", "id_tipo_credito"]);
    expect(productAllowsBranch(product(), 1)).toBe(true);
    expect(productAllowsBranch(product(), 3)).toBe(false);
    expect(productAllowsBranch(product({ branch_ids: [] }), 3)).toBe(true);
  });
});
