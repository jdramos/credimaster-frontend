// Constantes y helpers de Aliados (referidores) del superadmin. Las reglas
// del cálculo viven en el backend (api/superadmin/aliadoCommissionLogic.js);
// aquí solo se arman formularios, etiquetas y totales para pantalla/reporte.

export const ALIADOS_URL = "/api/superadmin/aliados";

export const COMMISSION_TYPE_OPTIONS = [
  { value: "PERCENT", label: "% de cada pago" },
  { value: "FIXED", label: "Monto fijo" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "OTRO", label: "Otro" },
];

// Concepto de un pago o factura de la empresa: solo MENSUALIDAD e
// IMPLEMENTACION generan comisión, y solo la mensualidad mueve el corte.
export const PAYMENT_CONCEPT_OPTIONS = [
  { value: "MENSUALIDAD", label: "Mensualidad" },
  { value: "IMPLEMENTACION", label: "Implementación" },
  { value: "OTRO", label: "Otro (sin comisión)" },
];

const labelOf = (options, value) => options.find((o) => o.value === value)?.label || value || "—";
export const conceptLabel = (v) => labelOf(PAYMENT_CONCEPT_OPTIONS, v);
export const paymentMethodLabel = (v) => labelOf(PAYMENT_METHOD_OPTIONS, v);

export const COMMISSION_STATUS = {
  PENDIENTE: { label: "Pendiente", color: "warning" },
  PAGADA: { label: "Pagada", color: "success" },
  ANULADA: { label: "Anulada", color: "default" },
};

export const fmtAmount = (v) =>
  Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (v, currency) => `${currency ? `${currency} ` : ""}${fmtAmount(v)}`;
export const isoDate = (v) => (v ? String(v).slice(0, 10) : "");
export const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const monthRange = (base = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  const y = base.getFullYear();
  const m = base.getMonth() + 1;
  const last = new Date(y, m, 0).getDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
};

// "10 %", "50.00 fijo", o "—" si no hay comisión.
export const describeRule = (type, value) => {
  if (!type || value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return type === "PERCENT"
    ? `${n.toLocaleString("es-NI", { maximumFractionDigits: 4 })} %`
    : `${fmtAmount(n)} fijo`;
};

// Comisión que se aplica a la empresa: la propia si se negoció, si no la del aliado.
export const effectiveRule = (assignment, kind = "monthly") => {
  const own = kind === "monthly"
    ? [assignment?.commission_type, assignment?.commission_value]
    : [assignment?.impl_commission_type, assignment?.impl_commission_value];
  const def = kind === "monthly"
    ? [assignment?.aliado_commission_type, assignment?.aliado_commission_value]
    : [assignment?.aliado_impl_commission_type, assignment?.aliado_impl_commission_value];
  const hasOwn = own[0] && own[1] !== null && own[1] !== undefined && own[1] !== "";
  return { text: describeRule(...(hasOwn ? own : def)), own: !!hasOwn };
};

export const emptyAliadoForm = {
  name: "",
  id_number: "",
  phone: "",
  email: "",
  payment_method: "TRANSFERENCIA",
  bank_name: "",
  bank_account: "",
  bank_account_holder: "",
  bank_account_currency: "",
  commission_type: "PERCENT",
  commission_value: "",
  impl_commission_type: "",
  impl_commission_value: "",
  status: "ACTIVE",
  notes: "",
};

export const aliadoFormFromRow = (row) => {
  const form = { ...emptyAliadoForm };
  for (const k of Object.keys(form)) {
    if (row?.[k] !== null && row?.[k] !== undefined) form[k] = String(row[k]);
  }
  for (const k of ["commission_value", "impl_commission_value"]) {
    if (form[k] !== "") form[k] = String(Number(form[k]));
  }
  return form;
};

export const emptyAssignmentForm = () => ({
  aliado_id: "",
  start_date: todayISO(),
  end_date: "",
  max_months: "",
  commission_type: "",
  commission_value: "",
  impl_commission_type: "",
  impl_commission_value: "",
  notes: "",
});

export const assignmentFormFromCurrent = (current) => {
  if (!current) return emptyAssignmentForm();
  const num = (v) => (v === null || v === undefined || v === "" ? "" : String(Number(v)));
  return {
    aliado_id: String(current.aliado_id),
    start_date: isoDate(current.start_date),
    end_date: isoDate(current.end_date),
    max_months: current.max_months ?? "",
    commission_type: current.commission_type || "",
    commission_value: num(current.commission_value),
    impl_commission_type: current.impl_commission_type || "",
    impl_commission_value: num(current.impl_commission_value),
    notes: current.notes || "",
  };
};

export const assignmentPayload = (form) => ({
  aliado_id: Number(form.aliado_id),
  start_date: form.start_date,
  end_date: form.end_date || null,
  max_months: form.max_months === "" ? null : Number(form.max_months),
  commission_type: form.commission_type || null,
  commission_value: form.commission_type && form.commission_value !== "" ? Number(form.commission_value) : null,
  impl_commission_type: form.impl_commission_type || null,
  impl_commission_value: form.impl_commission_type && form.impl_commission_value !== "" ? Number(form.impl_commission_value) : null,
  notes: form.notes || null,
});

export const sameAssignmentForm = (a, b) =>
  JSON.stringify(Object.keys(emptyAssignmentForm()).map((k) => String(a?.[k] ?? ""))) ===
  JSON.stringify(Object.keys(emptyAssignmentForm()).map((k) => String(b?.[k] ?? "")));

// Qué hacer al guardar la empresa con el formulario de aliado:
// "none" | "assign" (crear o actualizar) | "end" (se quitó el aliado).
export const assignmentAction = (form, initial) => {
  if (sameAssignmentForm(form, initial)) return "none";
  if (!form.aliado_id) return initial?.aliado_id ? "end" : "none";
  return "assign";
};

// Suma campos numéricos por moneda: [{ currency, accrued, ... }].
export const totalsByCurrency = (rows, fields, currencyOf = (r) => r.currency) => {
  const acc = {};
  for (const r of rows) {
    const cur = currencyOf(r) || "";
    acc[cur] ||= Object.fromEntries([["currency", cur], ...fields.map((f) => [f, 0])]);
    for (const f of fields) acc[cur][f] = Math.round((acc[cur][f] + Number(r[f] || 0)) * 100) / 100;
  }
  return Object.values(acc).sort((a, b) => a.currency.localeCompare(b.currency));
};
