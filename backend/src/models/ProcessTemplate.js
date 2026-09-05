import mongoose from 'mongoose';

const processTemplateSchema = new mongoose.Schema({
    name: { type: String, required: false },
    code: { type: String, unique: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    stages: [{
        order: { type: Number, required: false },
        name: { type: String, required: false },
        type: { type: String },
        expectedDuration: Number,
        temperatureRange: { min: Number, max: Number },
        humidityRange: { min: Number, max: Number },
        expectedYield: Number,
        qcRequired: { type: Boolean, default: false },
        instructions: String,
        requiredMachines: [String],
    }],
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

processTemplateSchema.pre('validate', async function () {
    if (!this.code) {
        const count = await this.constructor.countDocuments();
        this.code = `PRC-${String(count + 1).padStart(3, '0')}`;
    }
});

export default mongoose.model('ProcessTemplate', processTemplateSchema);
