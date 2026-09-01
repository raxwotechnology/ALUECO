import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { warehousesApi } from './warehousesApi';

export const useWarehouses = (filters = {}) => useQuery({
    queryKey: ['warehouses', filters],
    queryFn: () => warehousesApi.list(filters),
    staleTime: 5 * 60 * 1000,
});

export const useWarehouse = (id) => useQuery({
    queryKey: ['warehouse', id],
    queryFn: () => warehousesApi.getById(id),
    enabled: !!id,
});

export const useCreateWarehouse = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: warehousesApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['warehouses'] });
            toast.success('Warehouse created');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useUpdateWarehouse = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => warehousesApi.update(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['warehouses'] });
            toast.success('Warehouse updated');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useDeleteWarehouse = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: warehousesApi.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['warehouses'] });
            toast.success('Warehouse deleted');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};