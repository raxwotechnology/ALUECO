import axios from 'axios';
import { getApiUrl } from './config';

const api = axios.create({
    baseURL: getApiUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach JWT token and global date filter to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Apply global date filter if enabled
        const dateFilterEnabled = localStorage.getItem('dateFilterEnabled') === 'true';
        if (dateFilterEnabled && config.method === 'get') {
            const filterMonth = localStorage.getItem('filterMonth');
            const filterYear = localStorage.getItem('filterYear');

            if (filterMonth && filterYear && filterMonth !== 'ALL') {
                const year = parseInt(filterYear);
                const month = parseInt(filterMonth); // 1-indexed (Jan = 1)

                // Calculate start and end dates in UTC
                const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)).toISOString();
                const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

                // Paths that support date-range filtering
                const filterablePaths = [
                    '/sales-orders', '/purchase-orders', '/invoices', '/bills', 
                    '/payments', '/petty-cash', '/production-batches', '/grns', 
                    '/farm-harvests', '/damages', '/repairs', '/crm/inquiries', 
                    '/crm/quotations', '/attendance', '/payroll', '/audit-logs'
                ];

                const isFilterable = filterablePaths.some(path => config.url.includes(path));

                if (isFilterable) {
                    config.params = config.params || {};
                    // Only apply global filter if the specific request hasn't set custom date parameters
                    if (!config.params.startDate) config.params.startDate = startDate;
                    if (!config.params.endDate) config.params.endDate = endDate;
                }
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 401 (token expired/invalid) globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('auth-storage'); // Reset Zustand persisted auth state
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;