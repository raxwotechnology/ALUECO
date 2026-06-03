import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const gatePassSchema = new mongoose.Schema({
    gatePassNumber: { type: String, unique: true }, // GP-0001, GP-0002...

    // ── Vehicle & Shipment ───────────────────────────────────────────────────
    vehicleNumber:    { type: String, required: true }, // e.g. "WP-CAB-1234"
    driverName:       { type: String, required: true },
    transportCompany: { type: String },

    // ── Cargo Details ────────────────────────────────────────────────────────
    direction: {
        type: String,
        enum: ['outgoing', 'incoming'],
        default: 'outgoing',
    },
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportShipment' },
    invoiceId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    items: [{
        description: { type: String },
        quantity:    { type: Number },
        uom:         { type: String },
        batchNo:     { type: String }, // Julian batch code reference
    }],
    sealNumber:    { type: String },
    containerNo:   { type: String },
    grossWeightKg: { type: Number },

    // ── Authorisation ────────────────────────────────────────────────────────
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'exited'],
        default: 'pending',
    },
    approvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt:      { type: Date },
    rejectionReason: { type: String },

    // ── Timestamps ───────────────────────────────────────────────────────────
    requestedAt: { type: Date, default: Date.now },
    exitTime:    { type: Date },
    entryTime:   { type: Date },
    notes:       { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

gatePassSchema.pre('save', async function() {
    if (this.isNew && !this.gatePassNumber) {
        const seq = await getNextSequence('gatepass');
        this.gatePassNumber = `GP-${String(seq).padStart(4, '0')}`;
    }
});

gatePassSchema.pre(/^find/, function(next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

gatePassSchema.index({ status: 1, createdAt: -1 });
gatePassSchema.index({ vehicleNumber: 1 });

const GatePass = mongoose.model('GatePass', gatePassSchema);
export default GatePass;
