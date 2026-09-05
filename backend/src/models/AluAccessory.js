import mongoose from 'mongoose';

const aluAccessorySchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        maxlength: 50
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    brand: {
        type: String,
        default: '',
        trim: true
    },
    unit: {
        type: String,
        required: true,
        trim: true
    },
    purchaseRate: {
        type: Number,
        required: true,
        min: 0
    },
    sellingRate: {
        type: Number,
        required: true,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default mongoose.model('AluAccessory', aluAccessorySchema);
