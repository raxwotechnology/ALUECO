import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import { parseMonthlyAttendanceExcel, validateAttendanceData, calculateMonthlySummary } from '../utils/excelParser.js';
import fs from 'fs-extra';
import path from 'path';
import * as XLSX from 'xlsx';

/**
 * Attendance Import Service
 * Handles the business logic for importing monthly attendance from Excel files
 */
class AttendanceImportService {
    /**
     * Preview attendance data from Excel file before import
     */
    async previewAttendance(filePath, month, year) {
        try {
            // Parse Excel file
            const parseResult = parseMonthlyAttendanceExcel(filePath, month, year);
            
            if (!parseResult.success) {
                return {
                    success: false,
                    error: parseResult.error,
                    data: []
                };
            }

            // Validate parsed data
            const validationResult = validateAttendanceData(parseResult.data);
            
            // Match employees with database
            const employeeMatchResults = await this.matchEmployees(parseResult.data);
            
            // Calculate summary
            const summary = calculateMonthlySummary(parseResult.data);

            return {
                success: true,
                data: parseResult.data,
                validation: validationResult,
                employeeMatches: employeeMatchResults,
                summary: summary,
                parseErrors: parseResult.errors,
                parseWarnings: parseResult.warnings
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Match employee codes with database records
     */
    async matchEmployees(attendanceData) {
        const uniqueEmployeeCodes = [...new Set(attendanceData.map(d => d.employeeCode))];
        const matchedEmployees = [];
        const unmatchedEmployees = [];

        for (const empCode of uniqueEmployeeCodes) {
            const employee = await Employee.findOne({ 
                employeeCode: empCode,
                deletedAt: null 
            });

            if (employee) {
                matchedEmployees.push({
                    code: empCode,
                    name: employee.fullName,
                    employeeId: employee._id,
                    found: true
                });
            } else {
                unmatchedEmployees.push({
                    code: empCode,
                    name: attendanceData.find(d => d.employeeCode === empCode)?.employeeName || 'Unknown',
                    found: false
                });
            }
        }

        return {
            matched: matchedEmployees,
            unmatched: unmatchedEmployees,
            totalMatched: matchedEmployees.length,
            totalUnmatched: unmatchedEmployees.length
        };
    }

    /**
     * Import attendance data to database
     */
    async importAttendance(attendanceData, options = {}) {
        const { 
            skipValidation = false, 
            updateExisting = false,
            replaceMonth = false 
        } = options;

        try {
            // If replace month, delete existing records for the month
            if (replaceMonth) {
                const month = attendanceData[0]?.month;
                const year = attendanceData[0]?.year;
                
                if (month && year) {
                    await Attendance.deleteMany({ month, year });
                }
            }

            // Match employees
            const employeeMatchResults = await this.matchEmployees(attendanceData);
            
            // Filter out unmatched employees
            const matchedCodes = new Set(employeeMatchResults.matched.map(m => m.code));
            const validAttendanceData = attendanceData.filter(d => matchedCodes.has(d.employeeCode));

            // Create employee code to ID mapping
            const employeeMap = {};
            employeeMatchResults.matched.forEach(m => {
                employeeMap[m.code] = m.employeeId;
            });

            // Prepare attendance records for database
            const attendanceRecords = validAttendanceData.map(data => ({
                employeeId: employeeMap[data.employeeCode],
                employeeCode: data.employeeCode,
                employeeName: data.employeeName,
                date: data.date,
                status: data.status,
                arrivalTime: data.arrivalTime,
                departureTime: data.departureTime,
                workingHours: data.workingHours,
                overtimeHours: data.overtimeHours,
                month: data.month,
                year: data.year,
                checkInMethod: 'excel_import'
            }));

            // Bulk insert with update or skip based on options
            const importedRecords = [];
            const skippedRecords = [];
            const errorRecords = [];

            for (const record of attendanceRecords) {
                try {
                    // Check for existing record
                    const existing = await Attendance.findOne({
                        employeeId: record.employeeId,
                        date: record.date
                    });

                    if (existing) {
                        if (updateExisting) {
                            await Attendance.findByIdAndUpdate(existing._id, record);
                            importedRecords.push(record);
                        } else {
                            skippedRecords.push(record);
                        }
                    } else {
                        await Attendance.create(record);
                        importedRecords.push(record);
                    }
                } catch (error) {
                    errorRecords.push({
                        record,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                imported: importedRecords.length,
                skipped: skippedRecords.length,
                errors: errorRecords.length,
                errorDetails: errorRecords,
                employeeMatchResults: employeeMatchResults
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get monthly attendance summary
     */
    async getMonthlyAttendanceSummary(month, year) {
        try {
            const attendanceRecords = await Attendance.find({ month, year })
                .populate('employeeId', 'employeeCode fullName')
                .sort({ date: 1 });

            // Group by employee
            const employeeSummary = {};
            
            attendanceRecords.forEach(record => {
                const empCode = record.employeeCode;
                const empName = record.employeeName || record.employeeId?.fullName || 'Unknown';
                
                if (!employeeSummary[empCode]) {
                    employeeSummary[empCode] = {
                        employeeCode: empCode,
                        employeeName: empName,
                        employeeId: record.employeeId,
                        present: 0,
                        absent: 0,
                        leave: 0,
                        weeklyOff: 0,
                        paidOff: 0,
                        total: 0,
                        records: []
                    };
                }

                employeeSummary[empCode].total++;
                employeeSummary[empCode].records.push(record);

                switch (record.status) {
                    case 'P':
                        employeeSummary[empCode].present++;
                        break;
                    case 'A':
                        employeeSummary[empCode].absent++;
                        break;
                    case 'AL-AL':
                        employeeSummary[empCode].leave++;
                        break;
                    case 'WO':
                        employeeSummary[empCode].weeklyOff++;
                        break;
                    case 'POW':
                        employeeSummary[empCode].paidOff++;
                        break;
                }
            });

            // Calculate overall summary
            const overallSummary = {
                present: 0,
                absent: 0,
                leave: 0,
                weeklyOff: 0,
                paidOff: 0,
                totalEmployees: Object.keys(employeeSummary).length,
                totalRecords: attendanceRecords.length
            };

            Object.values(employeeSummary).forEach(emp => {
                overallSummary.present += emp.present;
                overallSummary.absent += emp.absent;
                overallSummary.leave += emp.leave;
                overallSummary.weeklyOff += emp.weeklyOff;
                overallSummary.paidOff += emp.paidOff;
            });

            return {
                success: true,
                overallSummary,
                employeeSummary: Object.values(employeeSummary),
                records: attendanceRecords
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check if attendance data already exists for a month
     */
    async checkExistingAttendance(month, year) {
        try {
            const existingCount = await Attendance.countDocuments({ month, year });
            return {
                exists: existingCount > 0,
                count: existingCount
            };
        } catch (error) {
            return {
                exists: false,
                error: error.message
            };
        }
    }

    /**
     * Clean up uploaded file
     */
    async cleanupFile(filePath) {
        try {
            if (await fs.pathExists(filePath)) {
                await fs.unlink(filePath);
            }
        } catch (error) {
            console.error('Error cleaning up file:', error);
        }
    }
}

/**
 * Check if the Excel file is a monthly performance report format
 * (Luxo / fingerprint machine format)
 */
export const isMonthlyPerformanceReport = (rawRows) => {
    if (!rawRows || rawRows.length === 0) return false;
    
    // Check across the first 25 rows for key indicators
    const checkLimit = Math.min(25, rawRows.length);
    let hasEmpCode = false;
    let hasDayColumns = false;
    let hasStatusRow = false;
    let hasTitle = false;

    for (let r = 0; r < checkLimit; r++) {
        const row = rawRows[r];
        if (!row || !Array.isArray(row)) continue;

        for (const cell of row) {
            if (cell === null || cell === undefined) continue;
            const str = String(cell).trim();
            if (/^(EmpCode|Emp\s*Code)$/i.test(str)) hasEmpCode = true;
            if (/^status$/i.test(str)) hasStatusRow = true;
            if (/Monthly\s*Performance\s*Report/i.test(str)) hasTitle = true;
        }

        if (row.some(c => c === '01' || c === 1 || c === '1') && row.some(c => c === '02' || c === 2 || c === '2')) {
            hasDayColumns = true;
        }
    }
    
    return (hasEmpCode && hasStatusRow) || (hasTitle && hasEmpCode) || (hasEmpCode && hasDayColumns);
};

/**
 * Parse monthly performance sheet (Luxo format)
 */
export const parseMonthlyPerformanceSheet = (rawRows) => {
    const records = [];
    const parsedEmployeesList = [];
    const errors = [];
    let period = null;

    // 1. Try to detect Month & Year from top header rows
    // e.g. "Report Date From : 01-07-2026 To : 31-07-2026"
    for (let r = 0; r < Math.min(10, rawRows.length); r++) {
        const rowStr = (rawRows[r] || []).join(' ');
        const dateMatch = rowStr.match(/(?:Report\s*Date\s*From\s*:?\s*)?(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/i);
        if (dateMatch) {
            const m = parseInt(dateMatch[2], 10);
            const y = parseInt(dateMatch[3], 10);
            if (m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
                period = { month: m, year: y };
                break;
            }
        }
    }

    if (!period) {
        const now = new Date();
        period = { month: now.getMonth() + 1, year: now.getFullYear() };
    }

    const daysInMonth = new Date(period.year, period.month, 0).getDate();
    
    // 2. Find employee sections
    let currentRowIndex = 0;
    
    while (currentRowIndex < rawRows.length) {
        const row = rawRows[currentRowIndex];
        if (!row || !Array.isArray(row)) {
            currentRowIndex++;
            continue;
        }
        
        // Look for EmpCode column header
        const empCodeIndex = row.findIndex(cell => cell !== null && cell !== undefined && /^(EmpCode|Emp\s*Code)$/i.test(String(cell).trim()));
        
        if (empCodeIndex === -1) {
            currentRowIndex++;
            continue;
        }

        const nameIndex = row.findIndex(cell => cell !== null && cell !== undefined && /^name$/i.test(String(cell).trim()));
        const desigIndex = row.findIndex(cell => cell !== null && cell !== undefined && /^designation$/i.test(String(cell).trim()));
        
        // Found employee section header. Look for the employee data row right below
        let empCode = null;
        let employeeName = null;
        let designation = null;
        let empDataRowIndex = -1;

        for (let offset = 1; offset <= 3; offset++) {
            const check = rawRows[currentRowIndex + offset];
            if (!check) continue;
            const codeCandidate = check[empCodeIndex];
            const nameCandidate = nameIndex !== -1 ? check[nameIndex] : check.slice(empCodeIndex + 1).find(c => c !== null && c !== undefined && String(c).trim() !== '');

            if (codeCandidate !== undefined && codeCandidate !== null && String(codeCandidate).trim() !== '' &&
                nameCandidate !== undefined && nameCandidate !== null && String(nameCandidate).trim() !== '') {
                const strCode = String(codeCandidate).trim();
                // Ensure it is not the days row (e.g. '01') or a label
                if (strCode !== '01' && strCode !== '1' && !/arrived/i.test(strCode)) {
                    empCode = strCode;
                    employeeName = String(nameCandidate).trim();
                    designation = desigIndex !== -1 && check[desigIndex] ? String(check[desigIndex]).trim() : '';
                    empDataRowIndex = currentRowIndex + offset;
                    break;
                }
            }
        }
        
        if (!empCode || !employeeName || empDataRowIndex === -1) {
            currentRowIndex++;
            continue;
        }
        
        // Extract employee summary columns from header row if available
        const empDataRow = rawRows[empDataRowIndex] || [];
        const headerMap = {};
        row.forEach((cell, idx) => {
            if (cell === null || cell === undefined) return;
            const key = String(cell).trim().toLowerCase();
            if (/^present$/i.test(key)) headerMap.present = idx;
            else if (/^hl$/i.test(key)) headerMap.hl = idx;
            else if (/^wo$/i.test(key)) headerMap.wo = idx;
            else if (/^absent$/i.test(key)) headerMap.absent = idx;
            else if (/^leave$/i.test(key)) headerMap.leave = idx;
            else if (/^paiddays$/i.test(key)) headerMap.paidDays = idx;
            else if (/^latehrs\.?$/i.test(key)) headerMap.lateHrs = idx;
            else if (/^workhrs\.?$/i.test(key)) headerMap.workHrs = idx;
            else if (/^ovtim\.?$/i.test(key)) headerMap.ovTim = idx;
        });

        const sheetSummary = {
            present: headerMap.present !== undefined && empDataRow[headerMap.present] !== undefined ? empDataRow[headerMap.present] : null,
            hl: headerMap.hl !== undefined && empDataRow[headerMap.hl] !== undefined ? empDataRow[headerMap.hl] : null,
            wo: headerMap.wo !== undefined && empDataRow[headerMap.wo] !== undefined ? empDataRow[headerMap.wo] : null,
            absent: headerMap.absent !== undefined && empDataRow[headerMap.absent] !== undefined ? empDataRow[headerMap.absent] : null,
            leave: headerMap.leave !== undefined && empDataRow[headerMap.leave] !== undefined ? empDataRow[headerMap.leave] : null,
            paidDays: headerMap.paidDays !== undefined && empDataRow[headerMap.paidDays] !== undefined ? empDataRow[headerMap.paidDays] : null,
            lateHrs: headerMap.lateHrs !== undefined && empDataRow[headerMap.lateHrs] !== undefined ? String(empDataRow[headerMap.lateHrs]).trim() : null,
            workHrs: headerMap.workHrs !== undefined && empDataRow[headerMap.workHrs] !== undefined ? String(empDataRow[headerMap.workHrs]).trim() : null,
            ovTim: headerMap.ovTim !== undefined && empDataRow[headerMap.ovTim] !== undefined ? String(empDataRow[headerMap.ovTim]).trim() : null,
        };

        // Find daily attendance rows below the employee header
        let dayRow = null;
        let arrivalRow = null;
        let departureRow = null;
        let workingRow = null;
        let overtimeRow = null;
        let statusRow = null;
        let nextIndex = empDataRowIndex + 1;
        
        for (let i = empDataRowIndex + 1; i < Math.min(empDataRowIndex + 12, rawRows.length); i++) {
            const checkRow = rawRows[i];
            if (!checkRow) continue;
            
            // Check if this row starts another employee section
            if (checkRow.some(c => c !== null && c !== undefined && /^(EmpCode|Emp\s*Code)$/i.test(String(c).trim()))) {
                break;
            }

            // Check labels across the first few cells
            const labelStr = checkRow.slice(0, 5).filter(Boolean).map(c => String(c).trim()).join(' ').toLowerCase();
            const hasDays = checkRow.some(c => c === '01' || c === 1 || c === '1') && checkRow.some(c => c === '02' || c === 2 || c === '2');
            
            if (hasDays && !dayRow) {
                dayRow = checkRow;
                nextIndex = Math.max(nextIndex, i + 1);
            } else if (/arrived\s*t[i|I]me/i.test(labelStr) || labelStr.includes('arrived')) {
                arrivalRow = checkRow;
                nextIndex = Math.max(nextIndex, i + 1);
            } else if (/dept\.?\s*time/i.test(labelStr) || labelStr.includes('dept')) {
                departureRow = checkRow;
                nextIndex = Math.max(nextIndex, i + 1);
            } else if (/working\s*hrs?\.?/i.test(labelStr) || (labelStr.includes('working') && labelStr.includes('hr'))) {
                workingRow = checkRow;
                nextIndex = Math.max(nextIndex, i + 1);
            } else if (/o\.?times?\s*hrs?\.?/i.test(labelStr) || labelStr.includes('o.time') || labelStr.includes('ovtim')) {
                overtimeRow = checkRow;
                nextIndex = Math.max(nextIndex, i + 1);
            } else if (/^status/i.test(labelStr) || labelStr.includes('status')) {
                statusRow = checkRow;
                nextIndex = Math.max(nextIndex, i + 1);
            }
        }
        
        if (!statusRow) {
            currentRowIndex = nextIndex;
            continue;
        }
        
        // Find column index where Day 1 starts
        let day1Index = -1;
        if (dayRow) {
            day1Index = dayRow.findIndex(c => c === '01' || c === 1 || c === '1');
        }
        if (day1Index === -1) {
            // Fallback: search statusRow for first non-label cell or use offset
            day1Index = empCodeIndex + 3;
        }
        
        let empPresent = 0;
        let empAbsent = 0;
        let empLeave = 0;
        let empWo = 0;
        let empHl = 0;
        let empWorkedMins = 0;
        let empOtMins = 0;
        const empDays = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const dayColumnIndex = day1Index + (day - 1);
            
            if (dayColumnIndex >= statusRow.length) continue;
            
            const rawStatus = statusRow[dayColumnIndex];
            const status = rawStatus ? String(rawStatus).trim() : '';
            const arrival = arrivalRow?.[dayColumnIndex] ? String(arrivalRow[dayColumnIndex]).trim() : null;
            const departure = departureRow?.[dayColumnIndex] ? String(departureRow[dayColumnIndex]).trim() : null;
            const workingHours = workingRow?.[dayColumnIndex] ? String(workingRow[dayColumnIndex]).trim() : "00:00";
            const overtimeHours = overtimeRow?.[dayColumnIndex] ? String(overtimeRow[dayColumnIndex]).trim() : "00:00";
            
            if (status && status !== '') {
                const date = new Date(period.year, period.month - 1, day);
                
                // Parse working hours to minutes
                const [workHrs, workMins] = workingHours.split(':').map(Number);
                const totalWorkedMinutes = (workHrs || 0) * 60 + (workMins || 0);
                
                // Parse overtime to minutes
                const [otHrs, otMins] = overtimeHours.split(':').map(Number);
                const overtimeMinutes = (otHrs || 0) * 60 + (otMins || 0);
                
                if (status === 'P' || status === 'POW') empPresent++;
                else if (status === 'A') empAbsent++;
                else if (status === 'WO') empWo++;
                else if (status === 'HL') empHl++;
                else if (status === 'AL-AL' || status === 'L' || status.toLowerCase().includes('leave')) empLeave++;

                empWorkedMins += totalWorkedMinutes;
                empOtMins += overtimeMinutes;

                empDays.push({
                    day,
                    date: `${period.year}-${String(period.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                    status,
                    arrivalTime: arrival,
                    departureTime: departure,
                    workingHours,
                    overtimeHours,
                    totalWorkedMinutes,
                    overtimeMinutes,
                });

                records.push({
                    employeeCode: empCode,
                    employeeName: employeeName,
                    designation: designation,
                    date: date,
                    status: status,
                    checkInTime: arrival,
                    checkOutTime: departure,
                    arrivalTime: arrival,
                    departureTime: departure,
                    workingHours: workingHours,
                    overtimeHours: overtimeHours,
                    totalWorkedMinutes: totalWorkedMinutes,
                    overtimeMinutes: overtimeMinutes,
                    month: period.month,
                    year: period.year,
                });
            }
        }
        
        const formatMins = (mins) => {
            if (!mins || mins <= 0) return '00:00';
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return `${h}:${String(m).padStart(2, '0')}`;
        };

        parsedEmployeesList.push({
            employeeCode: empCode,
            employeeName: employeeName,
            designation: designation || 'Staff',
            summary: {
                present: sheetSummary.present !== null ? Number(sheetSummary.present) : empPresent,
                absent: sheetSummary.absent !== null ? Number(sheetSummary.absent) : empAbsent,
                leave: sheetSummary.leave !== null ? Number(sheetSummary.leave) : empLeave,
                weeklyOff: sheetSummary.wo !== null ? Number(sheetSummary.wo) : empWo,
                halfDay: sheetSummary.hl !== null ? Number(sheetSummary.hl) : empHl,
                paidDays: sheetSummary.paidDays !== null ? Number(sheetSummary.paidDays) : (empPresent + empWo),
                lateHours: sheetSummary.lateHrs || '00:00',
                workingHours: sheetSummary.workHrs || formatMins(empWorkedMins),
                overtimeHours: sheetSummary.ovTim || formatMins(empOtMins),
                totalWorkedMinutes: empWorkedMins,
                overtimeMinutes: empOtMins,
            },
            days: empDays,
        });

        currentRowIndex = nextIndex;
    }
    
    return { period, records, employees: parsedEmployeesList, errors };
};

/**
 * Parse daily attendance rows from simple flat format
 */
export const parseDailyAttendanceRows = (jsonData) => {
    return jsonData.map(row => ({
        employeeCode: row['Employee Code'] || row['EmpCode'] || row['employeeCode'],
        employeeName: row['Name'] || row['Employee Name'] || row['employeeName'],
        status: row['Status'] || row['status'] || 'present',
        checkInTime: row['Check In'] || row['CheckIn'] || row['checkInTime'],
        checkOutTime: row['Check Out'] || row['CheckOut'] || row['checkOutTime'],
        notes: row['Notes'] || row['notes']
    })).filter(row => row.employeeCode);
};

/**
 * Normalize employee code (remove spaces, convert to string)
 */
export const normalizeEmployeeCode = (code) => {
    if (!code) return null;
    return String(code).trim().toUpperCase();
};

/**
 * Parse time string and apply to a specific date
 */
export const parseTimeOnDate = (timeStr, date) => {
    if (!timeStr || !date) return null;
    
    // Handle Excel time serial numbers
    if (typeof timeStr === 'number') {
        const excelDate = new Date(Math.round((timeStr - 25569) * 86400 * 1000));
        return excelDate;
    }
    
    // Handle time strings like "08:30", "08:30 AM", etc.
    const timeMatch = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
        const [, hours, minutes, meridiem] = timeMatch;
        let hour = parseInt(hours, 10);
        const minute = parseInt(minutes, 10);
        
        if (meridiem?.toUpperCase() === 'PM' && hour !== 12) {
            hour += 12;
        } else if (meridiem?.toUpperCase() === 'AM' && hour === 12) {
            hour = 0;
        }
        
        const result = new Date(date);
        result.setHours(hour, minute, 0, 0);
        return result;
    }
    
    return null;
};

export default new AttendanceImportService();