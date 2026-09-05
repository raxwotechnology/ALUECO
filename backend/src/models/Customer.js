import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';
import { attachSyncTriggers } from '../utils/syncTriggers.js';

const addressSchema = new mongoose.Schema(
    {
        label: { type: String, trim: true }, // "Main Shop", "Warehouse"
        attentionTo: { type: String, trim: true },
        line1: { type: String, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        country: { type: String, trim: true, default: 'Sri Lanka' },
        postalCode: { type: String, trim: true },
        phone: { type: String, trim: true },
        deliveryInstructions: { type: String, trim: true },
        isDefault: { type: Boolean, default: false },
    },
    { _id: true }
);

const contactSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true },
        designation: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        role: {
            type: String,
            type: String,
            default: 'other',
        },
        isPrimary: { type: Boolean, default: false },
        notes: { type: String, trim: true },
    },
    { _id: true }
);

const customerSchema = new mongoose.Schema(
    {
        customerCode: {
            type: String,
            unique: true,
            trim: true,
            uppercase: true,
        },

        // Type
        customerType: {
            type: String,
            type: String,
            default: 'company',
        },
        businessType: {
            type: String,
            type: String,
            default: 'retailer',
        },

        // Identity
        companyName: { type: String, trim: true, maxlength: 200 },
        displayName: {
            type: String,
            required: false,
            trim: true,
            maxlength: 100,
        },
        firstName: { type: String, trim: true }, // for individuals
        lastName: { type: String, trim: true },

        customerGroupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CustomerGroup',
        },
        tags: [{ type: String, trim: true }],

        // Registration
        businessRegistrationNumber: { type: String, trim: true },
        taxRegistrationNumber: { type: String, trim: true }, // VAT number
        industry: { type: String, trim: true },

        // Primary contact
        primaryContact: {
            name: { type: String, trim: true },
            email: { type: String, trim: true, lowercase: true },
            phone: { type: String, trim: true },
            mobile: { type: String, trim: true },
        },

        // Additional contacts
        contacts: [contactSchema],

        // Addresses
        billingAddress: addressSchema,
        shippingAddresses: [addressSchema],

        // Assignment
        assignedSalesRep: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        // Commercial terms
        paymentTerms: {
            type: {
                type: String,
                type: String,
                default: 'cod',
            },
            creditDays: { type: Number, default: 0, min: 0 },
            creditLimit: { type: Number, default: 0, min: 0 },
        },

        defaultDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },

        // Credit status (auto-updated by sales orders + payments)
        creditStatus: {
            currentBalance: { type: Number, default: 0 }, // outstanding receivable
            overdueAmount: { type: Number, default: 0 },
            availableCredit: { type: Number, default: 0 }, // creditLimit - currentBalance
            isOverdue: { type: Boolean, default: false },
            daysPastDue: { type: Number, default: 0 },
            onCreditHold: { type: Boolean, default: false }, // blocks new orders
            creditHoldReason: { type: String, trim: true },
        },

        // Analytics (auto-updated)
        analytics: {
            totalOrders: { type: Number, default: 0 },
            totalOrderValue: { type: Number, default: 0 },
            totalPaidAmount: { type: Number, default: 0 },
            lastOrderDate: { type: Date },
            lastPaymentDate: { type: Date },
        },

        // Status
        status: {
            type: String,
            type: String,
            default: 'active',
        },
        blacklistReason: { type: String, trim: true },

        notes: { type: String, trim: true, maxlength: 2000 },
        internalNotes: { type: String, trim: true, maxlength: 2000 },

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// Indexes
customerSchema.index({ displayName: 'text', companyName: 'text', customerCode: 'text' });
customerSchema.index({ customerGroupId: 1, status: 1 });
customerSchema.index({ assignedSalesRep: 1 });
customerSchema.index({ status: 1 });

// Auto-generate code
customerSchema.pre('save', async function () {
    if (this.isNew && !this.customerCode) {
        const seq = await getNextSequence('customer');
        this.customerCode = `CUST-${seq}`;
    }

    // Auto-calc availableCredit
    if (this.paymentTerms?.creditLimit !== undefined) {
        this.creditStatus.availableCredit = Math.max(
            0,
            (this.paymentTerms.creditLimit || 0) - (this.creditStatus.currentBalance || 0)
        );
    }
});

// Soft delete filter
customerSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

attachSyncTriggers(customerSchema, 'customers', 'Customer');

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;