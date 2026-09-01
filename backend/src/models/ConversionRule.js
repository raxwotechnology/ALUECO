import mongoose from 'mongoose';

const conversionRuleSchema = new mongoose.Schema({
    sourceProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    outputProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    processType: { type: String },
    expectedRatio: { type: Number, required: false },
    tolerancePercent: { type: Number, default: 5 },
    historicalRatios: [{
        batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionBatch' },
        actualRatio: Number,
        recordedAt: { type: Date, default: Date.now },
    }],
    movingAverage: Number,
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

conversionRuleSchema.index({ sourceProduct: 1, outputProduct: 1 });

export default mongoose.model('ConversionRule', conversionRuleSchema);
