import API from "../api";

// Cache en memoria a nivel de módulo -- la config de evaluación financiera
// es única por tenant (no por pantalla, a diferencia de HelpButton), así que
// basta un solo valor cacheado. Se invalida al guardar cambios desde
// FinancialEvaluationConfigManager para que la vista previa del score en
// CustomerFinancialEvaluationTab use los números nuevos sin recargar la página.
let cachedConfig = null;
let inFlight = null;

export async function getFinancialEvaluationConfig({ force = false } = {}) {
  if (cachedConfig && !force) return cachedConfig;
  if (inFlight && !force) return inFlight;

  inFlight = API.get("/api/financial-evaluation-config")
    .then(({ data }) => {
      cachedConfig = data;
      return data;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function invalidateFinancialEvaluationConfigCache() {
  cachedConfig = null;
}
