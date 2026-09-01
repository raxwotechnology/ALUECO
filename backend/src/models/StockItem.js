import mongoose from 'mongoose';

const stockItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: false,
        },
        productCode: { type: String, trim: true }, // denormalized
        productName: { type: String, trim: true }, // denormalized

        warehouseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Warehouse',
            required: false,
        },

        // Batch tracking (optional — only if product has it)
        batchNumber: { type: String, trim: true, default: null },
        grnNumber: { type: String, trim: true, default: null }, // Track the GRN number when received
        manufactureDate: { type: Date, default: null },
        expiryDate: { type: Date, default: null },

        quantities: {
            onHand: { type: Number, default: 0 },      // physical stock
            reserved: { type: Number, default: 0 },    // held for pending orders
            available: { type: Number, default: 0 },   // openStock - reserved (computed)
            openStock: { type: Number, default: 0 },   // stock made available to sell (POS)
            balanceStock: { type: Number, default: 0 },// stock remaining/unreleased from production/conversion
        },
        unitOfMeasure: { type: String, trim: true },

        // FIFO/weighted avg cost
        costPerUnit: { type: Number, default: 0 },
        totalValue: { type: Number, default: 0 },    // onHand × costPerUnit

        lastMovementDate: { type: Date },
        lastCountDate: { type: Date },
    },
    { timestamps: true }
);

// Unique stock record per (product, warehouse, batch)
// Using null batchNumber allows single record per product-warehouse for non-batch items
stockItemSchema.index(
    { productId: 1, warehouseId: 1, batchNumber: 1 },
    { unique: true }
);
stockItemSchema.index({ warehouseId: 1, productId: 1 });
stockItemSchema.index({ 'quantities.available': 1 });
stockItemSchema.index({ expiryDate: 1 });

// Keep available in sync before save
stockItemSchema.pre('save', function () {
    // If openStock and balanceStock are both 0 but onHand is positive (legacy items),
    // default openStock to onHand to prevent zero stock on legacy products.
    if (!this.quantities.openStock && !this.quantities.balanceStock && this.quantities.onHand > 0) {
        this.quantities.openStock = this.quantities.onHand;
    }

    // Force physical stock (onHand) to always equal the sum of open and balance stock
    this.quantities.onHand = (this.quantities.openStock || 0) + (this.quantities.balanceStock || 0);

    // available stock is what can actually be sold (openStock minus any reserved stock)
    this.quantities.available = Math.max(0, (this.quantities.openStock || 0) - (this.quantities.reserved || 0));

    this.totalValue = +(this.quantities.onHand * this.costPerUnit).toFixed(2);
});

const StockItem = mongoose.model('StockItem', stockItemSchema);
export default StockItem;