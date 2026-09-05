import api from '../../api/axios';

export const customersApi = {
    // Customers
    list: async (params = {}) => (await api.get('/customers', { params })).data,
    getById: async (id) => (await api.get(`/customers/${id}`)).data,
    create: async (data) => (await api.post('/customers', data)).data,
    update: async (id, data) => (await api.put(`/customers/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/customers/${id}`)).data,
    toggleCreditHold: async (id, reason) =>
        (await api.patch(`/customers/${id}/credit-hold`, { reason })).data,

    // Customer Groups
    listGroups: async (params = {}) => (await api.get('/customer-groups', { params })).data,
    createGroup: async (data) => (await api.post('/customer-groups', data)).data,
    updateGroup: async (id, data) => (await api.put(`/customer-groups/${id}`, data)).data,
    deleteGroup: async (id) => (await api.delete(`/customer-groups/${id}`)).data,
};