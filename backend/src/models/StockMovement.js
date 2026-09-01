import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const stockMovementSchema = new mongoose.Schema(
    {
        movementNumber: { type: String, unique: true, trim: true, uppercase: true },

        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
        productCode: { type: String, trim: true },
        productName: { type: String, trim: true },

        batchNumber: { type: String, trim: true, default: null },

        movementType: {
            type: String,
            required: false,
            type: String,
        },

        direction: { type: String, required: false },
        quantity: { type: Number, required: false, min: 0.01 },
        unitOfMeasure: { type: String, trim: true },

        // Warehouses
        warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }, // source OR destination
        fromWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
        toWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },

        // Cost tracking
        costPerUnit: { type: Number, default: 0 },
        totalCost: { type: Number, default: 0 },

        balanceBefore: { type: Number, default: 0 },
        balanceAfter: { type: Number, default: 0 },

        // Source document (what caused this movement)
        sourceDocument: {
            type: {
                type: String,
                type: String,
            },
            id: { type: mongoose.Schema.Types.ObjectId },
            number: { type: String, trim: true },
        },

        reason: { type: String, trim: true },
        notes: { type: String, trim: true },

        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

stockMovementSchema.index({ productId: 1, timestamp: -1 });
stockMovementSchema.index({ warehouseId: 1, timestamp: -1 });
stockMovementSchema.index({ movementType: 1, timestamp: -1 });
stockMovementSchema.index({ 'sourceDocument.id': 1 });

stockMovementSchema.pre('save', async function () {
    if (this.isNew && !this.movementNumber) {
        const seq = await getNextSequence('stock_movement');
        this.movementNumber = `MOV-${seq}`;
    }
});

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;