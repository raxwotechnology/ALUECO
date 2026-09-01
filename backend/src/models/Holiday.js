import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
    name: { type: String, required: false, trim: true },
    date: { type: Date, required: false },
    type: {
        type: String,
        default: 'public',
    },
    description: String,
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

holidaySchema.index({ date: 1 });
holidaySchema.index({ type: 1 });

holidaySchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
    if (typeof next === 'function') next();
});

const Holiday = mongoose.model('Holiday', holidaySchema);
export default Holiday;