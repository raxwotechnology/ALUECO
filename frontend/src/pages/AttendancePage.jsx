import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Plus, Calendar as CalendarIcon, Upload, CheckCircle2,
    AlertCircle, FileSpreadsheet, Eye, ChevronDown, ChevronUp,
    Search, UserPlus, Users, ArrowLeft, RefreshCw, FileCheck
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
import { useAttendance, useBulkMarkAttendance, useEmployees, useDepartments } from '../features/hr/useHr';
import { attendanceApi, employeesApi } from '../features/hr/hrApi';
import { parseAttendanceFileInBrowser } from '../utils/attendanceExcelParser';

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
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [departmentId, setDepartmentId] = useState('');
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);

    const { data: attData } = useAttendance({ date: selectedDate, departmentId: departmentId || undefined, limit: 200 });
    const { data: empData } = useEmployees({ departmentId: departmentId || undefined, status: 'active', limit: 500 });
    const { data: deptsData } = useDepartments();
    const bulkMark = useBulkMarkAttendance();

    const attendance = attData?.data || [];
    const employees = empData?.data || [];
    const depts = deptsData?.data || [];
    const deptOptions = depts.map((d) => ({ value: d._id, label: d.name }));

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
        // Seed with all employees, default present
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

    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [autoCreateEmployees, setAutoCreateEmployees] = useState(true);
    const [previewSearch, setPreviewSearch] = useState('');
    const [previewFilter, setPreviewFilter] = useState('all'); // 'all' | 'unregistered' | 'registered'
    const [expandedEmployeeCode, setExpandedEmployeeCode] = useState(null);

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
                // If backend route returned 404 or backend server hasn't been restarted, parse directly in browser
                console.warn('Backend preview not reachable or returned error, parsing in browser:', backendErr);
                res = await parseAttendanceFileInBrowser(file, employees);
            }

            if (res && res.success) {
                setPreviewData(res);
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
            // If user checked auto-create and there are unregistered employees,
            // register them in the employee database so they are recognized even if the backend process hasn't been restarted:
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
            if (selectedDate) {
                formData.append('date', selectedDate);
            }

            const result = await attendanceApi.importFromExcel(formData);
            
            if (result.success) {
                const totalCreated = Math.max(result.createdEmployees || 0, preCreatedCount);
                if (result.format === 'monthly' && result.period) {
                    const monthLabel = new Date(result.period.year, result.period.month - 1)
                        .toLocaleDateString('en-LK', { month: 'long', year: 'numeric' });
                    
                    let msg = `Successfully imported ${result.imported} records for ${monthLabel}!`;
                    if (totalCreated > 0) {
                        msg += ` (${totalCreated} new employees registered)`;
                    }
                    toast.success(msg);

                    // Switch active view to the imported month
                    const monthPadded = String(result.period.month).padStart(2, '0');
                    setSelectedDate(`${result.period.year}-${monthPadded}-01`);
                } else {
                    let msg = `Successfully imported ${result.imported} attendance records`;
                    if (totalCreated > 0) {
                        msg += ` (${totalCreated} new employees registered)`;
                    }
                    toast.success(msg);
                }

                if (result.errors > 0) {
                    toast.warning(`${result.errors} records were skipped due to discrepancies`);
                }

                queryClient.invalidateQueries({ queryKey: ['attendance'] });
                queryClient.invalidateQueries({ queryKey: ['employees'] });
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

    const filteredMonthlyEmployees = (previewData?.employees || []).filter((emp) => {
        if (previewFilter === 'unregistered' && emp.isRegistered) return false;
        if (previewFilter === 'registered' && !emp.isRegistered) return false;

        if (!previewSearch) return true;
        const q = previewSearch.toLowerCase();
        const code = String(emp.employeeCode || '').toLowerCase();
        const name = String(emp.employeeName || '').toLowerCase();
        const desig = String(emp.designation || '').toLowerCase();
        return code.includes(q) || name.includes(q) || desig.includes(q);
    });

    const filteredDailyRecords = (previewData?.records || []).filter((r) => {
        if (previewFilter === 'unregistered' && r.isRegistered) return false;
        if (previewFilter === 'registered' && !r.isRegistered) return false;

        if (!previewSearch) return true;
        const q = previewSearch.toLowerCase();
        const code = String(r.employeeCode || '').toLowerCase();
        const name = String(r.employeeName || '').toLowerCase();
        return code.includes(q) || name.includes(q);
    });

    const columns = [
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

    return (
        <div>
            <PageHeader title="Attendance" description="Daily staff attendance records"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => {
                            setIsImportOpen(true);
                            setPreviewData(null);
                            setImportFile(null);
                            setExpandedEmployeeCode(null);
                        }}>
                            <Upload size={16} className="mr-1.5" /> Import Excel
                        </Button>
                        <Button variant="primary" onClick={openBulk}>
                            <Plus size={16} className="mr-1.5" /> Bulk Mark Attendance
                        </Button>
                    </div>
                } />

            <Card>
                <div className="p-4 border-b flex gap-3">
                    <div className="w-48">
                        <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                    </div>
                    <div className="w-56">
                        <Select placeholder="All Departments" options={deptOptions}
                            value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} />
                    </div>
                </div>
                {attendance.length === 0
                    ? <EmptyState icon={CalendarIcon} title="No attendance recorded" description="Click 'Bulk Mark Attendance' to record for today"
                        action={<Button variant="primary" onClick={openBulk}>Mark Attendance</Button>} />
                    : <Table columns={columns} data={attendance} />}
            </Card>

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
                    {/* STEP 1: Upload Dropzone if no preview yet */}
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
                                    Supports biometric <strong>Monthly Performance Report</strong> (auto-detects month, daily check-ins/outs, OT) or simple daily attendance files.
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

                            <div className="mt-4">
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                                    Date for Daily Import (optional)
                                </label>
                                <Input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Only needed for simple single-day Excel files. Biometric monthly reports automatically detect their own month and date range.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Rich Preview Table */}
                    {previewData && (
                        <div className="space-y-4">
                            {/* Top Stats Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3 bg-gray-50 border rounded-xl">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Report Period</p>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 mt-0.5 truncate">
                                        {previewData.period?.monthName || 'Detected'}
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
                                    <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Registered in System</p>
                                    <p className="text-sm sm:text-base font-bold text-emerald-900 mt-0.5">
                                        {previewData.summary?.matchedCount || 0} Staff
                                    </p>
                                    <p className="text-[11px] text-emerald-600">Existing Employee Profiles</p>
                                </div>

                                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Not Yet in System</p>
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
                                        className={`px-3 py-1.5 rounded-md transition ${previewFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
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
                                            {filteredMonthlyEmployees.length === 0 ? (
                                                <tr>
                                                    <td colSpan={11} className="py-8 text-center text-gray-500">
                                                        No employees found matching filter criteria
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredMonthlyEmployees.map((emp) => {
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
                                            {filteredDailyRecords.map((r, idx) => (
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
                                    Confirm & Import ({previewData.summary?.totalEmployees || 0} Staff, {previewData.summary?.totalAttendanceDays || 0} Days)
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