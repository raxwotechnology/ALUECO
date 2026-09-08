import XLSX from 'xlsx';

/**
 * Parse Monthly Performance Report Excel file
 * Expected structure:
 * - EmpCode, Name, Designation columns
 * - Day 01 → Day 31 columns
 * - Arrived Time, Dept. Time, Working Hrs., O.Times Hrs., Status rows
 * - Monthly summary columns (Present, HL, WO, Absent, Leave, PaidDays, etc.)
 */
export const parseMonthlyAttendanceExcel = (filePath, month, year) => {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        const attendanceData = [];
        const errors = [];
        const warnings = [];

        // Find employee sections in the Excel
        let currentRowIndex = 0;
        
        while (currentRowIndex < rows.length) {
            const row = rows[currentRowIndex];
            
            // Look for EmpCode column to identify employee section
            const empCodeIndex = row.findIndex(cell => cell === 'EmpCode');
            
            if (empCodeIndex === -1) {
                currentRowIndex++;
                continue;
            }

            // Found employee section
            const empCode = rows[currentRowIndex + 2]?.[empCodeIndex];
            const employeeName = rows[currentRowIndex + 2]?.[empCodeIndex + 1];
            const designation = rows[currentRowIndex + 2]?.[empCodeIndex + 2];

            if (!empCode || !employeeName) {
                errors.push(`Row ${currentRowIndex + 2}: Missing employee code or name`);
                currentRowIndex += 10;
                continue;
            }

            // Find the row with day numbers (01, 02, 03, etc.)
            let dayRow = null;
            let arrivalRow = null;
            let departureRow = null;
            let workingRow = null;
            let overtimeRow = null;
            let statusRow = null;

            // Search for key rows in the next 10 rows
            for (let i = currentRowIndex + 3; i < Math.min(currentRowIndex + 15, rows.length); i++) {
                const checkRow = rows[i];
                if (!checkRow) continue;

                const firstCell = checkRow[empCodeIndex + 3]; // Skip EmpCode, Name, Designation columns
                
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
                errors.push(`Employee ${empCode} (${employeeName}): Could not find day or status rows`);
                currentRowIndex += 15;
                continue;
            }

            // Parse daily attendance records
            const dayOffset = empCodeIndex + 3; // Start of day columns
            
            for (let day = 1; day <= 31; day++) {
                const dayColumnIndex = dayOffset + (day - 1);
                
                // Skip if column doesn't exist in row
                if (dayColumnIndex >= dayRow.length) continue;

                const status = statusRow[dayColumnIndex];
                const arrival = arrivalRow?.[dayColumnIndex] || null;
                const departure = departureRow?.[dayColumnIndex] || null;
                const workingHours = workingRow?.[dayColumnIndex] || "00:00";
                const overtimeHours = overtimeRow?.[dayColumnIndex] || "00:00";

                // Only create record if status exists
                if (status && status.trim() !== '') {
                    // Validate status
                    const validStatuses = ['P', 'A', 'AL-AL', 'POW', 'WO'];
                    if (!validStatuses.includes(status)) {
                        warnings.push(`Employee ${empCode}: Invalid status "${status}" for day ${day}`);
                    }

                    // Create date object
                    const date = new Date(year, month - 1, day);
                    
                    attendanceData.push({
                        employeeCode: empCode,
                        employeeName: employeeName,
                        designation: designation,
                        date: date,
                        status: status,
                        arrivalTime: arrival,
                        departureTime: departure,
                        workingHours: workingHours,
                        overtimeHours: overtimeHours,
                        month: month,
                        year: year
                    });
                }
            }

            currentRowIndex += 15;
        }

        return {
            success: true,
            data: attendanceData,
            errors: errors,
            warnings: warnings,
            totalRecords: attendanceData.length
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            data: [],
            errors: [],
            warnings: []
        };
    }
};

/**
 * Validate attendance data before import
 */
export const validateAttendanceData = (attendanceData) => {
    const errors = [];
    const warnings = [];

    // Check for duplicate records
    const uniqueKeys = new Set();
    attendanceData.forEach((record, index) => {
        const key = `${record.employeeCode}-${record.date.toISOString()}`;
        if (uniqueKeys.has(key)) {
            errors.push(`Duplicate record: Employee ${record.employeeCode} on ${record.date.toDateString()}`);
        }
        uniqueKeys.add(key);
    });

    // Validate dates
    attendanceData.forEach((record, index) => {
        if (isNaN(record.date.getTime())) {
            errors.push(`Invalid date for employee ${record.employeeCode} at record ${index + 1}`);
        }
    });

    // Validate status values
    const validStatuses = ['P', 'A', 'AL-AL', 'POW', 'WO'];
    attendanceData.forEach((record, index) => {
        if (!validStatuses.includes(record.status)) {
            warnings.push(`Invalid status "${record.status}" for employee ${record.employeeCode} on ${record.date.toDateString()}`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Calculate monthly summary from attendance records
 */
export const calculateMonthlySummary = (attendanceData) => {
    const summary = {
        present: 0,
        absent: 0,
        leave: 0,
        weeklyOff: 0,
        paidOff: 0,
        total: attendanceData.length
    };

    attendanceData.forEach(record => {
        switch (record.status) {
            case 'P':
                summary.present++;
                break;
            case 'A':
                summary.absent++;
                break;
            case 'AL-AL':
                summary.leave++;
                break;
            case 'WO':
                summary.weeklyOff++;
                break;
            case 'POW':
                summary.paidOff++;
                break;
        }
    });

    return summary;
};