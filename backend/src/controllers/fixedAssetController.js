import asyncHandler from 'express-async-handler';
import FixedAsset from '../models/FixedAsset.js';
import Payment from '../models/Payment.js';
import BankAccount from '../models/BankAccount.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * @desc    Get all fixed assets
 * @route   GET /api/finance/fixed-assets
 * @access  Private
 */
export const getFixedAssets = asyncHandler(async (req, res) => {
    const assets = await FixedAsset.find()
        .populate('createdBy', 'firstName lastName')
        .sort({ purchaseDate: -1 });
    res.json({ success: true, data: assets });
});

/**
 * @desc    Get single fixed asset by ID
 * @route   GET /api/finance/fixed-assets/:id
 * @access  Private
 */
export const getFixedAssetById = asyncHandler(async (req, res) => {
    const asset = await FixedAsset.findOne({ _id: req.params.id })
        .populate('createdBy', 'firstName lastName');
    if (!asset) {
        res.status(404);
        throw new Error('Fixed Asset not found');
    }
    res.json({ success: true, data: asset });
});

/**
 * @desc    Create a new fixed asset
 * @route   POST /api/finance/fixed-assets
 * @access  Private
 */
export const createFixedAsset = asyncHandler(async (req, res) => {
    const asset = await FixedAsset.create({
        ...req.body,
        createdBy: req.user._id
    });

    createAuditLog({
        action: 'create',
        module: 'finance',
        documentId: asset._id,
        description: `Registered fixed asset: ${asset.name} (Cost: LKR ${asset.purchaseCost})`,
        req
    });

    res.status(201).json({ success: true, data: asset });
});

/**
 * @desc    Update a fixed asset
 * @route   PUT /api/finance/fixed-assets/:id
 * @access  Private
 */
export const updateFixedAsset = asyncHandler(async (req, res) => {
    const asset = await FixedAsset.findById(req.params.id);
    if (!asset) {
        res.status(404);
        throw new Error('Fixed Asset not found');
    }

    // Update fields manually to trigger pre('save') hook
    Object.keys(req.body).forEach(key => {
        if (key !== 'payments') { // payments handled by separate endpoint
            asset[key] = req.body[key];
        }
    });

    await asset.save();

    createAuditLog({
        action: 'update',
        module: 'finance',
        documentId: asset._id,
        description: `Updated fixed asset: ${asset.name}`,
        req
    });

    res.json({ success: true, data: asset });
});

/**
 * @desc    Soft delete a fixed asset
 * @route   DELETE /api/finance/fixed-assets/:id
 * @access  Private
 */
export const deleteFixedAsset = asyncHandler(async (req, res) => {
    const asset = await FixedAsset.findById(req.params.id);
    if (!asset) {
        res.status(404);
        throw new Error('Fixed Asset not found');
    }

    asset.deletedAt = new Date();
    await asset.save();

    createAuditLog({
        action: 'delete',
        module: 'finance',
        documentId: asset._id,
        description: `Soft deleted fixed asset: ${asset.name}`,
        req
    });

    res.json({ success: true, message: 'Fixed asset deleted successfully' });
});

/**
 * @desc    Add a payment installment to a fixed asset
 * @route   POST /api/finance/fixed-assets/:id/payments
 * @access  Private
 */
export const addAssetPayment = asyncHandler(async (req, res) => {
    const { amount, date, reference, notes, bankAccountId } = req.body;
    const asset = await FixedAsset.findById(req.params.id);
    if (!asset) {
        res.status(404);
        throw new Error('Fixed Asset not found');
    }

    // Validate bank account if provided
    if (bankAccountId) {
        const bankAccount = await BankAccount.findById(bankAccountId);
        if (!bankAccount) {
            res.status(404);
            throw new Error('Bank account not found');
        }
    }

    // Add payment to asset
    asset.payments.push({
        amount: Number(amount) || 0,
        date: date ? new Date(date) : new Date(),
        reference,
        notes,
        bankAccountId: bankAccountId || undefined
    });

    await asset.save();

    // Create Payment record to track in bank ledger (only if bank account is selected)
    if (bankAccountId) {
        console.log(`[Fixed Asset Payment] Creating payment record for bank account ${bankAccountId}`);
        const payment = await Payment.create({
            direction: 'paid',
            bankAccountId,
            partyName: `Fixed Asset: ${asset.name}`,
            paymentDate: date ? new Date(date) : new Date(),
            amount: Number(amount) || 0,
            method: 'bank_transfer',
            status: 'confirmed',
            notes: `Capital expenditure payment for ${asset.name}${reference ? ` - Ref: ${reference}` : ''}`,
            createdBy: req.user._id,
            receivedBy: req.user._id
        });
        console.log(`[Fixed Asset Payment] Payment created: ${payment.paymentNumber}, ID: ${payment._id}`);

        // Update bank account balance
        const bankAccount = await BankAccount.findById(bankAccountId);
        if (bankAccount) {
            bankAccount.balance = +(bankAccount.balance - (Number(amount) || 0)).toFixed(2);
            await bankAccount.save();
            console.log(`[Fixed Asset Payment] Bank account balance updated to: ${bankAccount.balance}`);
        }
    }

    createAuditLog({
        action: 'update',
        module: 'finance',
        documentId: asset._id,
        description: `Recorded payment of LKR ${amount} for asset: ${asset.name}${bankAccountId ? ' (Bank account updated)' : ' (Manual entry - no bank account)'}`,
        req
    });

    res.json({ success: true, data: asset });
});
