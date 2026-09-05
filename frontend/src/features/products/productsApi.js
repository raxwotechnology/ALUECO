import api from '../../api/axios';

export const productsApi = {
    // Products
    list: async (params = {}) => {
        const response = await api.get('/products', { params });
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/products/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/products', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/products/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/products/${id}`);
        return response.data;
    },
    getNextCode: async (categoryId, productShortCode) => {
        const response = await api.get('/products/next-code', { params: { categoryId, productShortCode } });
        return response.data;
    },

    // Categories
    listCategories: async (params = {}) => {
        const response = await api.get('/categories', { params });
        return response.data;
    },
    createCategory: async (data) => {
        const response = await api.post('/categories', data);
        return response.data;
    },
    updateCategory: async (id, data) => {
        const response = await api.put(`/categories/${id}`, data);
        return response.data;
    },
    deleteCategory: async (id) => {
        const response = await api.delete(`/categories/${id}`);
        return response.data;
    },

    // Brands
    listBrands: async () => {
        const response = await api.get('/brands');
        return response.data;
    },
    createBrand: async (data) => {
        const response = await api.post('/brands', data);
        return response.data;
    },
    updateBrand: async (id, data) => {
        const response = await api.put(`/brands/${id}`, data);
        return response.data;
    },
    deleteBrand: async (id) => {
        const response = await api.delete(`/brands/${id}`);
        return response.data;
    },

    // UOMs
    listUoms: async () => {
        const response = await api.get('/uoms');
        return response.data;
    },
};