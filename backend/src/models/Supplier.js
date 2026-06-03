import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const contactSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true },
        designation: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        isPrimary: { type: Boolean, default: false },
        notes: { type: String, trim: true },
    },
    { _id: true }
);

const supplierSchema = new mongoose.Schema(
    {
        supplierCode: {
            type: String,
            unique: true,
            trim: true,
            uppercase: true,
        },

        type: {
            type: String,
            type: String,
            default: 'company',
        },

        companyName: { type: String, trim: true, maxlength: 200 },
        displayName: {
            type: String,
            required: false,
            trim: true,
            maxlength: 100,
        },
        firstName: { type: String, trim: true }, // for individuals
        lastName: { type: String, trim: true },

        category: {
            type: String,
            type: String,
            default: 'multiple',
        },
        tags: [{ type: String, trim: true }],

        // Registration
        businessRegistrationNumber: { type: String, trim: true },
        taxRegistrationNumber: { type: String, trim: true }, // VAT
        country: { type: String, trim: true, default: 'Sri Lanka' },

        // Primary contact
        primaryContact: {
            name: { type: String, trim: true },
            email: { type: String, trim: true, lowercase: true },
            phone: { type: String, trim: true },
            mobile: { type: String, trim: true },
        },

        contacts: [contactSchema],

        // Addresses
        billingAddress: {
            line1: String, line2: String, city: String, state: String,
            country: { type: String, default: 'Sri Lanka' }, postalCode: String,
        },
        shippingAddress: {
            line1: String, line2: String, city: String, state: String,
            country: { type: String, default: 'Sri Lanka' }, postalCode: String,
        },

        // Commercial terms
        paymentTerms: {
            type: {
                type: String,
                type: String,
                default: 'credit',
            },
            creditDays: { type: Number, default: 30, min: 0 },
            creditLimit: { type: Number, default: 0, min: 0 },
        },

        defaultCurrency: { type: String, default: 'LKR' },

        // Banking (for payments TO supplier)
        bankDetails: {
            bankName: { type: String, trim: true },
            branchName: { type: String, trim: true },
            accountNumber: { type: String, trim: true },
            accountName: { type: String, trim: true },
            swiftCode: { type: String, trim: true },
        },

        // Logistics
        shippingTerms: { type: String, trim: true }, // FOB, CIF, EXW
        averageLeadTimeDays: { type: Number, default: 7 },

        // Performance (auto-updated later)
        performance: {
            totalOrders: { type: Number, default: 0 },
            totalPurchaseValue: { type: Number, default: 0 },
            onTimeDeliveryRate: { type: Number, default: 0 },
            qualityRejectRate: { type: Number, default: 0 },
            lastOrderDate: { type: Date },
            rating: { type: Number, default: 0, min: 0, max: 5 },
        },

        status: {
            type: String,
            type: String,
            default: 'active',
        },
        blacklistReason: { type: String, trim: true },

        notes: { type: String, trim: true, maxlength: 2000 },
        internalNotes: { type: String, trim: true, maxlength: 2000 },

        // ── ALE-specific additions ────────────────────────────────────────────────
        supplierShortCode: {
            type: String,
            trim: true,
            uppercase: true,
            maxlength: 12,
            // Used in Julian batch codes: "CHAMINDA", "ISHAN", "OWN-FARM"
        },
        isOwnFarm: {
            type: Boolean,
            default: false,
            // When true, intra-company transfer price applies
        },
        internalTransferPrice: {
            type: Number,
            default: 0,
            // Rs per Kg — set by Managing Director for Own Farm produce
        },
        supplierType: {
            type: String,
            enum: ['farmer', 'transport', 'packing', 'chemical', 'own_farm', 'other'],
            default: 'other',
        },
        supplierSource: {
            type: String,
            enum: ['own_farm', 'external_farmer', 'import'],
            default: 'external_farmer',
        },
        balanceDueLKR: {
            type: Number,
            default: 0,
        },

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// removed duplicate index
supplierSchema.index({ displayName: 'text', companyName: 'text', supplierCode: 'text' });
supplierSchema.index({ category: 1, status: 1 });
supplierSchema.index({ status: 1 });

supplierSchema.pre('save', async function () {
    if (this.isNew && !this.supplierCode) {
        const seq = await getNextSequence('supplier');
        this.supplierCode = `SUP-${seq}`;
    }
});

supplierSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;