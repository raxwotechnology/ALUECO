import mongoose from 'mongoose';

const aluGlassSchema = new mongoose.Schema({
    typeName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 100
    },
    thickness: {
        type: String,
        required: true,
        trim: true
    },
    ratePerSqFt: {
        type: Number,
        required: true,
        min: 0
    },
    ratePerSqM: {
        type: Number,
        required: true,
        min: 0
    },
    temperingCharge: {
        type: Number,
        default: 0,
        min: 0
    },
    processingCharge: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default mongoose.model('AluGlass', aluGlassSchema);
