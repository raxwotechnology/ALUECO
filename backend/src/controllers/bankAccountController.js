import asyncHandler from 'express-async-handler';
import BankAccount from '../models/BankAccount.js';
import Payment from '../models/Payment.js';

/**
 * @desc    Get all active bank accounts
 * @route   GET /api/bank-accounts
 * @access  Private
 */
export const getBankAccounts = asyncHandler(async (req, res) => {
    const accounts = await BankAccount.find({ deletedAt: null }).sort({ createdAt: -1 });
    res.json({ success: true, data: accounts });
});

/**
 * @desc    Get a single bank account details
 * @route   GET /api/bank-accounts/:id
 * @access  Private
 */
export const getBankAccountById = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
        res.status(404);
        throw new Error('Bank account not found');
    }
    res.json({ success: true, data: account });
});

/**
 * @desc    Create a new bank account
 * @route   POST /api/bank-accounts
 * @access  Private
 */
export const createBankAccount = asyncHandler(async (req, res) => {
    const { bankName, accountName, accountNumber, branchName, accountType, balance } = req.body;

    const existing = await BankAccount.findOne({ accountNumber, deletedAt: null });
    if (existing) {
        res.status(400);
        throw new Error('Bank account number already exists');
    }

    const account = await BankAccount.create({
        bankName,
        accountName,
        accountNumber,
        branchName,
        accountType,
        balance: balance || 0,
    });

    res.status(201).json({ success: true, data: account });
});

/**
 * @desc    Update a bank account metadata
 * @route   PUT /api/bank-accounts/:id
 * @access  Private
 */
export const updateBankAccount = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
        res.status(404);
        throw new Error('Bank account not found');
    }

    const { bankName, accountName, branchName, accountType, isActive } = req.body;
    account.bankName = bankName || account.bankName;
    account.accountName = accountName || account.accountName;
    account.branchName = branchName !== undefined ? branchName : account.branchName;
    account.accountType = accountType || account.accountType;
    account.isActive = isActive !== undefined ? isActive : account.isActive;

    await account.save();
    res.json({ success: true, data: account });
});

/**
 * @desc    Soft delete a bank account
 * @route   DELETE /api/bank-accounts/:id
 * @access  Private
 */
export const deleteBankAccount = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
        res.status(404);
        throw new Error('Bank account not found');
    }

    account.deletedAt = new Date();
    await account.save();
    res.json({ success: true, message: 'Bank account removed' });
});

/**
 * @desc    Get chronological ledger statement for a bank account
 * @route   GET /api/bank-accounts/:id/ledger
 * @access  Private
 */
export const getBankAccountLedger = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
        res.status(404);
        throw new Error('Bank account not found');
    }

    // Query all non-deleted payments linked to this bank account sorted chronologically
    const payments = await Payment.find({
        bankAccountId: account._id,
        status: 'confirmed',
        deletedAt: null
    })
    .populate('customerId', 'displayName customerCode')
    .populate('supplierId', 'displayName supplierCode')
    .sort({ paymentDate: 1, createdAt: 1 });

    // Build the ledger entries with running balance
    let currentBalance = 0; // Starts from 0, or we can consider initial balance as starting point
    const ledger = payments.map((p) => {
        const isDeposit = p.direction === 'received';
        const amount = p.amount || 0;

        if (isDeposit) {
            currentBalance = +(currentBalance + amount).toFixed(2);
        } else {
            currentBalance = +(currentBalance - amount).toFixed(2);
        }

        return {
            _id: p._id,
            paymentNumber: p.paymentNumber,
            date: p.paymentDate,
            partyName: p.partyName,
            method: p.method,
            type: isDeposit ? 'deposit' : 'withdrawal',
            amount: amount,
            runningBalance: currentBalance,
            chequeNumber: p.chequeNumber,
            chequeStatus: p.chequeStatus,
            transactionReference: p.transactionReference,
        };
    });

    res.json({
        success: true,
        account: {
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            currentBalance: account.balance,
        },
        ledger: ledger.reverse(), // Reverse to show latest first in view
    });
});
