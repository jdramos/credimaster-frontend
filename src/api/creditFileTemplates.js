import API from "../api";

export const getCreditFileTemplates = async () => {
  const { data } = await API.get("/api/credit-file-templates");
  return data;
};

export const createCreditFileTemplate = async (payload) => {
  const { data } = await API.post("/api/credit-file-templates", payload);
  return data;
};

export const updateCreditFileTemplate = async (id, payload) => {
  const { data } = await API.put(`/api/credit-file-templates/${id}`, payload);
  return data;
};

export const getCreditFileByLoanId = async (loanId) => {
  const { data } = await API.get(`/api/credit-file-templates/loan/${loanId}`);
  return data;
};
