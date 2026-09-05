import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema({
    code: { type: String, required: false, unique: true, trim: true, uppercase: true, maxlength: 20 },
    name: { type: String, required: false, trim: true, maxlength: 100 },
    description: String,
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    level: { type: Number, default: 1 }, // 1 = junior, 2 = mid, 3 = senior, etc.
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

// removed duplicate index
designationSchema.index({ departmentId: 1 });

designationSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
    if (typeof next === 'function') next();
});

const Designation = mongoose.model('Designation', designationSchema);
export default Designation;