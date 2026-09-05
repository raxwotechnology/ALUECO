import api from '../../api/axios';

export const salesOrdersApi = {
    list: async (params = {}) => (await api.get('/sales-orders', { params })).data,
    getById: async (id) => (await api.get(`/sales-orders/${id}`)).data,
    create: async (data) => (await api.post('/sales-orders', data)).data,
    update: async (id, data) => (await api.put(`/sales-orders/${id}`, data)).data,
    changeStatus: async (id, status, reason) =>
        (await api.patch(`/sales-orders/${id}/status`, { status, reason })).data,
    delete: async (id) => (await api.delete(`/sales-orders/${id}`)).data,
};