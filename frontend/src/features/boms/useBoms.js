import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { bomsApi } from './bomsApi';

export const useBoms = (filters = {}) => useQuery({
    queryKey: ['boms', filters],
    queryFn: () => bomsApi.list(filters),
    keepPreviousData: true,
});

export const useBom = (id) => useQuery({
    queryKey: ['bom', id],
    queryFn: () => bomsApi.getById(id),
    enabled: !!id,
});

export const useCreateBom = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: bomsApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['boms'] });
            toast.success('BOM created');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useUpdateBom = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => bomsApi.update(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['boms'] });
            toast.success('BOM updated');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useDeleteBom = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: bomsApi.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['boms'] });
            toast.success('BOM archived');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useCheckAvailability = (bomId, quantity) => useQuery({
    queryKey: ['bomAvailability', bomId, quantity],
    queryFn: () => bomsApi.checkAvailability(bomId, quantity),
    enabled: !!bomId && !!quantity,
    staleTime: 0,             // Always treat as stale — stock changes constantly
    refetchOnMount: 'always', // Always refetch when component mounts
});