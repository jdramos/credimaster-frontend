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
    const { data } = await API.post(`${BASE}/${loanId}/disburse`, payload);
    return data;
  },

  createRemittance: async (loanId, payload) => {
    const { data } = await API.post(`${BASE}/${loanId}/remittance`, payload);
    return data;
  },

  returnRemittance: async (loanId, payload) => {
    const { data } = await API.put(`${BASE}/${loanId}/remittance/return`, payload);
    return data;
  },

  getRemittance: async (loanId) => {
    const { data } = await API.get(`${BASE}/${loanId}/remittance`);
    return data;
  },

  listRemittances: async (params) => {
    const { data } = await API.get(`${BASE}/remittances`, { params });
    return data;
  },

  listDisbursableLoans: async () => {
    const { data } = await API.get(`${BASE}/remittances/disbursable`);
    return data;
  },

  createBatchRemittance: async (payload) => {
    const { data } = await API.post(`${BASE}/remittances/batch`, payload);
    return data;
  },

  listPendingDeliveries: async () => {
    const { data } = await API.get(`${BASE}/remittances/pending-delivery`);
    return data;
  },

  markDelivered: async (loanId, { delivery_notes, image } = {}) => {
    // Si viene imagen se envía multipart; si no, JSON normal.
    if (image) {
      const fd = new FormData();
      if (delivery_notes) fd.append("delivery_notes", delivery_notes);
      fd.append("image", image);
      const { data } = await API.put(`${BASE}/${loanId}/remittance/deliver`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    }
    const { data } = await API.put(`${BASE}/${loanId}/remittance/deliver`, {
      delivery_notes: delivery_notes || null,
    });
    return data;
  },

  getDeliveryImageUrl: async (remittanceId) => {
    const { data } = await API.get(`${BASE}/remittances/${remittanceId}/delivery-image-url`);
    return data;
  },
};