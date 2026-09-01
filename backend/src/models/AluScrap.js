import mongoose from 'mongoose';

const aluScrapSchema = new mongoose.Schema({
    profileCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    lengthMm: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['available', 'used', 'wasted'],
        default: 'available'
    },
    sourceQuotationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AluQuotation',
        default: null
    },
    notes: {
        type: String,
        trim: true
    }
}, { timestamps: true });

export default mongoose.model('AluScrap', aluScrapSchema);
