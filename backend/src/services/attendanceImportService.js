/**
 * Parses biometric "Monthly Performance Report" Excel exports
 * (Luxo / fingerprint machine format) into daily attendance records.
 */

const STATUS_MAP = {
    P: 'present',
    POW: 'present',
    A: 'absent',
    WO: 'weekend',
    HL: 'half_day',
};

const SUB_ROW_LABELS = {
    arrived: ['arrived tim', 'arrived time'],
    dept: ['dept.time', 'dept time', 'departed time'],
    working: ['working hrs', 'working hours'],
    ot: ['o.times hrs', 'o.times hours', 'ot hrs', 'overtime'],
    status: ['status'],
};

export function isMonthlyPerformanceReport(rows) {
    const flat = rows.slice(0, 15).flat().filter(Boolean).join(' ').toLowerCase();
    return flat.includes('monthly performance report') || flat.includes('empcode');
}

export function parseReportPeriod(rows) {
    for (const row of rows) {
        const text = (row || []).filter(Boolean).join(' ');
        const fromMatch = text.match(/From\s*:\s*(\d{1,2})-(\d{1,2})-(\d{4})/i);
        if (fromMatch) {
            const [, day, month, year] = fromMatch;
            return {
                year: parseInt(year, 10),
                month: parseInt(month, 10),
                startDay: parseInt(day, 10),
            };
        }
    }
    return null;
}

export function parseDurationToMinutes(value) {
    if (value === null || value === undefined || value === '') return 0;
    const str = String(value).trim();
    if (!str || str === '00:00' || str === '0:0') return 0;

    if (str.includes(':')) {
        const [hoursPart, minutesPart] = str.split(':');
        const hours = parseInt(hoursPart, 10) || 0;
        const minutes = parseInt(minutesPart, 10) || 0;
        return hours * 60 + minutes;
    }

    const num = Number(str);
    return Number.isFinite(num) ? Math.round(num * 60) : 0;
}

export function parseTimeOnDate(timeValue, baseDate) {
    if (timeValue === null || timeValue === undefined || timeValue === '') return null;

    if (timeValue instanceof Date && !isNaN(timeValue.getTime())) {
        const d = new Date(baseDate);
        d.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
        return d;
    }

    const str = String(timeValue).trim();
    if (!str || str === '00:00') return null;

    const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;

    const d = new Date(baseDate);
    d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
    return d;
}

export function mapBiometricStatus(code) {
    if (code === null || code === undefined || code === '') return null;
    const raw = String(code).trim().toUpperCase();
    if (!raw) return null;
    if (STATUS_MAP[raw]) return STATUS_MAP[raw];
    if (raw.startsWith('AL')) return 'leave';
    return 'present';
}

function normalizeLabel(value) {
    return String(value ?? '').trim().toLowerCase();
}

function findDayColumns(row) {
    const dayColumns = {};
    if (!row) return dayColumns;

    for (let col = 0; col < row.length; col++) {
        const cell = row[col];
        if (cell === null || cell === undefined || cell === '') continue;
        const text = String(cell).trim();
        const dayNum = parseInt(text, 10);
        if (dayNum >= 1 && dayNum <= 31 && /^\d{1,2}$/.test(text)) {
            dayColumns[dayNum] = col;
        }
    }

    return dayColumns;
}

function matchSubRow(label, keys) {
    const normalized = normalizeLabel(label);
    return keys.some((key) => normalized.startsWith(key));
}

function findSubRows(rows, startIndex) {
    const found = {};
    for (let i = startIndex; i < Math.min(startIndex + 8, rows.length); i++) {
        const label = normalizeLabel(rows[i]?.[0]);
        if (matchSubRow(label, SUB_ROW_LABELS.arrived)) found.arrived = rows[i];
        else if (matchSubRow(label, SUB_ROW_LABELS.dept)) found.dept = rows[i];
        else if (matchSubRow(label, SUB_ROW_LABELS.working)) found.working = rows[i];
        else if (matchSubRow(label, SUB_ROW_LABELS.ot)) found.ot = rows[i];
        else if (matchSubRow(label, SUB_ROW_LABELS.status)) found.status = rows[i];
    }
    return found;
}

function isEmpHeaderRow(row) {
    return normalizeLabel(row?.[0]) === 'empcode';
}

function isEmployeeSummaryRow(row) {
    if (!row?.[0] || isEmpHeaderRow(row)) return false;
    const label = normalizeLabel(row[0]);
    if (Object.values(SUB_ROW_LABELS).flat().some((key) => label.startsWith(key))) return false;
    if (label.includes('report date') || label.includes('company name')) return false;
    return Boolean(row[1]) && (label.length <= 12);
}

/**
 * Parse monthly biometric sheet into flat daily records.
 * @returns {{ period: object|null, records: Array, errors: Array }}
 */
export function parseMonthlyPerformanceSheet(rows) {
    const period = parseReportPeriod(rows);
    const records = [];
    const errors = [];

    if (!period) {
        errors.push({ message: 'Could not find report period (Report Date From) in file' });
        return { period, records, errors };
    }

    for (let i = 0; i < rows.length; i++) {
        if (!isEmpHeaderRow(rows[i])) continue;

        const empRow = rows[i + 1];
        if (!isEmployeeSummaryRow(empRow)) continue;

        const employeeCode = String(empRow[0]).trim();
        const employeeName = String(empRow[1] || '').trim();

        let dayHeaderIndex = i + 2;
        let dayColumns = {};
        while (dayHeaderIndex < i + 6 && dayHeaderIndex < rows.length) {
            dayColumns = findDayColumns(rows[dayHeaderIndex]);
            if (Object.keys(dayColumns).length >= 5) break;
            dayHeaderIndex++;
        }

        if (Object.keys(dayColumns).length === 0) {
            errors.push({ employeeCode, error: 'Day columns not found for employee block' });
            continue;
        }

        const subRows = findSubRows(rows, dayHeaderIndex + 1);
        if (!subRows.status) {
            errors.push({ employeeCode, error: 'Status row not found for employee block' });
            continue;
        }

        for (const [dayStr, colIndex] of Object.entries(dayColumns)) {
            const dayNum = parseInt(dayStr, 10);
            const date = new Date(period.year, period.month - 1, dayNum);
            date.setHours(0, 0, 0, 0);

            const statusCode = subRows.status[colIndex];
            const status = mapBiometricStatus(statusCode);
            if (!status) continue;

            const checkInTime = parseTimeOnDate(subRows.arrived?.[colIndex], date);
            let checkOutTime = parseTimeOnDate(subRows.dept?.[colIndex], date);
            if (checkInTime && checkOutTime && checkOutTime <= checkInTime) {
                checkOutTime = new Date(checkOutTime);
                checkOutTime.setDate(checkOutTime.getDate() + 1);
            }

            const totalWorkedMinutes = parseDurationToMinutes(subRows.working?.[colIndex]);
            const overtimeMinutes = parseDurationToMinutes(subRows.ot?.[colIndex]);

            records.push({
                employeeCode,
                employeeName,
                date,
                status,
                checkInTime,
                checkOutTime,
                totalWorkedMinutes,
                overtimeMinutes,
            });
        }

        i = dayHeaderIndex + 6;
    }

    return { period, records, errors };
}

/**
 * Parse simple daily import rows (header-based JSON from sheet_to_json).
 */
export function parseDailyAttendanceRows(jsonData) {
    return jsonData.map((row) => ({
        employeeCode: row['Employee Code'] || row['employee_code'] || row['EmployeeCode'] || row['EmpCode'],
        status: row['Status'] || row['status'] || 'present',
        checkInTime: row['Check In'] || row['check_in'] || row['CheckIn'],
        checkOutTime: row['Check Out'] || row['check_out'] || row['CheckOut'],
    })).filter((row) => row.employeeCode);
}

export function normalizeEmployeeCode(code) {
    return String(code ?? '').trim().toUpperCase();
}
