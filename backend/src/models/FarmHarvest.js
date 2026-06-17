import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const harvestLineItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productCode: String,
    productName: String,
    quantity: { type: Number, required: true, min: 0 },
    unitOfMeasure: String,
    unitPrice: { type: Number, default: 0 },
    batchNumber: String,
    stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' }
});

const farmHarvestSchema = new mongoose.Schema({
    harvestNumber: { type: String, unique: true, uppercase: true },
    farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true },
    farmName: String,
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    harvestDate: { type: Date, default: Date.now },
    items: [harvestLineItemSchema],
    totalValue: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'approved'], default: 'draft' },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

farmHarvestSchema.pre('save', async function() {
    if (this.isNew && !this.harvestNumber) {
        const seq = await getNextSequence('harvest');
        this.harvestNumber = `HRV-${seq}`;
    }
    this.totalValue = this.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
});

farmHarvestSchema.pre(/^find/, function(next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const FarmHarvest = mongoose.model('FarmHarvest', farmHarvestSchema);
export default FarmHarvest;
