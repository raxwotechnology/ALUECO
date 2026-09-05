import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const bomComponentSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false,
    },
    productCode: String,
    productName: String,
    productType: String, // 'raw_material', 'semi_finished', 'packaging', etc.

    quantity: { type: Number, required: false, min: 0.0001 },
    unitOfMeasure: String,

    // What type of component
    componentType: {
        type: String,
        default: 'raw_material',
    },

    // Wastage allowance (% extra to account for loss during production)
    wastagePercent: { type: Number, default: 0, min: 0, max: 100 },

    // Cost at time of BOM creation (snapshot)
    standardCost: { type: Number, default: 0 },

    // Optional: which step in production this is used
    productionStep: { type: Number, default: 1 },

    isOptional: { type: Boolean, default: false },
    notes: String,
}, { _id: true });

const bomLaborSchema = new mongoose.Schema({
    laborType: {
        type: String,
        default: 'general',
    },
    description: String,
    hours: { type: Number, required: false, min: 0 },
    hourlyRate: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
}, { _id: true });

const bomSchema = new mongoose.Schema({
    bomCode: { type: String, unique: true, trim: true, uppercase: true },
    name: {
        type: String,
        required: false,
        trim: true,
        maxlength: 200,
    },
    version: { type: String, default: '1.0', trim: true },

    // Finished product this BOM makes
    finishedProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false,
    },
    finishedProductCode: String,
    finishedProductName: String,

    // Output quantity this BOM produces (e.g., "1 batch = 100 units")
    outputQuantity: { type: Number, required: false, min: 0.01, default: 1 },
    outputUnitOfMeasure: String,

    components: [bomComponentSchema],
    labor: [bomLaborSchema],

    // Costing (calculated)
    totalMaterialCost: { type: Number, default: 0 },
    totalLaborCost: { type: Number, default: 0 },
    overheadPercent: { type: Number, default: 0 }, // as % of material + labor
    totalOverheadCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 },

    // Standard production time
    estimatedProductionTimeHours: { type: Number, default: 0 },

    status: {
        type: String,
        default: 'active',
    },
    isDefault: { type: Boolean, default: true }, // if a product has multiple BOM versions, one is default

    effectiveFrom: Date,
    effectiveUntil: Date,

    notes: String,
    internalNotes: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

// removed duplicate index
bomSchema.index({ finishedProductId: 1, isDefault: 1, status: 1 });
bomSchema.index({ status: 1 });

bomSchema.pre('save', async function () {
    if (this.isNew && !this.bomCode) {
        const seq = await getNextSequence('bom');
        this.bomCode = `BOM-${seq}`;
    }

    // Calculate component costs
    let materialCost = 0;
    this.components.forEach((c) => {
        const effectiveQty = c.quantity * (1 + (c.wastagePercent || 0) / 100);
        materialCost += effectiveQty * (c.standardCost || 0);
    });
    this.totalMaterialCost = +materialCost.toFixed(2);

    // Labor
    let laborCost = 0;
    this.labor.forEach((l) => {
        l.totalCost = +(l.hours * l.hourlyRate).toFixed(2);
        laborCost += l.totalCost;
    });
    this.totalLaborCost = +laborCost.toFixed(2);

    // Overhead
    this.totalOverheadCost = +((this.totalMaterialCost + this.totalLaborCost) * (this.overheadPercent || 0) / 100).toFixed(2);

    this.totalCost = +(this.totalMaterialCost + this.totalLaborCost + this.totalOverheadCost).toFixed(2);
    this.costPerUnit = this.outputQuantity > 0
        ? +(this.totalCost / this.outputQuantity).toFixed(2)
        : 0;
});

bomSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const BillOfMaterials = mongoose.model('BillOfMaterials', bomSchema);
export default BillOfMaterials;