import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const billLineItemSchema = new mongoose.Schema({
    lineNumber: Number,
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productCode: String,
    productName: String,
    description: String,

    quantity: { type: Number, required: false, min: 0.01 },
    unitOfMeasure: String,
    unitPrice: { type: Number, required: false, min: 0 },

    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },

    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    taxable: { type: Boolean, default: true },

    lineSubtotal: { type: Number, default: 0 },
    lineDiscount: { type: Number, default: 0 },
    lineTax: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },

    grnLineItemId: mongoose.Schema.Types.ObjectId,
    notes: String,
}, { _id: true });

const billSchema = new mongoose.Schema({
    billNumber: { type: String, unique: true, trim: true, uppercase: true },
    supplierInvoiceNumber: { type: String, trim: true }, // supplier's own number

    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: false },
    supplierSnapshot: {
        name: String,
        code: String,
        taxRegistrationNumber: String,
    },

    // Sources
    purchaseOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' }],
    purchaseOrderNumbers: [String],
    grnIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GoodsReceiptNote' }],
    grnNumbers: [String],

    // Dates
    billDate: { type: Date, default: Date.now },
    dueDate: Date,
    receivedDate: { type: Date, default: Date.now },

    currency: { type: String, default: 'LKR' },

    items: [billLineItemSchema],

    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    paymentTerms: {
        type: { type: String },
        creditDays: Number,
    },

    paymentStatus: {
        type: String,
        default: 'unpaid',
    },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    lastPaymentDate: Date,
    fullyPaidAt: Date,

    daysOutstanding: { type: Number, default: 0 },
    daysPastDue: { type: Number, default: 0 },
    agingBucket: {
        type: String,
        default: 'current',
    },

    status: {
        type: String,
        default: 'approved',
    },

    disputeReason: String,
    notes: String,
    internalNotes: String,

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

// removed duplicate index
billSchema.index({ supplierId: 1, billDate: -1 });
billSchema.index({ paymentStatus: 1, dueDate: 1 });
billSchema.index({ agingBucket: 1 });

billSchema.pre('save', async function () {
    if (this.isNew && !this.billNumber) {
        const seq = await getNextSequence('bill');
        this.billNumber = `BILL-${seq}`;
    }

    this.items.forEach((item, idx) => {
        item.lineNumber = idx + 1;
        item.lineSubtotal = +(item.quantity * item.unitPrice).toFixed(2);
        const discFromPct = item.lineSubtotal * (item.discountPercent || 0) / 100;
        item.lineDiscount = +(discFromPct + (item.discountAmount || 0)).toFixed(2);
        const taxable = item.lineSubtotal - item.lineDiscount;
        item.lineTax = item.taxable ? +(taxable * (item.taxRate || 0) / 100).toFixed(2) : 0;
        item.taxAmount = item.lineTax;
        item.lineTotal = +(taxable + item.lineTax).toFixed(2);
    });

    this.subtotal = +this.items.reduce((s, i) => s + i.lineSubtotal, 0).toFixed(2);
    this.totalDiscount = +this.items.reduce((s, i) => s + i.lineDiscount, 0).toFixed(2);
    this.totalTax = +this.items.reduce((s, i) => s + i.lineTax, 0).toFixed(2);

    this.grandTotal = +(
        this.subtotal - this.totalDiscount + this.totalTax
        + (this.shippingCost || 0) + (this.otherCharges || 0)
    ).toFixed(2);

    this.balanceDue = +(this.grandTotal - (this.amountPaid || 0)).toFixed(2);

    if (this.amountPaid >= this.grandTotal && this.grandTotal > 0) {
        this.paymentStatus = 'paid';
        if (!this.fullyPaidAt) this.fullyPaidAt = new Date();
    } else if (this.amountPaid > 0) {
        this.paymentStatus = 'partially_paid';
    } else if (!['cancelled', 'disputed'].includes(this.paymentStatus)) {
        this.paymentStatus = 'unpaid';
    }

    if (this.dueDate && !['paid', 'cancelled'].includes(this.paymentStatus)) {
        const now = new Date();
        const daysPast = Math.floor((now - new Date(this.dueDate)) / (1000 * 60 * 60 * 24));
        this.daysPastDue = Math.max(0, daysPast);
        if (this.daysPastDue > 0 && this.paymentStatus === 'unpaid') {
            this.paymentStatus = 'overdue';
        }
        if (this.daysPastDue === 0) this.agingBucket = 'current';
        else if (this.daysPastDue <= 30) this.agingBucket = '1_30';
        else if (this.daysPastDue <= 60) this.agingBucket = '31_60';
        else if (this.daysPastDue <= 90) this.agingBucket = '61_90';
        else this.agingBucket = '91_plus';
    }

    if (this.billDate) {
        this.daysOutstanding = Math.floor((Date.now() - new Date(this.billDate)) / (1000 * 60 * 60 * 24));
    }
});

billSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const Bill = mongoose.model('Bill', billSchema);
export default Bill;