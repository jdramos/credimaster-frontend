import API from "../api";

const BASE = "/api/approvals";

export const approvalApi = {
  getByRequest: async (creditRequestId) => {
    const { data } = await API.get(`${BASE}/${creditRequestId}`);
    return data;
  },

  create: async (payload) => {
    const { data } = await API.post(BASE, payload);
    return data;
  },

  updateStatus: async (approvalId, payload) => {
    const { data } = await API.put(`${BASE}/${approvalId}`, payload);
    return data;
  },
};