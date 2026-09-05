import api from '../../api/axios';

export const bomsApi = {
    list: async (params = {}) => (await api.get('/boms', { params })).data,
    getById: async (id) => (await api.get(`/boms/${id}`)).data,
    create: async (data) => (await api.post('/boms', data)).data,
    update: async (id, data) => (await api.put(`/boms/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/boms/${id}`)).data,
    checkAvailability: async (id, quantity) =>
        (await api.get(`/boms/${id}/check-availability`, { params: { quantity } })).data,
};