import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { suppliersApi } from './suppliersApi';

export const useSuppliers = (filters = {}) => useQuery({
    queryKey: ['suppliers', filters],
    queryFn: () => suppliersApi.list(filters),
    keepPreviousData: true,
});

export const useSupplier = (id) => useQuery({
    queryKey: ['supplier', id],
    queryFn: () => suppliersApi.getById(id),
    enabled: !!id,
});

export const useCreateSupplier = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: suppliersApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success('Supplier created');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useUpdateSupplier = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => suppliersApi.update(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success('Supplier updated');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useDeleteSupplier = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: suppliersApi.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success('Supplier deleted');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};