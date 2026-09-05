import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema({
    quotationCode: { type: String, unique: true },
    quoteNumber: { type: String },
    inquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', set: v => v === '' ? undefined : v },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', set: v => v === '' ? undefined : v },
    // customerId can reference either Customer or be provided as a string name
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', set: v => v === '' ? undefined : v },
    customerName: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },
    customerAddress: { type: String },
    version: { type: Number, default: 1 },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: { type: String },
        description: { type: String },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, default: 0 },
        subtotal: { type: Number, default: 0 }
    }],
    totalAmount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    terms: {
        incoterm: { type: String, default: 'FOB' },
        paymentTerms: String,
        deliveryWeeks: Number,
        validUntil: Date,
        notes: String,
    },
    status: { type: String, default: 'draft' },
    sentAt: Date,
    acceptedAt: Date,
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

quotationSchema.pre('validate', async function () {
    if (this.customerId === '') {
        this.customerId = undefined;
    }
    if (this.inquiryId === '') {
        this.inquiryId = undefined;
    }
    if (this.inquiry === '') {
        this.inquiry = undefined;
    }

    if (!this.quotationCode) {
        const date = new Date();
        const prefix = `QUO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
        const count = await this.constructor.countDocuments({ quotationCode: { $regex: `^${prefix}` } });
        this.quotationCode = `${prefix}-${String(count + 1).padStart(3, '0')}`;
        this.quoteNumber = this.quotationCode;
    }
    // Auto-calculate grand total
    if (this.isModified('items') || this.isNew) {
        this.totalAmount = (this.items || []).reduce((sum, i) => sum + (i.subtotal || (i.quantity * i.unitPrice) || 0), 0);
        this.grandTotal = this.totalAmount + (this.tax || 0) - (this.discount || 0);
    }
});

export default mongoose.model('Quotation', quotationSchema);
