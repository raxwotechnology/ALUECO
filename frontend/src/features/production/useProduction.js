import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productionApi } from './productionApi';

export const useProductionOrders = (filters = {}) => useQuery({
    queryKey: ['productionOrders', filters],
    queryFn: () => productionApi.list(filters),
    keepPreviousData: true,
});

export const useProductionOrder = (id) => useQuery({
    queryKey: ['productionOrder', id],
    queryFn: () => productionApi.getById(id),
    enabled: !!id,
});

export const useCreateProductionOrder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: productionApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['productionOrders'] });
            toast.success('Production order created');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useProductionAction = () => {
    const qc = useQueryClient();
    return {
        approve: useMutation({
            mutationFn: productionApi.approve,
            onSuccess: () => {
                qc.invalidateQueries({ queryKey: ['productionOrders'] });
                qc.invalidateQueries({ queryKey: ['productionOrder'] });
                toast.success('Production order approved');
            },
            onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
        }),
        start: useMutation({
            mutationFn: productionApi.start,
            onSuccess: () => {
                qc.invalidateQueries({ queryKey: ['productionOrders'] });
                qc.invalidateQueries({ queryKey: ['productionOrder'] });
                toast.success('Production started');
            },
            onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
        }),
        complete: useMutation({
            mutationFn: ({ id, data }) => productionApi.complete(id, data),
            onSuccess: (result) => {
                qc.invalidateQueries({ queryKey: ['productionOrders'] });
                qc.invalidateQueries({ queryKey: ['productionOrder'] });
                qc.invalidateQueries({ queryKey: ['stock'] });
                qc.invalidateQueries({ queryKey: ['stockMovements'] });
                toast.success(result.message || 'Production completed');
            },
            onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
        }),
        hold: useMutation({
            mutationFn: ({ id, reason }) => productionApi.hold(id, reason),
            onSuccess: () => {
                qc.invalidateQueries({ queryKey: ['productionOrders'] });
                qc.invalidateQueries({ queryKey: ['productionOrder'] });
                toast.success('Production on hold');
            },
            onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
        }),
        cancel: useMutation({
            mutationFn: ({ id, reason }) => productionApi.cancel(id, reason),
            onSuccess: () => {
                qc.invalidateQueries({ queryKey: ['productionOrders'] });
                qc.invalidateQueries({ queryKey: ['productionOrder'] });
                toast.success('Production cancelled');
            },
            onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
        }),
    };
};