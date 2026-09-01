import api from '../../api/axios';

export const billsApi = {
    list: async (params = {}) => (await api.get('/bills', { params })).data,
    getById: async (id) => (await api.get(`/bills/${id}`)).data,
    create: async (data) => (await api.post('/bills', data)).data,
    createFromGrn: async (data) => (await api.post('/bills/from-grn', data)).data,
    changeStatus: async (id, status, reason) =>
        (await api.patch(`/bills/${id}/status`, { status, reason })).data,
    agingSummary: async () => (await api.get('/bills/aging/summary')).data,
};