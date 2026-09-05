import asyncHandler from 'express-async-handler';
import Inquiry from '../models/Inquiry.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * @desc    Get all inquiries / leads
 * @route   GET /api/crm/inquiries
 * @access  Private
 */
export const getInquiries = asyncHandler(async (req, res) => {
    const { status, source, search, result, page = 1, limit = 50 } = req.query;
    const filter = { deletedAt: null };
    
    if (status && status !== 'all') {
        filter.status = status;
    }
    if (source && source !== 'all') {
        filter.$or = [{ inquirySource: source }, { source: source }];
    }
    if (result && result !== 'all') {
        filter.result = result;
    }
    if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$and = filter.$and || [];
        filter.$and.push({
            $or: [
                { leadNo: regex },
                { inquiryCode: regex },
                { customerName: regex },
                { companyName: regex },
                { contactPerson: regex },
                { contactNo: regex },
                { phone: regex },
                { email: regex },
                { projectLocation: regex },
                { requirement: regex },
                { quotationNo: regex }
            ]
        });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [inquiries, total] = await Promise.all([
        Inquiry.find(filter)
            .populate('products.product', 'name productCode')
            .populate('assignedTo', 'firstName lastName')
            .populate('followUpHistory.user', 'name firstName lastName email')
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
 * @desc    Get single inquiry by ID
 * @route   GET /api/crm/inquiries/:id
 * @access  Private
 */
export const getInquiryById = asyncHandler(async (req, res) => {
    const inquiry = await Inquiry.findOne({ _id: req.params.id, deletedAt: null })
        .populate('products.product', 'name productCode')
        .populate('assignedTo', 'firstName lastName')
        .populate('followUpHistory.user', 'name firstName lastName email')
        .populate('customer', 'displayName companyName');

    if (!inquiry) {
        res.status(404);
        throw new Error('Inquiry not found');
    }

    res.json({ success: true, data: inquiry });
});

/**
 * @desc    Create a new inquiry / lead
 * @route   POST /api/crm/inquiries
 * @access  Private
 */
export const createInquiry = asyncHandler(async (req, res) => {
    const initialHistory = [];
    if (req.body.initialNote || req.body.notes) {
        initialHistory.push({
            date: new Date(),
            salesOfficer: req.user ? (req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()) : 'Sales Officer',
            user: req.user?._id,
            note: req.body.initialNote || req.body.notes || 'Inquiry created',
            nextFollowUpDate: req.body.nextFollowUpDate || req.body.followUpDate
        });
    }

    const inquiry = await Inquiry.create({
        ...req.body,
        followUpHistory: req.body.followUpHistory || (initialHistory.length > 0 ? initialHistory : undefined),
        createdBy: req.user?._id
    });

    createAuditLog({
        action: 'create',
        module: 'crm',
        documentId: inquiry._id,
        description: `New lead created: ${inquiry.leadNo || inquiry.inquiryCode} - ${inquiry.customerName || inquiry.companyName}`,
        req
    });

    res.status(201).json({ success: true, data: inquiry });
});

/**
 * @desc    Update inquiry / lead details
 * @route   PUT /api/crm/inquiries/:id
 * @access  Private
 */
export const updateInquiry = asyncHandler(async (req, res) => {
    const oldData = await Inquiry.findById(req.params.id);
    if (!oldData || oldData.deletedAt) {
        res.status(404);
        throw new Error('Inquiry not found');
    }

    const updates = { ...req.body, updatedBy: req.user?._id };

    // Auto update result based on status
    if (updates.status === 'Won' || updates.status === 'won') {
        updates.result = 'Won';
        if (updates.advanceAmount > 0 || updates.advanceDate) {
            updates.projectStatus = updates.projectStatus || 'Created';
        }
    } else if (updates.status === 'Lost' || updates.status === 'lost') {
        updates.result = 'Lost';
    } else if (updates.status === 'Hold') {
        updates.result = 'Hold';
    } else if (updates.status) {
        updates.result = updates.result || 'Pending';
    }

    const inquiry = await Inquiry.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
    ).populate('followUpHistory.user', 'name firstName lastName');

    createAuditLog({
        action: 'update',
        module: 'crm',
        documentId: inquiry._id,
        description: `Updated lead ${inquiry.leadNo || inquiry.inquiryCode} (${inquiry.customerName || inquiry.companyName})`,
        changes: req.body,
        previousData: oldData,
        req
    });

    res.json({ success: true, data: inquiry });
});

/**
 * @desc    Add follow-up history log to an inquiry
 * @route   POST /api/crm/inquiries/:id/follow-up
 * @access  Private
 */
export const addFollowUpLog = asyncHandler(async (req, res) => {
    const { note, nextFollowUpDate, salesOfficer } = req.body;
    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry || inquiry.deletedAt) {
        res.status(404);
        throw new Error('Inquiry not found');
    }

    const officerName = salesOfficer || (req.user ? (req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()) : 'Sales Officer');

    const historyItem = {
        date: new Date(),
        salesOfficer: officerName,
        user: req.user?._id,
        note: note || 'Follow-up conducted',
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : inquiry.nextFollowUpDate
    };

    inquiry.followUpHistory.unshift(historyItem);
    if (nextFollowUpDate) {
        inquiry.nextFollowUpDate = new Date(nextFollowUpDate);
        inquiry.followUpDate = new Date(nextFollowUpDate);
    }
    if (note) {
        inquiry.notes = note;
    }
    if (req.body.status) {
        inquiry.status = req.body.status;
        if (req.body.status === 'Won') inquiry.result = 'Won';
        if (req.body.status === 'Lost') inquiry.result = 'Lost';
    }
    inquiry.updatedBy = req.user?._id;

    await inquiry.save();

    res.json({ success: true, data: inquiry });
});

/**
 * @desc    Transition inquiry through pipeline
 * @route   PUT /api/crm/inquiries/:id/transition
 * @access  Private
 */
export const transitionInquiry = asyncHandler(async (req, res) => {
    const { nextStatus, lostReason, advanceAmount, advanceDate, finalValue, note } = req.body;
    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry || inquiry.deletedAt) {
        res.status(404);
        throw new Error('Inquiry not found');
    }

    const prevStatus = inquiry.status;
    inquiry.status = nextStatus;

    if (nextStatus === 'Won' || nextStatus === 'won') {
        inquiry.result = 'Won';
        if (advanceAmount !== undefined) inquiry.advanceAmount = Number(advanceAmount);
        if (advanceDate) inquiry.advanceDate = new Date(advanceDate);
        if (finalValue !== undefined) inquiry.finalValue = Number(finalValue);
        inquiry.projectStatus = 'Created';
    } else if (nextStatus === 'Lost' || nextStatus === 'lost') {
        inquiry.result = 'Lost';
        if (lostReason) inquiry.lostReason = lostReason;
    } else if (nextStatus === 'Hold') {
        inquiry.result = 'Hold';
    } else {
        inquiry.result = 'Pending';
    }

    // Add to history log
    const officerName = req.user ? (req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()) : 'Sales Officer';
    inquiry.followUpHistory.unshift({
        date: new Date(),
        salesOfficer: officerName,
        user: req.user?._id,
        note: note || `Status changed from "${prevStatus}" to "${nextStatus}"${lostReason ? ` (Reason: ${lostReason})` : ''}`,
        nextFollowUpDate: inquiry.nextFollowUpDate
    });

    inquiry.updatedBy = req.user?._id;
    await inquiry.save();

    createAuditLog({
        action: 'update',
        module: 'crm',
        documentId: inquiry._id,
        description: `Lead ${inquiry.leadNo || inquiry.inquiryCode} transitioned: ${prevStatus} → ${nextStatus}`,
        req
    });

    res.json({ success: true, data: inquiry });
});

/**
 * @desc    Get dashboard metrics for Lead Follow-Up System
 * @route   GET /api/crm/inquiries/stats
 * @access  Private
 */
export const getInquiryDashboardStats = asyncHandler(async (req, res) => {
    const match = { deletedAt: null };
    const allLeads = await Inquiry.find(match).select('status result quotationValue finalValue advanceAmount nextFollowUpDate createdAt');

    const totalLeads = allLeads.length;
    const now = new Date();

    let pendingFollowUps = 0;
    let wonLeads = 0;
    let lostLeads = 0;
    let totalWonValue = 0;

    const statusCounts = {};

    for (const lead of allLeads) {
        const s = lead.status || 'New Inquiry';
        statusCounts[s] = (statusCounts[s] || 0) + 1;

        const isWon = s === 'Won' || s === 'won' || lead.result === 'Won' || lead.result === 'won';
        const isLost = s === 'Lost' || s === 'lost' || lead.result === 'Lost' || lead.result === 'lost';

        if (isWon) {
            wonLeads += 1;
            totalWonValue += Number(lead.finalValue || lead.quotationValue || 0);
        } else if (isLost) {
            lostLeads += 1;
        } else {
            // Active lead: check if follow-up is pending/due or in follow-up pipeline
            if (lead.nextFollowUpDate || ['Follow-Up', 'Contacted', 'Site Visit Pending', 'Quotation Pending', 'Quotation Sent', 'Negotiation'].includes(s)) {
                pendingFollowUps += 1;
            }
        }
    }

    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

    res.json({
        success: true,
        data: {
            totalLeads,
            pendingFollowUps,
            wonLeads,
            lostLeads,
            totalWonValue,
            conversionRate: parseFloat(conversionRate.toFixed(1)),
            statusCounts
        }
    });
});

/**
 * @desc    Legacy conversion rate endpoint
 * @route   GET /api/crm/inquiries/conversion-rate
 * @access  Private
 */
export const getConversionRate = asyncHandler(async (req, res) => {
    const allLeads = await Inquiry.find({ deletedAt: null }).select('status result finalValue quotationValue');
    const total = allLeads.length;
    const confirmed = allLeads.filter(l => l.status === 'Won' || l.status === 'won' || l.result === 'Won').length;
    const lost = allLeads.filter(l => l.status === 'Lost' || l.status === 'lost' || l.result === 'Lost').length;
    const conversionRate = total > 0 ? (confirmed / total) * 100 : 0;

    res.json({
        success: true,
        data: {
            total,
            confirmed,
            lost,
            conversionRate: parseFloat(conversionRate.toFixed(1))
        }
    });
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
        description: `Deleted lead ${inquiry.leadNo || inquiry.inquiryCode}`,
        req
    });

    res.json({ success: true, message: 'Lead deleted successfully' });
});
