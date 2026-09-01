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
        actualCode: { type: String, default: '' },
        description: { type: String, required: true },
        quantityFormula: { type: String, required: true }, // e.g. "2" or "2 * P"
        lengthFormula: { type: String, required: true }    // e.g. "W" or "H" or "H - 50"
    }],
    glassBOM: [{
        glassCode: { type: String, default: '' },
        quantityFormula: { type: String, required: true }, // e.g. "P"
        widthFormula: { type: String, required: true },    // e.g. "(W - 150) / 2"
        heightFormula: { type: String, required: true },   // e.g. "H - 100"
        glassSheetLength: { type: String, default: '8' },
        base21ftPrice: { type: Number, default: 0 }
    }],
    accessoryBOM: [{
        accessoryCode: { type: String, required: true },
        actualCode: { type: String, default: '' },
        quantityFormula: { type: String, required: true }   // e.g. "4 * P" or "2 * Q"
    }],
    labourMethod: {
        type: String,
        enum: ['linear_feet', 'feet', 'sqft', 'sqm', 'opening', 'fixed', 'percentage'],
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
    profileSpec: {
        type: String,
        default: 'Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)',
        trim: true
    },
    glassSpec: {
        type: String,
        default: '5mm Single Tempered Clear Glass',
        trim: true
    },
    hardwareSpec: {
        type: String,
        default: 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals',
        trim: true
    },
    scopeSpec: {
        type: String,
        default: 'Fabrication, Delivery & Installation Inclusive',
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
