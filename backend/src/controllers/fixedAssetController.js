import asyncHandler from 'express-async-handler';
import FixedAsset from '../models/FixedAsset.js';
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
    const { amount, date, reference, notes } = req.body;
    const asset = await FixedAsset.findById(req.params.id);
    if (!asset) {
        res.status(404);
        throw new Error('Fixed Asset not found');
    }

    asset.payments.push({
        amount: Number(amount) || 0,
        date: date ? new Date(date) : new Date(),
        reference,
        notes
    });

    await asset.save();

    createAuditLog({
        action: 'update',
        module: 'finance',
        documentId: asset._id,
        description: `Recorded payment of LKR ${amount} for asset: ${asset.name}`,
        req
    });

    res.json({ success: true, data: asset });
});
