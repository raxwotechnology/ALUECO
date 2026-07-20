import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const posShiftSchema = new mongoose.Schema({
    shiftNumber: {
        type: String,
        unique: true,
        trim: true,
        uppercase: true
    },
    cashierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    terminalId: {
        type: String,
        default: 'TERM-01'
    },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    openedAt: {
        type: Date,
        default: Date.now
    },
    closedAt: {
        type: Date
    },
    openingFloat: {
        type: Number,
        default: 0,
        min: 0
    },
    paymentsExpected: {
        cash: { type: Number, default: 0 },
        card: { type: Number, default: 0 },
        online: { type: Number, default: 0 }
    },
    paymentsActual: {
        cash: { type: Number, default: 0 },
        card: { type: Number, default: 0 },
        online: { type: Number, default: 0 }
    },
    variance: {
        cash: { type: Number, default: 0 },
        card: { type: Number, default: 0 },
        online: { type: Number, default: 0 }
    },
    closingNotes: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

posShiftSchema.pre('save', async function () {
    if (this.isNew && !this.shiftNumber) {
        const seq = await getNextSequence('pos_shift');
        this.shiftNumber = `PSH-${seq}`;
    }
    
    // Auto-calculate variance if closed
    if (this.status === 'closed') {
        this.variance.cash = +(this.paymentsActual.cash - this.paymentsExpected.cash).toFixed(2);
        this.variance.card = +(this.paymentsActual.card - this.paymentsExpected.card).toFixed(2);
        this.variance.online = +(this.paymentsActual.online - this.paymentsExpected.online).toFixed(2);
    }
});

const PosShift = mongoose.model('PosShift', posShiftSchema);
export default PosShift;
