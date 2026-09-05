import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
    employeeCode: String,
    employeeName: String,

    date: { type: Date, required: false },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },

    checkInTime: Date,
    checkOutTime: Date,
    totalWorkedMinutes: { type: Number, default: 0 },

    lateMinutes: { type: Number, default: 0 },
    earlyLeaveMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },

    status: {
        type: String,
        default: 'present',
    },

    leaveId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveRequest' },
    leaveType: String,

    checkInMethod: { type: String, default: 'manual' },
    location: { latitude: Number, longitude: Number, address: String },

    notes: String,

    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ── Pre-save Hook: Auto-calculate OT based on 8-hour standard shift ──────────
attendanceSchema.pre('save', function() {
    if (this.checkInTime && this.checkOutTime) {
        const workedMs      = new Date(this.checkOutTime) - new Date(this.checkInTime);
        const workedMinutes = Math.floor(workedMs / (1000 * 60));

        this.totalWorkedMinutes = workedMinutes;
        // Standard shift = 8 hours = 480 minutes
        this.overtimeMinutes    = Math.max(0, workedMinutes - 480);
    }
});

// Unique: one attendance record per employee per date
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;