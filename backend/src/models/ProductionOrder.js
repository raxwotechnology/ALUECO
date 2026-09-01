import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const consumptionItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    productCode: String,
    productName: String,
    componentType: String,

    plannedQuantity: { type: Number, required: false, min: 0 },
    actualQuantity: { type: Number, default: 0 },
    unitOfMeasure: String,

    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },

    // Cost tracking
    standardCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },

    // Stock movement reference
    stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' },
    consumedAt: Date,

    notes: String,
}, { _id: true });

const laborLogSchema = new mongoose.Schema({
    laborType: String,
    description: String,
    plannedHours: Number,
    actualHours: { type: Number, default: 0 },
    hourlyRate: Number,
    actualCost: { type: Number, default: 0 },

    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    workerName: String,
    notes: String,
}, { _id: true });

const outputItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    productCode: String,
    productName: String,

    plannedQuantity: { type: Number, required: false },
    actualQuantity: { type: Number, default: 0 },
    damagedQuantity: { type: Number, default: 0 },
    rejectedQuantity: { type: Number, default: 0 },

    unitOfMeasure: String,
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },

    // Output quality
    qcStatus: {
        type: String,
        default: 'pending',
    },

    // Cost of this output
    costPerUnit: { type: Number, default: 0 },

    // Batch tracking
    batchNumber: String,
    manufactureDate: Date,
    expiryDate: Date,

    stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' },
    producedAt: Date,

    notes: String,
}, { _id: true });

const productionOrderSchema = new mongoose.Schema({
    productionNumber: { type: String, unique: true, trim: true, uppercase: true },

    // Source
    bomId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillOfMaterials', required: false },
    bomCode: String,
    bomName: String,

    finishedProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    finishedProductName: String,
    finishedProductCode: String,

    // Quantities
    plannedQuantity: { type: Number, required: false, min: 0.01 }, // finished units to make
    batchMultiplier: Number, // plannedQty / bom.outputQuantity

    // Warehouses
    sourceWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: false }, // where raw materials are
    outputWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: false }, // where finished goods go

    // Dates
    plannedStartDate: Date,
    plannedEndDate: Date,
    actualStartDate: Date,
    actualEndDate: Date,

    // Status
    status: {
        type: String,
        default: 'draft',
    },

    priority: { type: String, default: 'normal' },

    // Consumption (raw materials used)
    consumption: [consumptionItemSchema],

    // Labor logs
    labor: [laborLogSchema],

    // Output (what we actually made)
    output: [outputItemSchema],

    // Costing
    plannedMaterialCost: { type: Number, default: 0 },
    actualMaterialCost: { type: Number, default: 0 },
    plannedLaborCost: { type: Number, default: 0 },
    actualLaborCost: { type: Number, default: 0 },
    overheadCost: { type: Number, default: 0 },
    totalPlannedCost: { type: Number, default: 0 },
    totalActualCost: { type: Number, default: 0 },
    costVariance: { type: Number, default: 0 }, // actual - planned
    costPerUnit: { type: Number, default: 0 }, // actual cost / actual quantity

    // Completion tracking
    completionPercent: { type: Number, default: 0 },
    totalProduced: { type: Number, default: 0 },

    notes: String,
    internalNotes: String,
    referenceLink: { type: String, trim: true },

    // Reference
    sourceType: { type: String, default: 'manual' },
    sourceSalesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },

    // Audit
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,
    cancellationReason: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

// removed duplicate index
productionOrderSchema.index({ status: 1, plannedStartDate: -1 });
productionOrderSchema.index({ finishedProductId: 1 });
productionOrderSchema.index({ bomId: 1 });

productionOrderSchema.pre('save', async function () {
    if (this.isNew && !this.productionNumber) {
        const seq = await getNextSequence('production_order');
        this.productionNumber = `PO-PRD-${seq}`;
    }

    // Calculate planned costs
    this.plannedMaterialCost = +this.consumption.reduce(
        (s, c) => s + (c.plannedQuantity * (c.standardCost || 0)), 0
    ).toFixed(2);

    this.actualMaterialCost = +this.consumption.reduce(
        (s, c) => s + (c.actualCost || 0), 0
    ).toFixed(2);

    this.plannedLaborCost = +this.labor.reduce(
        (s, l) => s + ((l.plannedHours || 0) * (l.hourlyRate || 0)), 0
    ).toFixed(2);

    this.actualLaborCost = +this.labor.reduce(
        (s, l) => s + (l.actualCost || 0), 0
    ).toFixed(2);

    this.totalPlannedCost = +(this.plannedMaterialCost + this.plannedLaborCost + (this.overheadCost || 0)).toFixed(2);
    this.totalActualCost = +(this.actualMaterialCost + this.actualLaborCost + (this.overheadCost || 0)).toFixed(2);
    this.costVariance = +(this.totalActualCost - this.totalPlannedCost).toFixed(2);

    // Total produced
    this.totalProduced = +this.output.reduce(
        (s, o) => s + (o.actualQuantity || 0), 0
    ).toFixed(4);

    // Cost per unit (based on actual output)
    this.costPerUnit = this.totalProduced > 0
        ? +(this.totalActualCost / this.totalProduced).toFixed(2)
        : 0;

    // Completion %
    this.completionPercent = this.plannedQuantity > 0
        ? Math.min(100, +((this.totalProduced / this.plannedQuantity) * 100).toFixed(2))
        : 0;
});

productionOrderSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const ProductionOrder = mongoose.model('ProductionOrder', productionOrderSchema);
export default ProductionOrder;