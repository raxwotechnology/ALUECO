import api from '../../api/axios';

export const usersApi = {
    list: async (params = {}) => (await api.get('/users', { params })).data,
};