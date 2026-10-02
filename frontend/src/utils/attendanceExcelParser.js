import * as XLSX from 'xlsx';

/**
 * Check if the Excel file is a monthly performance report format
 * (Luxo / biometric fingerprint machine format)
 */
export const isMonthlyPerformanceReport = (rawRows) => {
    if (!rawRows || rawRows.length === 0) return false;
    
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

const formatMins = (mins) => {
    if (!mins || mins <= 0) return '00:00';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
};

/**
 * Parse monthly performance report (Luxo format)
 */
export const parseMonthlyPerformanceSheet = (rawRows) => {
    const records = [];
    const parsedEmployeesList = [];
    const errors = [];
    let period = null;

    // Detect Month & Year from top header rows
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
    let currentRowIndex = 0;

    while (currentRowIndex < rawRows.length) {
        const row = rawRows[currentRowIndex];
        if (!row || !Array.isArray(row)) {
            currentRowIndex++;
            continue;
        }

        const empCodeIndex = row.findIndex(cell => cell !== null && cell !== undefined && /^(EmpCode|Emp\s*Code)$/i.test(String(cell).trim()));
        if (empCodeIndex === -1) {
            currentRowIndex++;
            continue;
        }

        const nameIndex = row.findIndex(cell => cell !== null && cell !== undefined && /^name$/i.test(String(cell).trim()));
        const desigIndex = row.findIndex(cell => cell !== null && cell !== undefined && /^designation$/i.test(String(cell).trim()));

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

        let day1Index = -1;
        if (dayRow) {
            day1Index = dayRow.findIndex(c => c === '01' || c === 1 || c === '1');
        }
        if (day1Index === -1) {
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
                const [workHrs, workMins] = workingHours.split(':').map(Number);
                const totalWorkedMinutes = (workHrs || 0) * 60 + (workMins || 0);

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
                    date: new Date(period.year, period.month - 1, day),
                    status,
                    checkInTime: arrival,
                    checkOutTime: departure,
                    arrivalTime: arrival,
                    departureTime: departure,
                    workingHours,
                    overtimeHours,
                    totalWorkedMinutes,
                    overtimeMinutes,
                    month: period.month,
                    year: period.year,
                });
            }
        }

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
 * Client-side parse Excel file directly in browser
 */
export const parseAttendanceFileInBrowser = async (file, existingEmployees = []) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (isMonthlyPerformanceReport(rawRows)) {
        const { period, records, employees: parsedEmployees, errors } = parseMonthlyPerformanceSheet(rawRows);
        const monthName = period?.month ? `${monthNames[period.month - 1]} ${period.year}` : 'Detected Period';

        let matchedCount = 0;
        let unmatchedCount = 0;

        const enrichedEmployees = parsedEmployees.map(emp => {
            const rawCode = String(emp.employeeCode || '').trim();
            const cleanNum = rawCode.replace(/[^0-9]/g, '');

            const match = existingEmployees.find(e => {
                const eCode = String(e.employeeCode || '').trim().toUpperCase();
                const eNum = eCode.replace(/[^0-9]/g, '');
                if (eCode === rawCode.toUpperCase()) return true;
                if (cleanNum && eNum && cleanNum === eNum) return true;
                if (emp.employeeName && (
                    e.firstName?.toLowerCase() === emp.employeeName.toLowerCase() ||
                    e.lastName?.toLowerCase() === emp.employeeName.toLowerCase() ||
                    e.fullName?.toLowerCase() === emp.employeeName.toLowerCase() ||
                    e.displayName?.toLowerCase() === emp.employeeName.toLowerCase()
                )) return true;
                return false;
            });

            const isRegistered = !!match;
            if (isRegistered) matchedCount++;
            else unmatchedCount++;

            return {
                ...emp,
                isRegistered,
                dbEmployee: match ? {
                    _id: match._id,
                    employeeCode: match.employeeCode,
                    fullName: match.fullName || `${match.firstName || ''} ${match.lastName || ''}`.trim(),
                    displayName: match.displayName,
                    designation: match.designationId?.name || match.designation || 'Staff',
                } : null,
            };
        });

        return {
            success: true,
            format: 'monthly',
            period: {
                ...period,
                monthName,
                daysInMonth: period ? new Date(period.year, period.month, 0).getDate() : 31,
            },
            summary: {
                totalEmployees: enrichedEmployees.length,
                matchedCount,
                unmatchedCount,
                totalAttendanceDays: records.length,
            },
            employees: enrichedEmployees,
            errors,
        };
    }

    // Daily format
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    const enrichedDaily = jsonData.map(row => {
        const code = row['Employee Code'] || row['EmpCode'] || row['employeeCode'];
        const name = row['Name'] || row['Employee Name'] || row['employeeName'];
        const match = existingEmployees.find(e => e.employeeCode === code || e.firstName === name || e.fullName === name);
        return {
            employeeCode: code,
            employeeName: name || match?.fullName || 'Unknown',
            status: row['Status'] || row['status'] || 'present',
            checkInTime: row['Check In'] || row['CheckIn'] || row['checkInTime'],
            checkOutTime: row['Check Out'] || row['CheckOut'] || row['checkOutTime'],
            isRegistered: !!match,
            dbEmployee: match || null,
        };
    }).filter(r => r.employeeCode);

    return {
        success: true,
        format: 'daily',
        summary: {
            totalEmployees: enrichedDaily.length,
            matchedCount: enrichedDaily.filter(r => r.isRegistered).length,
            unmatchedCount: enrichedDaily.filter(r => !r.isRegistered).length,
            totalAttendanceDays: enrichedDaily.length,
        },
        records: enrichedDaily,
    };
};
