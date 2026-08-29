import dayjs from "dayjs";

export const empty = (value, fallback = "—") => {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
};

export const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export const money = (value, currency = "C$") =>
  `${currency} ${toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const number = (value, decimals = 2) =>
  toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const integer = (value) =>
  toNumber(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });

export const percent = (value, decimals = 2) => `${number(value, decimals)}%`;

export const date = (value, fallback = "—") => {
  if (!value) return fallback;

  const d = dayjs(value);
  return d.isValid() ? d.format("DD/MM/YYYY") : fallback;
};

export const datetime = (value, fallback = "—") => {
  if (!value) return fallback;

  const d = dayjs(value);
  return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : fallback;
};

export const getPeriodText = ({ dateFrom, dateTo } = {}) => {
  if (dateFrom && dateTo) {
    return `${date(dateFrom)} al ${date(dateTo)}`;
  }

  if (dateFrom) return `Desde ${date(dateFrom)}`;
  if (dateTo) return `Hasta ${date(dateTo)}`;

  return "Todos los registros";
};

export const sumBy = (rows = [], field) =>
  rows.reduce((acc, row) => {
    const value = typeof field === "function" ? field(row) : row?.[field];
    return acc + toNumber(value);
  }, 0);

export const fullName = (...parts) =>
  parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

// Sustitución simple de placeholders `{{campo}}` en una plantilla editable
// (ver hr_document_templates / HrConfigPanel.jsx) — sin lógica condicional
// en la plantilla misma; los pocos fragmentos que deben desaparecer por
// completo (p.ej. la frase del salario para un empleado dado de baja) ya
// vienen resueltos en `data` como cadena vacía. La plantilla en sí es
// HTML generado por el editor de texto enriquecido (toolbar de
// negrita/cursiva/fuente en HrConfigPanel.jsx), nunca HTML escrito a mano.
export const interpolate = (template, data = {}) =>
  String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) => (data[key] ?? ""));

export const yesNo = (value) => {
  if (value === true || value === "Y" || value === 1) return "Sí";
  if (value === false || value === "N" || value === 0) return "No";
  return "—";
};
