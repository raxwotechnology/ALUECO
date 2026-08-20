import mongoose from 'mongoose';

const aluQuotationItemSchema = new mongoose.Schema({
    applicationType: { type: String, required: true },
    configuration: { type: String, required: true },
    width: { type: Number, required: true },  // in mm
    height: { type: Number, required: true }, // in mm
    quantity: { type: Number, required: true, default: 1 }, // number of openings
    
    trackSystem: { type: String },
    description: { type: String, default: '' },
    profileSpec: { type: String, default: 'Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)' },
    glassSpec: { type: String, default: '5mm Single Tempered Clear Glass' },
    hardwareSpec: { type: String, default: 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals' },
    scopeSpec: { type: String, default: 'Fabrication, Delivery & Installation Inclusive' },
    topSection: {
        enabled: { type: Boolean, default: false },
        height: { type: Number, default: 0 },
        type: { type: String, default: 'fixed' }
    },
    panelArrangement: [{
        id: Number,
        action: String
    }],

    // Snapshot of calculated components for this opening
    profileCuts: [{
        profileCode: String,
        description: String,
        length: Number, // in mm
        qty: Number,    // quantity of cuts for this length
        totalLength: Number
    }],
    glassItems: [{
        glassType: String,
        width: Number,
        height: Number,
        qty: Number,
        areaSqFt: Number,
        unitRate: Number,
        cost: Number
    }],
    accessories: [{
        code: String,
        name: String,
        qty: Number,
        unitRate: Number,
        cost: Number
    }],
    labourCost: Number,
    unitPrice: Number, // calculated selling price for 1 opening (before manual project adjustments)
    totalPrice: Number // unitPrice * quantity
});

const aluQuotationSchema = new mongoose.Schema({
    quoteNumber: { type: String, required: true }, // e.g. QOT-2026-0001
    version: { type: Number, default: 0 },          // 0 = Rev 00, 1 = Rev 01, etc.
    revisionGroupCode: { type: String, required: true }, // same code across revisions, e.g. QOT-2026-0001
    isLatestRevision: { type: Boolean, default: true },
    
    customerName: { type: String, required: true },
    projectName: { type: String, required: true },
    description: { type: String, default: '' },
    location: { type: String, default: '' },
    date: { type: Date, required: true, default: Date.now },
    validTill: { type: Date, required: true },
    preparedBy: { type: String, default: 'ALUECO Team' },
    
    items: [aluQuotationItemSchema],
    
    // Project-wide aggregated costs
    totalAluminiumCost: { type: Number, default: 0 },
    totalGlassCost: { type: Number, default: 0 },
    totalAccessoriesCost: { type: Number, default: 0 },
    totalLabourCost: { type: Number, default: 0 },
    transportCost: { type: Number, default: 0 },
    
    additionalCosts: [{
        name: { type: String, required: true },
        cost: { type: Number, required: true }
    }],
    
    profitMarginPercent: { type: Number, default: 20 }, // profit margin applied
    calculatedSellingPrice: { type: Number, default: 0 }, // exact sum before discount/adjustments
    
    discount: { type: Number, default: 0 },
    manualAdjustment: { type: Number, default: 0 }, // can be positive or negative special pricing
    
    finalSellingPrice: { type: Number, default: 0 }, // final client-facing price
    
    status: {
        type: String,
        enum: ['draft', 'sent', 'follow_up', 'revised', 'accepted', 'rejected', 'expired', 'converted'],
        default: 'draft'
    },
    
    // Preservation snapshots
    rateSnapshot: { type: Object, default: {} }, // snapshot of prices used for this revision
    cuttingOptimizationResults: { type: Object, default: {} }, // 1D bin packing instructions
    glassOptimizationResults: { type: Object, default: {} }, // 2D glass bin packing instructions
    
    checklist: [{ type: String }],
    terms: [{ type: String }],
    termsAndConditions: { type: String, default: '' },
    includeVat: { type: Boolean, default: true },
    distributeTransportCost: { type: Boolean, default: false },
    
    discountStatus: { 
        type: String, 
        enum: ['none', 'pending', 'approved', 'rejected'], 
        default: 'none' 
    },
    discountApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Enforce unique combo of quoteNumber and version
aluQuotationSchema.index({ quoteNumber: 1, version: 1 }, { unique: true });

export default mongoose.model('AluQuotation', aluQuotationSchema);
