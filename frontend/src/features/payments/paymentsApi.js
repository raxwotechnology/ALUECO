import api from '../../api/axios';

export const paymentsApi = {
    list: async (params = {}) => (await api.get('/payments', { params })).data,
    getById: async (id) => (await api.get(`/payments/${id}`)).data,
    create: async (data) => (await api.post('/payments', data)).data,
};