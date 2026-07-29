import API from "../api";

export const requestPasswordReset = async (email) => {
  const { data } = await API.post("/api/login/forgot-password", { email });
  return data;
};

export const confirmPasswordReset = async ({ tenant_code, token, newPassword }) => {
  const { data } = await API.post("/api/login/reset-password", { tenant_code, token, newPassword });
  return data;
};
