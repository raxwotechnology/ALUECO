import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const grnLineItemSchema = new mongoose.Schema({
    poLineItemId: mongoose.Schema.Types.ObjectId,
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    productCode: String,
    productName: String,

    orderedQuantity: Number,       // from PO
    receivedQuantity: { type: Number, required: false, min: 0 },
    acceptedQuantity: { type: Number, default: 0 },
    rejectedQuantity: { type: Number, default: 0 },
    damagedQuantity: { type: Number, default: 0 },

    unitOfMeasure: String,
    unitPrice: { type: Number, required: false },

    batchNumber: String,
    manufactureDate: Date,
    expiryDate: Date,

    qcStatus: {
        type: String,
        default: 'not_required',
    },
    rejectionReason: String,
    notes: String,

    stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' },
}, { _id: true });

const grnSchema = new mongoose.Schema({
    grnNumber: { type: String, unique: true, trim: true, uppercase: true },

    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: false },
    poNumber: String, // denormalized
    sourceType: { type: String, enum: ['supplier', 'own_farm'], default: 'supplier' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: false },
    supplierName: String,
    farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: false },
    farmName: String,

    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: false },

    receiptDate: { type: Date, default: Date.now },
    supplierDeliveryNoteNumber: String,
    supplierInvoiceNumber: String,

    // Transport
    vehicleNumber: String,
    driverName: String,
    transportCompany: String,

    items: [grnLineItemSchema],

    totalReceivedValue: { type: Number, default: 0 },
    totalAcceptedValue: { type: Number, default: 0 },
    totalPayableLKR: { type: Number, default: 0 },
    paidAmountLKR: { type: Number, default: 0 },
    balanceDueLKR: { type: Number, default: 0 },

    status: {
        type: String,
        default: 'draft',
    },

    hasDiscrepancy: { type: Boolean, default: false },
    discrepancyNotes: String,

    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    notes: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

// removed duplicate index
grnSchema.index({ purchaseOrderId: 1 });
grnSchema.index({ supplierId: 1, receiptDate: -1 });
grnSchema.index({ status: 1 });

grnSchema.pre('save', async function () {
    if (this.isNew && !this.grnNumber) {
        const seq = await getNextSequence('grn');
        this.grnNumber = `GRN-${seq}`;
    }

    this.totalReceivedValue = +this.items.reduce(
        (s, i) => s + (i.receivedQuantity * i.unitPrice), 0
    ).toFixed(2);
    this.totalAcceptedValue = +this.items.reduce(
        (s, i) => s + ((i.acceptedQuantity || i.receivedQuantity) * i.unitPrice), 0
    ).toFixed(2);
});

grnSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const GoodsReceiptNote = mongoose.model('GoodsReceiptNote', grnSchema);
export default GoodsReceiptNote;