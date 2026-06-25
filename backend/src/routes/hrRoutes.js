import express from 'express';
import {
    createDepartment, getDepartments, updateDepartment, deleteDepartment,
    createDesignation, getDesignations, updateDesignation, deleteDesignation,
    createEmployee, getEmployees, getEmployeeById, updateEmployee, deleteEmployee,
    createShift, getShifts, updateShift, deleteShift,
    markAttendance, getAttendance, bulkMarkAttendance,
    createLeaveRequest, getLeaveRequests, approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest,
    createHoliday, getHolidays, updateHoliday, deleteHoliday,
    createSalaryStructure, getSalaryStructures, updateSalaryStructure, deleteSalaryStructure,
    createLeaveStructure, getLeaveStructures, updateLeaveStructure, deleteLeaveStructure, getMyEmployeeProfile,
} from '../controllers/hrController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission, requireAnyPermission } from '../middleware/permissionMiddleware.js';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import ProductionBatch from '../models/ProductionBatch.js';

const router = express.Router();
router.use(protect);

// ── Departments ────────────────────────────────────────────────────────────────
router.route('/departments')
    .get(requirePermission('hr.employees.view'), getDepartments)
    .post(requirePermission('hr.departments.manage'), createDepartment);

router.route('/departments/:id')
    .put(requirePermission('hr.departments.manage'), updateDepartment)
    .delete(requirePermission('hr.departments.manage'), deleteDepartment);

// ── Designations ───────────────────────────────────────────────────────────────
router.route('/designations')
    .get(requirePermission('hr.employees.view'), getDesignations)
    .post(requirePermission('hr.designations.manage'), createDesignation);

router.route('/designations/:id')
    .put(requirePermission('hr.designations.manage'), updateDesignation)
    .delete(requirePermission('hr.designations.manage'), deleteDesignation);

// ── Employees ──────────────────────────────────────────────────────────────────
router.route('/employees')
    .get(requirePermission('hr.employees.view'), getEmployees)
    .post(requirePermission('hr.employees.manage'), createEmployee);

router.get('/employees/me', getMyEmployeeProfile);

router.route('/employees/:id')
    .get(requirePermission('hr.employees.view'), getEmployeeById)
    .put(requirePermission('hr.employees.manage'), updateEmployee)
    .delete(requirePermission('hr.employees.manage'), deleteEmployee);

// ── Shifts ─────────────────────────────────────────────────────────────────────
router.route('/shifts')
    .get(requirePermission('hr.shifts.manage'), getShifts)
    .post(requirePermission('hr.shifts.manage'), createShift);

router.route('/shifts/:id')
    .put(requirePermission('hr.shifts.manage'), updateShift)
    .delete(requirePermission('hr.shifts.manage'), deleteShift);

// ── Attendance ─────────────────────────────────────────────────────────────────
router.route('/attendance')
    .get(requirePermission('hr.attendance.view'), getAttendance)
    .post(requirePermission('hr.attendance.manage'), markAttendance);

router.post('/attendance/bulk', requirePermission('hr.attendance.manage'), bulkMarkAttendance);

// ── Leave ──────────────────────────────────────────────────────────────────────
router.route('/leaves')
    .get(requirePermission('hr.leaves.view'), getLeaveRequests)
    .post(requireAnyPermission('hr.leaves.manage', 'hr.leaves.view'), createLeaveRequest);

router.patch('/leaves/:id/approve', requirePermission('hr.leaves.manage'), approveLeaveRequest);
router.patch('/leaves/:id/reject',  requirePermission('hr.leaves.manage'), rejectLeaveRequest);
router.patch('/leaves/:id/cancel',  requirePermission('hr.leaves.manage'), cancelLeaveRequest);

// ── Holidays ───────────────────────────────────────────────────────────────────
router.route('/holidays')
    .get(requirePermission('dashboard.view'), getHolidays)
    .post(requirePermission('hr.holidays.manage'), createHoliday);

router.route('/holidays/:id')
    .put(requirePermission('hr.holidays.manage'), updateHoliday)
    .delete(requirePermission('hr.holidays.manage'), deleteHoliday);

// ── Salary Structures ──────────────────────────────────────────────────────────
router.route('/salary-structures')
    .get(requirePermission('hr.salary.view'), getSalaryStructures)
    .post(requirePermission('hr.salary.manage'), createSalaryStructure);

router.route('/salary-structures/:id')
    .put(requirePermission('hr.salary.manage'), updateSalaryStructure)
    .delete(requirePermission('hr.salary.manage'), deleteSalaryStructure);

// ── Leave Structures ───────────────────────────────────────────────────────────
router.route('/leave-structures')
    .get(requirePermission('hr.leaves.view'), getLeaveStructures)
    .post(requirePermission('hr.leaves.manage'), createLeaveStructure);

router.route('/leave-structures/:id')
    .put(requirePermission('hr.leaves.manage'), updateLeaveStructure)
    .delete(requirePermission('hr.leaves.manage'), deleteLeaveStructure);

// ── Employee of the Month ─────────────────────────────────────────────────────
/**
 * @desc    Get top 3 employees by attendance + OT for a given month/year
 * @route   GET /api/hr/employee-of-month?month=6&year=2026
 * @access  Private
 *
 * Ranking criteria:
 *   1. Most days present  (primary)
 *   2. Most OT minutes    (secondary tiebreaker)
 */
router.get('/employee-of-month', requirePermission('hr.employees.view'), async (req, res) => {
    try {
        const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
        const year  = parseInt(req.query.year)  || new Date().getFullYear();

        const startDate = new Date(year, month - 1, 1);
        const endDate   = new Date(year, month, 1);

        // Step 1: Aggregate attendance for the period
        const nominees = await Attendance.aggregate([
            {
                $match: {
                    date:   { $gte: startDate, $lt: endDate },
                    status: 'present',
                }
            },
            {
                $group: {
                    _id:         '$employeeId',
                    daysPresent: { $sum: 1 },
                    totalOTMins: { $sum: '$overtimeMinutes' },
                }
            },
            { $sort: { daysPresent: -1, totalOTMins: -1 } },
            { $limit: 3 },
            {
                $lookup: {
                    from:         'employees',
                    localField:   '_id',
                    foreignField: '_id',
                    as:           'employee',
                }
            },
            { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
        ]);

        // Step 2: For each nominee, fetch average batch efficiency
        const enriched = await Promise.all(nominees.map(async (n) => {
            const batches = await ProductionBatch.find({
                createdBy: n._id,
                date: { $gte: startDate, $lt: endDate },
                efficiencyPercentage: { $gt: 0 },
            }).select('efficiencyPercentage');

            const avgEfficiency = batches.length > 0
                ? parseFloat((batches.reduce((s, b) => s + b.efficiencyPercentage, 0) / batches.length).toFixed(2))
                : null;

            return {
                rank:           nominees.indexOf(n) + 1,
                employeeId:     n._id,
                name:           n.employee ? `${n.employee.firstName} ${n.employee.lastName}` : 'Unknown',
                employeeCode:   n.employee?.employeeCode,
                department:     n.employee?.department,
                daysPresent:    n.daysPresent,
                totalOTHours:   parseFloat((n.totalOTMins / 60).toFixed(1)),
                avgBatchEfficiency: avgEfficiency,
            };
        }));

        res.json({
            success: true,
            period: { month, year },
            data: enriched,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;