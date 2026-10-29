// Formatos de celda para las columnas de printAccountingReport /
// exportReportToExcel (`format`). En Excel las columnas `numeric` van como
// número sin formato; estos formatos solo aplican a la impresión.
export const reportMoney = (value) =>
  Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const reportInteger = (value) => Number(value || 0).toLocaleString("es-NI", { maximumFractionDigits: 0 });

export const reportPercent = (value) =>
  value === null || value === undefined || value === "" ? "" : `${Number(value).toLocaleString("es-NI", { maximumFractionDigits: 2 })}%`;

export const reportDate = (value) => (value ? String(value).slice(0, 10) : "");

export const reportDateTime = (value) => (value ? String(value).replace("T", " ").slice(0, 16) : "");

export const reportYesNo = (value) => (value ? "Sí" : "No");

// "Del 2026-10-01 al 2026-10-31", "Al 2026-10-31", etc.
export const reportPeriod = (from, to) => {
  if (from && to) return `Del ${from} al ${to}`;
  if (from) return `Desde ${from}`;
  if (to) return `Al ${to}`;
  return "";
};

// "Sucursal: Central · Estado: Activo" con los filtros que tienen valor.
export const reportFilters = (pairs) =>
  pairs.filter(([, value]) => value !== undefined && value !== null && value !== "").map(([label, value]) => `${label}: ${value}`).join(" · ");
