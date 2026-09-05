import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invoicesApi } from './invoicesApi';

const invalidateReportsAndDashboard = (qc) => {
    const keys = [
        'dashboardKpis', 'revenueChart', 'topProducts', 'topCustomers',
        'stockValuation', 'stockMovementReport', 'lowStockReport', 'dailyStockStatus',
        'salesSummary', 'salesByProduct', 'salesByCustomer', 'salesTrend',
        'financialSnapshot', 'varianceReport'
    ];
    keys.forEach(key => qc.invalidateQueries({ queryKey: [key] }));
};

export const useInvoices = (filters = {}) => useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoicesApi.list(filters),
    keepPreviousData: true,
});

export const useInvoice = (id) => useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getById(id),
    enabled: !!id,
});

export const useCreateInvoice = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: invoicesApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['customers'] });
            qc.invalidateQueries({ queryKey: ['stock'] });
            qc.invalidateQueries({ queryKey: ['stockMovements'] });
            invalidateReportsAndDashboard(qc);
            toast.success('Invoice created');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useGenerateFromSO = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: invoicesApi.createFromSalesOrder,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['salesOrders'] });
            qc.invalidateQueries({ queryKey: ['customers'] });
            qc.invalidateQueries({ queryKey: ['stock'] });
            qc.invalidateQueries({ queryKey: ['stockMovements'] });
            invalidateReportsAndDashboard(qc);
            toast.success('Invoice generated from sales order');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useChangeInvoiceStatus = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, reason }) => invoicesApi.changeStatus(id, status, reason),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['invoice'] });
            qc.invalidateQueries({ queryKey: ['customers'] });
            invalidateReportsAndDashboard(qc);
            toast.success('Status updated');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useAgingSummary = (filters = {}) => useQuery({
    queryKey: ['invoicesAging', filters],
    queryFn: () => invoicesApi.agingSummary(filters),
});