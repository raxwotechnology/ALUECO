import api from '../../api/axios';

export const returnsApi = {
    list: async (params = {}) => (await api.get('/customer-returns', { params })).data,
    getById: async (id) => (await api.get(`/customer-returns/${id}`)).data,
    create: async (data) => (await api.post('/customer-returns', data)).data,
    approve: async (id) => (await api.patch(`/customer-returns/${id}/approve`)).data,
    reject: async (id, reason) => (await api.patch(`/customer-returns/${id}/reject`, { reason })).data,
    receive: async (id, data) => (await api.patch(`/customer-returns/${id}/receive`, data)).data,
    process: async (id, data) => (await api.patch(`/customer-returns/${id}/process`, data)).data,
    issueCreditNote: async (id) => (await api.patch(`/customer-returns/${id}/issue-credit-note`)).data,
    complete: async (id) => (await api.patch(`/customer-returns/${id}/complete`)).data,
};

export const creditNotesApi = {
    list: async (params = {}) => (await api.get('/credit-notes', { params })).data,
    getById: async (id) => (await api.get(`/credit-notes/${id}`)).data,
    create: async (data) => (await api.post('/credit-notes', data)).data,
    apply: async (id, data) => (await api.post(`/credit-notes/${id}/apply`, data)).data,
};

export const damagesApi = {
    list: async (params = {}) => (await api.get('/damages', { params })).data,
    getById: async (id) => (await api.get(`/damages/${id}`)).data,
    create: async (data) => (await api.post('/damages', data)).data,
    update: async (id, data) => (await api.patch(`/damages/${id}`, data)).data,
    writeOff: async (id) => (await api.patch(`/damages/${id}/write-off`)).data,
    summary: async () => (await api.get('/damages/summary')).data,
};

export const supplierReturnsApi = {
    list: async (params = {}) => (await api.get('/supplier-returns', { params })).data,
    getById: async (id) => (await api.get(`/supplier-returns/${id}`)).data,
    create: async (data) => (await api.post('/supplier-returns', data)).data,
    send: async (id) => (await api.patch(`/supplier-returns/${id}/send`)).data,
    recordCredit: async (id, data) => (await api.patch(`/supplier-returns/${id}/record-credit`, data)).data,
};

export const repairsApi = {
    list: async (params = {}) => (await api.get('/repairs', { params })).data,
    getById: async (id) => (await api.get(`/repairs/${id}`)).data,
    create: async (data) => (await api.post('/repairs', data)).data,
    update: async (id, data) => (await api.put(`/repairs/${id}`, data)).data,
    start: async (id, data) => (await api.patch(`/repairs/${id}/start`, data)).data,
    complete: async (id, data) => (await api.patch(`/repairs/${id}/complete`, data)).data,
};