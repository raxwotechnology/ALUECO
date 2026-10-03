import asyncHandler from 'express-async-handler';
import AluAgreement from '../models/AluAgreement.js';
import AluQuotation from '../models/AluQuotation.js';
import BankAccount from '../models/BankAccount.js';

// Helper to generate Agreement Number (PA-200, PA-201, ...)
const generateAgreementNumber = async () => {
    const count = await AluAgreement.countDocuments();
    const nextNum = 200 + count;
    return `PA-${nextNum}`;
};

// @desc    Get all project agreements
// @route   GET /api/alu/agreements
// @access  Private
export const getAgreements = asyncHandler(async (req, res) => {
    const agreements = await AluAgreement.find().sort({ createdAt: -1 });
    res.json({ success: true, data: agreements });
});

// @desc    Get single project agreement by ID
// @route   GET /api/alu/agreements/:id
// @access  Private
export const getAgreementById = asyncHandler(async (req, res) => {
    const agreement = await AluAgreement.findById(req.params.id);
    if (!agreement) {
        res.status(404);
        throw new Error('Project Agreement not found');
    }
    res.json({ success: true, data: agreement });
});

// @desc    Create new project agreement
// @route   POST /api/alu/agreements
// @access  Private
export const createAgreement = asyncHandler(async (req, res) => {
    const {
        quotationId,
        quotationNumber,
        agreementDate,
        customerDetails,
        projectValue,
        paymentSchedule,
        scopeOfWork,
        leadTimeDays,
        warranties,
        generalConditions,
        bankDetails
    } = req.body;

    const agreementNumber = await generateAgreementNumber();

    // Default payment schedule if not provided
    const defaultSchedule = paymentSchedule && paymentSchedule.length > 0 ? paymentSchedule : [
        { stageName: 'Order Confirmation Advance', amount: Math.round(projectValue * 0.55), percentage: 55 },
        { stageName: 'Project Progress Payment', amount: Math.round(projectValue * 0.20), percentage: 20 },
        { stageName: 'Final Payment Upon Project Completion', amount: Math.round(projectValue * 0.25), percentage: 25 }
    ];

    // Resolve Bank Details fallback from database if not specified
    let finalBankDetails = bankDetails;
    if (!finalBankDetails || !finalBankDetails.accountNumber) {
        const defaultAccount = await BankAccount.findOne({ isActive: true, deletedAt: null }).sort({ createdAt: -1 });
        if (defaultAccount) {
            finalBankDetails = {
                bankName: defaultAccount.bankName,
                accountName: defaultAccount.accountName,
                accountNumber: defaultAccount.accountNumber,
                branch: defaultAccount.branchName || ''
            };
        }
    }

    const agreement = await AluAgreement.create({
        agreementNumber,
        quotationId,
        quotationNumber,
        agreementDate: agreementDate || new Date(),
        customerDetails,
        projectValue,
        paymentSchedule: defaultSchedule,
        scopeOfWork,
        leadTimeDays: leadTimeDays || 14,
        warranties: warranties || { workmanshipYears: 10, hardwareYears: 5 },
        generalConditions,
        bankDetails: finalBankDetails || {
            bankName: 'Bank of Ceylon',
            accountName: 'Company Account',
            accountNumber: '',
            branch: ''
        },
        createdBy: req.user ? req.user._id : null
    });

    res.status(201).json({ success: true, data: agreement });
});

// @desc    Update project agreement
// @route   PUT /api/alu/agreements/:id
// @access  Private
export const updateAgreement = asyncHandler(async (req, res) => {
    const agreement = await AluAgreement.findById(req.params.id);
    if (!agreement) {
        res.status(404);
        throw new Error('Project Agreement not found');
    }

    const updated = await AluAgreement.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { returnDocument: 'after', runValidators: true }
    );

    res.json({ success: true, data: updated });
});

// @desc    Delete project agreement
// @route   DELETE /api/alu/agreements/:id
// @access  Private
export const deleteAgreement = asyncHandler(async (req, res) => {
    const agreement = await AluAgreement.findById(req.params.id);
    if (!agreement) {
        res.status(404);
        throw new Error('Project Agreement not found');
    }
    await agreement.deleteOne();
    res.json({ success: true, message: 'Agreement deleted successfully' });
});
