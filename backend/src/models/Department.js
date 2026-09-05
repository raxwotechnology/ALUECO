import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
    code: { type: String, required: false, unique: true, trim: true, uppercase: true, maxlength: 20 },
    name: { type: String, required: false, trim: true, maxlength: 100 },
    description: String,
    parentDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

// removed duplicate index
departmentSchema.index({ isActive: 1 });

departmentSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
    if (typeof next === 'function') next();
});

const Department = mongoose.model('Department', departmentSchema);
export default Department;