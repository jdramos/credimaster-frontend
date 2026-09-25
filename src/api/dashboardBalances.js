import API from "../api"; // ajusta según tu instancia axios

export const getDashboardCatalogs = async () => {
  const { data } = await API.get("/api/dashboard/catalogs");
  return data;
};

export const getBalancesFastSummary = async (params) => {
  const { data } = await API.get("/api/dashboard/balances-fast/summary", {
    params,
  });
  return data;
};

export const getBalancesFastPortfolioByMonth = async (params) => {
  const { data } = await API.get(
    "/api/dashboard/balances-fast/portfolio-by-month",
    { params },
  );
  return data;
};

export const getBalancesFastAging = async (params) => {
  const { data } = await API.get("/api/dashboard/balances-fast/aging", {
    params,
  });
  return data;
};

export const getBalancesFastPortfolioByBranch = async (params) => {
  const { data } = await API.get(
    "/api/dashboard/balances-fast/portfolio-by-branch",
    { params },
  );
  return data;
};

export const getBalancesFastRiskBreakdown = async (params) => {
  const { data } = await API.get(
    "/api/dashboard/balances-fast/risk-breakdown",
    { params },
  );
  return data;
};

export const getBalancesDetail = async (params) => {
  const { data } = await API.get("/api/balances/balances-detail", { params });
  return data;
};

// compatibilidad con nombres anteriores
export const getBalancesDashboardSummary = getBalancesFastSummary;
export const getBalancesPortfolioByMonth = getBalancesFastPortfolioByMonth;
export const getBalancesAging = getBalancesFastAging;
