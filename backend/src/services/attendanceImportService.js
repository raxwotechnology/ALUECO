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
    
    // Look for key indicators of monthly performance report format
    const firstRow = rawRows[0];
    const hasEmpCode = firstRow.some(cell => cell === 'EmpCode' || cell === 'Emp Code');
    
    // Look for day columns (01, 02, 03, etc.)
    const hasDayColumns = rawRows.some(row => 
        row.some(cell => cell === '01' || cell === 1 || cell === '02' || cell === 2)
    );
    
    // Look for status row
    const hasStatusRow = rawRows.some(row => 
        row.some(cell => cell === 'Status')
    );
    
    return hasEmpCode && hasDayColumns && hasStatusRow;
};

/**
 * Parse monthly performance sheet (Luxo format)
 */
export const parseMonthlyPerformanceSheet = (rawRows) => {
    const records = [];
    const errors = [];
    let period = null;
    
    // Find employee sections
    let currentRowIndex = 0;
    
    while (currentRowIndex < rawRows.length) {
        const row = rawRows[currentRowIndex];
        
        // Look for EmpCode column
        const empCodeIndex = row.findIndex(cell => cell === 'EmpCode' || cell === 'Emp Code');
        
        if (empCodeIndex === -1) {
            currentRowIndex++;
            continue;
        }
        
        // Found employee section
        const empCode = rawRows[currentRowIndex + 2]?.[empCodeIndex];
        const employeeName = rawRows[currentRowIndex + 2]?.[empCodeIndex + 1];
        
        if (!empCode || !employeeName) {
            currentRowIndex += 10;
            continue;
        }
        
        // Find day and status rows
        let dayRow = null;
        let arrivalRow = null;
        let departureRow = null;
        let workingRow = null;
        let overtimeRow = null;
        let statusRow = null;
        
        for (let i = currentRowIndex + 3; i < Math.min(currentRowIndex + 15, rawRows.length); i++) {
            const checkRow = rawRows[i];
            if (!checkRow) continue;
            
            const firstCell = checkRow[empCodeIndex + 3];
            
            if (firstCell === '01' || firstCell === 1) {
                dayRow = checkRow;
            } else if (firstCell === 'Arrived Time' || firstCell === 'Arrived Time ') {
                arrivalRow = checkRow;
            } else if (firstCell === 'Dept.Time' || firstCell === 'Dept. Time') {
                departureRow = checkRow;
            } else if (firstCell === 'Working Hrs.' || firstCell === 'Working Hrs') {
                workingRow = checkRow;
            } else if (firstCell === 'O.Times Hrs.' || firstCell === 'O.Times Hrs') {
                overtimeRow = checkRow;
            } else if (firstCell === 'Status') {
                statusRow = checkRow;
            }
        }
        
        if (!dayRow || !statusRow) {
            currentRowIndex += 15;
            continue;
        }
        
        // Parse daily attendance records
        const dayOffset = empCodeIndex + 3;
        
        for (let day = 1; day <= 31; day++) {
            const dayColumnIndex = dayOffset + (day - 1);
            
            if (dayColumnIndex >= dayRow.length) continue;
            
            const status = statusRow[dayColumnIndex];
            const arrival = arrivalRow?.[dayColumnIndex] || null;
            const departure = departureRow?.[dayColumnIndex] || null;
            const workingHours = workingRow?.[dayColumnIndex] || "00:00";
            const overtimeHours = overtimeRow?.[dayColumnIndex] || "00:00";
            
            if (status && status.trim() !== '') {
                // Determine month/year from context or use current
                const now = new Date();
                if (!period) {
                    period = { month: now.getMonth() + 1, year: now.getFullYear() };
                }
                
                const date = new Date(period.year, period.month - 1, day);
                
                // Parse working hours to minutes
                const [workHrs, workMins] = workingHours.split(':').map(Number);
                const totalWorkedMinutes = (workHrs || 0) * 60 + (workMins || 0);
                
                // Parse overtime to minutes
                const [otHrs, otMins] = overtimeHours.split(':').map(Number);
                const overtimeMinutes = (otHrs || 0) * 60 + (otMins || 0);
                
                records.push({
                    employeeCode: empCode,
                    employeeName: employeeName,
                    date: date,
                    status: status,
                    checkInTime: arrival,
                    checkOutTime: departure,
                    totalWorkedMinutes: totalWorkedMinutes,
                    overtimeMinutes: overtimeMinutes
                });
            }
        }
        
        currentRowIndex += 15;
    }
    
    return { period, records, errors };
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