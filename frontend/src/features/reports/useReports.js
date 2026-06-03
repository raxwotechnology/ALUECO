import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, salesReportsApi, inventoryReportsApi } from './reportsApi';
import {
    productionReportsApi, returnsReportsApi, financialReportsApi, hrReportsApi,
} from './reportsApi';

// Production
export const useProductionSummary = (params = {}) => useQuery({ queryKey: ['productionSummary', params], queryFn: () => productionReportsApi.summary(params) });
export const useProductionByProduct = (params = {}) => useQuery({ queryKey: ['productionByProduct', params], queryFn: () => productionReportsApi.byProduct(params) });
export const useProductionWastage = (params = {}) => useQuery({ queryKey: ['productionWastage', params], queryFn: () => productionReportsApi.wastage(params) });

// Returns
export const useReturnsSummary = (params = {}) => useQuery({ queryKey: ['returnsSummary', params], queryFn: () => returnsReportsApi.summary(params) });
export const useDamagesReport = (params = {}) => useQuery({ queryKey: ['damagesReport', params], queryFn: () => returnsReportsApi.damages(params) });

// Financial
export const useFinancialSnapshot = (params = {}) => useQuery({ queryKey: ['financialSnapshot', params], queryFn: () => financialReportsApi.snapshot(params) });
export const useFinancialTargets = () => useQuery({ queryKey: ['financialTargets'], queryFn: financialReportsApi.targets });

export const useSetTarget = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: financialReportsApi.setTarget,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['financialTargets'] });
            qc.invalidateQueries({ queryKey: ['varianceReport'] });
        }
    });
};

export const useVarianceReport = (params = {}) => useQuery({ queryKey: ['varianceReport', params], queryFn: () => financialReportsApi.variance(params) });
export const useSalesComparison = (params = {}) => useQuery({ queryKey: ['salesComparison', params], queryFn: () => financialReportsApi.comparison(params) });

// HR
export const useHeadcountReport = () => useQuery({ queryKey: ['headcountReport'], queryFn: hrReportsApi.headcount });
export const useAttendanceReport = (params = {}) => useQuery({ queryKey: ['attendanceReport', params], queryFn: () => hrReportsApi.attendance(params) });
export const useLeavePatternsReport = (params = {}) => useQuery({ queryKey: ['leavePatternsReport', params], queryFn: () => hrReportsApi.leavePatterns(params) });
export const usePayrollSummaryReport = (params = {}) => useQuery({ queryKey: ['payrollSummaryReport', params], queryFn: () => hrReportsApi.payrollSummary(params) });
export const useShiftWiseReport = (params = {}) => useQuery({ queryKey: ['shiftWiseReport', params], queryFn: () => hrReportsApi.shiftWise(params) });

// Dashboard
export const useDashboardKpis = () => useQuery({
    queryKey: ['dashboardKpis'],
    queryFn: dashboardApi.kpis,
    refetchInterval: 60000, // refresh every minute
});
export const useRevenueChart = (months = 6) => useQuery({
    queryKey: ['revenueChart', months],
    queryFn: () => dashboardApi.revenueChart(months),
});
export const useTopProducts = (params = {}) => useQuery({
    queryKey: ['topProducts', params],
    queryFn: () => dashboardApi.topProducts(params),
});
export const useTopCustomers = (params = {}) => useQuery({
    queryKey: ['topCustomers', params],
    queryFn: () => dashboardApi.topCustomers(params),
});

// Sales
export const useSalesSummary = (params = {}) => useQuery({
    queryKey: ['salesSummary', params],
    queryFn: () => salesReportsApi.summary(params),
});
export const useSalesByProduct = (params = {}) => useQuery({
    queryKey: ['salesByProduct', params],
    queryFn: () => salesReportsApi.byProduct(params),
});
export const useSalesByCustomer = (params = {}) => useQuery({
    queryKey: ['salesByCustomer', params],
    queryFn: () => salesReportsApi.byCustomer(params),
});
export const useSalesTrend = (params = {}) => useQuery({
    queryKey: ['salesTrend', params],
    queryFn: () => salesReportsApi.trend(params),
});

// Inventory
export const useStockValuation = (params = {}) => useQuery({
    queryKey: ['stockValuation', params],
    queryFn: () => inventoryReportsApi.valuation(params),
});
export const useStockMovement = (params = {}) => useQuery({
    queryKey: ['stockMovementReport', params],
    queryFn: () => inventoryReportsApi.movement(params),
});
export const useSlowFastMovers = (params = {}) => useQuery({
    queryKey: ['slowFastMovers', params],
    queryFn: () => inventoryReportsApi.slowFastMovers(params),
});
export const useLowStockReport = () => useQuery({
    queryKey: ['lowStockReport'],
    queryFn: inventoryReportsApi.lowStock,
});