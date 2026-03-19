import API from  "../../src/api";

const BASE = "/api/loans";

export const loanApi = {
  getAll: async (params) => {
    const { data } = await API.get(BASE, { params });
    return data;
  },

  getOne: async (loanId) => {
    const { data } = await API.get(`${BASE}/${loanId}`);
    return data;
  },

  create: async (payload) => {
    const { data } = await API.post(BASE, payload);
    return data;
  },

  update: async (loanId, payload) => {
    const { data } = await API.put(`${BASE}/${loanId}`, payload);
    return data;
  },

  previewAmortization: async (payload) => {
    const { data } = await API.post(`${BASE}/amortization`, payload);
    return data;
  },

  showAmortization: async (loanId) => {
    const { data } = await API.get(`${BASE}/amortization/${loanId}`);
    return data;
  },

  getLoansByCustomer: async (customerId) => {
    const { data } = await API.get(`${BASE}/customer/${customerId}`);
    return data;
  },

  generateBalances: async (payload) => {
    const { data } = await API.post(`${BASE}/balances`, payload);
    return data;
  },

  disburse: async (loanId, payload) => {
    const { data } = await API.post(`${BASE}/disburse/${loanId}`, payload);
    return data;
  },
};