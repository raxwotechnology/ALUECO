import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const supplierReturnItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    productCode: String,
    productName: String,

    // Source: original receipt from supplier
    grnId: { type: mongoose.Schema.Types.ObjectId, ref: 'GoodsReceiptNote' },
    poId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },

    quantity: { type: Number, required: false, min: 0.01 },
    unitOfMeasure: String,
    unitPrice: { type: Number, required: false },

    reason: {
        type: String,
        required: false,
    },
    reasonDescription: String,

    // Stock impact
    stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' },
}, { _id: true });

const supplierReturnSchema = new mongoose.Schema({
    returnNumber: { type: String, unique: true, trim: true, uppercase: true },

    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: false },
    supplierSnapshot: { name: String, code: String },

    returnDate: { type: Date, default: Date.now },
    expectedCreditDate: Date,

    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: false },

    // Source document (e.g., damage record)
    sourceDocument: {
        type: { type: String },
        id: mongoose.Schema.Types.ObjectId,
        number: String,
    },

    items: [supplierReturnItemSchema],

    totalReturnValue: { type: Number, default: 0 },
    expectedCreditAmount: { type: Number, default: 0 },
    actualCreditReceived: { type: Number, default: 0 },

    creditReceivedDate: Date,
    creditReferenceNumber: String, // supplier's credit note number

    status: {
        type: String,
        default: 'draft',
    },

    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

// removed duplicate index
supplierReturnSchema.index({ supplierId: 1, returnDate: -1 });

supplierReturnSchema.pre('save', async function () {
    if (this.isNew && !this.returnNumber) {
        const seq = await getNextSequence('supplier_return');
        this.returnNumber = `SRT-${seq}`;
    }
    this.totalReturnValue = +this.items.reduce(
        (s, i) => s + (i.quantity * i.unitPrice), 0
    ).toFixed(2);
    if (!this.expectedCreditAmount) this.expectedCreditAmount = this.totalReturnValue;
});

supplierReturnSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const SupplierReturn = mongoose.model('SupplierReturn', supplierReturnSchema);
export default SupplierReturn;