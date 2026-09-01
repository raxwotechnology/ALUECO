import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { purchaseOrdersApi, grnsApi } from './purchaseOrdersApi';

export const usePurchaseOrders = (filters = {}) => useQuery({
    queryKey: ['purchaseOrders', filters],
    queryFn: () => purchaseOrdersApi.list(filters),
    keepPreviousData: true,
});

export const usePurchaseOrder = (id) => useQuery({
    queryKey: ['purchaseOrder', id],
    queryFn: () => purchaseOrdersApi.getById(id),
    enabled: !!id,
});

export const useCreatePurchaseOrder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: purchaseOrdersApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
            toast.success('PO created');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useChangePoStatus = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, reason }) => purchaseOrdersApi.changeStatus(id, status, reason),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
            qc.invalidateQueries({ queryKey: ['purchaseOrder'] });
            toast.success(data.message);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useCreateGrn = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: grnsApi.create,
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
            qc.invalidateQueries({ queryKey: ['purchaseOrder'] });
            qc.invalidateQueries({ queryKey: ['grns'] });
            qc.invalidateQueries({ queryKey: ['stock'] });
            toast.success(data.message);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useGrns = (filters = {}) => useQuery({
    queryKey: ['grns', filters],
    queryFn: () => grnsApi.list(filters),
});

export const useApproveGrnQA = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => grnsApi.approveQA(id, data),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
            qc.invalidateQueries({ queryKey: ['purchaseOrder'] });
            qc.invalidateQueries({ queryKey: ['grns'] });
            qc.invalidateQueries({ queryKey: ['stock'] });
            toast.success(res.message || 'QA approved successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to approve GRN'),
    });
};

export const useSendGrnSms = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => grnsApi.sendGrnSms(id, data),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ['purchaseOrder'] });
            qc.invalidateQueries({ queryKey: ['grns'] });
            toast.success(res.message || 'SMS sent successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to send SMS'),
    });
};