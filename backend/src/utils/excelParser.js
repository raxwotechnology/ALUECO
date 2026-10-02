import XLSX from 'xlsx';

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
            const empCodeIndex = row.findIndex(cell => cell !== null && cell !== undefined && /^(EmpCode|Emp\s*Code)$/i.test(String(cell).trim()));
            
            if (empCodeIndex === -1) {
                currentRowIndex++;
                continue;
            }

            const nameIndex = row.findIndex(cell => cell !== null && cell !== undefined && /^name$/i.test(String(cell).trim()));
            const desigIndex = row.findIndex(cell => cell !== null && cell !== undefined && /^designation$/i.test(String(cell).trim()));

            // Found employee section. Look for employee data in subsequent rows (offset 1 to 3)
            let empCode = null;
            let employeeName = null;
            let designation = null;
            let empDataRowIndex = -1;

            for (let offset = 1; offset <= 3; offset++) {
                const check = rows[currentRowIndex + offset];
                if (!check) continue;
                const codeCandidate = check[empCodeIndex];
                const nameCandidate = nameIndex !== -1 ? check[nameIndex] : check.slice(empCodeIndex + 1).find(c => c !== null && c !== undefined && String(c).trim() !== '');

                if (codeCandidate !== undefined && codeCandidate !== null && String(codeCandidate).trim() !== '' &&
                    nameCandidate !== undefined && nameCandidate !== null && String(nameCandidate).trim() !== '') {
                    const strCode = String(codeCandidate).trim();
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

            // Find key attendance rows
            let dayRow = null;
            let arrivalRow = null;
            let departureRow = null;
            let workingRow = null;
            let overtimeRow = null;
            let statusRow = null;
            let nextIndex = empDataRowIndex + 1;

            for (let i = empDataRowIndex + 1; i < Math.min(empDataRowIndex + 12, rows.length); i++) {
                const checkRow = rows[i];
                if (!checkRow) continue;

                if (checkRow.some(c => c !== null && c !== undefined && /^(EmpCode|Emp\s*Code)$/i.test(String(c).trim()))) {
                    break;
                }

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

            // Find start of day columns
            let day1Index = -1;
            if (dayRow) {
                day1Index = dayRow.findIndex(c => c === '01' || c === 1 || c === '1');
            }
            if (day1Index === -1) {
                day1Index = empCodeIndex + 3;
            }
            
            const daysInMonth = new Date(year, month, 0).getDate();

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
                    const validStatuses = ['P', 'A', 'AL-AL', 'POW', 'WO', 'HL', 'L'];
                    if (!validStatuses.includes(status)) {
                        warnings.push(`Employee ${empCode}: Invalid status "${status}" for day ${day}`);
                    }

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

            currentRowIndex = nextIndex;
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