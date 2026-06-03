import asyncHandler from 'express-async-handler';
import Inquiry from '../models/Inquiry.js';
import { createAuditLog } from '../utils/auditLogger.js';

// ── Valid state machine transitions ───────────────────────────────────────────
const VALID_TRANSITIONS = {
    new:             ['quoted', 'lost'],
    quoted:          ['sample_sent', 'order_confirmed', 'lost'],
    sample_sent:     ['sample_approved', 'lost'],
    sample_approved: ['order_confirmed', 'lost'],
    order_confirmed: ['shipped', 'lost'],
    shipped:         ['closed'],
    closed:          [],
    lost:            [],
};

/**
 * @desc    Get all inquiries
 * @route   GET /api/crm/inquiries
 * @access  Private
 */
export const getInquiries = asyncHandler(async (req, res) => {
    const { status, source, page = 1, limit = 20 } = req.query;
    const filter = { deletedAt: null };
    
    if (status) filter.status = status;
    if (source) filter.source = source;

    const skip = (Number(page) - 1) * Number(limit);

    const [inquiries, total] = await Promise.all([
        Inquiry.find(filter)
            .populate('interestedProducts', 'name productCode')
            .populate('assignedTo', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Inquiry.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: inquiries,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
    });
});

/**
 * @desc    Create a new inquiry
 * @route   POST /api/crm/inquiries
 * @access  Private
 */
export const createInquiry = asyncHandler(async (req, res) => {
    const inquiry = await Inquiry.create({
        ...req.body,
        createdBy: req.user._id
    });

    createAuditLog({
        action: 'create',
        module: 'crm',
        documentId: inquiry._id,
        description: `New lead/inquiry from ${inquiry.companyName} (${inquiry.contactPerson})`,
        req
    });

    res.status(201).json({ success: true, data: inquiry });
});

/**
 * @desc    Update inquiry status/details
 * @route   PUT /api/crm/inquiries/:id
 * @access  Private
 */
export const updateInquiry = asyncHandler(async (req, res) => {
    const oldData = await Inquiry.findById(req.params.id);
    const inquiry = await Inquiry.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user._id },
        { new: true, runValidators: true }
    );

    if (!inquiry) {
        res.status(404);
        throw new Error('Inquiry not found');
    }

    createAuditLog({
        action: 'update',
        module: 'crm',
        documentId: inquiry._id,
        description: `Updated inquiry for ${inquiry.companyName}`,
        changes: req.body,
        previousData: oldData,
        req
    });

    res.json({ success: true, data: inquiry });
});

/**
 * @desc    Transition inquiry through the sales pipeline state machine
 * @route   PUT /api/crm/inquiries/:id/transition
 * @access  Private
 *
 * Valid transitions:
 *   new → quoted → sample_sent → sample_approved → order_confirmed → shipped → closed
 *   Any stage → lost
 */
export const transitionInquiry = asyncHandler(async (req, res) => {
    const { nextStatus, lostReason } = req.body;
    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
        res.status(404);
        throw new Error('Inquiry not found');
    }

    const currentStatus = inquiry.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(nextStatus)) {
        res.status(400);
        throw new Error(
            `Invalid transition: "${currentStatus}" → "${nextStatus}". Allowed: [${allowed.join(', ')}]`
        );
    }

    inquiry.status = nextStatus;
    if (nextStatus === 'lost' && lostReason) {
        inquiry.lostReason = lostReason;
    }
    inquiry.updatedBy = req.user._id;
    await inquiry.save();

    createAuditLog({
        action: 'update',
        module: 'crm',
        documentId: inquiry._id,
        description: `Inquiry transitioned: ${currentStatus} → ${nextStatus} for ${inquiry.companyName}`,
        req
    });

    res.json({ success: true, data: inquiry });
});

/**
 * @desc    Get inquiry pipeline conversion rate
 * @route   GET /api/crm/inquiries/conversion-rate
 * @access  Private
 */
export const getConversionRate = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const match = { deletedAt: null };
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate)   match.createdAt.$lte = new Date(endDate);
    }

    const [stats] = await Inquiry.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                total:     { $sum: 1 },
                confirmed: { $sum: { $cond: [{ $in: ['$status', ['order_confirmed', 'shipped', 'closed']] }, 1, 0] } },
                lost:      { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
            }
        },
        {
            $addFields: {
                conversionRate: {
                    $cond: [
                        { $gt: ['$total', 0] },
                        { $multiply: [{ $divide: ['$confirmed', '$total'] }, 100] },
                        0
                    ]
                }
            }
        }
    ]);

    res.json({ success: true, data: stats || { total: 0, confirmed: 0, lost: 0, conversionRate: 0 } });
});

/**
 * @desc    Delete (soft) an inquiry
 * @route   DELETE /api/crm/inquiries/:id
 * @access  Private
 */
export const deleteInquiry = asyncHandler(async (req, res) => {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
        res.status(404);
        throw new Error('Inquiry not found');
    }
    inquiry.deletedAt = new Date();
    await inquiry.save();

    createAuditLog({
        action: 'delete',
        module: 'crm',
        documentId: inquiry._id,
        description: `Deleted inquiry from ${inquiry.companyName}`,
        req
    });

    res.json({ success: true, message: 'Inquiry deleted' });
});
