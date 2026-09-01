import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const leaveRequestSchema = new mongoose.Schema({
    leaveNumber: { type: String, unique: true, trim: true, uppercase: true },

    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
    employeeCode: String,
    employeeName: String,

    leaveType: {
        type: String,
        required: false,
    },

    fromDate: { type: Date, required: false },
    toDate: { type: Date, required: false },
    numberOfDays: { type: Number, required: false, min: 0.5 },

    isHalfDay: { type: Boolean, default: false },
    halfDayPeriod: { type: String },

    reason: { type: String, required: false },
    attachmentUrl: String, // medical certificate, etc.

    status: {
        type: String,
        default: 'pending',
    },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectionReason: String,

    contactDuringLeave: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

leaveRequestSchema.index({ employeeId: 1, fromDate: -1 });
leaveRequestSchema.index({ status: 1 });
// removed duplicate index

leaveRequestSchema.pre('save', async function () {
    if (this.isNew && !this.leaveNumber) {
        const seq = await getNextSequence('leave');
        this.leaveNumber = `LV-${seq}`;
    }
});

leaveRequestSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
    if (typeof next === 'function') next();
});

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
export default LeaveRequest;