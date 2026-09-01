import mongoose from 'mongoose';

const aluJobCardItemSchema = new mongoose.Schema({
    applicationType: { type: String, required: true },
    configuration: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    quantity: { type: Number, required: true },
    // Quantity tracking per stage
    cuttingQty: { type: Number, default: 0 },
    assemblyQty: { type: Number, default: 0 },
    glazingQty: { type: Number, default: 0 },
    qaQty: { type: Number, default: 0 },
    readyQty: { type: Number, default: 0 },
    completedQty: { type: Number, default: 0 }
});

const aluJobCardSchema = new mongoose.Schema({
    jobCardNumber: {
        type: String,
        required: true,
        unique: true
    },
    salesOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesOrder',
        required: true
    },
    quotationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AluQuotation',
        required: true
    },
    customerName: { type: String, required: true },
    projectName: { type: String, required: true },
    status: {
        type: String,
        enum: ['cutting', 'assembly', 'glazing', 'qa', 'ready'],
        default: 'cutting'
    },
    items: [aluJobCardItemSchema],
    notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('AluJobCard', aluJobCardSchema);
