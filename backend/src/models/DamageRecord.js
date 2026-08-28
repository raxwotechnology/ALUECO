import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const damageRecordSchema = new mongoose.Schema({
    damageNumber: { type: String, unique: true, trim: true, uppercase: true },

    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    productCode: String,
    productName: String,

    quantity: { type: Number, required: false, min: 0.01 },
    unitOfMeasure: String,
    costPerUnit: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },

    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },

    source: {
        type: String,
        required: false,
    },

    // Links to source document
    sourceDocument: {
        type: { type: String },
        id: mongoose.Schema.Types.ObjectId,
        number: String,
    },

    description: String,

    disposition: {
        type: String,
        default: 'pending',
    },

    // Writeoff tracking
    writtenOff: { type: Boolean, default: false },
    writtenOffAt: Date,
    writeOffValue: { type: Number, default: 0 },

    // Stock impact
    stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' },
    stockAdjusted: { type: Boolean, default: false },

    // Link to repair order if disposition is 'repair'
    repairOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'RepairOrder' },

    // Link to supplier return if disposition is 'return_to_supplier'
    supplierReturnId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupplierReturn' },

    photos: [String],
    notes: String,

    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,

    deletedAt: { type: Date, default: null },
}, { timestamps: true });

// removed duplicate index
damageRecordSchema.index({ productId: 1, createdAt: -1 });
damageRecordSchema.index({ source: 1, disposition: 1 });

damageRecordSchema.pre('save', async function () {
    if (this.isNew && !this.damageNumber) {
        const seq = await getNextSequence('damage');
        this.damageNumber = `DMG-${seq}`;
    }
    this.totalValue = +(this.quantity * (this.costPerUnit || 0)).toFixed(2);
});

damageRecordSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const DamageRecord = mongoose.model('DamageRecord', damageRecordSchema);
export default DamageRecord;