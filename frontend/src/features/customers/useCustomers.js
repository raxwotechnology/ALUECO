import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { customersApi } from './customersApi';

export const useCustomers = (filters = {}) => {
    return useQuery({
        queryKey: ['customers', filters],
        queryFn: () => customersApi.list(filters),
        keepPreviousData: true,
    });
};

export const useCustomer = (id) => {
    return useQuery({
        queryKey: ['customer', id],
        queryFn: () => customersApi.getById(id),
        enabled: !!id,
    });
};

export const useCreateCustomer = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: customersApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Customer created');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create'),
    });
};

export const useUpdateCustomer = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => customersApi.update(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Customer updated');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
    });
};

export const useDeleteCustomer = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: customersApi.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Customer deleted');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
    });
};

export const useToggleCreditHold = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reason }) => customersApi.toggleCreditHold(id, reason),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['customers'] });
            toast.success(data.message);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useCustomerGroups = () => {
    return useQuery({
        queryKey: ['customerGroups'],
        queryFn: () => customersApi.listGroups(),
        staleTime: 5 * 60 * 1000,
    });
};