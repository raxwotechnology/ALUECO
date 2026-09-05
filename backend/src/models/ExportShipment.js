import mongoose from 'mongoose';

const exportShipmentSchema = new mongoose.Schema({
    shipmentCode: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false },
    salesOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' }],
    invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        batch: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionBatch' },
        quantity: Number,
        uom: { type: mongoose.Schema.Types.ObjectId, ref: 'UnitOfMeasure' },
        netWeight: Number,
        grossWeight: Number,
        unitPrice: Number,
        totalPrice: Number,
    }],
    containerDetails: {
        containerNumber: String,
        containerSize: { type: String },
        sealNumber: String,
        tareWeight: Number,
        maxPayload: Number,
    },
    logistics: {
        shippingLine: String,
        vesselName: String,
        voyageNumber: String,
        portOfLoading: { type: String, default: 'Colombo' },
        portOfDischarge: String,
        etd: Date,
        eta: Date,
        actualDeparture: Date,
        actualArrival: Date,
        billOfLading: String,
        trackingUrl: String,
    },
    documentation: {
        commercialInvoice: { url: String, generated: { type: Boolean, default: false } },
        packingList: { url: String, generated: { type: Boolean, default: false } },
        certificateOfOrigin: { url: String, generated: { type: Boolean, default: false } },
        phytosanitaryCert: { url: String, generated: { type: Boolean, default: false } },
        fumigationCert: { url: String, generated: { type: Boolean, default: false } },
        coa: { url: String, generated: { type: Boolean, default: false } },
        customsDeclaration: { url: String, generated: { type: Boolean, default: false } },
    },
    financials: {
        totalFOBValue: { type: Number, default: 0 },
        freightCost: { type: Number, default: 0 },
        insuranceCost: { type: Number, default: 0 },
        totalCIFValue: { type: Number, default: 0 },
        currency: { type: String, default: 'USD' },
        exchangeRate: Number,
        paymentTerms: String,
        paymentStatus: { type: String, default: 'pending' },
    },
    status: {
        type: String,
        default: 'draft',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// exportShipmentSchema.index({ shipmentCode: 1 });
exportShipmentSchema.index({ customer: 1, status: 1 });
exportShipmentSchema.index({ 'logistics.etd': 1 });

exportShipmentSchema.pre('validate', async function () {
    if (!this.shipmentCode) {
        const date = new Date();
        const prefix = `SHIP-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
        const count = await this.constructor.countDocuments({ shipmentCode: { $regex: `^${prefix}` } });
        this.shipmentCode = `${prefix}-${String(count + 1).padStart(3, '0')}`;
    }
    // Auto-calculate CIF
    if (this.financials) {
        this.financials.totalCIFValue = (this.financials.totalFOBValue || 0) + (this.financials.freightCost || 0) + (this.financials.insuranceCost || 0);
    }
});

export default mongoose.model('ExportShipment', exportShipmentSchema);
