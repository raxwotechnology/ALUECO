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
import * as XLSX from 'xlsx';

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

/**
 * Import monthly attendance from Excel file (one employee per row with daily data)
 */
export const importMonthlyAttendanceFromExcel = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }

    const { month, year } = req.body;
    if (!month || !year) {
        res.status(400);
        throw new Error('Month and year are required');
    }

    const targetMonth = parseInt(month);
    const targetYear = parseInt(year);
    
    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const results = [];
    const errors = [];
    const validStatuses = ['present', 'absent', 'half_day', 'late', 'leave', 'holiday', 'weekend'];

    for (const row of jsonData) {
        try {
            // Extract employee information
            const employeeCode = row['EmpCode'] || row['Employee Code'] || row['employee_code'] || row['EmployeeCode'];
            if (!employeeCode) {
                errors.push({ row, error: 'Employee Code (EmpCode) missing' });
                continue;
            }

            const emp = await Employee.findOne({ employeeCode });
            if (!emp) {
                errors.push({ row, error: `Employee not found with code: ${employeeCode}` });
                continue;
            }

            // Validate employee name if provided
            const employeeName = row['Name'] || row['Employee Name'];
            if (employeeName) {
                const normalizedName = employeeName.toLowerCase().trim();
                const dbFullName = emp.fullName.toLowerCase().trim();
                if (!dbFullName.includes(normalizedName) && !normalizedName.includes(dbFullName)) {
                    errors.push({ 
                        row, 
                        error: `Name mismatch for employee ${employeeCode}: expected "${emp.fullName}", got "${employeeName}"`,
                        warning: true
                    });
                }
            }

            // Process each day of the month (01-31)
            const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
            
            for (let day = 1; day <= daysInMonth; day++) {
                const dayKey = day.toString().padStart(2, '0');
                
                // Extract daily data - try multiple column name formats
                const arrivedTime = row[`Arrived Time_${dayKey}`] || row[`Arrived Time ${dayKey}`] || row[`Day${dayKey}_In`] || row[`D${dayKey}_In`] || row[`In_${dayKey}`];
                const deptTime = row[`Dept. Time_${dayKey}`] || row[`Dept. Time ${dayKey}`] || row[`Day${dayKey}_Out`] || row[`D${dayKey}_Out`] || row[`Out_${dayKey}`];
                const workingHrs = row[`Working Hrs._${dayKey}`] || row[`Working Hrs. ${dayKey}`] || row[`WorkHrs_${dayKey}`] || row[`Work_${dayKey}`];
                const otHrs = row[`O.Times Hrs._${dayKey}`] || row[`O.Times Hrs. ${dayKey}`] || row[`OT_${dayKey}`] || row[`Overtime_${dayKey}`];
                const status = row[`Status_${dayKey}`] || row[`Status ${dayKey}`] || row[`D${dayKey}_Status`] || row[`S_${dayKey}`];

                // Skip if no data for this day
                const hasArrivedTime = arrivedTime && arrivedTime !== '' && arrivedTime !== 0;
                const hasDeptTime = deptTime && deptTime !== '' && deptTime !== 0;
                const hasStatus = status && status !== '' && status !== 0;
                
                if (!hasArrivedTime && !hasDeptTime && !hasStatus) {
                    continue;
                }

                // Create attendance date
                const attendanceDate = new Date(targetYear, targetMonth - 1, day);
                attendanceDate.setHours(0, 0, 0, 0);

                // Check if attendance already exists
                let att = await Attendance.findOne({ employeeId: emp._id, date: attendanceDate });

                if (!att) {
                    att = new Attendance({
                        employeeId: emp._id,
                        employeeCode: emp.employeeCode,
                        employeeName: emp.fullName,
                        date: attendanceDate,
                        markedBy: req.user._id,
                    });
                }

                // Normalize status
                let normalizedStatus = 'present';
                if (status) {
                    const statusLower = status.toLowerCase().trim();
                    const statusMap = {
                        'present': 'present', 'p': 'present', '✓': 'present',
                        'absent': 'absent', 'a': 'absent', '✗': 'absent',
                        'half day': 'half_day', 'half-day': 'half_day', 'hd': 'half_day', '½': 'half_day',
                        'late': 'late', 'l': 'late',
                        'leave': 'leave', 'lv': 'leave',
                        'holiday': 'holiday', 'h': 'holiday',
                        'weekend': 'weekend', 'w': 'weekend', 'wo': 'weekend'
                    };
                    normalizedStatus = statusMap[statusLower] || statusLower;
                    
                    if (!validStatuses.includes(normalizedStatus)) {
                        normalizedStatus = 'present';
                    }
                }
                
                att.status = normalizedStatus;

                // Parse check-in time
                if (arrivedTime) {
                    let checkIn;
                    if (typeof arrivedTime === 'string' && arrivedTime.includes(':')) {
                        const [hours, minutes] = arrivedTime.split(':').map(Number);
                        checkIn = new Date(attendanceDate);
                        checkIn.setHours(hours, minutes, 0, 0);
                    } else {
                        checkIn = new Date(arrivedTime);
                    }
                    
                    if (!isNaN(checkIn.getTime())) {
                        att.checkInTime = checkIn;
                    }
                }

                // Parse check-out time
                if (deptTime) {
                    let checkOut;
                    if (typeof deptTime === 'string' && deptTime.includes(':')) {
                        const [hours, minutes] = deptTime.split(':').map(Number);
                        checkOut = new Date(attendanceDate);
                        checkOut.setHours(hours, minutes, 0, 0);
                    } else {
                        checkOut = new Date(deptTime);
                    }
                    
                    if (!isNaN(checkOut.getTime())) {
                        att.checkOutTime = checkOut;
                    }
                }

                // Calculate worked minutes from working hours if provided
                if (workingHrs && typeof workingHrs === 'string') {
                    const [hrs, mins] = workingHrs.split(':').map(Number);
                    if (!isNaN(hrs) && !isNaN(mins)) {
                        att.totalWorkedMinutes = (hrs * 60) + mins;
                    }
                }

                // Calculate overtime from OT hours if provided
                if (otHrs && typeof otHrs === 'string') {
                    const [hrs, mins] = otHrs.split(':').map(Number);
                    if (!isNaN(hrs) && !isNaN(mins)) {
                        att.overtimeMinutes = (hrs * 60) + mins;
                    }
                }

                // Auto-calculate if not provided
                if (att.checkInTime && att.checkOutTime) {
                    const diff = (new Date(att.checkOutTime) - new Date(att.checkInTime)) / 60000;
                    if (!att.totalWorkedMinutes) {
                        att.totalWorkedMinutes = Math.max(0, Math.floor(diff));
                    }
                    if (!att.overtimeMinutes) {
                        att.overtimeMinutes = Math.max(0, att.totalWorkedMinutes - 480);
                    }
                    
                    // Calculate late minutes
                    const shiftStart = new Date(attendanceDate);
                    shiftStart.setHours(8, 0, 0, 0);
                    if (att.checkInTime > shiftStart) {
                        att.lateMinutes = Math.floor((att.checkInTime - shiftStart) / 60000);
                    }
                }

                await att.save();
                results.push(att);
            }
        } catch (error) {
            errors.push({ row, error: error.message });
        }
    }

    // Separate warnings from critical errors
    const warnings = errors.filter(e => e.warning);
    const criticalErrors = errors.filter(e => !e.warning);

    res.json({
        success: true,
        imported: results.length,
        errors: criticalErrors.length,
        warnings: warnings.length,
        data: results,
        errorDetails: criticalErrors,
        warningDetails: warnings,
    });
});

/**
 * Import attendance from Excel or CSV file (daily format)
 */
export const importAttendanceFromExcel = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }

    const { date } = req.body;
    if (!date) {
        res.status(400);
        throw new Error('Date is required');
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    let jsonData;

    // Check file type and parse accordingly
    const originalName = req.file.originalname.toLowerCase();
    
    if (originalName.endsWith('.csv')) {
        // Parse CSV file using XLSX (more reliable for CSV parsing)
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    } else {
        // Parse Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    }

    const results = [];
    const errors = [];
    const validStatuses = ['present', 'absent', 'half_day', 'late', 'leave', 'holiday', 'weekend'];

    for (const row of jsonData) {
        try {
            // Find employee by code (support multiple column name formats)
            const employeeCode = row['Employee Code'] || row['employee_code'] || row['EmployeeCode'] || row['employeeCode'];
            if (!employeeCode) {
                errors.push({ row, error: 'Employee Code missing' });
                continue;
            }

            const emp = await Employee.findOne({ employeeCode });
            if (!emp) {
                errors.push({ row, error: `Employee not found with code: ${employeeCode}` });
                continue;
            }

            // Validate employee name if provided
            const employeeName = row['Employee Name'] || row['employee_name'] || row['EmployeeName'] || row['employeeName'];
            if (employeeName) {
                const normalizedName = employeeName.toLowerCase().trim();
                const dbFullName = emp.fullName.toLowerCase().trim();
                const dbFirstName = emp.firstName ? emp.firstName.toLowerCase().trim() : '';
                const dbLastName = emp.lastName ? emp.lastName.toLowerCase().trim() : '';
                
                // Check if name matches (partial match allowed)
                const nameMatches = normalizedName.includes(dbFirstName) || 
                                   normalizedName.includes(dbLastName) ||
                                   dbFullName.includes(normalizedName);
                
                if (!nameMatches) {
                    errors.push({ 
                        row, 
                        error: `Name mismatch for employee ${employeeCode}: expected "${emp.fullName}", got "${employeeName}"`,
                        warning: true
                    });
                    // Continue anyway - code match is more important
                }
            }

            // Check if attendance already exists
            let att = await Attendance.findOne({ employeeId: emp._id, date: attendanceDate });

            if (!att) {
                att = new Attendance({
                    employeeId: emp._id,
                    employeeCode: emp.employeeCode,
                    employeeName: emp.fullName,
                    date: attendanceDate,
                    markedBy: req.user._id,
                });
            }

            // Normalize and validate status
            let status = (row['Status'] || row['status'] || 'present').toLowerCase().trim();
            
            // Map common status variations
            const statusMap = {
                'present': 'present',
                'p': 'present',
                'absent': 'absent',
                'a': 'absent',
                'half day': 'half_day',
                'half-day': 'half_day',
                'half_day': 'half_day',
                'hd': 'half_day',
                'late': 'late',
                'l': 'late',
                'leave': 'leave',
                'lv': 'leave',
                'holiday': 'holiday',
                'h': 'holiday',
                'weekend': 'weekend',
                'w': 'weekend'
            };
            
            status = statusMap[status] || status;
            
            if (!validStatuses.includes(status)) {
                errors.push({ 
                    row, 
                    error: `Invalid status "${row['Status'] || row['status']}" for employee ${employeeCode}. Defaulting to "present"`,
                    warning: true
                });
                status = 'present';
            }
            
            att.status = status;

            // Parse check-in time (support multiple formats)
            const checkInTime = row['Check In'] || row['check_in'] || row['CheckIn'] || row['checkIn'] || row['Time In'] || row['time_in'];
            if (checkInTime) {
                let checkIn;
                
                // Try parsing as time string (HH:MM) or full date
                if (typeof checkInTime === 'string' && checkInTime.includes(':')) {
                    // Time format - combine with attendance date
                    const [hours, minutes] = checkInTime.split(':').map(Number);
                    checkIn = new Date(attendanceDate);
                    checkIn.setHours(hours, minutes, 0, 0);
                } else {
                    // Try direct date parsing
                    checkIn = new Date(checkInTime);
                }
                
                if (!isNaN(checkIn.getTime())) {
                    att.checkInTime = checkIn;
                } else {
                    errors.push({ 
                        row, 
                        error: `Invalid check-in time format: ${checkInTime} for employee ${employeeCode}`,
                        warning: true
                    });
                }
            }

            // Parse check-out time (support multiple formats)
            const checkOutTime = row['Check Out'] || row['check_out'] || row['CheckOut'] || row['checkOut'] || row['Time Out'] || row['time_out'];
            if (checkOutTime) {
                let checkOut;
                
                // Try parsing as time string (HH:MM) or full date
                if (typeof checkOutTime === 'string' && checkOutTime.includes(':')) {
                    // Time format - combine with attendance date
                    const [hours, minutes] = checkOutTime.split(':').map(Number);
                    checkOut = new Date(attendanceDate);
                    checkOut.setHours(hours, minutes, 0, 0);
                } else {
                    // Try direct date parsing
                    checkOut = new Date(checkOutTime);
                }
                
                if (!isNaN(checkOut.getTime())) {
                    att.checkOutTime = checkOut;
                } else {
                    errors.push({ 
                        row, 
                        error: `Invalid check-out time format: ${checkOutTime} for employee ${employeeCode}`,
                        warning: true
                    });
                }
            }

            // Calculate worked minutes and overtime
            if (att.checkInTime && att.checkOutTime) {
                const diff = (new Date(att.checkOutTime) - new Date(att.checkInTime)) / 60000;
                att.totalWorkedMinutes = Math.max(0, Math.floor(diff));
                
                // Calculate overtime (standard 8-hour shift = 480 minutes)
                att.overtimeMinutes = Math.max(0, att.totalWorkedMinutes - 480);
                
                // Calculate late minutes if check-in is after 8:00 AM
                const shiftStart = new Date(attendanceDate);
                shiftStart.setHours(8, 0, 0, 0);
                if (att.checkInTime > shiftStart) {
                    att.lateMinutes = Math.floor((att.checkInTime - shiftStart) / 60000);
                }
            } else {
                att.totalWorkedMinutes = 0;
                att.overtimeMinutes = 0;
                att.lateMinutes = 0;
            }

            await att.save();
            results.push(att);
        } catch (error) {
            errors.push({ row, error: error.message });
        }
    }

    // Separate warnings from critical errors
    const warnings = errors.filter(e => e.warning);
    const criticalErrors = errors.filter(e => !e.warning);

    res.json({
        success: true,
        imported: results.length,
        errors: criticalErrors.length,
        warnings: warnings.length,
        data: results,
        errorDetails: criticalErrors,
        warningDetails: warnings,
    });
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
    if (year && year !== 'all') {
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