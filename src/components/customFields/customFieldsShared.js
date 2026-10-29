// Campos personalizados por empresa: constantes y reglas del frontend.
// Las secciones y la validación de valores replican
// api/customFields/customFieldRules.js del backend (mantener en sincronía).

export const ENTITY_LABELS = { CUSTOMER: "Cliente", LOAN: "Crédito" };

export const FIELD_TYPES = [
  { value: "TEXT", label: "Texto" },
  { value: "NUMBER", label: "Número" },
  { value: "DATE", label: "Fecha" },
  { value: "BOOLEAN", label: "Sí / No" },
  { value: "LIST", label: "Lista de opciones" },
];

export const FIELD_TYPE_LABELS = Object.fromEntries(FIELD_TYPES.map((t) => [t.value, t.label]));

export const SECTIONS = {
  CUSTOMER: {
    general: "Datos generales",
    economic: "Actividad económica",
    references: "Referencias",
    additional: "Datos adicionales",
  },
  LOAN: {
    conditions: "Datos del crédito",
    guarantees: "Garantías y documentos",
  },
};

export const errorKeyFor = (field) => `custom_fields.${field.field_key}`;

export const isEmptyValue = (value) =>
  value === null || value === undefined || (typeof value === "string" && value.trim() === "");

// Clave sugerida a partir del nombre ("Número de hijos" -> numero_de_hijos).
export const suggestKey = (label) =>
  String(label || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^[^a-z]+/, "")
    .replace(/_+$/, "")
    .slice(0, 50);

export const KEY_PATTERN = /^[a-z][a-z0-9_]{1,49}$/;

const isValidIsoDate = (text) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

const valueError = (field, value) => {
  if (isEmptyValue(value)) return Number(field.is_required) === 1 ? "Campo requerido" : null;
  if (field.field_type === "NUMBER" && !Number.isFinite(Number(String(value).replace(/,/g, "")))) {
    return "Debe ser un número";
  }
  if (field.field_type === "DATE" && !isValidIsoDate(String(value).slice(0, 10))) return "Fecha no válida";
  if (field.field_type === "LIST" && !(field.options || []).includes(String(value))) return "Opción no válida";
  return null;
};

// Errores { "custom_fields.clave": mensaje } de los campos indicados
// (por defecto todos los recibidos, que ya vienen solo activos).
export const validateCustomFieldValues = (fields = [], values = {}) => {
  const errors = {};
  fields.forEach((field) => {
    const message = valueError(field, values[field.field_key]);
    if (message) errors[errorKeyFor(field)] = message;
  });
  return errors;
};

export const fieldsInSection = (fields = [], section) =>
  fields.filter((field) => field.section === section).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

// Valores a enviar: solo los campos activos recibidos, vacío = null.
export const customFieldsPayload = (fields = [], values = {}) =>
  Object.fromEntries(
    fields.map((field) => {
      const value = values[field.field_key];
      return [field.field_key, isEmptyValue(value) ? null : value];
    }),
  );

export const formatCustomFieldValue = (field, value) => {
  if (isEmptyValue(value)) return "—";
  switch (field.field_type) {
    case "BOOLEAN":
      return value === true || value === 1 || value === "1" || value === "true" ? "Sí" : "No";
    case "NUMBER":
      return Number(value).toLocaleString("es-NI", { maximumFractionDigits: 4 });
    case "DATE": {
      const [y, m, d] = String(value).slice(0, 10).split("-");
      return d ? `${d}/${m}/${y}` : String(value);
    }
    default:
      return String(value);
  }
};

// Definición de impresión/Excel (ReportExportButtons) de la lista de campos.
export const buildDefinitionsReport = (entity, rows = []) => ({
  title: `Campos personalizados — ${ENTITY_LABELS[entity] || entity}`,
  subtitle: "Configuración de la empresa",
  orientation: "landscape",
  fileName: `campos_personalizados_${String(entity).toLowerCase()}`,
  columns: [
    { field: "sort_order", label: "Orden", numeric: true },
    { field: "label", label: "Nombre" },
    { field: "field_key", label: "Clave interna" },
    { field: "type_label", label: "Tipo" },
    { field: "options_label", label: "Opciones" },
    { field: "section_label", label: "Sección" },
    { field: "required_label", label: "Obligatorio" },
    { field: "status_label", label: "Estado" },
    { field: "value_count", label: "Registros con dato", numeric: true },
  ],
  rows: rows.map((row) => ({
    ...row,
    type_label: FIELD_TYPE_LABELS[row.field_type] || row.field_type,
    options_label: row.field_type === "LIST" ? (row.options || []).join(", ") : "",
    section_label: SECTIONS[entity]?.[row.section] || row.section,
    required_label: Number(row.is_required) === 1 ? "Sí" : "No",
    status_label: Number(row.is_active) === 1 ? "Activo" : "Inactivo",
    value_count: Number(row.value_count || 0),
  })),
});
