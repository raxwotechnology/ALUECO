import mongoose from 'mongoose';

const componentSchema = new mongoose.Schema({
    name: { type: String, required: false },
    code: String,
    type: { type: String, required: false },
    calculationType: {
        type: String,
        default: 'fixed',
    },
    amount: { type: Number, default: 0 }, // if fixed
    percentage: { type: Number, default: 0 }, // if percentage
    isTaxable: { type: Boolean, default: true },
    isStatutory: { type: Boolean, default: false },
    statutoryType: { type: String },
    description: String,
}, { _id: true });

const salaryStructureSchema = new mongoose.Schema({
    name: { type: String, required: false, trim: true },
    code: { type: String, trim: true, uppercase: true, unique: true },
    description: String,
    applicableTo: {
        type: String,
        default: 'all',
    },
    frequency: {
        type: String,
        enum: ['monthly', 'daily'],
        default: 'monthly',
    },
    components: [componentSchema],
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

salaryStructureSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
    if (typeof next === 'function') next();
});

const SalaryStructure = mongoose.model('SalaryStructure', salaryStructureSchema);
export default SalaryStructure;