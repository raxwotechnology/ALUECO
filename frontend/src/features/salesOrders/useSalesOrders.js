import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { salesOrdersApi } from './salesOrdersApi';

const invalidateReportsAndDashboard = (qc) => {
    const keys = [
        'dashboardKpis', 'revenueChart', 'topProducts', 'topCustomers',
        'stockValuation', 'stockMovementReport', 'lowStockReport', 'dailyStockStatus',
        'salesSummary', 'salesByProduct', 'salesByCustomer', 'salesTrend',
        'financialSnapshot', 'varianceReport'
    ];
    keys.forEach(key => qc.invalidateQueries({ queryKey: [key] }));
};

export const useSalesOrders = (filters = {}) => useQuery({
    queryKey: ['salesOrders', filters],
    queryFn: () => salesOrdersApi.list(filters),
    keepPreviousData: true,
});

export const useSalesOrder = (id) => useQuery({
    queryKey: ['salesOrder', id],
    queryFn: () => salesOrdersApi.getById(id),
    enabled: !!id,
});

export const useCreateSalesOrder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: salesOrdersApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['salesOrders'] });
            qc.invalidateQueries({ queryKey: ['stock'] });
            qc.invalidateQueries({ queryKey: ['stockMovements'] });
            invalidateReportsAndDashboard(qc);
            toast.success('Order created');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create order'),
    });
};

export const useChangeOrderStatus = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, reason }) => salesOrdersApi.changeStatus(id, status, reason),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['salesOrders'] });
            qc.invalidateQueries({ queryKey: ['salesOrder'] });
            qc.invalidateQueries({ queryKey: ['stock'] });
            qc.invalidateQueries({ queryKey: ['stockMovements'] });
            invalidateReportsAndDashboard(qc);
            toast.success(data.message);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useDeleteSalesOrder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: salesOrdersApi.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['salesOrders'] });
            qc.invalidateQueries({ queryKey: ['stock'] });
            qc.invalidateQueries({ queryKey: ['stockMovements'] });
            invalidateReportsAndDashboard(qc);
            toast.success('Order deleted');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};