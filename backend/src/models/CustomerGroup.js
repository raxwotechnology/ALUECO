import mongoose from 'mongoose';

const customerGroupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: false,
            trim: true,
            unique: true,
            maxlength: 100,
        },
        code: {
            type: String,
            required: false,
            unique: true,
            trim: true,
            uppercase: true,
            maxlength: 20,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },

        // Default commercial terms
        defaultPaymentTerms: {
            type: {
                type: String,
                type: String,
                default: 'cod',
            },
            creditDays: { type: Number, default: 0, min: 0 },
            defaultCreditLimit: { type: Number, default: 0, min: 0 },
        },

        defaultDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
        priority: { type: Number, default: 0 }, // higher = priority during stock shortage

        color: { type: String, default: '#6366f1' }, // for UI tags
        isActive: { type: Boolean, default: true },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

customerGroupSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const CustomerGroup = mongoose.model('CustomerGroup', customerGroupSchema);
export default CustomerGroup;