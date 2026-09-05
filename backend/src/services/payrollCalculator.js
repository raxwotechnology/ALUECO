/**
 * Sri Lanka Payroll Calculator
 *
 * Handles:
 * - EPF: Employee 8%, Employer 12% (of gross earnings in most cases)
 * - ETF: Employer 3% (employee pays nothing)
 * - APIT: income tax slabs (assessment year 2024/2025)
 *
 * Source: Inland Revenue Department Sri Lanka
 * NOTE: Tax rates change year-to-year. Verify with current IRD schedule before production.
 *       These rates are as of early 2026; client's accountant should confirm.
 */

// APIT (Advance Personal Income Tax) slabs — monthly
// Based on assessment year 2024/2025 onwards
// Tax-free threshold: LKR 150,000/month (LKR 1,800,000/year)
const APIT_SLABS_MONTHLY = [
    { upto: 150000, rate: 0, cumulative: 0 },        // 0% up to 150,000
    { upto: 233333, rate: 0.06, cumulative: 0 },     // 6% on next 83,333
    { upto: 275000, rate: 0.18, cumulative: 5000 },  // 18% on next 41,667
    { upto: 316667, rate: 0.24, cumulative: 12500 }, // 24% on next 41,667
    { upto: 358333, rate: 0.30, cumulative: 22500 }, // 30% on next 41,667
    { upto: Infinity, rate: 0.36, cumulative: 35000 }, // 36% above
];

/**
 * Calculate APIT (income tax) on monthly taxable income
 */
export const calculateAPIT = (monthlyTaxableIncome) => {
    const income = Number(monthlyTaxableIncome) || 0;
    if (income <= 0) return 0;

    let previousLimit = 0;
    for (const slab of APIT_SLABS_MONTHLY) {
        if (income <= slab.upto) {
            const taxInThisSlab = (income - previousLimit) * slab.rate;
            return +(slab.cumulative + taxInThisSlab).toFixed(2);
        }
        previousLimit = slab.upto;
    }
    return 0;
};

/**
 * Calculate EPF employee contribution (8%)
 */
export const calculateEPFEmployee = (epfableEarnings, rate = 0.08) => {
    return +(Number(epfableEarnings) * rate).toFixed(2);
};

/**
 * Calculate EPF employer contribution (12%)
 */
export const calculateEPFEmployer = (epfableEarnings, rate = 0.12) => {
    return +(Number(epfableEarnings) * rate).toFixed(2);
};

/**
 * Calculate ETF employer contribution (3%)
 */
export const calculateETF = (epfableEarnings, rate = 0.03) => {
    return +(Number(epfableEarnings) * rate).toFixed(2);
};

/**
 * Main payslip calculation
 *
 * Inputs:
 * @param {Object} params
 * @param {Number} params.basicSalary
 * @param {Array} params.earnings - [{ name, amount, isTaxable, isEpfable }]
 * @param {Array} params.otherDeductions - manual deductions (loans, advances)
 * @param {Object} params.attendance - { workingDays, daysPresent, unpaidLeaveDays, overtimeHours }
 * @param {Number} params.overtimeRate - per hour rate (optional, e.g., 1.5× hourly)
 */
export const calculatePayslip = ({
    basicSalary = 0,
    earnings = [],
    otherDeductions = [],
    attendance = {},
    overtimeRate = 0,
}) => {
    const basic = Number(basicSalary) || 0;

    // Calculate proportional basic if unpaid leave
    const totalWorkingDays = Math.max(1, attendance.workingDays || 26);
    const unpaidLeave = Number(attendance.unpaidLeaveDays) || 0;
    const paidDays = totalWorkingDays - unpaidLeave;
    const unpaidLeaveDeduction = unpaidLeave > 0 ? +((basic / totalWorkingDays) * unpaidLeave).toFixed(2) : 0;
    const effectiveBasic = basic - unpaidLeaveDeduction;

    // Overtime earnings
    const otHours = Number(attendance.overtimeHours) || 0;
    const otAmount = +(otHours * overtimeRate).toFixed(2);

    // Build earnings list
    const allEarnings = [];
    allEarnings.push({ name: 'Basic Salary', amount: effectiveBasic, type: 'fixed', isTaxable: true, isEpfable: true });

    earnings.forEach((e) => {
        allEarnings.push({
            name: e.name,
            amount: Number(e.amount) || 0,
            type: e.type || 'allowance',
            isTaxable: e.isTaxable !== false,
            isEpfable: e.isEpfable !== false, // allowances are usually EPF-able in SL
        });
    });

    if (otAmount > 0) {
        allEarnings.push({
            name: 'Overtime',
            amount: otAmount,
            type: 'overtime',
            isTaxable: true,
            isEpfable: false, // OT is typically NOT EPF-able in Sri Lanka
        });
    }

    // Totals
    const grossEarnings = +allEarnings.reduce((s, e) => s + e.amount, 0).toFixed(2);
    const epfableEarnings = +allEarnings
        .filter((e) => e.isEpfable)
        .reduce((s, e) => s + e.amount, 0).toFixed(2);
    const taxableEarnings = +allEarnings
        .filter((e) => e.isTaxable)
        .reduce((s, e) => s + e.amount, 0).toFixed(2);

    // Statutory
    const epfEmployee = calculateEPFEmployee(epfableEarnings);
    const epfEmployer = calculateEPFEmployer(epfableEarnings);
    const etf = calculateETF(epfableEarnings);
    const apit = calculateAPIT(taxableEarnings);

    // Build deductions list
    const allDeductions = [];
    if (epfEmployee > 0) {
        allDeductions.push({ name: 'EPF Employee (8%)', amount: epfEmployee, type: 'epf' });
    }
    if (apit > 0) {
        allDeductions.push({ name: 'APIT (Income Tax)', amount: apit, type: 'apit' });
    }

    // Other deductions (loans, advances, etc.)
    let advanceDeducted = 0;
    let loanDeducted = 0;
    otherDeductions.forEach((d) => {
        allDeductions.push({
            name: d.name,
            amount: Number(d.amount) || 0,
            type: d.type || 'other',
        });
        if (d.type === 'advance') advanceDeducted += Number(d.amount) || 0;
        if (d.type === 'loan') loanDeducted += Number(d.amount) || 0;
    });

    const totalDeductions = +allDeductions.reduce((s, d) => s + d.amount, 0).toFixed(2);
    const netPay = +(grossEarnings - totalDeductions).toFixed(2);

    return {
        basicSalary: basic,
        effectiveBasic,
        unpaidLeaveDays: unpaidLeave,
        unpaidLeaveDeduction,
        overtimeHours: otHours,
        earnings: allEarnings,
        grossEarnings,
        epfableEarnings,
        taxableEarnings,
        deductions: allDeductions,
        totalDeductions,
        epfEmployeeContribution: epfEmployee,
        epfEmployerContribution: epfEmployer,
        etfContribution: etf,
        apitAmount: apit,
        advanceDeducted: +advanceDeducted.toFixed(2),
        loanDeducted: +loanDeducted.toFixed(2),
        netPay,
    };
};