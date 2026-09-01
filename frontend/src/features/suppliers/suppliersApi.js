import api from '../../api/axios';

export const suppliersApi = {
    list: async (params = {}) => (await api.get('/suppliers', { params })).data,
    getById: async (id) => (await api.get(`/suppliers/${id}`)).data,
    create: async (data) => (await api.post('/suppliers', data)).data,
    update: async (id, data) => (await api.put(`/suppliers/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/suppliers/${id}`)).data,
};