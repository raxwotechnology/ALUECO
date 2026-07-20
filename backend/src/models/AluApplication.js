import mongoose from 'mongoose';

const aluApplicationSchema = new mongoose.Schema({
    type: {
        type: String, // e.g. Sliding Door, Casement Window, Fixed Glass
        required: true,
        trim: true
    },
    configuration: {
        type: String, // e.g. 2 Panel, 3 Panel - 2 Track
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    profileBOM: [{
        profileCode: { type: String, required: true },
        description: { type: String, required: true },
        quantityFormula: { type: String, required: true }, // e.g. "2" or "2 * P"
        lengthFormula: { type: String, required: true }    // e.g. "W" or "H" or "H - 50"
    }],
    glassBOM: [{
        glassType: { type: String, required: true },
        quantityFormula: { type: String, required: true }, // e.g. "P"
        widthFormula: { type: String, required: true },    // e.g. "(W - 150) / 2"
        heightFormula: { type: String, required: true }   // e.g. "H - 100"
    }],
    accessoryBOM: [{
        accessoryCode: { type: String, required: true },
        quantityFormula: { type: String, required: true }   // e.g. "4 * P" or "2 * Q"
    }],
    labourMethod: {
        type: String,
        enum: ['sqft', 'sqm', 'opening', 'fixed', 'percentage'],
        default: 'opening'
    },
    labourRate: {
        type: Number,
        default: 0
    },
    brand: {
        type: String,
        default: 'Standard',
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Enforce unique combination of type, configuration and brand
aluApplicationSchema.index({ type: 1, configuration: 1, brand: 1 }, { unique: true });

export default mongoose.model('AluApplication', aluApplicationSchema);
