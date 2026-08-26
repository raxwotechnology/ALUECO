import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const aluPoItemSchema = new mongoose.Schema({
    itemCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 50,
    },
    materialType: {
        type: String,
        enum: ['profile', 'glass', 'accessory', 'raw_material', 'hardware', 'other'],
        default: 'raw_material',
    },
    productName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false,
    },
    requiredQuantity: {
        type: Number,
        required: true,
        min: 0,
    },
    receivedQuantity: {
        type: Number,
        default: 0,
        min: 0,
    },
    pendingQuantity: {
        type: Number,
        default: function () {
            return Math.max(0, (this.requiredQuantity || 0) - (this.receivedQuantity || 0));
        },
        min: 0,
    },
    unitOfMeasure: {
        type: String,
        default: 'pcs',
        trim: true,
    },
    estimatedUnitCost: {
        type: Number,
        default: 0,
        min: 0,
    },
    estimatedTotalCost: {
        type: Number,
        default: 0,
        min: 0,
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: false,
    },
    status: {
        type: String,
        enum: ['pending', 'partially_received', 'fulfilled', 'cancelled'],
        default: 'pending',
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 500,
    },
}, { _id: true });

const aluPurchaseOrderSchema = new mongoose.Schema({
    poNumber: {
        type: String,
        unique: true,
        trim: true,
        uppercase: true,
    },
    sourceType: {
        type: String,
        enum: ['quotation_shortage', 'manual_entry', 'direct_requisition'],
        default: 'quotation_shortage',
    },
    quotationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AluQuotation',
        required: false,
    },
    salesOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesOrder',
        required: false,
    },
    projectName: {
        type: String,
        trim: true,
        default: '',
    },
    customerName: {
        type: String,
        trim: true,
        default: '',
    },
    items: [aluPoItemSchema],
    totalEstimatedCost: {
        type: Number,
        default: 0,
        min: 0,
    },
    status: {
        type: String,
        enum: ['pending', 'partially_received', 'fulfilled', 'cancelled'],
        default: 'pending',
    },
    priority: {
        type: String,
        enum: ['normal', 'high', 'urgent'],
        default: 'normal',
    },
    expectedDate: {
        type: Date,
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

aluPurchaseOrderSchema.index({ poNumber: 1 });
aluPurchaseOrderSchema.index({ status: 1 });
aluPurchaseOrderSchema.index({ quotationId: 1 });
aluPurchaseOrderSchema.index({ salesOrderId: 1 });
aluPurchaseOrderSchema.index({ 'items.itemCode': 1 });

aluPurchaseOrderSchema.pre('save', async function () {
    if (this.isNew && !this.poNumber) {
        const seq = await getNextSequence('alu_purchase_order');
        this.poNumber = `ALU-PO-${String(seq).padStart(4, '0')}`;
    }

    // Calculate item costs and pending quantities
    let total = 0;
    let allFulfilled = this.items.length > 0;
    let anyReceived = false;

    this.items.forEach((item) => {
        item.pendingQuantity = Math.max(0, (item.requiredQuantity || 0) - (item.receivedQuantity || 0));
        item.estimatedTotalCost = +((item.requiredQuantity || 0) * (item.estimatedUnitCost || 0)).toFixed(2);
        total += item.estimatedTotalCost;

        if (item.pendingQuantity === 0 && item.requiredQuantity > 0) {
            item.status = 'fulfilled';
        } else if (item.receivedQuantity > 0) {
            item.status = 'partially_received';
            anyReceived = true;
            allFulfilled = false;
        } else {
            allFulfilled = false;
        }
    });

    this.totalEstimatedCost = +total.toFixed(2);

    if (this.items.length > 0) {
        if (allFulfilled) {
            this.status = 'fulfilled';
        } else if (anyReceived && this.status !== 'cancelled') {
            this.status = 'partially_received';
        }
    }
});

aluPurchaseOrderSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const AluPurchaseOrder = mongoose.model('AluPurchaseOrder', aluPurchaseOrderSchema);
export default AluPurchaseOrder;
