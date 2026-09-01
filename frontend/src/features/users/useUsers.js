import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const usersApi = {
    list: async (params = {}) => (await api.get('/users', { params })).data,
    getById: async (id) => (await api.get(`/users/${id}`)).data,
    update: async (id, data) => (await api.put(`/users/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/users/${id}`)).data,
    register: async (data) => (await api.post('/auth/register', data)).data,
};

export const useUsers = (filters = {}) => useQuery({
    queryKey: ['users', filters],
    queryFn: () => usersApi.list(filters),
    keepPreviousData: true,
});

export const useUser = (id) => useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
});

export const useCreateUser = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: usersApi.register,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['users'] });
            toast.success('User created');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create user'),
    });
};

export const useUpdateUser = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => usersApi.update(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['users'] });
            toast.success('User updated');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
    });
};

export const useDeleteUser = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: usersApi.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['users'] });
            toast.success('User deactivated');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};