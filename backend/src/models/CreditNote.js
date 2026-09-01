import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const creditNoteSchema = new mongoose.Schema({
    creditNoteNumber: { type: String, unique: true, trim: true, uppercase: true },

    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false },
    customerSnapshot: { name: String, code: String },

    issueDate: { type: Date, default: Date.now },
    amount: { type: Number, required: false, min: 0.01 },
    remainingAmount: { type: Number }, // unapplied balance

    reason: {
        type: String,
        default: 'return',
    },
    description: String,

    // Source
    customerReturnId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerReturn' },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }, // if issued against specific invoice

    // Applications (this credit applied to other invoices over time)
    applications: [{
        invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
        invoiceNumber: String,
        amountApplied: Number,
        appliedAt: { type: Date, default: Date.now },
        appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    }],

    status: {
        type: String,
        default: 'issued',
    },

    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

// removed duplicate index
creditNoteSchema.index({ customerId: 1, issueDate: -1 });
creditNoteSchema.index({ status: 1 });

creditNoteSchema.pre('save', async function () {
    if (this.isNew && !this.creditNoteNumber) {
        const seq = await getNextSequence('credit_note');
        this.creditNoteNumber = `CN-${seq}`;
    }

    const totalApplied = (this.applications || []).reduce((s, a) => s + (a.amountApplied || 0), 0);
    this.remainingAmount = +(this.amount - totalApplied).toFixed(2);

    if (this.remainingAmount <= 0) this.status = 'fully_applied';
    else if (totalApplied > 0) this.status = 'partially_applied';
    else if (this.status !== 'cancelled') this.status = 'issued';
});

creditNoteSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const CreditNote = mongoose.model('CreditNote', creditNoteSchema);
export default CreditNote;