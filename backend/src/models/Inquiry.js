import mongoose from 'mongoose';

const inquirySchema = new mongoose.Schema({
    inquiryCode: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    // UI-friendly fields
    companyName: { type: String },
    contactPerson: { type: String },
    email: { type: String },
    phone: { type: String },
    country: { type: String },
    prospectName: String,
    prospectEmail: String,
    prospectCountry: String,
    projectLocation: { type: String },
    expectedTimeline: { type: String },
    source: { 
        type: String, 
        enum: ['facebook', 'whatsapp', 'showroom', 'architect', 'contractor', 'referral', 'website', 'email', 'other'],
        default: 'website' 
    },
    products: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        requestedQty: Number,
        uom: { type: mongoose.Schema.Types.ObjectId, ref: 'UnitOfMeasure' },
        specifications: String,
    }],
    sampleRequested: { type: Boolean, default: false },
    sampleDetails: {
        sentDate: Date,
        trackingNumber: String,
        feedback: String,
        approved: { type: Boolean, default: false },
    },
    quotations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' }],
    status: {
        type: String,
        enum: ['new', 'site_visit', 'quotation_pending', 'quotation_sent', 'negotiation', 'won', 'lost'],
        default: 'new',
    },
    lostReason: String,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    followUpDate: Date,
    notes: { type: String },
    convertedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ assignedTo: 1, status: 1 });

inquirySchema.pre('validate', async function () {
    if (!this.inquiryCode) {
        const date = new Date();
        const prefix = `INQ-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
        const count = await this.constructor.countDocuments({ inquiryCode: { $regex: `^${prefix}` } });
        this.inquiryCode = `${prefix}-${String(count + 1).padStart(3, '0')}`;
    }
});

export default mongoose.model('Inquiry', inquirySchema);
