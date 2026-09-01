import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema({
    bankName: {
        type: String,
        required: [true, 'Bank name is required'],
        trim: true,
    },
    accountName: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true,
    },
    accountNumber: {
        type: String,
        required: [true, 'Account number is required'],
        unique: true,
        trim: true,
    },
    branchName: {
        type: String,
        trim: true,
    },
    accountType: {
        type: String,
        enum: ['current', 'savings'],
        default: 'current',
    },
    balance: {
        type: Number,
        default: 0,
    },
    currency: {
        type: String,
        default: 'LKR',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

bankAccountSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);
export default BankAccount;
