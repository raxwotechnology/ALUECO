import api from '../../api/axios';

export const dashboardApi = {
    kpis: async () => (await api.get('/reports/dashboard/kpis')).data,
    revenueChart: async (months = 6) => (await api.get('/reports/dashboard/revenue-chart', { params: { months } })).data,
    topProducts: async (params = {}) => (await api.get('/reports/dashboard/top-products', { params })).data,
    topCustomers: async (params = {}) => (await api.get('/reports/dashboard/top-customers', { params })).data,
};

export const salesReportsApi = {
    summary: async (params = {}) => (await api.get('/reports/sales/summary', { params })).data,
    byProduct: async (params = {}) => (await api.get('/reports/sales/by-product', { params })).data,
    byCustomer: async (params = {}) => (await api.get('/reports/sales/by-customer', { params })).data,
    trend: async (params = {}) => (await api.get('/reports/sales/trend', { params })).data,
};

export const inventoryReportsApi = {
    valuation: async (params = {}) => (await api.get('/reports/inventory/valuation', { params })).data,
    movement: async (params = {}) => (await api.get('/reports/inventory/movement', { params })).data,
    slowFastMovers: async (params = {}) => (await api.get('/reports/inventory/slow-fast-movers', { params })).data,
    lowStock: async () => (await api.get('/reports/inventory/low-stock')).data,
};

export const productionReportsApi = {
    summary: async (params = {}) => (await api.get('/reports/production/summary', { params })).data,
    byProduct: async (params = {}) => (await api.get('/reports/production/by-product', { params })).data,
    wastage: async (params = {}) => (await api.get('/reports/production/wastage', { params })).data,
};

export const returnsReportsApi = {
    summary: async (params = {}) => (await api.get('/reports/returns/summary', { params })).data,
    damages: async (params = {}) => (await api.get('/reports/damages/summary', { params })).data,
};

export const financialReportsApi = {
    snapshot: async (params = {}) => (await api.get('/reports/financial/snapshot', { params })).data,
    targets: async () => (await api.get('/reports/financial/targets')).data,
    setTarget: async (data) => (await api.post('/reports/financial/targets', data)).data,
    variance: async (params = {}) => (await api.get('/reports/financial/variance', { params })).data,
    comparison: async (params = {}) => (await api.get('/reports/financial/comparison', { params })).data,
};

export const hrReportsApi = {
    headcount: async () => (await api.get('/reports/hr/headcount')).data,
    attendance: async (params = {}) => (await api.get('/reports/hr/attendance-summary', { params })).data,
    leavePatterns: async (params = {}) => (await api.get('/reports/hr/leave-patterns', { params })).data,
    payrollSummary: async (params = {}) => (await api.get('/reports/hr/payroll-summary', { params })).data,
    shiftWise: async (params = {}) => (await api.get('/reports/hr/shift-wise', { params })).data,
};