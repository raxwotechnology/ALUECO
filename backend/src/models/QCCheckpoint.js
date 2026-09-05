import mongoose from 'mongoose';

const qcCheckpointSchema = new mongoose.Schema({
    name: { type: String, required: false },
    code: { type: String, unique: true },
    category: { type: String },
    applicableStages: [{ type: String }],
    parameters: [{
        name: String,
        unit: String,
        minValue: Number,
        maxValue: Number,
        method: String,
    }],
    isMandatory: { type: Boolean, default: true },
    certificationStandard: { type: String, default: 'none' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('QCCheckpoint', qcCheckpointSchema);
