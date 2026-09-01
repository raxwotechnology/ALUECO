import mongoose from 'mongoose';

const inquirySchema = new mongoose.Schema({
    inquiryCode: { type: String, unique: true },
    leadNo: { type: String, unique: true, sparse: true }, // e.g. L-0001
    inquiryDate: { type: Date, default: Date.now },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    
    // Customer / Prospect Details
    customerName: { type: String },
    contactNo: { type: String },
    companyName: { type: String },
    contactPerson: { type: String },
    email: { type: String },
    phone: { type: String },
    country: { type: String, default: 'Sri Lanka' },
    prospectName: String,
    prospectEmail: String,
    prospectCountry: String,
    
    // Project & Source
    inquirySource: { type: String, default: 'Direct' },
    source: { type: String, default: 'Direct' },
    projectLocation: { type: String },
    requirement: { type: String },
    expectedTimeline: { type: String },
    
    // Site Visit & Quotation Tracking
    siteVisitDate: { type: Date },
    quotationNo: { type: String },
    quotationValue: { type: Number, default: 0 },
    quotations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' }],
    aluQuotations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AluQuotation' }],
    
    // Status, Follow-up & Outcomes
    status: {
        type: String,
        default: 'New Inquiry',
    },
    nextFollowUpDate: { type: Date },
    followUpDate: { type: Date }, // legacy alias
    finalValue: { type: Number, default: 0 },
    result: {
        type: String,
        default: 'Pending'
    },
    advanceAmount: { type: Number, default: 0 },
    advanceDate: { type: Date },
    projectStatus: {
        type: String,
        default: 'Not Created'
    },
    lostReason: { type: String },
    
    // Follow-up interaction log
    followUpHistory: [{
        date: { type: Date, default: Date.now },
        salesOfficer: { type: String },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String },
        nextFollowUpDate: { type: Date }
    }],

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
    
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    notes: { type: String },
    convertedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ leadNo: 1 });
inquirySchema.index({ assignedTo: 1, status: 1 });

inquirySchema.pre('validate', async function () {
    // Keep sync between customerName/companyName and contactNo/phone
    if (this.customerName && !this.companyName) this.companyName = this.customerName;
    if (this.companyName && !this.customerName) this.customerName = this.companyName;
    if (this.contactNo && !this.phone) this.phone = this.contactNo;
    if (this.phone && !this.contactNo) this.contactNo = this.phone;
    if (this.inquirySource && !this.source) this.source = this.inquirySource;
    if (this.source && !this.inquirySource) this.inquirySource = this.source;
    if (this.nextFollowUpDate && !this.followUpDate) this.followUpDate = this.nextFollowUpDate;
    if (this.followUpDate && !this.nextFollowUpDate) this.nextFollowUpDate = this.followUpDate;

    // Generate inquiryCode if not present
    if (!this.inquiryCode) {
        const date = new Date();
        const prefix = `INQ-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
        const count = await this.constructor.countDocuments({ inquiryCode: { $regex: `^${prefix}` } });
        this.inquiryCode = `${prefix}-${String(count + 1).padStart(3, '0')}`;
    }

    // Generate leadNo if not present (e.g. L-0001, L-0002...)
    if (!this.leadNo) {
        const totalCount = await this.constructor.countDocuments();
        let nextNum = totalCount + 1;
        let candidate = `L-${String(nextNum).padStart(4, '0')}`;
        while (await this.constructor.exists({ leadNo: candidate })) {
            nextNum += 1;
            candidate = `L-${String(nextNum).padStart(4, '0')}`;
        }
        this.leadNo = candidate;
    }
});

export default mongoose.model('Inquiry', inquirySchema);

