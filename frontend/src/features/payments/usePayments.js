import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { paymentsApi } from './paymentsApi';

const invalidateReportsAndDashboard = (qc) => {
    const keys = [
        'dashboardKpis', 'revenueChart', 'topProducts', 'topCustomers',
        'stockValuation', 'stockMovementReport', 'lowStockReport', 'dailyStockStatus',
        'salesSummary', 'salesByProduct', 'salesByCustomer', 'salesTrend',
        'financialSnapshot', 'varianceReport'
    ];
    keys.forEach(key => qc.invalidateQueries({ queryKey: [key] }));
};

export const usePayments = (filters = {}) => useQuery({
    queryKey: ['payments', filters],
    queryFn: () => paymentsApi.list(filters),
    keepPreviousData: true,
});

export const useCreatePayment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: paymentsApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['payments'] });
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['bills'] });
            qc.invalidateQueries({ queryKey: ['customers'] });
            invalidateReportsAndDashboard(qc);
            toast.success('Payment recorded');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};