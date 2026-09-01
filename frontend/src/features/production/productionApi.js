import api from '../../api/axios';

export const productionApi = {
    list: async (params = {}) => (await api.get('/production-orders', { params })).data,
    getById: async (id) => (await api.get(`/production-orders/${id}`)).data,
    create: async (data) => (await api.post('/production-orders', data)).data,
    approve: async (id) => (await api.patch(`/production-orders/${id}/approve`)).data,
    start: async (id) => (await api.patch(`/production-orders/${id}/start`)).data,
    complete: async (id, data) => (await api.patch(`/production-orders/${id}/complete`, data)).data,
    hold: async (id, reason) => (await api.patch(`/production-orders/${id}/hold`, { reason })).data,
    cancel: async (id, reason) => (await api.patch(`/production-orders/${id}/cancel`, { reason })).data,
    delete: async (id) => (await api.delete(`/production-orders/${id}`)).data,
};