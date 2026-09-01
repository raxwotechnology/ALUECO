import asyncHandler from 'express-async-handler';
import Farm from '../models/Farm.js';
import { createAuditLog } from '../utils/auditLogger.js';

export const createFarm = asyncHandler(async (req, res) => {
    const { name, location, contactNumber, notes, status } = req.body;
    if (!name) {
        res.status(400);
        throw new Error('Farm name is required');
    }

    const farm = await Farm.create({
        name,
        location,
        contactNumber,
        notes,
        status: status || 'active'
    });

    createAuditLog({
        userId: req.user._id,
        action: 'create',
        module: 'farms',
        documentId: farm._id,
        details: `Created farm: ${farm.name} (${farm.farmCode})`
    });

    res.status(201).json({ success: true, data: farm });
});

export const getFarms = asyncHandler(async (req, res) => {
    const { search, status } = req.query;
    const filter = {};
    if (search) {
        filter.name = { $regex: search, $options: 'i' };
    }
    if (status) {
        filter.status = status;
    }

    const farms = await Farm.find(filter).sort({ name: 1 });
    res.json({ success: true, count: farms.length, data: farms });
});

export const getFarmById = asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);
    if (!farm) {
        res.status(404);
        throw new Error('Farm not found');
    }
    res.json({ success: true, data: farm });
});

export const updateFarm = asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);
    if (!farm) {
        res.status(404);
        throw new Error('Farm not found');
    }

    const updated = await Farm.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
    );

    createAuditLog({
        userId: req.user._id,
        action: 'update',
        module: 'farms',
        documentId: farm._id,
        details: `Updated farm details for: ${farm.name}`
    });

    res.json({ success: true, data: updated });
});

export const deleteFarm = asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);
    if (!farm) {
        res.status(404);
        throw new Error('Farm not found');
    }

    farm.deletedAt = new Date();
    await farm.save();

    createAuditLog({
        userId: req.user._id,
        action: 'delete',
        module: 'farms',
        documentId: farm._id,
        details: `Soft deleted farm: ${farm.name}`
    });

    res.json({ success: true, message: 'Farm deleted successfully' });
});
