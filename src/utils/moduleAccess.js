// Módulos opcionales por empresa (ver api/superadmin/moduleRegistry.js en el
// backend: las claves deben coincidir). enabled_modules null = todos.

export const isModuleEnabled = (enabledModules, key) =>
  enabledModules === null || enabledModules === undefined || (Array.isArray(enabledModules) && enabledModules.includes(key));

// Pantallas que pertenecen a un módulo opcional, por prefijo de ruta. Si la
// empresa no tiene el módulo, la pantalla no se abre aunque se llegue por un
// enlace guardado, un favorito o la URL: se muestra un aviso en vez de una
// pantalla que fallaría con 403 en cada consulta. Una ruta que calza con
// varios prefijos exige todos sus módulos (ej. Conozca a su Empleado: RRHH y
// cumplimiento).
export const PATH_MODULES = [
  ["/contabilidad", "accounting"],
  ["/retenciones", "accounting"],
  ["/proveedores", "accounting"],
  ["/cuentas-por-pagar", "accounting"],
  ["/flujo-caja", "accounting"],
  ["/cumplimiento", "compliance"],
  ["/rrhh/conozca-su-empleado", "compliance"],
  ["/bancos", "banks"],
  ["/caja", "caja"],
  ["/rrhh", "hr"],
  ["/obligaciones", "obligations"],
  ["/presupuesto", "budget"],
  ["/seguros", "insurance"],
  ["/ti", "it"],
  ["/ti/riesgo", "it_risk"],
  ["/reports/conami/icc", "icc"],
  ["/reports/conami/sinriesgo", "sinriesgo"],
  ["/sinriesgos", "sinriesgo"],
  ["/configuracion/provision-cartera", "risk_classification_ngrc"],
  ["/provisiones", "risk_classification_ngrc"],
];

const matchesPrefix = (pathname, prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`);

// ¿La empresa está normada por la CONAMI? (tenants.conami_regulated). Si no
// se sabe, se asume que sí: es lo que tenían todas las empresas antes.
export const isConamiRegulated = (tenant) =>
  !(tenant?.conami_regulated === false || tenant?.conami_regulated === 0);

// Pantallas que solo tienen sentido para una empresa normada por la CONAMI.
export const REGULATED_ONLY_PATHS = ["/conami/tablas"];

export const isRegulatedOnlyPath = (pathname) =>
  REGULATED_ONLY_PATHS.some((prefix) => matchesPrefix(pathname, prefix));

// Primer módulo apagado que exige la ruta, o null si se puede abrir.
export const blockedModuleForPath = (pathname, enabledModules) => {
  if (enabledModules === null || enabledModules === undefined) return null;
  const match = PATH_MODULES.find(([prefix, key]) => matchesPrefix(pathname, prefix) && !isModuleEnabled(enabledModules, key));
  return match ? match[1] : null;
};

export const MODULE_LABELS = {
  accounting: "Contabilidad",
  compliance: "Cumplimiento LA/FT/FP",
  banks: "Bancos",
  caja: "Caja",
  hr: "Recursos Humanos",
  obligations: "Obligaciones Financieras",
  budget: "Presupuesto",
  insurance: "Seguros",
  it: "Gestión de TI",
  it_risk: "Riesgo Tecnológico",
  icc: "Informe ICC",
  isc: "Informe ISC",
  sinriesgo: "Reporte Sin Riesgo",
  risk_classification_ngrc: "Clasificación NGRC",
};
