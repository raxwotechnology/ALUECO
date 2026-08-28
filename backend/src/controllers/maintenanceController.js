import asyncHandler from 'express-async-handler';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * @desc    Get maintenance requests
 * @route   GET /api/maintenance/requests
 * @access  Private
 */
export const getMaintenanceRequests = asyncHandler(async (req, res) => {
    const { status, priority } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const requests = await MaintenanceRequest.find(filter)
        .populate('requestedBy', 'firstName lastName')
        .sort({ createdAt: -1 });

    // Transform responses to ensure backward compatibility
    const transformedRequests = requests.map(req => ({
        ...req.toObject(),
        // Map old field names to new ones if needed
        assetId: req.assetId || req.asset || null,
        category: req.category || req.assetType || 'machine',
        title: req.title || req.description || 'No title'
    }));

    res.json({ success: true, data: transformedRequests });
});

/**
 * @desc    Create maintenance request (for machine or vehicle)
 * @route   POST /api/maintenance/requests
 * @access  Private
 */
export const createMaintenanceRequest = asyncHandler(async (req, res) => {
    // Ensure compatibility with both old and new field names
    const requestData = {
        ...req.body,
        status: 'pending',
        requestedBy: req.user._id
    };

    // Map old field names to new ones if needed
    if (req.body.asset && !req.body.assetId) {
        requestData.assetId = req.body.asset;
    }
    if (req.body.assetType && !req.body.category) {
        requestData.category = req.body.assetType;
    }

    const request = await MaintenanceRequest.create(requestData);

    createAuditLog({
        action: 'create',
        module: 'maintenance',
        documentId: request._id,
        description: `New maintenance request for ${request.assetId || request.title || 'unknown asset'} (${request.priority})`,
        req
    });

    res.status(201).json({ success: true, data: request });
});

/**
 * @desc    Update maintenance status (Complete repair)
 * @route   PUT /api/maintenance/requests/:id
 * @access  Private
 */
export const updateMaintenanceStatus = asyncHandler(async (req, res) => {
    const request = await MaintenanceRequest.findByIdAndUpdate(
        req.params.id,
        { ...req.body },
        { new: true }
    );

    createAuditLog({
        action: 'update',
        module: 'maintenance',
        documentId: request._id,
        description: `Maintenance request ${request.status}`,
        req
    });

    res.json({ success: true, data: request });
});
