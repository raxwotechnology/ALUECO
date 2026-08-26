import mongoose from 'mongoose';

const aluProfileSchema = new mongoose.Schema({
    profileCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        maxlength: 50
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    supplier: {
        type: String,
        required: true,
        trim: true
    },
    standardLengths: [{
        lengthMm: { type: Number, required: true }, // in mm (e.g., 2134 for 7ft)
        price: { type: Number, required: true }      // price for this standard bar length
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default mongoose.model('AluProfile', aluProfileSchema);
