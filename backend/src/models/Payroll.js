import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

// Define subdocument schemas explicitly
const earningSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, required: true }, // 'fixed', 'overtime', 'commission', 'bonus', 'allowance'
    isTaxable: { type: Boolean, default: true },
    isEpfable: { type: Boolean, default: true },
}, { _id: false });

const deductionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, required: true }, // 'epf', 'loan', 'advance', 'apit', 'unpaid_leave', 'other'
}, { _id: false });

const payslipSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
    employeeCode: String,
    employeeName: String,

    // Attendance summary
    workingDays: { type: Number, default: 0 },
    daysPresent: { type: Number, default: 0 },
    daysAbsent: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },

    // Earnings
    basicSalary: { type: Number, default: 0 },
    earnings: [earningSchema],
    grossEarnings: { type: Number, default: 0 },

    // Deductions
    deductions: [deductionSchema],
    totalDeductions: { type: Number, default: 0 },

    // Statutory (Sri Lanka)
    epfEmployeeContribution: { type: Number, default: 0 }, // 8%
    epfEmployerContribution: { type: Number, default: 0 }, // 12%
    etfContribution: { type: Number, default: 0 }, // 3% (employer only)
    apitAmount: { type: Number, default: 0 }, // income tax

    // Advances/Loans deducted this month
    advanceDeducted: { type: Number, default: 0 },
    loanDeducted: { type: Number, default: 0 },

    // Net
    netPay: { type: Number, default: 0 },

    // Payment info
    paymentStatus: {
        type: String,
        default: 'pending',
    },
    paidAt: Date,
    paymentReference: String,

    notes: String,
}, { _id: true });

const payrollSchema = new mongoose.Schema({
    payrollNumber: { type: String, unique: true, trim: true, uppercase: true },

    periodMonth: { type: Number, required: false, min: 1, max: 12 }, // 1-12
    periodYear: { type: Number, required: false },
    periodStartDate: Date,
    periodEndDate: Date,

    payslips: [payslipSchema],

    totalEmployees: { type: Number, default: 0 },
    totalGrossEarnings: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalEpfEmployee: { type: Number, default: 0 },
    totalEpfEmployer: { type: Number, default: 0 },
    totalEtf: { type: Number, default: 0 },
    totalApit: { type: Number, default: 0 },
    totalNetPay: { type: Number, default: 0 },

    status: {
        type: String,
        default: 'draft',
    },

    processedAt: Date,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paidAt: Date,

    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

// removed duplicate index
payrollSchema.index({ periodYear: -1, periodMonth: -1 });
payrollSchema.index({ status: 1 });

// Unique: only one payroll per month per year
payrollSchema.index(
    { periodYear: 1, periodMonth: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

payrollSchema.pre('save', async function () {
    if (this.isNew && !this.payrollNumber) {
        const seq = await getNextSequence('payroll');
        this.payrollNumber = `PAY-${this.periodYear}${String(this.periodMonth).padStart(2, '0')}-${seq}`;
    }

    this.totalEmployees = this.payslips.length;
    this.totalGrossEarnings = +this.payslips.reduce((s, p) => s + (p.grossEarnings || 0), 0).toFixed(2);
    this.totalDeductions = +this.payslips.reduce((s, p) => s + (p.totalDeductions || 0), 0).toFixed(2);
    this.totalEpfEmployee = +this.payslips.reduce((s, p) => s + (p.epfEmployeeContribution || 0), 0).toFixed(2);
    this.totalEpfEmployer = +this.payslips.reduce((s, p) => s + (p.epfEmployerContribution || 0), 0).toFixed(2);
    this.totalEtf = +this.payslips.reduce((s, p) => s + (p.etfContribution || 0), 0).toFixed(2);
    this.totalApit = +this.payslips.reduce((s, p) => s + (p.apitAmount || 0), 0).toFixed(2);
    this.totalNetPay = +this.payslips.reduce((s, p) => s + (p.netPay || 0), 0).toFixed(2);
});

payrollSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
    if (typeof next === 'function') next();
});

const Payroll = mongoose.model('Payroll', payrollSchema);
export default Payroll;