import api from '../../api/axios';

export const departmentsApi = {
    list: async (params = {}) => (await api.get('/hr/departments', { params })).data,
    create: async (data) => (await api.post('/hr/departments', data)).data,
    update: async (id, data) => (await api.put(`/hr/departments/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/hr/departments/${id}`)).data,
};

export const designationsApi = {
    list: async (params = {}) => (await api.get('/hr/designations', { params })).data,
    create: async (data) => (await api.post('/hr/designations', data)).data,
    update: async (id, data) => (await api.put(`/hr/designations/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/hr/designations/${id}`)).data,
};

export const employeesApi = {
    list: async (params = {}) => (await api.get('/hr/employees', { params })).data,
    getById: async (id) => (await api.get(`/hr/employees/${id}`)).data,
    getMyProfile: async () => (await api.get('/hr/employees/me')).data,
    create: async (data) => (await api.post('/hr/employees', data)).data,
    update: async (id, data) => (await api.put(`/hr/employees/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/hr/employees/${id}`)).data,
};

export const shiftsApi = {
    list: async () => (await api.get('/hr/shifts')).data,
    create: async (data) => (await api.post('/hr/shifts', data)).data,
    update: async (id, data) => (await api.put(`/hr/shifts/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/hr/shifts/${id}`)).data,
};

export const attendanceApi = {
    list: async (params = {}) => (await api.get('/hr/attendance', { params })).data,
    mark: async (data) => (await api.post('/hr/attendance', data)).data,
    bulkMark: async (data) => (await api.post('/hr/attendance/bulk', data)).data,
    importFromExcel: async (formData) => (await api.post('/hr/attendance/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })).data,
    importMonthlyFromExcel: async (formData) => (await api.post('/hr/attendance/import-monthly', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })).data,
};

export const leavesApi = {
    list: async (params = {}) => (await api.get('/hr/leaves', { params })).data,
    create: async (data) => (await api.post('/hr/leaves', data)).data,
    approve: async (id) => (await api.patch(`/hr/leaves/${id}/approve`)).data,
    reject: async (id, reason) => (await api.patch(`/hr/leaves/${id}/reject`, { reason })).data,
    cancel: async (id) => (await api.patch(`/hr/leaves/${id}/cancel`)).data,
};

export const leaveStructuresApi = {
    list: async (params = {}) => (await api.get('/hr/leave-structures', { params })).data,
    create: async (data) => (await api.post('/hr/leave-structures', data)).data,
    update: async (id, data) => (await api.put(`/hr/leave-structures/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/hr/leave-structures/${id}`)).data,
};

export const holidaysApi = {
    list: async (params = {}) => (await api.get('/hr/holidays', { params })).data,
    create: async (data) => (await api.post('/hr/holidays', data)).data,
    update: async (id, data) => (await api.put(`/hr/holidays/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/hr/holidays/${id}`)).data,
};

export const salaryStructuresApi = {
    list: async (params = {}) => (await api.get('/hr/salary-structures', { params })).data,
    create: async (data) => (await api.post('/hr/salary-structures', data)).data,
    update: async (id, data) => (await api.put(`/hr/salary-structures/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/hr/salary-structures/${id}`)).data,
};

export const payrollApi = {
    list: async (params = {}) => (await api.get('/payroll', { params })).data,
    getById: async (id) => (await api.get(`/payroll/${id}`)).data,
    process: async (data) => (await api.post('/payroll/process', data)).data,
    preview: async (data) => (await api.post('/payroll/preview', data)).data,
    approve: async (id) => (await api.patch(`/payroll/${id}/approve`)).data,
    markPaid: async (id) => (await api.patch(`/payroll/${id}/mark-paid`)).data,
    getPayslip: async (payrollId, employeeId) => (await api.get(`/payroll/${payrollId}/payslip/${employeeId}`)).data,
    getMyPayslips: async () => (await api.get('/payroll/my-payslips')).data,
};