import asyncHandler from 'express-async-handler';
import QCResult from '../models/QCResult.js';
import ProductionBatch from '../models/ProductionBatch.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { createNotification } from '../services/notificationService.js';

/**
 * @desc    Record QC Result for a batch
 * @route   POST /api/qc/results
 * @access  Private (QC Staff/Admin)
 */
export const recordQCResult = asyncHandler(async (req, res) => {
    const { batchId, results, overallResult, remarks } = req.body;

    const batch = await ProductionBatch.findById(batchId);
    if (!batch) {
        res.status(404);
        throw new Error('Batch not found');
    }

    const qcResult = await QCResult.create({
        batchId,
        testDate: new Date(),
        performedBy: req.user._id,
        results,
        overallResult,
        remarks
    });

    // Update batch status based on QC result
    batch.status = overallResult === 'pass' ? 'qc_passed' : 'qc_failed';
    await batch.save();

    // Create notification for production team
    createNotification({
        recipient: batch.createdBy,
        type: overallResult === 'pass' ? 'notification:qc_passed' : 'notification:qc_failed',
        title: `QC ${overallResult === 'pass' ? 'Passed' : 'Failed'}`,
        message: `Batch ${batch.batchNumber} has ${overallResult === 'pass' ? 'passed' : 'failed'} quality control checks.`,
        link: `/manufacturing/batches/${batch._id}`
    });

    createAuditLog({
        action: 'create',
        module: 'manufacturing',
        documentId: qcResult._id,
        description: `Recorded QC result for batch: ${batch.batchNumber} (${overallResult})`,
        req
    });

    res.status(201).json({ success: true, data: qcResult });
});

/**
 * @desc    Get QC results for a batch
 * @route   GET /api/qc/results/:batchId
 * @access  Private
 */
export const getQCResultsByBatch = asyncHandler(async (req, res) => {
    const results = await QCResult.find({ batchId: req.params.batchId })
        .populate('performedBy', 'firstName lastName')
        .sort({ testDate: -1 });
    
    res.json({ success: true, data: results });
});
