import api from '../../api/axios';

export const invoicesApi = {
    list: async (params = {}) => (await api.get('/invoices', { params })).data,
    getById: async (id) => (await api.get(`/invoices/${id}`)).data,
    create: async (data) => (await api.post('/invoices', data)).data,
    createFromSalesOrder: async (data) => (await api.post('/invoices/from-sales-order', data)).data,
    changeStatus: async (id, status, reason) =>
        (await api.patch(`/invoices/${id}/status`, { status, reason })).data,
    delete: async (id) => (await api.delete(`/invoices/${id}`)).data,
    agingSummary: async (params = {}) => (await api.get('/invoices/aging/summary', { params })).data,
};