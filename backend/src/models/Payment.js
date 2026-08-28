import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const paymentAllocationSchema = new mongoose.Schema({
    documentType: {
        type: String,
        required: false,
    },
    documentId: { type: mongoose.Schema.Types.ObjectId, required: false },
    documentNumber: String,
    amount: { type: Number, required: false, min: 0 },
}, { _id: true });

const paymentSchema = new mongoose.Schema({
    paymentNumber: { type: String, unique: true, trim: true, uppercase: true },

    direction: {
        type: String, // received from customer | paid to supplier
        required: false,
    },

    // Customer (if received) OR supplier (if paid)
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    partyName: String,

    paymentDate: { type: Date, default: Date.now },

    currency: { type: String, default: 'LKR' },
    amount: { type: Number, required: false, min: 0.01 },

    method: {
        type: String,
        required: false,
    },

    // Method-specific
    chequeNumber: String,
    chequeDate: Date,
    chequeStatus: { type: String },

    bankName: String,
    transactionReference: String,

    // What the payment is applied to
    allocations: [paymentAllocationSchema],
    unallocatedAmount: { type: Number, default: 0 }, // advance payment

    status: {
        type: String,
        default: 'confirmed',
    },

    notes: String,
    receiptImageUrl: String,

    // Alueco project payment link
    salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
    isAlueco: { type: Boolean, default: false },

    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

// removed duplicate index
paymentSchema.index({ customerId: 1, paymentDate: -1 });
paymentSchema.index({ supplierId: 1, paymentDate: -1 });
paymentSchema.index({ direction: 1, status: 1 });

paymentSchema.pre('save', async function () {
    if (this.isNew && !this.paymentNumber) {
        const seq = await getNextSequence(this.direction === 'received' ? 'payment_receipt' : 'payment_made');
        const prefix = this.direction === 'received' ? 'REC' : 'PAY';
        this.paymentNumber = `${prefix}-${seq}`;
    }

    const totalAllocated = (this.allocations || []).reduce((s, a) => s + a.amount, 0);
    this.unallocatedAmount = +(this.amount - totalAllocated).toFixed(2);
});

paymentSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;