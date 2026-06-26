import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { stockApi } from './stockApi';

const invalidateReportsAndDashboard = (qc) => {
    const keys = [
        'dashboardKpis', 'revenueChart', 'topProducts', 'topCustomers',
        'stockValuation', 'stockMovementReport', 'lowStockReport', 'dailyStockStatus',
        'salesSummary', 'salesByProduct', 'salesByCustomer', 'salesTrend',
        'financialSnapshot', 'varianceReport'
    ];
    keys.forEach(key => qc.invalidateQueries({ queryKey: [key] }));
};

export const useStockItems = (filters = {}) => useQuery({
    queryKey: ['stock', filters],
    queryFn: () => stockApi.list(filters),
    keepPreviousData: true,
    refetchOnMount: 'always', // Always fetch fresh data when component mounts
});

export const useStockMovements = (filters = {}) => useQuery({
    queryKey: ['stockMovements', filters],
    queryFn: () => stockApi.movements(filters),
    keepPreviousData: true,
});

export const useReservations = (filters = {}) => useQuery({
    queryKey: ['stockReservations', filters],
    queryFn: () => stockApi.reservations(filters),
});

export const useOpeningStock = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: stockApi.openingStock,
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['stock'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['stockMovements'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['bomAvailability'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
            invalidateReportsAndDashboard(qc);
            toast.success(data.message);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useTransferStock = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: stockApi.transfer,
        onSuccess: (data) => {
            // refetchType:'all' forces immediate refetch of both active and inactive queries
            qc.invalidateQueries({ queryKey: ['stock'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['stockMovements'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['bomAvailability'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
            invalidateReportsAndDashboard(qc);
            toast.success(data.message);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useAdjustStock = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: stockApi.adjust,
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['stock'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['stockMovements'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['bomAvailability'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
            invalidateReportsAndDashboard(qc);
            toast.success(data.message);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useConvertStock = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: stockApi.convert,
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['stock'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['stockMovements'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['productionBatches'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['bomAvailability'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
            invalidateReportsAndDashboard(qc);
            toast.success(data.message || 'Stock converted successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Conversion failed'),
    });
};

export const useConvertStockBom = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: stockApi.convertBom,
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['stock'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['stockMovements'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['productionBatches'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['bomAvailability'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
            invalidateReportsAndDashboard(qc);
            toast.success(data.message || 'BOM conversion successful');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'BOM conversion failed'),
    });
};

export const useConvertStockRecipe = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: stockApi.convertRecipe,
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['stock'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['stockMovements'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['productionBatches'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['bomAvailability'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
            invalidateReportsAndDashboard(qc);
            toast.success(data.message || 'Formula conversion successful');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Formula conversion failed'),
    });
};

export const useReleaseStock = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => stockApi.release(data),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['stock'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['stockMovements'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
            invalidateReportsAndDashboard(qc);
            toast.success(data.message || 'Stock released successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Stock release failed'),
    });
};

export const useUpdateStockItem = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => stockApi.update(id, data),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['stock'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['stockMovements'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
            invalidateReportsAndDashboard(qc);
            toast.success('Stock item updated successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
    });
};

export const useDeleteStockItem = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => stockApi.delete(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['stock'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['stockMovements'], refetchType: 'all' });
            qc.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
            invalidateReportsAndDashboard(qc);
            toast.success('Stock item deleted successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Deletion failed'),
    });
};