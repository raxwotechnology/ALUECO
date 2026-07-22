import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: false,
        default: 'Wholesale ERP'
    },
    companyAddress: String,
    companyPhone: String,
    companyEmail: String,
    companyLogo: String,
    secondaryLogo: String,
    taxId: String,
    currency: {
        type: String,
        default: 'LKR'
    },
    currencySymbol: {
        type: String,
        default: 'Rs.'
    },
    defaultTaxRate: {
        type: Number,
        default: 0
    },
    lowStockThreshold: {
        type: Number,
        default: 10
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
