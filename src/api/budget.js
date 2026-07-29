import API from "../api";

export const getBudgets = async () => {
  const { data } = await API.get("/api/budget");
  return data;
};

export const getBudget = async (id) => {
  const { data } = await API.get(`/api/budget/${id}`);
  return data;
};

export const createBudget = async (payload) => {
  const { data } = await API.post("/api/budget", payload);
  return data;
};

export const updateBudgetStatus = async (id, status) => {
  const { data } = await API.put(`/api/budget/${id}/status`, { status });
  return data;
};

export const getBudgetableAccounts = async () => {
  const { data } = await API.get("/api/budget/accounts");
  return data;
};

export const getBudgetAccountLines = async (id) => {
  const { data } = await API.get(`/api/budget/${id}/account-lines`);
  return data;
};

export const saveBudgetAccountLines = async (id, lines) => {
  const { data } = await API.post(`/api/budget/${id}/account-lines`, { lines });
  return data;
};

export const getBudgetPortfolioGoals = async (id) => {
  const { data } = await API.get(`/api/budget/${id}/portfolio-goals`);
  return data;
};

export const saveBudgetPortfolioGoals = async (id, goals) => {
  const { data } = await API.post(`/api/budget/${id}/portfolio-goals`, { goals });
  return data;
};

export const getBudgetTracking = async (id, params) => {
  const { data } = await API.get(`/api/budget/${id}/tracking`, { params });
  return data;
};

export const getBudgetAlerts = async (status) => {
  const { data } = await API.get("/api/budget/alerts", { params: status ? { status } : {} });
  return data;
};

export const runBudgetAlertCheck = async () => {
  const { data } = await API.post("/api/budget/alerts/run-check");
  return data;
};

export const dismissBudgetAlert = async (id, comment) => {
  const { data } = await API.post(`/api/budget/alerts/${id}/dismiss`, { comment });
  return data;
};
