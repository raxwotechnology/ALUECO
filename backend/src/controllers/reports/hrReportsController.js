import asyncHandler from 'express-async-handler';
import Employee from '../../models/Employee.js';
import Attendance from '../../models/Attendance.js';
import LeaveRequest from '../../models/LeaveRequest.js';
import Payroll from '../../models/Payroll.js';

/**
 * GET /api/reports/hr/headcount
 */
export const getHeadcountReport = asyncHandler(async (req, res) => {
    const [total, byDepartment, byDesignation, byEmploymentType, byStatus] = await Promise.all([
        Employee.countDocuments({ deletedAt: null }),
        Employee.aggregate([
            { $match: { deletedAt: null } },
            { $group: { _id: '$departmentId', count: { $sum: 1 } } },
            { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
            { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
            { $project: { name: '$dept.name', count: 1 } },
            { $sort: { count: -1 } },
        ]),
        Employee.aggregate([
            { $match: { deletedAt: null } },
            { $group: { _id: '$designationId', count: { $sum: 1 } } },
            { $lookup: { from: 'designations', localField: '_id', foreignField: '_id', as: 'des' } },
            { $unwind: { path: '$des', preserveNullAndEmptyArrays: true } },
            { $project: { name: '$des.name', count: 1 } },
            { $sort: { count: -1 } },
        ]),
        Employee.aggregate([
            { $match: { deletedAt: null } },
            { $group: { _id: '$employmentType', count: { $sum: 1 } } },
        ]),
        Employee.aggregate([
            { $match: { deletedAt: null } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
    ]);

    res.json({
        success: true,
        data: { total, byDepartment, byDesignation, byEmploymentType, byStatus },
    });
});

/**
 * GET /api/reports/hr/attendance-summary?startDate=&endDate=
 */
export const getAttendanceReport = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const [summary, byEmployee] = await Promise.all([
        Attendance.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]),
        Attendance.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: '$employeeId',
                    employeeName: { $first: '$employeeName' },
                    employeeCode: { $first: '$employeeCode' },
                    present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
                    absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
                    late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
                    leave: { $sum: { $cond: [{ $eq: ['$status', 'leave'] }, 1, 0] } },
                    halfDay: { $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] } },
                    totalLateMinutes: { $sum: '$lateMinutes' },
                    totalOvertimeMinutes: { $sum: '$overtimeMinutes' },
                },
            },
            { $sort: { present: -1 } },
        ]),
    ]);

    res.json({
        success: true,
        data: {
            period: { start, end },
            summary, byEmployee,
        },
    });
});

/**
 * GET /api/reports/hr/leave-patterns?year=
 */
export const getLeavePatternsReport = asyncHandler(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const [byType, byMonth, topTakers] = await Promise.all([
        LeaveRequest.aggregate([
            { $match: { deletedAt: null, status: 'approved', fromDate: { $gte: start, $lte: end } } },
            { $group: { _id: '$leaveType', count: { $sum: 1 }, totalDays: { $sum: '$numberOfDays' } } },
            { $sort: { totalDays: -1 } },
        ]),
        LeaveRequest.aggregate([
            { $match: { deletedAt: null, status: 'approved', fromDate: { $gte: start, $lte: end } } },
            { $group: { _id: { $month: '$fromDate' }, count: { $sum: 1 }, totalDays: { $sum: '$numberOfDays' } } },
            { $sort: { _id: 1 } },
        ]),
        LeaveRequest.aggregate([
            { $match: { deletedAt: null, status: 'approved', fromDate: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: '$employeeId',
                    employeeName: { $first: '$employeeName' },
                    employeeCode: { $first: '$employeeCode' },
                    leaveCount: { $sum: 1 },
                    totalDays: { $sum: '$numberOfDays' },
                },
            },
            { $sort: { totalDays: -1 } },
            { $limit: 10 },
        ]),
    ]);

    res.json({ success: true, data: { year, byType, byMonth, topTakers } });
});

/**
 * GET /api/reports/hr/payroll-summary?year=
 */
export const getPayrollSummaryReport = asyncHandler(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();

    const data = await Payroll.aggregate([
        { $match: { deletedAt: null, periodYear: year } },
        { $sort: { periodMonth: 1 } },
        {
            $project: {
                periodMonth: 1, periodYear: 1, status: 1,
                totalEmployees: 1, totalGrossEarnings: 1, totalDeductions: 1,
                totalEpfEmployee: 1, totalEpfEmployer: 1, totalEtf: 1, totalApit: 1, totalNetPay: 1,
            },
        },
    ]);

    const yearTotals = data.reduce(
        (s, m) => ({
            gross: s.gross + (m.totalGrossEarnings || 0),
            deductions: s.deductions + (m.totalDeductions || 0),
            netPay: s.netPay + (m.totalNetPay || 0),
            epfEmployee: s.epfEmployee + (m.totalEpfEmployee || 0),
            epfEmployer: s.epfEmployer + (m.totalEpfEmployer || 0),
            etf: s.etf + (m.totalEtf || 0),
            apit: s.apit + (m.totalApit || 0),
        }),
        { gross: 0, deductions: 0, netPay: 0, epfEmployee: 0, epfEmployer: 0, etf: 0, apit: 0 }
    );

    res.json({
        success: true,
        data: {
            year,
            monthly: data,
            yearTotals: Object.fromEntries(Object.entries(yearTotals).map(([k, v]) => [k, +v.toFixed(2)])),
        },
    });
});