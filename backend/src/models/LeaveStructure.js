import mongoose from 'mongoose';

const leaveStructureSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: String,
    leaveBalances: {
        annual: { type: Number, default: 14 },
        sick: { type: Number, default: 7 },
        casual: { type: Number, default: 7 },
        maternity: { type: Number, default: 84 },
        paternity: { type: Number, default: 3 },
        unpaid: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

leaveStructureSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
    if (typeof next === 'function') next();
});

const LeaveStructure = mongoose.model('LeaveStructure', leaveStructureSchema);
export default LeaveStructure;
