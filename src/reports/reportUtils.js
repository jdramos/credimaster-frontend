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

export const yesNo = (value) => {
  if (value === true || value === "Y" || value === 1) return "Sí";
  if (value === false || value === "N" || value === 0) return "No";
  return "—";
};
