import api from '../../api/axios';

export const purchaseOrdersApi = {
    list: async (params = {}) => (await api.get('/purchase-orders', { params })).data,
    getById: async (id) => (await api.get(`/purchase-orders/${id}`)).data,
    create: async (data) => (await api.post('/purchase-orders', data)).data,
    update: async (id, data) => (await api.put(`/purchase-orders/${id}`, data)).data,
    changeStatus: async (id, status, reason) =>
        (await api.patch(`/purchase-orders/${id}/status`, { status, reason })).data,
    delete: async (id) => (await api.delete(`/purchase-orders/${id}`)).data,
};

export const grnsApi = {
    list: async (params = {}) => (await api.get('/grns', { params })).data,
    getById: async (id) => (await api.get(`/grns/${id}`)).data,
    create: async (data) => (await api.post('/grns', data)).data,
    approveQA: async (id, data) => (await api.put(`/grns/${id}/approve-qa`, data)).data,
    sendGrnSms: async (id, data) => (await api.post(`/grns/${id}/send-sms`, data)).data,
};