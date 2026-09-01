import asyncHandler from 'express-async-handler';
import Machine from '../models/Machine.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * @desc    Get all machines
 * @route   GET /api/production/machines
 */
export const getMachines = asyncHandler(async (req, res) => {
    const machines = await Machine.find({ deletedAt: null }).sort({ name: 1 });
    res.json({ success: true, data: machines });
});

/**
 * @desc    Create a machine
 * @route   POST /api/production/machines
 */
export const createMachine = asyncHandler(async (req, res) => {
    const machine = await Machine.create({ ...req.body, createdBy: req.user._id });
    createAuditLog({ action: 'create', module: 'production', documentId: machine._id, description: `Added machine ${machine.name}`, req });
    res.status(201).json({ success: true, data: machine });
});

/**
 * @desc    Update a machine
 * @route   PUT /api/production/machines/:id
 */
export const updateMachine = asyncHandler(async (req, res) => {
    const machine = await Machine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!machine) { res.status(404); throw new Error('Machine not found'); }
    res.json({ success: true, data: machine });
});

/**
 * @desc    Delete (soft) a machine
 * @route   DELETE /api/production/machines/:id
 */
export const deleteMachine = asyncHandler(async (req, res) => {
    const machine = await Machine.findById(req.params.id);
    if (!machine) { res.status(404); throw new Error('Machine not found'); }
    machine.deletedAt = new Date();
    await machine.save();
    res.json({ success: true, message: 'Machine deleted' });
});
