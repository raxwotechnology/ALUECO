import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const addressSnapshotSchema = new mongoose.Schema(
    {
        label: String,
        line1: String,
        line2: String,
        city: String,
        state: String,
        country: String,
        postalCode: String,
        phone: String,
    },
    { _id: false }
);

const lineItemSchema = new mongoose.Schema(
    {
        lineNumber: { type: Number },

        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: false,
        },
        productCode: { type: String, trim: true }, // denormalized
        productName: { type: String, trim: true }, // denormalized
        description: { type: String, trim: true },

        orderedQuantity: { type: Number, required: false, min: 0.01 },
        dispatchedQuantity: { type: Number, default: 0 },
        deliveredQuantity: { type: Number, default: 0 },
        returnedQuantity: { type: Number, default: 0 },

        unitOfMeasure: { type: String, trim: true },

        listPrice: { type: Number, required: false, min: 0 },
        unitPrice: { type: Number, required: false, min: 0 },

        discountPercent: { type: Number, default: 0, min: 0, max: 100 },
        discountAmount: { type: Number, default: 0, min: 0 },

        taxRate: { type: Number, default: 0, min: 0 },
        taxAmount: { type: Number, default: 0, min: 0 },
        taxable: { type: Boolean, default: true },

        lineSubtotal: { type: Number, default: 0 }, // qty × unitPrice
        lineDiscount: { type: Number, default: 0 },
        lineTax: { type: Number, default: 0 },
        lineTotal: { type: Number, default: 0 }, // subtotal - discount + tax

        lineStatus: {
            type: String,
            default: 'pending',
        },

        notes: { type: String, trim: true },
    },
    { _id: true }
);

const salesOrderSchema = new mongoose.Schema(
    {
        orderNumber: { type: String, unique: true, trim: true, uppercase: true },

        source: {
            type: String,
            default: 'direct',
        },

        // Parties
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: false,
        },
        customerId: { // Maintain for compatibility if needed, but not required
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
        },
        // Source warehouse for fulfillment
        sourceWarehouseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Warehouse',
        },
        sourceWarehouseSnapshot: {
            name: String,
            warehouseCode: String,
        },
        customerSnapshot: {
            name: String,
            code: String,
            taxRegistrationNumber: String,
            contactName: String,
            phone: String,
        },

        billingAddress: addressSnapshotSchema,
        shippingAddress: addressSnapshotSchema,
        shippingAddressLabel: { type: String, trim: true },

        salesRepId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

        // Dates
        orderDate: { type: Date, default: Date.now },
        requestedDeliveryDate: Date,
        committedDeliveryDate: Date,

        // Currency
        currency: { type: String, default: 'LKR' },

        // Line items
        items: [lineItemSchema],

        // Totals (calculated)
        subtotal: { type: Number, default: 0 },
        totalDiscount: { type: Number, default: 0 },
        totalTax: { type: Number, default: 0 },
        shippingCost: { type: Number, default: 0 },
        otherCharges: { type: Number, default: 0 },
        roundingAdjustment: { type: Number, default: 0 },
        grandTotal: { type: Number, default: 0 },

        // Order-level discount
        orderDiscount: {
            type: { type: String },
            value: { type: Number, default: 0 },
            amount: { type: Number, default: 0 },
            reason: String,
        },

        // Payment terms (snapshot from customer)
        paymentTerms: {
            type: { type: String },
            creditDays: Number,
            dueDate: Date,
        },

        // Status
        status: {
            type: String,
            default: 'draft',
        },

        // Holds
        isOnHold: { type: Boolean, default: false },
        holdReason: String,

        // Credit check result
        creditCheck: {
            performed: { type: Boolean, default: false },
            passed: Boolean,
            creditAvailable: Number,
            creditRequired: Number,
            overridden: { type: Boolean, default: false },
            overrideReason: String,
            overrideBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },

        // Approval
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,

        // Notes
        customerNotes: { type: String, trim: true },
        internalNotes: { type: String, trim: true },
        specialInstructions: { type: String, trim: true },

        // Priority
        priority: {
            type: String,
            default: 'normal',
        },

        // Cancellation
        cancellationReason: String,
        cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        cancelledAt: Date,

        advancePercentage: { type: Number, default: 50 },
        advanceAmount: { type: Number, default: 0 },
        advanceReceived: { type: Boolean, default: false },
        productionStatus: {
            type: String,
            enum: ['waiting_payment', 'ready_for_production', 'in_production', 'completed', 'cancelled'],
            default: 'waiting_payment',
        },
        paymentSchedule: [{
            stageName: { type: String, required: true },
            amount: { type: Number, required: true },
            status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
            paidAt: Date
        }],
        totalPaid: { type: Number, default: 0 },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// Indexes
salesOrderSchema.index({ sourceWarehouseId: 1, status: 1 });
// removed duplicate index
salesOrderSchema.index({ customerId: 1, orderDate: -1 });
salesOrderSchema.index({ status: 1, orderDate: -1 });
salesOrderSchema.index({ salesRepId: 1, orderDate: -1 });
salesOrderSchema.index({ orderDate: -1 });

// Auto-generate order number + calculate totals
salesOrderSchema.pre('save', async function () {
    if (this.isNew && !this.orderNumber) {
        const seq = await getNextSequence('sales_order');
        this.orderNumber = `SO-${seq}`;
    }

    // Calculate line totals
    this.items.forEach((item, idx) => {
        item.lineNumber = idx + 1;
        item.lineSubtotal = +(item.orderedQuantity * item.unitPrice).toFixed(2);

        const discountFromPercent = item.lineSubtotal * (item.discountPercent || 0) / 100;
        item.lineDiscount = +(discountFromPercent + (item.discountAmount || 0)).toFixed(2);

        const taxable = item.lineSubtotal - item.lineDiscount;
        item.lineTax = item.taxable ? +(taxable * (item.taxRate || 0) / 100).toFixed(2) : 0;
        item.taxAmount = item.lineTax;

        item.lineTotal = +(taxable + item.lineTax).toFixed(2);
    });

    // Calculate order totals
    this.subtotal = +this.items.reduce((s, i) => s + i.lineSubtotal, 0).toFixed(2);
    this.totalDiscount = +this.items.reduce((s, i) => s + i.lineDiscount, 0).toFixed(2);
    this.totalTax = +this.items.reduce((s, i) => s + i.lineTax, 0).toFixed(2);

    let orderLevelDiscount = 0;
    if (this.orderDiscount?.type === 'percentage') {
        orderLevelDiscount = +((this.subtotal - this.totalDiscount) * (this.orderDiscount.value || 0) / 100).toFixed(2);
    } else if (this.orderDiscount?.type === 'fixed') {
        orderLevelDiscount = this.orderDiscount.value || 0;
    }
    if (this.orderDiscount) this.orderDiscount.amount = orderLevelDiscount;

    this.grandTotal = +(
        this.subtotal
        - this.totalDiscount
        - orderLevelDiscount
        + this.totalTax
        + (this.shippingCost || 0)
        + (this.otherCharges || 0)
        + (this.roundingAdjustment || 0)
    ).toFixed(2);

    if (this.paymentTerms?.type === 'credit' && this.paymentTerms.creditDays && !this.paymentTerms.dueDate) {
        const due = new Date(this.orderDate);
        due.setDate(due.getDate() + this.paymentTerms.creditDays);
        this.paymentTerms.dueDate = due;
    }

    // Auto-fill advanceAmount if 0
    if ((!this.advanceAmount || this.advanceAmount === 0) && this.advancePercentage > 0) {
        this.advanceAmount = +(this.grandTotal * (this.advancePercentage / 100)).toFixed(2);
    }
    
    // Generate default payment schedule if empty
    if (this.paymentSchedule && this.paymentSchedule.length === 0) {
        this.paymentSchedule.push({
            stageName: 'Order Confirmation Advance',
            amount: this.advanceAmount,
            status: this.advanceReceived ? 'paid' : 'pending',
            paidAt: this.advanceReceived ? new Date() : undefined
        });
        this.paymentSchedule.push({
            stageName: 'Completion & Delivery Payment',
            amount: +(this.grandTotal - this.advanceAmount).toFixed(2),
            status: 'pending'
        });
    }
});

salesOrderSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const SalesOrder = mongoose.model('SalesOrder', salesOrderSchema);
export default SalesOrder;