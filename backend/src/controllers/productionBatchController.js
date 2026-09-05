import asyncHandler from 'express-async-handler';
import ProductionBatch from '../models/ProductionBatch.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { createNotification } from '../services/notificationService.js';
import { validateYield } from '../utils/manufacturingUtils.js';
import excelService from '../services/excelService.js';

/**
 * @desc    Get all production batches
 * @route   GET /api/production-batches
 * @access  Private
 */
export const getProductionBatches = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { deletedAt: null };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [batches, total] = await Promise.all([
        ProductionBatch.find(filter)
            .populate('templateId', 'name type')
            .populate('warehouseId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        ProductionBatch.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: batches,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
    });
});

/**
 * @desc    Create a new production batch (Status: planned)
 * @route   POST /api/production-batches
 * @access  Private
 */
export const createProductionBatch = asyncHandler(async (req, res) => {
    const batch = await ProductionBatch.create({
        ...req.body,
        status: 'planned',
        createdBy: req.user._id
    });

    createAuditLog({
        action: 'create',
        module: 'manufacturing',
        documentId: batch._id,
        documentCode: batch.batchNumber,
        description: `Planned new production batch: ${batch.batchNumber}`,
        req
    });

    // Bi-directional Excel Sync
    excelService.appendExcelRow('production', batch.toObject()).catch(err => {
        console.error('Excel Sync Failed (Create):', err);
    });

    res.status(201).json({ success: true, data: batch });
});

/**
 * @desc    Start/Issue raw materials for batch (Status: in_progress)
 * @route   PUT /api/production-batches/:id/start
 * @access  Private
 */
export const startProductionBatch = asyncHandler(async (req, res) => {
    const batch = await ProductionBatch.findById(req.params.id);

    if (!batch) {
        res.status(404);
        throw new Error('Batch not found');
    }

    if (batch.status !== 'planned') {
        res.status(400);
        throw new Error('Batch must be in planned status to start');
    }

    // Update status
    batch.status = 'in_progress';
    batch.plannedStartDate = new Date();
    await batch.save();

    createAuditLog({
        action: 'update',
        module: 'manufacturing',
        documentId: batch._id,
        documentCode: batch.batchNumber,
        description: `Started production batch: ${batch.batchNumber}`,
        req
    });

    // Bi-directional Excel Sync
    excelService.updateExcelRow('production', batch.toObject()).catch(err => {
        console.error('Excel Sync Failed (Update):', err);
    });

    res.json({ success: true, data: batch });
});

/**
 * @desc    Complete production batch (Status: completed)
 * @route   PUT /api/production-batches/:id/complete
 * @access  Private
 */
export const completeProductionBatch = asyncHandler(async (req, res) => {
    const { actualYieldWeight, totalWastageWeight } = req.body;
    const batch = await ProductionBatch.findById(req.params.id);

    if (!batch) {
        res.status(404);
        throw new Error('Batch not found');
    }

    if (batch.status !== 'qc_passed') {
        res.status(400);
        throw new Error('Batch must pass QC before completion');
    }

    batch.status = 'completed';
    batch.actualYieldWeight = actualYieldWeight || batch.actualYieldWeight;
    batch.totalWastageWeight = totalWastageWeight || batch.totalWastageWeight;
    batch.plannedEndDate = new Date();
    await batch.save();

    // Automated yield validation and alert
    await validateYield(batch);

    // Notify relevant staff
    createNotification({
        recipient: batch.createdBy,
        type: 'notification:batch_completed',
        title: 'Production Complete',
        message: `Batch ${batch.batchNumber} has been successfully completed.`,
        link: `/manufacturing/batches/${batch._id}`
    });

    createAuditLog({
        action: 'update',
        module: 'manufacturing',
        documentId: batch._id,
        documentCode: batch.batchNumber,
        description: `Completed production batch: ${batch.batchNumber}`,
        req
    });

    // Bi-directional Excel Sync
    excelService.updateExcelRow('production', batch.toObject()).catch(err => {
        console.error('Excel Sync Failed (Complete):', err);
    });

    res.json({ success: true, data: batch });
});

/**
 * @desc    Update production batch status (General status transition)
 * @route   PUT /api/production-batches/:id/status
 * @access  Private
 */
export const updateProductionBatchStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const batch = await ProductionBatch.findById(req.params.id);

    if (!batch) {
        res.status(404);
        throw new Error('Batch not found');
    }

    // Set stage and timestamps accordingly
    batch.status = status;
    
    if (status === 'in_progress') {
        batch.plannedStartDate = new Date();
        batch.processingStage = 'washing_cutting';
        batch.stageTimestamps = { ...batch.stageTimestamps, washing_cutting: new Date() };
    } else if (status === 'qc_pending') {
        batch.processingStage = 'packing';
        batch.stageTimestamps = { ...batch.stageTimestamps, packing: new Date() };
    } else if (status === 'completed' || status === 'qc_passed') {
        batch.plannedEndDate = new Date();
        batch.processingStage = 'completed';
        batch.stageTimestamps = { ...batch.stageTimestamps, completed: new Date() };
    }

    await batch.save();

    createAuditLog({
        action: 'update',
        module: 'manufacturing',
        documentId: batch._id,
        documentCode: batch.batchNo || batch.batchNumber,
        description: `Updated production batch status to ${status} for batch: ${batch.batchNo || batch.batchNumber}`,
        req
    });

    // Bi-directional Excel Sync
    excelService.updateExcelRow('production', batch.toObject()).catch(err => {
        console.error('Excel Sync Failed (Status Update):', err);
    });

    res.json({ success: true, data: batch });
});

