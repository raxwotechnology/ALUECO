import mongoose from 'mongoose';

const stockReservationSchema = new mongoose.Schema(
    {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
        warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: false },
        batchNumber: { type: String, trim: true, default: null },

        quantity: { type: Number, required: false, min: 0.01 },
        unitOfMeasure: { type: String, trim: true },

        sourceDocument: {
            type: { type: String, default: 'sales_order' },
            id: { type: mongoose.Schema.Types.ObjectId, required: false },
            number: { type: String, trim: true },
            lineItemId: { type: mongoose.Schema.Types.ObjectId }, // order line
        },

        status: {
            type: String,
            type: String,
            default: 'active',
        },

        reservedAt: { type: Date, default: Date.now },
        reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        fulfilledAt: { type: Date },
        cancelledAt: { type: Date },
        cancellationReason: { type: String, trim: true },
    },
    { timestamps: true }
);

stockReservationSchema.index({ productId: 1, warehouseId: 1, status: 1 });
stockReservationSchema.index({ 'sourceDocument.id': 1, status: 1 });

const StockReservation = mongoose.model('StockReservation', stockReservationSchema);
export default StockReservation;