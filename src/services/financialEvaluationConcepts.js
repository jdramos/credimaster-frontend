import API from "../api";

// Mismo patrón de cache-once que financialEvaluationConfig.js.
let cachedConcepts = null;
let inFlight = null;

export async function getFinancialEvaluationConcepts({ force = false } = {}) {
  if (cachedConcepts && !force) return cachedConcepts;
  if (inFlight && !force) return inFlight;

  inFlight = API.get("/api/financial-evaluation-concepts")
    .then(({ data }) => {
      cachedConcepts = data;
      return data;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function invalidateFinancialEvaluationConceptsCache() {
  cachedConcepts = null;
}
