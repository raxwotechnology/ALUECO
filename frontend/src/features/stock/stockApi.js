import api from '../../api/axios';

export const stockApi = {
    list: async (params = {}) => (await api.get('/stock', { params })).data,
    byProduct: async (productId) => (await api.get(`/stock/by-product/${productId}`)).data,
    movements: async (params = {}) => (await api.get('/stock/movements', { params })).data,
    reservations: async (params = {}) => (await api.get('/stock/reservations', { params })).data,
    openingStock: async (data) => (await api.post('/stock/opening', data)).data,
    transfer: async (data) => (await api.post('/stock/transfer', data)).data,
    adjust: async (data) => (await api.post('/stock/adjustment', data)).data,
    convert: async (data) => (await api.post('/stock/convert', data)).data,
    convertBom: async (data) => (await api.post('/stock/convert-bom', data)).data,
    convertRecipe: async (data) => (await api.post('/stock/convert-recipe', data)).data,
    release: async (data) => (await api.post('/stock/release', data)).data,
    update: async (id, data) => (await api.put(`/stock/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/stock/${id}`)).data,
};