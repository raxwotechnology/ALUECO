import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const addressSnapshotSchema = new mongoose.Schema({
    line1: String, line2: String, city: String, state: String,
    country: String, postalCode: String, phone: String,
}, { _id: false });

const poLineItemSchema = new mongoose.Schema({
    lineNumber: Number,
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    productCode: String,
    productName: String,
    description: String,

    orderedQuantity: { type: Number, required: false, min: 0.01 },
    receivedQuantity: { type: Number, default: 0 },
    pendingQuantity: { type: Number, default: 0 },

    unitOfMeasure: String,
    unitPrice: { type: Number, required: false, min: 0 },

    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0 },

    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    taxable: { type: Boolean, default: true },

    lineSubtotal: { type: Number, default: 0 },
    lineDiscount: { type: Number, default: 0 },
    lineTax: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },

    lineStatus: {
        type: String,
        default: 'pending',
    },
    notes: String,
}, { _id: true });

const purchaseOrderSchema = new mongoose.Schema({
    poNumber: { type: String, unique: true, trim: true, uppercase: true },

    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: false },
    supplierSnapshot: {
        name: String,
        code: String,
        taxRegistrationNumber: String,
        contactName: String,
        phone: String,
    },

    supplierBillingAddress: addressSnapshotSchema,

    deliverTo: {
        warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: false },
        warehouseName: String,
        address: addressSnapshotSchema,
    },

    poDate: { type: Date, default: Date.now },
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,

    currency: { type: String, default: 'LKR' },

    items: [poLineItemSchema],

    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    paymentTerms: {
        type: { type: String },
        creditDays: Number,
        dueDate: Date,
    },
    shippingTerms: String, // FOB, CIF, EXW

    status: {
        type: String,
        default: 'draft',
    },

    sentToSupplierAt: Date,

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,

    // GRNs referenced
    grns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GoodsReceiptNote' }],
    receiptCompletionPercent: { type: Number, default: 0 },

    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: String,

    notes: String,
    internalNotes: String,
    termsAndConditions: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

// removed duplicate index
purchaseOrderSchema.index({ supplierId: 1, poDate: -1 });
purchaseOrderSchema.index({ status: 1, poDate: -1 });

purchaseOrderSchema.pre('save', async function () {
    if (this.isNew && !this.poNumber) {
        const seq = await getNextSequence('purchase_order');
        this.poNumber = `PO-${seq}`;
    }

    // Calculate line totals
    this.items.forEach((item, idx) => {
        item.lineNumber = idx + 1;
        item.lineSubtotal = +(item.orderedQuantity * item.unitPrice).toFixed(2);
        const discountFromPct = item.lineSubtotal * (item.discountPercent || 0) / 100;
        item.lineDiscount = +(discountFromPct + (item.discountAmount || 0)).toFixed(2);
        const taxable = item.lineSubtotal - item.lineDiscount;
        item.lineTax = item.taxable ? +(taxable * (item.taxRate || 0) / 100).toFixed(2) : 0;
        item.taxAmount = item.lineTax;
        item.lineTotal = +(taxable + item.lineTax).toFixed(2);
        item.pendingQuantity = +(item.orderedQuantity - (item.receivedQuantity || 0)).toFixed(2);

        if (item.receivedQuantity >= item.orderedQuantity) {
            item.lineStatus = 'fully_received';
        } else if (item.receivedQuantity > 0) {
            item.lineStatus = 'partially_received';
        }
    });

    this.subtotal = +this.items.reduce((s, i) => s + i.lineSubtotal, 0).toFixed(2);
    this.totalDiscount = +this.items.reduce((s, i) => s + i.lineDiscount, 0).toFixed(2);
    this.totalTax = +this.items.reduce((s, i) => s + i.lineTax, 0).toFixed(2);

    this.grandTotal = +(
        this.subtotal - this.totalDiscount + this.totalTax
        + (this.shippingCost || 0) + (this.otherCharges || 0)
    ).toFixed(2);

    // Receipt completion %
    const totalOrdered = this.items.reduce((s, i) => s + i.orderedQuantity, 0);
    const totalReceived = this.items.reduce((s, i) => s + (i.receivedQuantity || 0), 0);
    this.receiptCompletionPercent = totalOrdered > 0 ? +((totalReceived / totalOrdered) * 100).toFixed(2) : 0;

    // Auto-set status based on receipt progress
    if (['approved', 'sent', 'partially_received'].includes(this.status)) {
        if (totalReceived >= totalOrdered && totalOrdered > 0) {
            this.status = 'fully_received';
        } else if (totalReceived > 0) {
            this.status = 'partially_received';
        }
    }

    if (this.paymentTerms?.type === 'credit' && this.paymentTerms.creditDays && !this.paymentTerms.dueDate) {
        const due = new Date(this.poDate);
        due.setDate(due.getDate() + this.paymentTerms.creditDays);
        this.paymentTerms.dueDate = due;
    }
});

purchaseOrderSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
export default PurchaseOrder;