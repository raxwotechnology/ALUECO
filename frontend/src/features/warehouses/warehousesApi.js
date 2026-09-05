import api from '../../api/axios';

export const warehousesApi = {
    list: async (params = {}) => (await api.get('/warehouses', { params })).data,
    getById: async (id) => (await api.get(`/warehouses/${id}`)).data,
    create: async (data) => (await api.post('/warehouses', data)).data,
    update: async (id, data) => (await api.put(`/warehouses/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/warehouses/${id}`)).data,
};