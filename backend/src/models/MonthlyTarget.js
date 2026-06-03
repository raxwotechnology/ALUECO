import mongoose from 'mongoose';

const monthlyTargetSchema = new mongoose.Schema({
    year: {
        type: Number,
        required: true,
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12,
    },
    revenueTarget: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    notes: {
        type: String,
        trim: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, { timestamps: true });

// Enforce unique target per month/year
monthlyTargetSchema.index({ year: 1, month: 1 }, { unique: true });

const MonthlyTarget = mongoose.model('MonthlyTarget', monthlyTargetSchema);
export default MonthlyTarget;
