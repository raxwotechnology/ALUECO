import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    departmentsApi, designationsApi, employeesApi, shiftsApi,
    attendanceApi, leavesApi, holidaysApi, salaryStructuresApi, payrollApi, leaveStructuresApi,
} from './hrApi';

const onErr = (err) => toast.error(err.response?.data?.message || 'Failed');
const invalidate = (qc, keys) => () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

// Departments
export const useDepartments = (filters = {}) => useQuery({ queryKey: ['departments', filters], queryFn: () => departmentsApi.list(filters) });
export const useCreateDepartment = () => { const qc = useQueryClient(); return useMutation({ mutationFn: departmentsApi.create, onSuccess: () => { invalidate(qc, ['departments'])(); toast.success('Department created'); }, onError: onErr }); };
export const useUpdateDepartment = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }) => departmentsApi.update(id, data), onSuccess: () => { invalidate(qc, ['departments'])(); toast.success('Updated'); }, onError: onErr }); };
export const useDeleteDepartment = () => { const qc = useQueryClient(); return useMutation({ mutationFn: departmentsApi.delete, onSuccess: () => { invalidate(qc, ['departments'])(); toast.success('Deleted'); }, onError: onErr }); };

// Designations
export const useDesignations = (filters = {}) => useQuery({ queryKey: ['designations', filters], queryFn: () => designationsApi.list(filters) });
export const useCreateDesignation = () => { const qc = useQueryClient(); return useMutation({ mutationFn: designationsApi.create, onSuccess: () => { invalidate(qc, ['designations'])(); toast.success('Created'); }, onError: onErr }); };
export const useUpdateDesignation = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }) => designationsApi.update(id, data), onSuccess: () => { invalidate(qc, ['designations'])(); toast.success('Updated'); }, onError: onErr }); };
export const useDeleteDesignation = () => { const qc = useQueryClient(); return useMutation({ mutationFn: designationsApi.delete, onSuccess: () => { invalidate(qc, ['designations'])(); toast.success('Deleted'); }, onError: onErr }); };

// Employees
export const useEmployees = (filters = {}) => useQuery({ queryKey: ['employees', filters], queryFn: () => employeesApi.list(filters), keepPreviousData: true });
export const useEmployee = (id) => useQuery({ queryKey: ['employee', id], queryFn: () => employeesApi.getById(id), enabled: !!id });
export const useCreateEmployee = () => { const qc = useQueryClient(); return useMutation({ mutationFn: employeesApi.create, onSuccess: () => { invalidate(qc, ['employees'])(); toast.success('Employee added'); }, onError: onErr }); };
export const useUpdateEmployee = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }) => employeesApi.update(id, data), onSuccess: () => { invalidate(qc, ['employees', 'employee'])(); toast.success('Updated'); }, onError: onErr }); };
export const useDeleteEmployee = () => { const qc = useQueryClient(); return useMutation({ mutationFn: employeesApi.delete, onSuccess: () => { invalidate(qc, ['employees'])(); toast.success('Terminated'); }, onError: onErr }); };

// Shifts
export const useShifts = () => useQuery({ queryKey: ['shifts'], queryFn: shiftsApi.list });
export const useCreateShift = () => { const qc = useQueryClient(); return useMutation({ mutationFn: shiftsApi.create, onSuccess: () => { invalidate(qc, ['shifts'])(); toast.success('Shift created'); }, onError: onErr }); };
export const useUpdateShift = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }) => shiftsApi.update(id, data), onSuccess: () => { invalidate(qc, ['shifts'])(); toast.success('Updated'); }, onError: onErr }); };
export const useDeleteShift = () => { const qc = useQueryClient(); return useMutation({ mutationFn: shiftsApi.delete, onSuccess: () => { invalidate(qc, ['shifts'])(); toast.success('Deleted'); }, onError: onErr }); };

// Attendance
export const useAttendance = (filters = {}) => useQuery({ queryKey: ['attendance', filters], queryFn: () => attendanceApi.list(filters), keepPreviousData: true });
export const useMarkAttendance = () => { const qc = useQueryClient(); return useMutation({ mutationFn: attendanceApi.mark, onSuccess: () => { invalidate(qc, ['attendance'])(); toast.success('Marked'); }, onError: onErr }); };
export const useBulkMarkAttendance = () => { const qc = useQueryClient(); return useMutation({ mutationFn: attendanceApi.bulkMark, onSuccess: (r) => { invalidate(qc, ['attendance'])(); toast.success(`Marked ${r.count} records`); }, onError: onErr }); };

// Leaves
export const useLeaves = (filters = {}) => useQuery({ queryKey: ['leaves', filters], queryFn: () => leavesApi.list(filters), keepPreviousData: true });
export const useCreateLeave = () => { const qc = useQueryClient(); return useMutation({ mutationFn: leavesApi.create, onSuccess: (r) => { invalidate(qc, ['leaves'])(); toast.success('Leave request submitted'); if (r.warning) toast(r.warning, { icon: '⚠️' }); }, onError: onErr }); };
export const useLeaveActions = () => {
    const qc = useQueryClient();
    return {
        approve: useMutation({ mutationFn: leavesApi.approve, onSuccess: () => { invalidate(qc, ['leaves', 'employees'])(); toast.success('Approved'); }, onError: onErr }),
        reject: useMutation({ mutationFn: ({ id, reason }) => leavesApi.reject(id, reason), onSuccess: () => { invalidate(qc, ['leaves'])(); toast.success('Rejected'); }, onError: onErr }),
        cancel: useMutation({ mutationFn: leavesApi.cancel, onSuccess: () => { invalidate(qc, ['leaves', 'employees'])(); toast.success('Cancelled'); }, onError: onErr }),
    };
};

// Holidays
export const useHolidays = (filters = {}) => useQuery({ queryKey: ['holidays', filters], queryFn: () => holidaysApi.list(filters) });
export const useCreateHoliday = () => { const qc = useQueryClient(); return useMutation({ mutationFn: holidaysApi.create, onSuccess: () => { invalidate(qc, ['holidays'])(); toast.success('Added'); }, onError: onErr }); };
export const useUpdateHoliday = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }) => holidaysApi.update(id, data), onSuccess: () => { invalidate(qc, ['holidays'])(); toast.success('Updated'); }, onError: onErr }); };
export const useDeleteHoliday = () => { const qc = useQueryClient(); return useMutation({ mutationFn: holidaysApi.delete, onSuccess: () => { invalidate(qc, ['holidays'])(); toast.success('Deleted'); }, onError: onErr }); };

// Salary Structures
export const useSalaryStructures = (filters = {}) => useQuery({ queryKey: ['salaryStructures', filters], queryFn: () => salaryStructuresApi.list(filters) });
export const useCreateSalaryStructure = () => { const qc = useQueryClient(); return useMutation({ mutationFn: salaryStructuresApi.create, onSuccess: () => { invalidate(qc, ['salaryStructures'])(); toast.success('Created'); }, onError: onErr }); };
export const useUpdateSalaryStructure = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }) => salaryStructuresApi.update(id, data), onSuccess: () => { invalidate(qc, ['salaryStructures'])(); toast.success('Updated'); }, onError: onErr }); };
export const useDeleteSalaryStructure = () => { const qc = useQueryClient(); return useMutation({ mutationFn: salaryStructuresApi.delete, onSuccess: () => { invalidate(qc, ['salaryStructures'])(); toast.success('Deleted'); }, onError: onErr }); };

// Payroll
export const usePayrolls = (filters = {}) => useQuery({ queryKey: ['payrolls', filters], queryFn: () => payrollApi.list(filters) });
export const usePayroll = (id) => useQuery({ queryKey: ['payroll', id], queryFn: () => payrollApi.getById(id), enabled: !!id });
export const useProcessPayroll = () => { const qc = useQueryClient(); return useMutation({ mutationFn: payrollApi.process, onSuccess: () => { invalidate(qc, ['payrolls'])(); toast.success('Payroll processed'); }, onError: onErr }); };
export const usePayrollActions = () => {
    const qc = useQueryClient();
    return {
        approve: useMutation({ mutationFn: payrollApi.approve, onSuccess: () => { invalidate(qc, ['payrolls', 'payroll'])(); toast.success('Approved'); }, onError: onErr }),
        markPaid: useMutation({ mutationFn: payrollApi.markPaid, onSuccess: () => { invalidate(qc, ['payrolls', 'payroll'])(); toast.success('Marked as paid'); }, onError: onErr }),
    };
};
export const usePayslip = (payrollId, employeeId) => useQuery({
    queryKey: ['payslip', payrollId, employeeId],
    queryFn: () => payrollApi.getPayslip(payrollId, employeeId),
    enabled: !!payrollId && !!employeeId,
});

// Leave Structures
export const useLeaveStructures = (filters = {}) => useQuery({ queryKey: ['leaveStructures', filters], queryFn: () => leaveStructuresApi.list(filters) });
export const useCreateLeaveStructure = () => { const qc = useQueryClient(); return useMutation({ mutationFn: leaveStructuresApi.create, onSuccess: () => { invalidate(qc, ['leaveStructures'])(); toast.success('Created'); }, onError: onErr }); };
export const useUpdateLeaveStructure = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }) => leaveStructuresApi.update(id, data), onSuccess: () => { invalidate(qc, ['leaveStructures'])(); toast.success('Updated'); }, onError: onErr }); };
export const useDeleteLeaveStructure = () => { const qc = useQueryClient(); return useMutation({ mutationFn: leaveStructuresApi.delete, onSuccess: () => { invalidate(qc, ['leaveStructures'])(); toast.success('Deleted'); }, onError: onErr }); };

// Self-Service hooks
export const useMyProfile = () => useQuery({ queryKey: ['myProfile'], queryFn: employeesApi.getMyProfile });
export const useMyPayslips = () => useQuery({ queryKey: ['myPayslips'], queryFn: payrollApi.getMyPayslips });