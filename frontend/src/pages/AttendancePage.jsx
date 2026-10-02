import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
    Plus, Calendar as CalendarIcon, Upload, CheckCircle2,
    AlertCircle, FileSpreadsheet, Eye, ChevronDown, ChevronUp,
    Search, UserPlus, Users, ArrowLeft, RefreshCw, FileCheck,
    DollarSign, Play, Clock, CalendarDays, History, Sparkles,
    Check, Filter, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import {
    useAttendance,
    useBulkMarkAttendance,
    useEmployees,
    useDepartments,
    useMonthlyAttendanceSummary,
    useUploadedAttendanceMonths
} from '../features/hr/useHr';
import { attendanceApi, employeesApi } from '../features/hr/hrApi';
import { parseAttendanceFileInBrowser } from '../utils/attendanceExcelParser';

const monthsList = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const statusVariant = {
    present: 'success', absent: 'danger', half_day: 'warning',
    leave: 'info', holiday: 'default', weekend: 'default', late: 'warning',
    P: 'success', A: 'danger', WO: 'default', POW: 'warning', 'AL-AL': 'info', HL: 'warning', L: 'info',
};

const formatStatusLabel = (status) => {
    switch (status) {
        case 'P': return 'Present';
        case 'A': return 'Absent';
        case 'WO': return 'Weekly Off';
        case 'POW': return 'Present (Off Day)';
        case 'AL-AL': return 'Annual Leave';
        case 'HL': return 'Half Day';
        case 'L': return 'Leave';
        default: return status?.replace(/_/g, ' ') || '—';
    }
};

export default function AttendancePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // View Mode: 'monthly' (Monthly Reports & Summary) or 'daily' (Day-by-Day Attendance)
    const [viewMode, setViewMode] = useState('monthly');

    // Date filters for Daily View
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [departmentId, setDepartmentId] = useState('');

    // Period filters for Monthly View
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [monthlySearch, setMonthlySearch] = useState('');
    const [monthlyFilter, setMonthlyFilter] = useState('all'); // 'all' | 'ot' | 'no-salary'
    const [expandedMonthlyCode, setExpandedMonthlyCode] = useState(null);

    // Queries
    const { data: attData } = useAttendance({ date: selectedDate, departmentId: departmentId || undefined, limit: 200 });
    const { data: empData } = useEmployees({ departmentId: departmentId || undefined, status: 'active', limit: 500 });
    const { data: deptsData } = useDepartments();
    const { data: uploadedMonthsData, isLoading: isMonthsLoading } = useUploadedAttendanceMonths();
    const { data: monthlySummaryData, isLoading: isMonthlyLoading } = useMonthlyAttendanceSummary({
        month: selectedMonth,
        year: selectedYear,
        departmentId: departmentId || undefined,
    });
    const { data: rawMonthAttData } = useAttendance({
        month: selectedMonth,
        year: selectedYear,
        departmentId: departmentId || undefined,
        limit: 2000,
    });
    const { data: allAttendanceData } = useAttendance({ limit: 5000 });

    const bulkMark = useBulkMarkAttendance();

    const attendance = attData?.data || [];
    const employees = empData?.data || [];
    const depts = deptsData?.data || [];
    const deptOptions = depts.map((d) => ({ value: d._id, label: d.name }));

    const formatMins = (mins) => {
        if (!mins || mins <= 0) return '00:00';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}:${String(m).padStart(2, '0')}`;
    };

    // Robust fallback uploaded months from attendance collection
    const fallbackUploadedMonths = React.useMemo(() => {
        const records = allAttendanceData?.data || [];
        if (records.length === 0) return [];
        const map = new Map();
        for (const r of records) {
            let m = r.month;
            let y = r.year;
            if (!m && r.date) {
                const d = new Date(r.date);
                m = d.getMonth() + 1;
                y = d.getFullYear();
            }
            if (m && y) {
                const key = `${y}-${m}`;
                if (!map.has(key)) {
                    map.set(key, {
                        month: m,
                        year: y,
                        totalRecords: 0,
                        employeeSet: new Set(),
                        monthName: `${monthsList.find(ml => ml.value === m)?.label || ''} ${y}`,
                    });
                }
                const item = map.get(key);
                item.totalRecords++;
                if (r.employeeId) item.employeeSet.add(typeof r.employeeId === 'object' ? r.employeeId._id : r.employeeId);
                else if (r.employeeCode) item.employeeSet.add(r.employeeCode);
            }
        }
        return Array.from(map.values()).map(v => ({
            month: v.month,
            year: v.year,
            totalRecords: v.totalRecords,
            employeeCount: v.employeeSet.size,
            monthName: v.monthName,
        })).sort((a, b) => b.year - a.year || b.month - a.month);
    }, [allAttendanceData]);

    const uploadedMonths = (uploadedMonthsData?.data && uploadedMonthsData.data.length > 0)
        ? uploadedMonthsData.data
        : fallbackUploadedMonths;

    // Robust fallback monthly summary from raw month attendance
    const fallbackSummary = React.useMemo(() => {
        const records = rawMonthAttData?.data || [];
        if (records.length === 0) return { employees: [], overallSummary: {} };

        const empMap = new Map();
        for (const rec of records) {
            const emp = typeof rec.employeeId === 'object' ? rec.employeeId : employees.find(e => e._id === rec.employeeId);
            const empCode = rec.employeeCode || emp?.employeeCode || 'Unknown';
            const empKey = emp?._id ? emp._id.toString() : empCode;

            if (!empMap.has(empKey)) {
                const fullName = emp?.fullName || (emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : (rec.employeeName || 'Staff'));
                const desig = emp?.designationId?.name || emp?.designation || 'Staff';
                const dept = emp?.departmentId?.name || 'General';
                const basic = emp?.basicSalary || 0;

                empMap.set(empKey, {
                    employeeId: emp?._id || null,
                    employeeCode: empCode,
                    employeeName: fullName,
                    designation: desig,
                    department: dept,
                    basicSalary: basic,
                    hasSalaryConfigured: basic > 0,
                    daysPresent: 0,
                    daysAbsent: 0,
                    halfDays: 0,
                    leaveDays: 0,
                    weeklyOffs: 0,
                    totalWorkedMinutes: 0,
                    overtimeMinutes: 0,
                    lateMinutes: 0,
                    dailyRecords: [],
                });
            }

            const data = empMap.get(empKey);
            const s = String(rec.status || '').trim().toLowerCase();

            if (['p', 'pow', 'present', 'late'].includes(s)) {
                data.daysPresent++;
            } else if (['a', 'absent'].includes(s)) {
                data.daysAbsent++;
            } else if (['hl', 'half_day'].includes(s)) {
                data.halfDays++;
            } else if (['wo', 'weekly_off', 'weekend'].includes(s)) {
                data.weeklyOffs++;
            } else if (['al-al', 'leave', 'l'].includes(s)) {
                data.leaveDays++;
            }

            data.totalWorkedMinutes += rec.totalWorkedMinutes || 0;
            data.overtimeMinutes += rec.overtimeMinutes || 0;
            data.lateMinutes += rec.lateMinutes || 0;

            const dayNum = rec.date ? new Date(rec.date).getDate() : null;
            data.dailyRecords.push({
                day: dayNum,
                date: rec.date,
                status: rec.status,
                arrivalTime: rec.arrivalTime,
                departureTime: rec.departureTime,
                workingHours: rec.workingHours || formatMins(rec.totalWorkedMinutes),
                overtimeHours: rec.overtimeHours || formatMins(rec.overtimeMinutes),
                totalWorkedMinutes: rec.totalWorkedMinutes || 0,
                overtimeMinutes: rec.overtimeMinutes || 0,
            });
        }

        const emps = Array.from(empMap.values()).map(e => ({
            ...e,
            workingHours: formatMins(e.totalWorkedMinutes),
            overtimeHours: formatMins(e.overtimeMinutes),
            lateHours: formatMins(e.lateMinutes),
        }));

        let totalPresent = 0;
        let totalAbsent = 0;
        let totalWorkedMins = 0;
        let totalOvertimeMins = 0;
        emps.forEach(e => {
            totalPresent += e.daysPresent;
            totalAbsent += e.daysAbsent;
            totalWorkedMins += e.totalWorkedMinutes;
            totalOvertimeMins += e.overtimeMinutes;
        });

        return {
            employees: emps,
            period: {
                month: selectedMonth,
                year: selectedYear,
                monthName: `${monthsList.find(m => m.value === Number(selectedMonth))?.label} ${selectedYear}`,
                daysInMonth: new Date(selectedYear, selectedMonth, 0).getDate(),
            },
            overallSummary: {
                totalEmployees: emps.length,
                totalRecords: records.length,
                totalPresent,
                totalAbsent,
                totalWorkingHours: formatMins(totalWorkedMins),
                totalOvertimeHours: formatMins(totalOvertimeMins),
            }
        };
    }, [rawMonthAttData, employees, selectedMonth, selectedYear]);

    const monthlySummary = (monthlySummaryData?.employees && monthlySummaryData.employees.length > 0)
        ? monthlySummaryData
        : fallbackSummary;
    const monthlyEmployees = monthlySummary.employees || [];

    // Automatically synchronize selectedMonth & selectedYear with latest uploaded report if current selection has 0 records
    useEffect(() => {
        if (uploadedMonths.length > 0) {
            const hasDataInCurrent = uploadedMonths.some(m => m.month === Number(selectedMonth) && m.year === Number(selectedYear));
            if (!hasDataInCurrent) {
                const latest = uploadedMonths[0];
                setSelectedMonth(latest.month);
                setSelectedYear(latest.year);
            }
        }
    }, [uploadedMonths]);

    // Bulk mark state
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [bulkRecords, setBulkRecords] = useState([]);

    const formatDateTimeLocal = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const openBulk = () => {
        const attMap = new Map();
        attendance.forEach((a) => {
            if (a.employeeId) {
                const id = typeof a.employeeId === 'object' ? a.employeeId._id : a.employeeId;
                if (id) attMap.set(id.toString(), a);
            }
        });

        const records = employees.map((e) => {
            const existing = attMap.get(e._id.toString());
            return {
                employeeId: e._id,
                employeeName: `${e.firstName} ${e.lastName}`,
                status: existing?.status || 'present',
                checkInTime: existing?.checkInTime ? formatDateTimeLocal(existing.checkInTime) : `${selectedDate}T08:00`,
                checkOutTime: existing?.checkOutTime ? formatDateTimeLocal(existing.checkOutTime) : `${selectedDate}T17:00`,
            };
        });
        setBulkRecords(records);
        setIsBulkOpen(true);
    };

    const submitBulk = async () => {
        try {
            await bulkMark.mutateAsync({
                date: selectedDate,
                records: bulkRecords.map((r) => ({
                    employeeId: r.employeeId,
                    status: r.status,
                    checkInTime: ['present', 'late', 'half_day'].includes(r.status) && r.checkInTime ? r.checkInTime : undefined,
                    checkOutTime: ['present', 'late', 'half_day'].includes(r.status) && r.checkOutTime ? r.checkOutTime : undefined,
                })),
            });
            setIsBulkOpen(false);
        } catch { }
    };

    // Excel Import & Preview State
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [autoCreateEmployees, setAutoCreateEmployees] = useState(true);
    const [previewSearch, setPreviewSearch] = useState('');
    const [previewFilter, setPreviewFilter] = useState('all');
    const [expandedEmployeeCode, setExpandedEmployeeCode] = useState(null);

    // Target Month and Year Selection for Import
    const [targetImportMonth, setTargetImportMonth] = useState(selectedMonth || new Date().getMonth() + 1);
    const [targetImportYear, setTargetImportYear] = useState(selectedYear || new Date().getFullYear());

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setImportFile(file);
            await triggerPreview(file);
        }
    };

    const triggerPreview = async (file) => {
        setIsPreviewing(true);
        try {
            let res = null;
            // 1. Try backend preview API
            try {
                const formData = new FormData();
                formData.append('file', file);
                if (selectedDate) formData.append('date', selectedDate);
                res = await attendanceApi.previewExcel(formData);
            } catch (backendErr) {
                console.warn('Backend preview not reachable or returned error, parsing in browser:', backendErr);
                res = await parseAttendanceFileInBrowser(file, employees, {
                    targetMonth: targetImportMonth,
                    targetYear: targetImportYear,
                });
            }

            if (res && res.success) {
                setPreviewData(res);
                if (res.period?.month) setTargetImportMonth(res.period.month);
                if (res.period?.year) setTargetImportYear(res.period.year);
                setExpandedEmployeeCode(null);
                setPreviewSearch('');
                setPreviewFilter('all');
            } else {
                toast.error(res?.message || 'Could not parse attendance sheet');
            }
        } catch (err) {
            toast.error(err.message || 'Failed to preview Excel file');
            console.error(err);
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!importFile) {
            toast.error('Please select an Excel file');
            return;
        }

        setIsImporting(true);
        try {
            let preCreatedCount = 0;
            if (autoCreateEmployees && previewData?.employees) {
                const missing = previewData.employees.filter((e) => !e.isRegistered);
                for (const emp of missing) {
                    try {
                        const clean = String(emp.employeeCode || '').trim();
                        const proposedCode = isNaN(clean) ? clean : `EMP-${clean.padStart(3, '0')}`;
                        const alreadyExists = employees.some(e => e.employeeCode === proposedCode || e.employeeCode === clean);
                        if (!alreadyExists) {
                            await employeesApi.create({
                                employeeCode: proposedCode,
                                firstName: emp.employeeName || `Staff ${emp.employeeCode}`,
                                displayName: emp.employeeName,
                                status: 'active',
                                employmentType: 'permanent',
                            });
                            preCreatedCount++;
                        }
                    } catch (e) {
                        // ignore if already created
                    }
                }
                if (preCreatedCount > 0) {
                    await queryClient.invalidateQueries({ queryKey: ['employees'] });
                }
            }

            const formData = new FormData();
            formData.append('file', importFile);
            formData.append('autoCreateEmployees', autoCreateEmployees);
            formData.append('targetMonth', targetImportMonth);
            formData.append('targetYear', targetImportYear);
            if (selectedDate) {
                formData.append('date', selectedDate);
            }

            const result = await attendanceApi.importFromExcel(formData);

            if (result.success) {
                const totalCreated = Math.max(result.createdEmployees || 0, preCreatedCount);
                const finalMonth = targetImportMonth;
                const finalYear = targetImportYear;
                const monthName = monthsList.find(m => m.value === Number(finalMonth))?.label || '';

                let msg = `Successfully imported ${result.imported} records for ${monthName} ${finalYear}!`;
                if (totalCreated > 0) {
                    msg += ` (${totalCreated} new staff registered)`;
                }
                toast.success(msg);

                if (result.errors > 0) {
                    toast.warning(`${result.errors} records skipped`);
                }

                // Switch view to monthly and set to imported month
                setSelectedMonth(Number(finalMonth));
                setSelectedYear(Number(finalYear));
                setViewMode('monthly');

                await queryClient.invalidateQueries({ queryKey: ['attendance'] });
                await queryClient.invalidateQueries({ queryKey: ['employees'] });

                setIsImportOpen(false);
                setImportFile(null);
                setPreviewData(null);
                setExpandedEmployeeCode(null);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to import attendance');
            console.error(error);
        } finally {
            setIsImporting(false);
        }
    };

    // Filter preview employees
    const filteredPreviewMonthly = (previewData?.employees || []).filter((emp) => {
        if (previewFilter === 'unregistered' && emp.isRegistered) return false;
        if (previewFilter === 'registered' && !emp.isRegistered) return false;
        if (!previewSearch) return true;
        const q = previewSearch.toLowerCase();
        const code = String(emp.employeeCode || '').toLowerCase();
        const name = String(emp.employeeName || '').toLowerCase();
        const desig = String(emp.designation || '').toLowerCase();
        return code.includes(q) || name.includes(q) || desig.includes(q);
    });

    const filteredPreviewDaily = (previewData?.records || []).filter((r) => {
        if (previewFilter === 'unregistered' && r.isRegistered) return false;
        if (previewFilter === 'registered' && !r.isRegistered) return false;
        if (!previewSearch) return true;
        const q = previewSearch.toLowerCase();
        const code = String(r.employeeCode || '').toLowerCase();
        const name = String(r.employeeName || '').toLowerCase();
        return code.includes(q) || name.includes(q);
    });

    // Filter for Monthly Summary Table
    const filteredMonthlyList = monthlyEmployees.filter((emp) => {
        if (monthlyFilter === 'ot' && (!emp.overtimeMinutes || emp.overtimeMinutes <= 0)) return false;
        if (monthlyFilter === 'no-salary' && emp.hasSalaryConfigured) return false;
        if (!monthlySearch) return true;
        const q = monthlySearch.toLowerCase();
        const code = String(emp.employeeCode || '').toLowerCase();
        const name = String(emp.employeeName || '').toLowerCase();
        const desig = String(emp.designation || '').toLowerCase();
        return code.includes(q) || name.includes(q) || desig.includes(q);
    });

    // Daily Table Columns
    const dailyColumns = [
        {
            key: 'employee', label: 'Employee', render: (r) => (
                <div>
                    <p className="font-medium text-sm">{r.employeeName}</p>
                    <p className="text-xs font-mono text-gray-500">{r.employeeCode}</p>
                </div>
            )
        },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status] || 'default'}>{formatStatusLabel(r.status)}</Badge> },
        { key: 'checkIn', label: 'Check In', render: (r) => r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : (r.arrivalTime || '—') },
        { key: 'checkOut', label: 'Check Out', render: (r) => r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : (r.departureTime || '—') },
        { key: 'worked', label: 'Worked', render: (r) => r.workingHours && r.workingHours !== '00:00' ? `${r.workingHours} hrs` : (r.totalWorkedMinutes ? `${(r.totalWorkedMinutes / 60).toFixed(1)} hrs` : '—') },
        { key: 'late', label: 'Late', render: (r) => r.lateMinutes > 0 ? `${r.lateMinutes} min` : '—' },
        { key: 'ot', label: 'OT', render: (r) => r.overtimeHours && r.overtimeHours !== '00:00' ? `${r.overtimeHours} hrs` : (r.overtimeMinutes > 0 ? `${(r.overtimeMinutes / 60).toFixed(1)} hrs` : '—') },
    ];

    const currentMonthLabel = monthsList.find(m => m.value === Number(selectedMonth))?.label || 'Selected Month';

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <PageHeader
                title="Attendance & Biometric Reports"
                description="Manage daily check-ins, monthly biometric performance sheets, and sync attendance with payroll."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsImportOpen(true);
                                setPreviewData(null);
                                setImportFile(null);
                                setExpandedEmployeeCode(null);
                                setTargetImportMonth(selectedMonth);
                                setTargetImportYear(selectedYear);
                            }}
                        >
                            <Upload size={16} className="mr-1.5" /> Import Excel Sheet
                        </Button>
                        <Button variant="primary" onClick={openBulk}>
                            <Plus size={16} className="mr-1.5" /> Bulk Mark Daily
                        </Button>
                    </div>
                }
            />

            {/* View Mode Switcher Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs">
                <div className="inline-flex p-1 bg-gray-100 rounded-lg text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => setViewMode('monthly')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition ${viewMode === 'monthly' ? 'bg-white text-primary-950 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <CalendarDays size={15} className={viewMode === 'monthly' ? 'text-primary-600' : 'text-gray-400'} />
                        Monthly Summary & Reports
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${viewMode === 'monthly' ? 'bg-primary-100 text-primary-800' : 'bg-gray-200 text-gray-700'}`}>
                            {uploadedMonths.length}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('daily')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition ${viewMode === 'daily' ? 'bg-white text-primary-950 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Clock size={15} className={viewMode === 'daily' ? 'text-primary-600' : 'text-gray-400'} />
                        Daily Attendance View
                    </button>
                </div>

                {/* Quick Process Payroll Button */}
                {viewMode === 'monthly' && (
                    <Button
                        variant="primary"
                        onClick={() => navigate(`/payroll?month=${selectedMonth}&year=${selectedYear}`)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                        <DollarSign size={15} className="mr-1" />
                        Process {currentMonthLabel} {selectedYear} Payroll
                    </Button>
                )}
            </div>

            {/* ════════════════════════════════════════════════════════════════════
                VIEW MODE 1: MONTHLY ATTENDANCE & PAYROLL INTEGRATION
            ════════════════════════════════════════════════════════════════════ */}
            {viewMode === 'monthly' && (
                <div className="space-y-4">
                    {/* Month, Year, and Department Controls */}
                    <Card>
                        <div className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b bg-gray-50/50">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Period:
                                </span>
                                <div className="w-36">
                                    <Select
                                        options={monthsList}
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    />
                                </div>
                                <div className="w-24">
                                    <Input
                                        type="number"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    />
                                </div>
                                <div className="w-48">
                                    <Select
                                        placeholder="All Departments"
                                        options={deptOptions}
                                        value={departmentId}
                                        onChange={(e) => setDepartmentId(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsImportOpen(true);
                                        setTargetImportMonth(selectedMonth);
                                        setTargetImportYear(selectedYear);
                                    }}
                                >
                                    <Upload size={14} className="mr-1" /> Upload Sheet for this Month
                                </Button>
                            </div>
                        </div>

                        {/* History Chips of Uploaded Monthly Reports */}
                        <div className="p-3.5 bg-white border-b flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs">
                            <span className="font-semibold text-gray-500 flex items-center gap-1.5 flex-shrink-0">
                                <History size={14} className="text-primary-600" />
                                Uploaded Monthly Reports:
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
                                {uploadedMonths.length === 0 ? (
                                    <span className="text-gray-400 italic text-[11px]">
                                        No monthly reports uploaded yet. Click 'Upload Sheet' to import your biometric Excel report.
                                    </span>
                                ) : (
                                    uploadedMonths.map((m) => {
                                        const isCurrent = Number(selectedMonth) === m.month && Number(selectedYear) === m.year;
                                        return (
                                            <button
                                                key={`${m.year}-${m.month}`}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedMonth(m.month);
                                                    setSelectedYear(m.year);
                                                }}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
                                                    isCurrent
                                                        ? 'bg-primary-600 text-white font-bold shadow-xs ring-2 ring-primary-300'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium'
                                                }`}
                                            >
                                                <span>{m.monthName}</span>
                                                <span className={`text-[10px] px-1 py-0.2 rounded-full ${isCurrent ? 'bg-primary-700 text-primary-100' : 'bg-white text-gray-600'}`}>
                                                    {m.employeeCount} Staff ({m.totalRecords} logs)
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Summary KPI Cards for Selected Month */}
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 bg-gray-50/30">
                            <div className="p-3 bg-white border rounded-xl shadow-xs">
                                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Report Month</p>
                                <p className="text-base font-bold text-gray-900 mt-0.5 truncate">
                                    {currentMonthLabel} {selectedYear}
                                </p>
                                <p className="text-[11px] text-gray-400">
                                    {monthlySummary.period?.daysInMonth || 31} Days in month
                                </p>
                            </div>

                            <div className="p-3 bg-white border rounded-xl shadow-xs">
                                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Staff</p>
                                <p className="text-base font-bold text-gray-900 mt-0.5">
                                    {monthlySummary.overallSummary?.totalEmployees || 0} Staff
                                </p>
                                <p className="text-[11px] text-gray-400">
                                    {monthlySummary.overallSummary?.totalRecords || 0} Total logs
                                </p>
                            </div>

                            <div className="p-3 bg-white border rounded-xl shadow-xs">
                                <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Present Days</p>
                                <p className="text-base font-bold text-emerald-900 mt-0.5">
                                    {monthlySummary.overallSummary?.totalPresent || 0} Days
                                </p>
                                <p className="text-[11px] text-rose-600">
                                    {monthlySummary.overallSummary?.totalAbsent || 0} Absent days
                                </p>
                            </div>

                            <div className="p-3 bg-white border rounded-xl shadow-xs">
                                <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Total Overtime (OT)</p>
                                <p className="text-base font-bold text-amber-900 mt-0.5 font-mono">
                                    {monthlySummary.overallSummary?.totalOvertimeHours || '00:00'} hrs
                                </p>
                                <p className="text-[11px] text-gray-500">
                                    Work: {monthlySummary.overallSummary?.totalWorkingHours || '00:00'} hrs
                                </p>
                            </div>

                            <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl shadow-xs flex flex-col justify-between">
                                <div>
                                    <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                                        <Sparkles size={12} className="text-emerald-600" />
                                        Payroll Ready
                                    </p>
                                    <p className="text-xs font-semibold text-emerald-800 mt-1">
                                        {monthlyEmployees.filter(e => e.hasSalaryConfigured).length} of {monthlyEmployees.length} staff configured
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/payroll?month=${selectedMonth}&year=${selectedYear}`)}
                                    className="mt-2 text-left text-[11px] font-bold text-emerald-950 underline hover:text-emerald-800 flex items-center gap-1"
                                >
                                    Open in Payroll <ArrowRight size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Search and Filters Bar */}
                        <div className="p-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                            <div className="inline-flex p-1 bg-gray-100 rounded-lg text-xs font-medium">
                                <button
                                    type="button"
                                    onClick={() => setMonthlyFilter('all')}
                                    className={`px-3 py-1 rounded-md transition ${monthlyFilter === 'all' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    All Staff ({monthlyEmployees.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMonthlyFilter('ot')}
                                    className={`px-3 py-1 rounded-md transition ${monthlyFilter === 'ot' ? 'bg-white text-amber-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    With Overtime ({monthlyEmployees.filter(e => e.overtimeMinutes > 0).length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMonthlyFilter('no-salary')}
                                    className={`px-3 py-1 rounded-md transition ${monthlyFilter === 'no-salary' ? 'bg-white text-rose-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    No Salary Configured ({monthlyEmployees.filter(e => !e.hasSalaryConfigured).length})
                                </button>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by code, name, designation..."
                                    value={monthlySearch}
                                    onChange={(e) => setMonthlySearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>

                        {/* Monthly Summary Table */}
                        {isMonthlyLoading ? (
                            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                                <RefreshCw className="animate-spin text-primary-600" size={24} />
                                <p className="text-xs font-medium">Loading monthly attendance records...</p>
                            </div>
                        ) : filteredMonthlyList.length === 0 ? (
                            <div className="p-12 text-center">
                                <EmptyState
                                    icon={CalendarIcon}
                                    title={`No attendance logs for ${currentMonthLabel} ${selectedYear}`}
                                    description={
                                        uploadedMonths.length > 0
                                            ? `There are no logs for ${currentMonthLabel} ${selectedYear}. However, attendance records exist for ${uploadedMonths.map(m => m.monthName).join(', ')}.`
                                            : "Upload your biometric Monthly Performance Report to view 31-day records and calculate salaries."
                                    }
                                    action={
                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                            {uploadedMonths.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedMonth(uploadedMonths[0].month);
                                                        setSelectedYear(uploadedMonths[0].year);
                                                    }}
                                                    className="border-primary-300 text-primary-700 bg-primary-50 hover:bg-primary-100 font-semibold"
                                                >
                                                    <CalendarCheck size={15} className="mr-1.5 text-primary-600" />
                                                    View {uploadedMonths[0].monthName} ({uploadedMonths[0].totalRecords} logs)
                                                </Button>
                                            )}
                                            <Button
                                                variant="primary"
                                                onClick={() => {
                                                    setIsImportOpen(true);
                                                    setTargetImportMonth(selectedMonth);
                                                    setTargetImportYear(selectedYear);
                                                }}
                                            >
                                                <Upload size={15} className="mr-1.5" />
                                                Import Excel for {currentMonthLabel}
                                            </Button>
                                        </div>
                                    }
                                />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider border-b">
                                        <tr>
                                            <th className="py-2.5 px-3">Code</th>
                                            <th className="py-2.5 px-3">Employee Name</th>
                                            <th className="py-2.5 px-3">Designation</th>
                                            <th className="py-2.5 px-3 text-center">Present</th>
                                            <th className="py-2.5 px-3 text-center">Absent</th>
                                            <th className="py-2.5 px-3 text-center">Leave / WO</th>
                                            <th className="py-2.5 px-3 text-right">Worked Hrs</th>
                                            <th className="py-2.5 px-3 text-right">OT Hrs</th>
                                            <th className="py-2.5 px-3">Payroll & Salary Status</th>
                                            <th className="py-2.5 px-3 text-center">31-Day Log</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {filteredMonthlyList.map((emp) => {
                                            const isExpanded = expandedMonthlyCode === emp.employeeCode;
                                            return (
                                                <React.Fragment key={emp.employeeCode}>
                                                    <tr className="hover:bg-gray-50/80 transition">
                                                        <td className="py-2.5 px-3 font-mono font-bold text-gray-800">
                                                            #{emp.employeeCode}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="font-semibold text-gray-900">{emp.employeeName}</div>
                                                            <div className="text-[10px] text-gray-400">{emp.department || 'General'}</div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-gray-600">
                                                            {emp.designation || 'Staff'}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            <Badge variant="success">{emp.daysPresent} days</Badge>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            {emp.daysAbsent > 0 ? (
                                                                <Badge variant="danger">{emp.daysAbsent} days</Badge>
                                                            ) : (
                                                                <span className="text-gray-400">0</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center text-gray-600">
                                                            <span>{emp.leaveDays || 0} L</span> / <span className="text-gray-400">{emp.weeklyOffs || 0} WO</span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-medium text-gray-900">
                                                            {emp.workingHours || '00:00'}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                                                            {emp.overtimeHours && emp.overtimeHours !== '00:00' ? (
                                                                <span className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                                    +{emp.overtimeHours}
                                                                </span>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            {emp.hasSalaryConfigured ? (
                                                                <div>
                                                                    <div className="text-[11px] font-semibold text-gray-800">
                                                                        Basic: LKR {Number(emp.basicSalary).toLocaleString()}
                                                                    </div>
                                                                    {emp.overtimeMinutes > 0 && (
                                                                        <div className="text-[10px] font-semibold text-emerald-700">
                                                                            + Est. OT: LKR {Math.round((emp.basicSalary / 200) * 1.5 * (emp.overtimeMinutes / 60)).toLocaleString()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">
                                                                    <AlertCircle size={12} />
                                                                    No Basic Salary
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedMonthlyCode(isExpanded ? null : emp.employeeCode)}
                                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${isExpanded ? 'bg-primary-600 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                                            >
                                                                <Eye size={12} />
                                                                <span>{isExpanded ? 'Hide' : '31 Days'}</span>
                                                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded 31-Day Biometric Log Matrix */}
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={10} className="p-3 bg-gray-50/90 border-b border-t border-gray-200">
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                                                            <CalendarIcon size={14} className="text-primary-600" />
                                                                            {currentMonthLabel} {selectedYear} Daily Biometric Log — {emp.employeeName} (#{emp.employeeCode})
                                                                        </p>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => navigate(`/payroll?month=${selectedMonth}&year=${selectedYear}`)}
                                                                            className="text-xs font-semibold text-primary-700 hover:underline flex items-center gap-1"
                                                                        >
                                                                            Calculate in Payroll →
                                                                        </button>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-10 gap-2 max-h-60 overflow-y-auto p-1">
                                                                        {(emp.dailyRecords || []).map((d) => (
                                                                            <div
                                                                                key={d.day || d.date}
                                                                                className={`p-2 rounded-lg border text-xs flex flex-col justify-between ${
                                                                                    d.status === 'P' || d.status === 'present' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' :
                                                                                    d.status === 'A' || d.status === 'absent' ? 'bg-rose-50/70 border-rose-200 text-rose-900' :
                                                                                    d.status === 'WO' || d.status === 'weekend' ? 'bg-gray-100 border-gray-300 text-gray-400' :
                                                                                    d.status === 'POW' ? 'bg-amber-50/70 border-amber-200 text-amber-900' :
                                                                                    'bg-blue-50/70 border-blue-200 text-blue-900'
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                                                                                    <span>Day {String(d.day || '').padStart(2, '0')}</span>
                                                                                    <span className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                                                                                        d.status === 'P' ? 'bg-emerald-200 text-emerald-800' :
                                                                                        d.status === 'A' ? 'bg-rose-200 text-rose-800' :
                                                                                        d.status === 'WO' ? 'bg-gray-200 text-gray-600' :
                                                                                        'bg-amber-200 text-amber-800'
                                                                                    }`}>
                                                                                        {d.status}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="mt-1.5 space-y-0.5 text-[10px] leading-tight">
                                                                                    {d.arrivalTime ? (
                                                                                        <div className="text-gray-700">In: <span className="font-mono font-semibold">{d.arrivalTime}</span></div>
                                                                                    ) : (
                                                                                        <div className="text-gray-400">In: —</div>
                                                                                    )}
                                                                                    {d.departureTime ? (
                                                                                        <div className="text-gray-700">Out: <span className="font-mono font-semibold">{d.departureTime}</span></div>
                                                                                    ) : (
                                                                                        <div className="text-gray-400">Out: —</div>
                                                                                    )}
                                                                                    {d.workingHours && d.workingHours !== '00:00' && (
                                                                                        <div className="text-gray-600 font-mono">Hrs: {d.workingHours}</div>
                                                                                    )}
                                                                                    {d.overtimeHours && d.overtimeHours !== '00:00' && (
                                                                                        <div className="text-amber-800 font-mono font-bold">OT: {d.overtimeHours}</div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                VIEW MODE 2: DAILY ATTENDANCE
            ════════════════════════════════════════════════════════════════════ */}
            {viewMode === 'daily' && (
                <Card>
                    <div className="p-4 border-b flex flex-wrap items-center gap-3 bg-gray-50/50">
                        <div className="w-48">
                            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                        </div>
                        <div className="w-56">
                            <Select placeholder="All Departments" options={deptOptions}
                                value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} />
                        </div>
                        <span className="text-xs text-gray-500">
                            Showing daily logs for {new Date(selectedDate).toLocaleDateString('en-LK', { dateStyle: 'long' })}
                        </span>
                    </div>
                    {attendance.length === 0
                        ? <EmptyState icon={CalendarIcon} title="No attendance recorded for this day" description="Click 'Bulk Mark Daily' to record for today"
                            action={<Button variant="primary" onClick={openBulk}>Mark Attendance</Button>} />
                        : <Table columns={dailyColumns} data={attendance} />}
                </Card>
            )}

            {/* ── Bulk Mark Daily Attendance Modal ── */}
            <Modal isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} title={`Mark Attendance — ${selectedDate}`} size="lg">
                <div className="p-6 max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b">
                            <tr>
                                <th className="text-left py-2">Employee</th>
                                <th className="text-left py-2">Status</th>
                                <th className="text-left py-2">In</th>
                                <th className="text-left py-2">Out</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {bulkRecords.map((r, idx) => (
                                <tr key={r.employeeId}>
                                    <td className="py-2">{r.employeeName}</td>
                                    <td className="py-2">
                                        <select value={r.status}
                                            onChange={(e) => {
                                                const newR = [...bulkRecords]; newR[idx].status = e.target.value; setBulkRecords(newR);
                                            }}
                                            className="px-2 py-1 border rounded text-xs">
                                            <option value="present">Present</option>
                                            <option value="absent">Absent</option>
                                            <option value="half_day">Half Day</option>
                                            <option value="late">Late</option>
                                            <option value="leave">Leave</option>
                                        </select>
                                    </td>
                                    <td className="py-2">
                                        <input type="datetime-local" value={r.checkInTime}
                                            onChange={(e) => {
                                                const newR = [...bulkRecords]; newR[idx].checkInTime = e.target.value; setBulkRecords(newR);
                                            }}
                                            disabled={!['present', 'late', 'half_day'].includes(r.status)}
                                            className="px-2 py-1 border rounded text-xs disabled:bg-gray-100" />
                                    </td>
                                    <td className="py-2">
                                        <input type="datetime-local" value={r.checkOutTime}
                                            onChange={(e) => {
                                                const newR = [...bulkRecords]; newR[idx].checkOutTime = e.target.value; setBulkRecords(newR);
                                            }}
                                            disabled={!['present', 'late', 'half_day'].includes(r.status)}
                                            className="px-2 py-1 border rounded text-xs disabled:bg-gray-100" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsBulkOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={submitBulk} loading={bulkMark.isPending}>
                        Save All ({bulkRecords.length} records)
                    </Button>
                </div>
            </Modal>

            {/* ── Attendance Excel Preview & Import Modal ── */}
            <Modal
                isOpen={isImportOpen}
                onClose={() => {
                    if (!isImporting) {
                        setIsImportOpen(false);
                        setPreviewData(null);
                        setImportFile(null);
                        setExpandedEmployeeCode(null);
                    }
                }}
                title={previewData ? (previewData.format === 'monthly' ? `Monthly Attendance Sheet Preview — ${previewData.period?.monthName || ''}` : 'Daily Attendance Sheet Preview') : 'Import Attendance from Excel'}
                size={previewData ? '2xl' : 'lg'}
            >
                <div className="p-4 sm:p-6 space-y-4">
                    {/* Target Month & Year Selector Banner */}
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                                <CalendarIcon size={14} className="text-blue-600" />
                                Confirm Target Month for this Report:
                            </label>
                            {previewData?.period?.monthName && (
                                <span className="text-[11px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                                    Detected: {previewData.period.monthName}
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Target Month</label>
                                <select
                                    value={targetImportMonth}
                                    onChange={(e) => setTargetImportMonth(Number(e.target.value))}
                                    className="w-full text-xs font-medium px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                >
                                    {monthsList.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Target Year</label>
                                <input
                                    type="number"
                                    value={targetImportYear}
                                    onChange={(e) => setTargetImportYear(Number(e.target.value))}
                                    className="w-full text-xs font-medium px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-blue-800">
                            Attendance logs from this sheet will be saved to <strong>{monthsList.find(m => m.value === Number(targetImportMonth))?.label} {targetImportYear}</strong> and made available for employee payslip calculations.
                        </p>
                    </div>

                    {/* Dropzone if no preview yet */}
                    {!previewData && (
                        <div>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition bg-gray-50/50">
                                <div className="mx-auto w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 mb-3">
                                    <FileSpreadsheet size={26} />
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 mb-1">
                                    Upload Attendance Spreadsheet
                                </h3>
                                <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
                                    Supports biometric <strong>Monthly Performance Report</strong> (detects monthly logs, daily check-ins/outs, OT) or simple daily attendance files.
                                </p>

                                <input
                                    type="file"
                                    id="attendance-excel-input"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="attendance-excel-input"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 cursor-pointer shadow-sm transition"
                                >
                                    <Upload size={16} /> Choose Excel File
                                </label>

                                {importFile && (
                                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg text-xs font-medium text-gray-700 shadow-xs">
                                        <FileSpreadsheet size={16} className="text-emerald-600" />
                                        <span>{importFile.name}</span>
                                        <span className="text-gray-400">({(importFile.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                )}
                            </div>

                            {isPreviewing && (
                                <div className="mt-4 p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-center flex flex-col items-center justify-center gap-2">
                                    <RefreshCw className="animate-spin text-blue-600" size={24} />
                                    <p className="text-sm font-medium text-blue-900">
                                        Reading Excel sheet and matching employee records...
                                    </p>
                                    <p className="text-xs text-blue-700">
                                        Checking staff codes, 31-day biometric logs, worked hours, and OT.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Preview Table */}
                    {previewData && (
                        <div className="space-y-4">
                            {/* Top Stats Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3 bg-gray-50 border rounded-xl">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Report Period</p>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 mt-0.5 truncate">
                                        {monthsList.find(m => m.value === Number(targetImportMonth))?.label} {targetImportYear}
                                    </p>
                                    <p className="text-[11px] text-gray-400">
                                        {previewData.period?.daysInMonth || 31} Days in Month
                                    </p>
                                </div>

                                <div className="p-3 bg-gray-50 border rounded-xl">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Staff</p>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
                                        {previewData.summary?.totalEmployees || 0} Employees
                                    </p>
                                    <p className="text-[11px] text-gray-400">
                                        {previewData.summary?.totalAttendanceDays || 0} Total logs
                                    </p>
                                </div>

                                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                                    <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">In System</p>
                                    <p className="text-sm sm:text-base font-bold text-emerald-900 mt-0.5">
                                        {previewData.summary?.matchedCount || 0} Staff
                                    </p>
                                    <p className="text-[11px] text-emerald-600">Existing Employee Profiles</p>
                                </div>

                                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Not in System</p>
                                    <p className="text-sm sm:text-base font-bold text-amber-900 mt-0.5">
                                        {previewData.summary?.unmatchedCount || 0} Staff
                                    </p>
                                    <p className="text-[11px] text-amber-600">New Employee Profiles</p>
                                </div>
                            </div>

                            {/* Missing Employees Alert & Auto-Registration Checkbox */}
                            {previewData.summary?.unmatchedCount > 0 ? (
                                <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                                    <div className="flex items-start gap-2.5">
                                        <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 mt-0.5 flex-shrink-0">
                                            <UserPlus size={18} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-amber-950">
                                                {previewData.summary.unmatchedCount} employee{previewData.summary.unmatchedCount > 1 ? 's are' : ' is'} not added to the system yet
                                            </p>
                                            <p className="text-amber-800 text-xs mt-0.5">
                                                You can view their full monthly attendance breakdown below. Enable auto-registration to create their employee profiles automatically during import.
                                            </p>
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2.5 cursor-pointer bg-white px-3.5 py-2 rounded-lg border border-amber-300 shadow-xs text-xs font-semibold text-amber-900 select-none hover:bg-amber-50/50 transition flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={autoCreateEmployees}
                                            onChange={(e) => setAutoCreateEmployees(e.target.checked)}
                                            className="w-4 h-4 rounded border-amber-400 text-primary-600 focus:ring-primary-500"
                                        />
                                        Auto-Register Missing Employees
                                    </label>
                                </div>
                            ) : (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5 text-sm text-emerald-800">
                                    <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                                    <p className="font-medium text-xs sm:text-sm">
                                        All {previewData.summary?.totalEmployees || 0} employees found in this sheet are already registered in the system!
                                    </p>
                                </div>
                            )}

                            {/* Search & Filter Toolbar */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                                <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg text-xs font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewFilter('all')}
                                        className={`px-3 py-1.5 rounded-md transition ${previewFilter === 'all' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        All ({previewData.summary?.totalEmployees || 0})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewFilter('unregistered')}
                                        className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${previewFilter === 'unregistered' ? 'bg-white text-amber-900 shadow-xs font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        New / Not in System ({previewData.summary?.unmatchedCount || 0})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewFilter('registered')}
                                        className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${previewFilter === 'registered' ? 'bg-white text-emerald-900 shadow-xs font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        In System ({previewData.summary?.matchedCount || 0})
                                    </button>
                                </div>

                                <div className="relative w-full sm:w-64">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by code or name..."
                                        value={previewSearch}
                                        onChange={(e) => setPreviewSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Monthly Biometric Preview Table */}
                            {previewData.format === 'monthly' && (
                                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider sticky top-0 z-10 border-b">
                                            <tr>
                                                <th className="py-2.5 px-3">Code</th>
                                                <th className="py-2.5 px-3">Employee Name</th>
                                                <th className="py-2.5 px-3">Designation</th>
                                                <th className="py-2.5 px-3">System Status</th>
                                                <th className="py-2.5 px-3 text-center">Present</th>
                                                <th className="py-2.5 px-3 text-center">Absent</th>
                                                <th className="py-2.5 px-3 text-center">Leave</th>
                                                <th className="py-2.5 px-3 text-center">WO</th>
                                                <th className="py-2.5 px-3 text-right">Work Hrs</th>
                                                <th className="py-2.5 px-3 text-right">OT Hrs</th>
                                                <th className="py-2.5 px-3 text-center">31-Day Log</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {filteredPreviewMonthly.length === 0 ? (
                                                <tr>
                                                    <td colSpan={11} className="py-8 text-center text-gray-500">
                                                        No employees found matching filter criteria
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredPreviewMonthly.map((emp) => {
                                                    const isExpanded = expandedEmployeeCode === emp.employeeCode;
                                                    return (
                                                        <React.Fragment key={emp.employeeCode}>
                                                            <tr className={`hover:bg-gray-50/80 transition ${!emp.isRegistered ? 'bg-amber-50/30' : ''}`}>
                                                                <td className="py-2 px-3 font-mono font-bold text-gray-800">
                                                                    #{emp.employeeCode}
                                                                </td>
                                                                <td className="py-2 px-3">
                                                                    <div className="font-semibold text-gray-900">{emp.employeeName}</div>
                                                                    {emp.dbEmployee && emp.dbEmployee.fullName !== emp.employeeName && (
                                                                        <div className="text-[10px] text-gray-500">
                                                                            DB Match: {emp.dbEmployee.fullName} ({emp.dbEmployee.employeeCode})
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="py-2 px-3 text-gray-600">
                                                                    {emp.designation || 'Staff'}
                                                                </td>
                                                                <td className="py-2 px-3">
                                                                    {emp.isRegistered ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                            Registered
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                                            {autoCreateEmployees ? 'Will Auto-Create' : 'Not in System'}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="py-2 px-3 text-center font-bold text-emerald-700">
                                                                    {emp.summary?.present || 0}
                                                                </td>
                                                                <td className="py-2 px-3 text-center font-bold text-rose-700">
                                                                    {emp.summary?.absent || 0}
                                                                </td>
                                                                <td className="py-2 px-3 text-center text-blue-700 font-medium">
                                                                    {emp.summary?.leave || 0}
                                                                </td>
                                                                <td className="py-2 px-3 text-center text-gray-500 font-medium">
                                                                    {emp.summary?.weeklyOff || 0}
                                                                </td>
                                                                <td className="py-2 px-3 text-right font-mono font-medium text-gray-900">
                                                                    {emp.summary?.workingHours || '00:00'}
                                                                </td>
                                                                <td className="py-2 px-3 text-right font-mono font-semibold text-amber-700">
                                                                    {emp.summary?.overtimeHours || '00:00'}
                                                                </td>
                                                                <td className="py-2 px-3 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setExpandedEmployeeCode(isExpanded ? null : emp.employeeCode)}
                                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${isExpanded ? 'bg-primary-600 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                                                    >
                                                                        <Eye size={13} />
                                                                        <span>{isExpanded ? 'Hide' : '31 Days'}</span>
                                                                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                                    </button>
                                                                </td>
                                                            </tr>

                                                            {/* Expanded 31-Day Calendar view */}
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan={11} className="p-3 bg-gray-50/90 border-b border-t border-gray-200">
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center justify-between">
                                                                                <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                                                                    <CalendarIcon size={14} className="text-primary-600" />
                                                                                    Daily Attendance Log — {emp.employeeName} (Emp #{emp.employeeCode})
                                                                                </p>
                                                                                <span className="text-[11px] text-gray-500">
                                                                                    Total Days Logged: {emp.days?.length || 0}
                                                                                </span>
                                                                            </div>

                                                                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-10 gap-2 max-h-56 overflow-y-auto p-1">
                                                                                {(emp.days || []).map((d) => (
                                                                                    <div
                                                                                        key={d.day}
                                                                                        className={`p-2 rounded-lg border text-xs flex flex-col justify-between ${
                                                                                            d.status === 'P' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' :
                                                                                            d.status === 'A' ? 'bg-rose-50/70 border-rose-200 text-rose-900' :
                                                                                            d.status === 'WO' ? 'bg-gray-100 border-gray-300 text-gray-400' :
                                                                                            d.status === 'POW' ? 'bg-amber-50/70 border-amber-200 text-amber-900' :
                                                                                            'bg-blue-50/70 border-blue-200 text-blue-900'
                                                                                        }`}
                                                                                    >
                                                                                        <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                                                                                            <span>Day {String(d.day).padStart(2, '0')}</span>
                                                                                            <span className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                                                                                                d.status === 'P' ? 'bg-emerald-200 text-emerald-800' :
                                                                                                d.status === 'A' ? 'bg-rose-200 text-rose-800' :
                                                                                                d.status === 'WO' ? 'bg-gray-200 text-gray-600' :
                                                                                                'bg-amber-200 text-amber-800'
                                                                                            }`}>
                                                                                                {d.status}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="mt-1.5 space-y-0.5 text-[10px] leading-tight">
                                                                                            {d.arrivalTime ? (
                                                                                                <div className="text-gray-700">In: <span className="font-mono font-semibold">{d.arrivalTime}</span></div>
                                                                                            ) : (
                                                                                                <div className="text-gray-400">In: —</div>
                                                                                            )}
                                                                                            {d.departureTime ? (
                                                                                                <div className="text-gray-700">Out: <span className="font-mono font-semibold">{d.departureTime}</span></div>
                                                                                            ) : (
                                                                                                <div className="text-gray-400">Out: —</div>
                                                                                            )}
                                                                                            {d.workingHours && d.workingHours !== '00:00' && (
                                                                                                <div className="text-gray-600 font-mono">Hrs: {d.workingHours}</div>
                                                                                            )}
                                                                                            {d.overtimeHours && d.overtimeHours !== '00:00' && (
                                                                                                <div className="text-amber-800 font-mono font-bold">OT: {d.overtimeHours}</div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Daily Format Preview Table */}
                            {previewData.format === 'daily' && (
                                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider sticky top-0 z-10 border-b">
                                            <tr>
                                                <th className="py-2.5 px-3">Code</th>
                                                <th className="py-2.5 px-3">Employee Name</th>
                                                <th className="py-2.5 px-3">System Status</th>
                                                <th className="py-2.5 px-3 text-center">Status</th>
                                                <th className="py-2.5 px-3">Check In</th>
                                                <th className="py-2.5 px-3">Check Out</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {filteredPreviewDaily.map((r, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition">
                                                    <td className="py-2 px-3 font-mono font-bold text-gray-800">
                                                        {r.employeeCode}
                                                    </td>
                                                    <td className="py-2 px-3 font-medium text-gray-900">
                                                        {r.employeeName}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        {r.isRegistered ? (
                                                             <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                                                                Registered
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                                                                {autoCreateEmployees ? 'Will Auto-Create' : 'Not In System'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 text-center">
                                                        <Badge variant={statusVariant[r.status] || 'default'}>{formatStatusLabel(r.status)}</Badge>
                                                    </td>
                                                    <td className="py-2 px-3 font-mono text-gray-700">
                                                        {r.checkInTime ? String(r.checkInTime) : '—'}
                                                    </td>
                                                    <td className="py-2 px-3 font-mono text-gray-700">
                                                        {r.checkOutTime ? String(r.checkOutTime) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
                    {previewData ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setPreviewData(null);
                                    setImportFile(null);
                                    setExpandedEmployeeCode(null);
                                }}
                                disabled={isImporting}
                            >
                                <ArrowLeft size={15} className="mr-1.5" />
                                Choose Different File
                            </Button>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsImportOpen(false);
                                        setPreviewData(null);
                                        setImportFile(null);
                                    }}
                                    disabled={isImporting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleConfirmImport}
                                    loading={isImporting}
                                >
                                    <FileCheck size={16} className="mr-1.5" />
                                    Import into {monthsList.find(m => m.value === Number(targetImportMonth))?.label} {targetImportYear} ({previewData.summary?.totalEmployees || 0} Staff)
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-end gap-2 w-full">
                            <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                                Cancel
                            </Button>
                            {importFile && (
                                <Button
                                    variant="primary"
                                    onClick={() => triggerPreview(importFile)}
                                    loading={isPreviewing}
                                >
                                    <Eye size={16} className="mr-1.5" />
                                    Analyze & Preview Sheet
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}