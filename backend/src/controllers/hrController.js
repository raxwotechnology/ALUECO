import asyncHandler from 'express-async-handler';
import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import Employee from '../models/Employee.js';
import Shift from '../models/Shift.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Holiday from '../models/Holiday.js';
import SalaryStructure from '../models/SalaryStructure.js';
import LeaveStructure from '../models/LeaveStructure.js';

// ============================================================
// DEPARTMENTS
// ============================================================

export const createDepartment = asyncHandler(async (req, res) => {
    const dept = await Department.create(req.body);
    res.status(201).json({ success: true, data: dept });
});

export const getDepartments = asyncHandler(async (req, res) => {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const depts = await Department.find(filter)
        .populate('managerId', 'firstName lastName employeeCode')
        .populate('parentDepartmentId', 'name code')
        .sort({ name: 1 });

    res.json({ success: true, count: depts.length, data: depts });
});

export const updateDepartment = asyncHandler(async (req, res) => {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!dept) { res.status(404); throw new Error('Department not found'); }
    res.json({ success: true, data: dept });
});

export const deleteDepartment = asyncHandler(async (req, res) => {
    const dept = await Department.findById(req.params.id);
    if (!dept) { res.status(404); throw new Error('Department not found'); }
    dept.deletedAt = new Date();
    dept.isActive = false;
    await dept.save();
    res.json({ success: true });
});

// ============================================================
// DESIGNATIONS
// ============================================================

export const createDesignation = asyncHandler(async (req, res) => {
    const des = await Designation.create(req.body);
    res.status(201).json({ success: true, data: des });
});

export const getDesignations = asyncHandler(async (req, res) => {
    const { departmentId, isActive } = req.query;
    const filter = {};
    if (departmentId) filter.departmentId = departmentId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const list = await Designation.find(filter)
        .populate('departmentId', 'name code')
        .sort({ level: 1, name: 1 });

    res.json({ success: true, count: list.length, data: list });
});

export const updateDesignation = asyncHandler(async (req, res) => {
    const d = await Designation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!d) { res.status(404); throw new Error('Designation not found'); }
    res.json({ success: true, data: d });
});

export const deleteDesignation = asyncHandler(async (req, res) => {
    const d = await Designation.findById(req.params.id);
    if (!d) { res.status(404); throw new Error('Designation not found'); }
    d.deletedAt = new Date(); d.isActive = false; await d.save();
    res.json({ success: true });
});

// ============================================================
// EMPLOYEES
// ============================================================

export const createEmployee = asyncHandler(async (req, res) => {
    if (req.body.leaveStructureId) {
        const ls = await LeaveStructure.findById(req.body.leaveStructureId);
        if (ls) req.body.leaveBalances = ls.leaveBalances;
    }
    const emp = new Employee({ ...req.body, createdBy: req.user._id });
    await emp.save();

    const populated = await Employee.findById(emp._id)
        .populate('departmentId', 'name code')
        .populate('designationId', 'name code')
        .populate('reportsToId', 'firstName lastName employeeCode')
        .populate('leaveStructureId', 'name code leaveBalances');

    res.status(201).json({ success: true, data: populated });
});

export const getEmployees = asyncHandler(async (req, res) => {
    const {
        search, departmentId, designationId, status, employmentType,
        page = 1, limit = 20,
        sortBy = 'createdAt', sortOrder = 'desc',
    } = req.query;

    const filter = {};
    if (req.user.role === 'employee') {
        const emp = await Employee.findOne({ userId: req.user._id });
        if (!emp) {
            res.status(404);
            throw new Error('Employee profile not found');
        }
        filter._id = emp._id;
    } else {
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { employeeCode: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }
        if (departmentId) filter.departmentId = departmentId;
        if (designationId) filter.designationId = designationId;
        if (status) filter.status = status;
        if (employmentType) filter.employmentType = employmentType;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [employees, total] = await Promise.all([
        Employee.find(filter)
            .populate('departmentId', 'name code')
            .populate('designationId', 'name code')
            .populate('reportsToId', 'firstName lastName employeeCode')
            .sort(sortObj).skip(skip).limit(Number(limit)),
        Employee.countDocuments(filter),
    ]);

    res.json({
        success: true, count: employees.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: employees,
    });
});

export const getEmployeeById = asyncHandler(async (req, res) => {
    const emp = await Employee.findById(req.params.id)
        .populate('departmentId', 'name code')
        .populate('designationId', 'name code')
        .populate('reportsToId', 'firstName lastName employeeCode')
        .populate('userId', 'email role isActive')
        .populate('workShift', 'name startTime endTime')
        .populate('salaryStructureId', 'name code components')
        .populate('leaveStructureId', 'name code leaveBalances');
    if (!emp) { res.status(404); throw new Error('Employee not found'); }

    if (req.user.role === 'employee' && emp.userId?._id?.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to view this employee profile');
    }

    res.json({ success: true, data: emp });
});

export const updateEmployee = asyncHandler(async (req, res) => {
    if (req.body.leaveStructureId) {
        const ls = await LeaveStructure.findById(req.body.leaveStructureId);
        if (ls) req.body.leaveBalances = ls.leaveBalances;
    }
    const emp = await Employee.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user._id },
        { new: true, runValidators: true }
    );
    if (!emp) { res.status(404); throw new Error('Employee not found'); }
    res.json({ success: true, data: emp });
});

export const deleteEmployee = asyncHandler(async (req, res) => {
    const emp = await Employee.findById(req.params.id);
    if (!emp) { res.status(404); throw new Error('Employee not found'); }
    emp.deletedAt = new Date();
    emp.status = 'terminated';
    await emp.save();
    res.json({ success: true });
});

// ============================================================
// SHIFTS
// ============================================================

export const createShift = asyncHandler(async (req, res) => {
    const shift = await Shift.create(req.body);
    res.status(201).json({ success: true, data: shift });
});

export const getShifts = asyncHandler(async (req, res) => {
    const shifts = await Shift.find().sort({ startTime: 1 });
    res.json({ success: true, count: shifts.length, data: shifts });
});

export const updateShift = asyncHandler(async (req, res) => {
    const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!shift) { res.status(404); throw new Error('Shift not found'); }
    res.json({ success: true, data: shift });
});

export const deleteShift = asyncHandler(async (req, res) => {
    const shift = await Shift.findById(req.params.id);
    if (!shift) { res.status(404); throw new Error('Shift not found'); }
    shift.deletedAt = new Date(); shift.isActive = false; await shift.save();
    res.json({ success: true });
});

// ============================================================
// ATTENDANCE
// ============================================================

/**
 * Mark attendance for one employee (manual entry)
 */
export const markAttendance = asyncHandler(async (req, res) => {
    const {
        employeeId, date, checkInTime, checkOutTime,
        status, shiftId, notes, lateMinutes, overtimeMinutes,
    } = req.body;

    const emp = await Employee.findById(employeeId);
    if (!emp) { res.status(404); throw new Error('Employee not found'); }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Try to find existing record
    let att = await Attendance.findOne({ employeeId, date: attendanceDate });

    if (att) {
        // Update
        if (checkInTime !== undefined) {
            const checkIn = (checkInTime && checkInTime !== "") ? new Date(checkInTime) : null;
            att.checkInTime = (checkIn && !isNaN(checkIn.getTime())) ? checkIn : null;
        }
        if (checkOutTime !== undefined) {
            const checkOut = (checkOutTime && checkOutTime !== "") ? new Date(checkOutTime) : null;
            att.checkOutTime = (checkOut && !isNaN(checkOut.getTime())) ? checkOut : null;
        }
        if (status) att.status = status;
        if (shiftId) att.shiftId = shiftId;
        if (notes !== undefined) att.notes = notes;
        if (lateMinutes !== undefined) att.lateMinutes = lateMinutes;
        if (overtimeMinutes !== undefined) att.overtimeMinutes = overtimeMinutes;
    } else {
        const checkIn = (checkInTime && checkInTime !== "") ? new Date(checkInTime) : null;
        const checkOut = (checkOutTime && checkOutTime !== "") ? new Date(checkOutTime) : null;
        att = new Attendance({
            employeeId: emp._id,
            employeeCode: emp.employeeCode,
            employeeName: emp.fullName,
            date: attendanceDate,
            checkInTime: (checkIn && !isNaN(checkIn.getTime())) ? checkIn : null,
            checkOutTime: (checkOut && !isNaN(checkOut.getTime())) ? checkOut : null,
            status: status || 'present',
            shiftId,
            lateMinutes: lateMinutes || 0,
            overtimeMinutes: overtimeMinutes || 0,
            notes,
            markedBy: req.user._id,
        });
    }

    // Calculate worked minutes
    if (att.checkInTime && att.checkOutTime) {
        const diff = (new Date(att.checkOutTime) - new Date(att.checkInTime)) / 60000;
        att.totalWorkedMinutes = Math.max(0, Math.floor(diff));
    } else {
        att.totalWorkedMinutes = 0;
        att.overtimeMinutes = 0;
    }

    await att.save();
    res.status(201).json({ success: true, data: att });
});

export const getAttendance = asyncHandler(async (req, res) => {
    const {
        employeeId, departmentId, status,
        startDate, endDate, date,
        page = 1, limit = 50,
    } = req.query;

    const filter = {};
    if (req.user.role === 'employee') {
        const emp = await Employee.findOne({ userId: req.user._id });
        if (!emp) {
            res.status(404);
            throw new Error('Employee profile not found');
        }
        filter.employeeId = emp._id;
    } else {
        if (employeeId) filter.employeeId = employeeId;
        if (status) filter.status = status;
    }
    if (date) {
        const d = new Date(date); d.setHours(0, 0, 0, 0);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        filter.date = { $gte: d, $lt: next };
    } else if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Department filter requires employee lookup
    if (departmentId && req.user.role !== 'employee') {
        const empIds = await Employee.find({ departmentId }).distinct('_id');
        filter.employeeId = { $in: empIds };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [records, total] = await Promise.all([
        Attendance.find(filter)
            .populate('employeeId', 'firstName lastName employeeCode departmentId')
            .populate('shiftId', 'name startTime endTime')
            .sort({ date: -1 })
            .skip(skip).limit(Number(limit)),
        Attendance.countDocuments(filter),
    ]);

    res.json({
        success: true, count: records.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: records,
    });
});

/**
 * Bulk mark attendance for a day (for supervisors marking the whole team)
 */
export const bulkMarkAttendance = asyncHandler(async (req, res) => {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
        res.status(400); throw new Error('date and records array required');
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const results = [];
    for (const r of records) {
        if (!r.employeeId) continue;
        const emp = await Employee.findById(r.employeeId);
        if (!emp) continue;

        let att = await Attendance.findOne({ employeeId: r.employeeId, date: attendanceDate });
        if (!att) {
            att = new Attendance({
                employeeId: emp._id,
                employeeCode: emp.employeeCode,
                employeeName: emp.fullName,
                date: attendanceDate,
                markedBy: req.user._id,
            });
        }
        att.status = r.status || 'present';
        const checkIn = (r.checkInTime && r.checkInTime !== "") ? new Date(r.checkInTime) : null;
        const checkOut = (r.checkOutTime && r.checkOutTime !== "") ? new Date(r.checkOutTime) : null;
        att.checkInTime = (checkIn && !isNaN(checkIn.getTime())) ? checkIn : null;
        att.checkOutTime = (checkOut && !isNaN(checkOut.getTime())) ? checkOut : null;
        att.lateMinutes = r.lateMinutes || 0;
        att.overtimeMinutes = r.overtimeMinutes || 0;
        att.notes = r.notes;

        if (att.checkInTime && att.checkOutTime) {
            const diff = (new Date(att.checkOutTime) - new Date(att.checkInTime)) / 60000;
            att.totalWorkedMinutes = Math.max(0, Math.floor(diff));
        } else {
            att.totalWorkedMinutes = 0;
            att.overtimeMinutes = 0;
        }
        await att.save();
        results.push(att);
    }

    res.json({ success: true, count: results.length, data: results });
});

// ============================================================
// LEAVE REQUESTS
// ============================================================

export const createLeaveRequest = asyncHandler(async (req, res) => {
    const { employeeId, leaveType, fromDate, toDate, ...rest } = req.body;

    let targetEmployeeId = employeeId;
    if (req.user.role === 'employee') {
        const empSelf = await Employee.findOne({ userId: req.user._id });
        if (!empSelf) {
            res.status(404);
            throw new Error('Employee profile not found');
        }
        targetEmployeeId = empSelf._id;
    }

    const emp = await Employee.findById(targetEmployeeId);
    if (!emp) { res.status(404); throw new Error('Employee not found'); }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    const days = rest.isHalfDay ? 0.5 : (Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1);

    // Check balance (warn but don't block — admin can override)
    const balance = emp.leaveBalances?.[leaveType] || 0;

    const leave = new LeaveRequest({
        employeeId: emp._id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        leaveType, fromDate: from, toDate: to, numberOfDays: days,
        ...rest,
        status: req.user.role === 'employee' ? 'pending' : (rest.status || 'pending'),
        createdBy: req.user._id,
    });
    await leave.save();

    res.status(201).json({
        success: true, data: leave,
        warning: days > balance ? `Requested ${days} days exceeds balance of ${balance}` : undefined,
    });
});

export const getLeaveRequests = asyncHandler(async (req, res) => {
    const {
        employeeId, status, leaveType,
        startDate, endDate,
        page = 1, limit = 20,
    } = req.query;

    const filter = {};
    if (req.user.role === 'employee') {
        const emp = await Employee.findOne({ userId: req.user._id });
        if (!emp) {
            res.status(404);
            throw new Error('Employee profile not found');
        }
        filter.employeeId = emp._id;
    } else {
        if (employeeId) filter.employeeId = employeeId;
    }
    if (status) filter.status = status;
    if (leaveType) filter.leaveType = leaveType;
    if (startDate || endDate) {
        filter.fromDate = {};
        if (startDate) filter.fromDate.$gte = new Date(startDate);
        if (endDate) filter.fromDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [leaves, total] = await Promise.all([
        LeaveRequest.find(filter)
            .populate('employeeId', 'firstName lastName employeeCode departmentId leaveBalances')
            .populate('approvedBy', 'firstName lastName')
            .sort({ fromDate: -1 }).skip(skip).limit(Number(limit)),
        LeaveRequest.countDocuments(filter),
    ]);

    res.json({
        success: true, count: leaves.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: leaves,
    });
});

export const approveLeaveRequest = asyncHandler(async (req, res) => {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) { res.status(404); throw new Error('Leave not found'); }
    if (leave.status !== 'pending') {
        res.status(400); throw new Error(`Cannot approve leave with status '${leave.status}'`);
    }

    leave.status = 'approved';
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();
    await leave.save();

    // Deduct from employee balance
    const emp = await Employee.findById(leave.employeeId);
    if (emp) {
        emp.leaveBalances = emp.leaveBalances || {};
        const current = emp.leaveBalances[leave.leaveType] || 0;
        emp.leaveBalances[leave.leaveType] = Math.max(0, current - leave.numberOfDays);
        await emp.save();
    }

    res.json({ success: true, data: leave });
});

export const rejectLeaveRequest = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) { res.status(404); throw new Error('Leave not found'); }
    if (leave.status !== 'pending') {
        res.status(400); throw new Error(`Cannot reject leave with status '${leave.status}'`);
    }
    leave.status = 'rejected';
    leave.rejectedBy = req.user._id;
    leave.rejectedAt = new Date();
    leave.rejectionReason = reason;
    await leave.save();
    res.json({ success: true, data: leave });
});

export const cancelLeaveRequest = asyncHandler(async (req, res) => {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) { res.status(404); throw new Error('Leave not found'); }

    const wasApproved = leave.status === 'approved';
    leave.status = 'cancelled';
    await leave.save();

    // Restore balance if was approved
    if (wasApproved) {
        const emp = await Employee.findById(leave.employeeId);
        if (emp) {
            emp.leaveBalances = emp.leaveBalances || {};
            const current = emp.leaveBalances[leave.leaveType] || 0;
            emp.leaveBalances[leave.leaveType] = current + leave.numberOfDays;
            await emp.save();
        }
    }

    res.json({ success: true, data: leave });
});

// ============================================================
// HOLIDAYS
// ============================================================

export const createHoliday = asyncHandler(async (req, res) => {
    const h = await Holiday.create(req.body);
    res.status(201).json({ success: true, data: h });
});

export const getHolidays = asyncHandler(async (req, res) => {
    const { year, type } = req.query;
    const filter = {};
    if (year) {
        const start = new Date(`${year}-01-01`);
        const end = new Date(`${year}-12-31`);
        filter.date = { $gte: start, $lte: end };
    }
    if (type) filter.type = type;

    const holidays = await Holiday.find(filter).sort({ date: 1 });
    res.json({ success: true, count: holidays.length, data: holidays });
});

export const updateHoliday = asyncHandler(async (req, res) => {
    const h = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!h) { res.status(404); throw new Error('Holiday not found'); }
    res.json({ success: true, data: h });
});

export const deleteHoliday = asyncHandler(async (req, res) => {
    const h = await Holiday.findById(req.params.id);
    if (!h) { res.status(404); throw new Error('Holiday not found'); }
    h.deletedAt = new Date(); h.isActive = false; await h.save();
    res.json({ success: true });
});

// ============================================================
// SALARY STRUCTURES
// ============================================================

export const createSalaryStructure = asyncHandler(async (req, res) => {
    const s = await SalaryStructure.create(req.body);
    res.status(201).json({ success: true, data: s });
});

export const getSalaryStructures = asyncHandler(async (req, res) => {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const list = await SalaryStructure.find(filter).sort({ name: 1 });
    res.json({ success: true, count: list.length, data: list });
});

export const updateSalaryStructure = asyncHandler(async (req, res) => {
    const s = await SalaryStructure.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!s) { res.status(404); throw new Error('Salary structure not found'); }
    res.json({ success: true, data: s });
});

export const deleteSalaryStructure = asyncHandler(async (req, res) => {
    const s = await SalaryStructure.findById(req.params.id);
    if (!s) { res.status(404); throw new Error('Salary structure not found'); }
    s.deletedAt = new Date(); s.isActive = false; await s.save();
    res.json({ success: true });
});

// ============================================================
// LEAVE STRUCTURES & PROFILE SELF-SERVICE
// ============================================================

export const createLeaveStructure = asyncHandler(async (req, res) => {
    const s = await LeaveStructure.create(req.body);
    res.status(201).json({ success: true, data: s });
});

export const getLeaveStructures = asyncHandler(async (req, res) => {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const list = await LeaveStructure.find(filter).sort({ name: 1 });
    res.json({ success: true, count: list.length, data: list });
});

export const updateLeaveStructure = asyncHandler(async (req, res) => {
    const s = await LeaveStructure.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!s) { res.status(404); throw new Error('Leave structure not found'); }
    res.json({ success: true, data: s });
});

export const deleteLeaveStructure = asyncHandler(async (req, res) => {
    const s = await LeaveStructure.findById(req.params.id);
    if (!s) { res.status(404); throw new Error('Leave structure not found'); }
    s.deletedAt = new Date(); s.isActive = false; await s.save();
    res.json({ success: true });
});

export const getMyEmployeeProfile = asyncHandler(async (req, res) => {
    const emp = await Employee.findOne({ userId: req.user._id })
        .populate('departmentId', 'name code')
        .populate('designationId', 'name code')
        .populate('workShift', 'name startTime endTime')
        .populate('salaryStructureId', 'name code components')
        .populate('leaveStructureId', 'name code leaveBalances');
    if (!emp) {
        res.status(404);
        throw new Error('Employee profile not found for this user');
    }
    res.json({ success: true, data: emp });
});