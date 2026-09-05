import mongoose from 'mongoose';

const aluAgreementSchema = new mongoose.Schema({
    agreementNumber: { type: String, required: true, unique: true }, // e.g. PA-200
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AluQuotation' },
    quotationNumber: { type: String, required: true }, // e.g. QOT-231
    agreementDate: { type: Date, required: true, default: Date.now },
    
    contractorDetails: {
        companyName: { type: String, default: 'LUXO Construction (Pvt) Ltd' },
        experienceCenter: { type: String, default: 'ALUECO Experience Center' },
        address: { type: String, default: 'No.145B, Wallawatta, Weliweriya' },
        phone1: { type: String, default: '0742899977' },
        phone2: { type: String, default: '0777140680' },
        website: { type: String, default: 'www.luxoconstruction.com' }
    },
    
    customerDetails: {
        customerName: { type: String, required: true },
        projectLocation: { type: String, required: true },
        contactNo: { type: String, default: '' }
    },
    
    projectValue: { type: Number, required: true }, // Total Contract Value in LKR
    
    paymentSchedule: [{
        stageName: { type: String, required: true },
        amount: { type: Number, required: true },
        percentage: { type: Number, default: 0 }
    }],
    
    scopeOfWork: {
        type: String,
        default: 'LUXO Construction (Pvt) Ltd agrees to supply, fabricate, deliver, and install the aluminium works as detailed in the approved quotation. Any additional work requested outside the approved quotation shall be treated as a variation and charged separately.'
    },
    
    leadTimeDays: { type: Number, default: 14 }, // e.g. 14 working days
    
    warranties: {
        workmanshipYears: { type: Number, default: 10 },
        hardwareYears: { type: Number, default: 5 }
    },
    
    generalConditions: {
        type: String,
        default: 'All payments shall follow the agreed schedule. Variations will be charged separately. Final handover will be after full payment.'
    },
    
    bankDetails: {
        bankName: { type: String, default: 'Hatton National Bank' },
        accountName: { type: String, default: 'M.E.H.Bandara' },
        accountNumber: { type: String, default: '147020135728' },
        branch: { type: String, default: 'Nawala' }
    },
    
    status: {
        type: String,
        enum: ['draft', 'sent', 'signed', 'active', 'completed'],
        default: 'draft'
    },
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('AluAgreement', aluAgreementSchema);
