/**
 * Calculates the 3-digit Julian Day of the Year (1-366)
 * @param {Date} date
 * @returns {number}
 */
export function getJulianDay(date) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d - start + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

/**
 * Generates the Julian Tracking Batch Code: [SupplierCode]-ALE[YearShort][JulianDay]
 * Example: ISHAN-ALE26002 (Supplier ISHAN, year 2026, Julian day 2)
 * @param {string} supplierCode
 * @param {Date} [date]
 * @returns {string}
 */
export function generateJulianBatchCode(supplierCode, date = new Date()) {
    const d = new Date(date);
    const yearShort = String(d.getFullYear()).slice(-2);
    const julianDay = getJulianDay(d);
    const julianDayString = String(julianDay).padStart(3, '0');
    
    // Normalize supplier code to uppercase and remove spaces/special chars
    const normalizedSupplier = (supplierCode || 'SUP').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    return `${normalizedSupplier}-ALE${yearShort}${julianDayString}`;
}
