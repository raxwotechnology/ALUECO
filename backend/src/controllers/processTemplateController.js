import asyncHandler from 'express-async-handler';
import ProcessTemplate from '../models/ProcessTemplate.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * @desc    Get all process templates
 * @route   GET /api/process-templates
 * @access  Private
 */
export const getProcessTemplates = asyncHandler(async (req, res) => {
    const templates = await ProcessTemplate.find({ deletedAt: null })
        .sort({ name: 1 })
        .populate('createdBy', 'firstName lastName');
    
    res.json({ success: true, data: templates });
});

/**
 * @desc    Create a process template
 * @route   POST /api/process-templates
 * @access  Private/Admin
 */
export const createProcessTemplate = asyncHandler(async (req, res) => {
    const template = await ProcessTemplate.create({
        ...req.body,
        createdBy: req.user._id
    });

    createAuditLog({
        action: 'create',
        module: 'manufacturing',
        documentId: template._id,
        documentCode: template.code,
        description: `Created process template: ${template.name}`,
        req
    });

    res.status(201).json({ success: true, data: template });
});

/**
 * @desc    Get template by ID
 * @route   GET /api/process-templates/:id
 * @access  Private
 */
export const getProcessTemplateById = asyncHandler(async (req, res) => {
    const template = await ProcessTemplate.findById(req.params.id)
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName');

    if (!template) {
        res.status(404);
        throw new Error('Template not found');
    }

    res.json({ success: true, data: template });
});

/**
 * @desc    Update template
 * @route   PUT /api/process-templates/:id
 * @access  Private/Admin
 */
export const updateProcessTemplate = asyncHandler(async (req, res) => {
    const oldData = await ProcessTemplate.findById(req.params.id);
    const template = await ProcessTemplate.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user._id },
        { new: true, runValidators: true }
    );

    if (!template) {
        res.status(404);
        throw new Error('Template not found');
    }

    createAuditLog({
        action: 'update',
        module: 'manufacturing',
        documentId: template._id,
        documentCode: template.code,
        description: `Updated process template: ${template.name}`,
        changes: req.body,
        previousData: oldData,
        req
    });

    res.json({ success: true, data: template });
});

/**
 * @desc    Delete template (Soft delete)
 * @route   DELETE /api/process-templates/:id
 * @access  Private/Admin
 */
export const deleteProcessTemplate = asyncHandler(async (req, res) => {
    const template = await ProcessTemplate.findById(req.params.id);

    if (!template) {
        res.status(404);
        throw new Error('Template not found');
    }

    template.deletedAt = new Date();
    await template.save();

    createAuditLog({
        action: 'delete',
        module: 'manufacturing',
        documentId: template._id,
        documentCode: template.code,
        description: `Deleted process template: ${template.name}`,
        req
    });

    res.json({ success: true, message: 'Template removed' });
});
