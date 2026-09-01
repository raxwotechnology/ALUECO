import asyncHandler from 'express-async-handler';
import AuditLog from '../models/AuditLog.js';
import SmsLog from '../models/SmsLog.js';
import { formatSmsContact } from '../services/smsService.js';

/**
 * @desc    Get all audit logs
 * @route   GET /api/audit
 * @access  Private/Admin
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
    const { module, action, userId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};
    if (module) query.module = module;
    if (action) query.action = action;
    if (userId) query.performedBy = userId;
    
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const count = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
        .populate('performedBy', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(limit) * (Number(page) - 1));

    res.json({
        success: true,
        data: logs,
        page: Number(page),
        pages: Math.ceil(count / Number(limit)),
        total: count,
    });
});

/**
 * @desc    Get single audit log detail
 * @route   GET /api/audit/:id
 * @access  Private/Admin
 */
export const getAuditLogById = asyncHandler(async (req, res) => {
    const log = await AuditLog.findById(req.params.id)
        .populate('performedBy', 'firstName lastName email role');

    if (log) {
        res.json({ success: true, data: log });
    } else {
        res.status(404);
        throw new Error('Audit log not found');
    }
});

/**
 * @desc    Get all automated SMS notification logs
 * @route   GET /api/audit/sms
 * @access  Private/Admin
 */
export const getSmsLogs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const count = await SmsLog.countDocuments({ deletedAt: null });
    const logs = await SmsLog.find({ deletedAt: null })
        .populate({
            path: 'grnId',
            select: 'grnNumber totalAcceptedValue totalPayableLKR'
        })
        .sort({ date: -1 })
        .limit(Number(limit))
        .skip(Number(limit) * (Number(page) - 1));

    res.json({
        success: true,
        data: logs,
        page: Number(page),
        pages: Math.ceil(count / Number(limit)),
        total: count
    });
});

/**
 * @desc    Send a manual/custom SMS notification
 * @route   POST /api/audit/sms/send-manual
 * @access  Private/Admin
 */
export const sendManualSms = asyncHandler(async (req, res) => {
    const { contact, recipientName, message } = req.body;

    if (!contact || !message) {
        res.status(400);
        throw new Error('Contact and message are required');
    }

    const formattedContact = formatSmsContact(contact);
    if (!formattedContact) {
        res.status(400);
        throw new Error('Invalid Sri Lankan contact number format');
    }

    const { SMS_USER_ID, SMS_API_KEY, SMS_SENDER_ID, SMS_GATEWAY_URL } = process.env;
    let status = 'sent';
    let errorMessage = null;

    if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL) {
        console.log(`[SMS Gateway] Manual Dispatched via SMSlenz to: ${formattedContact}`);
        try {
            const response = await fetch(SMS_GATEWAY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: SMS_USER_ID,
                    api_key: SMS_API_KEY,
                    sender_id: SMS_SENDER_ID,
                    contact: formattedContact,
                    message: message
                })
            });

            const data = await response.json();
            if (response.status === 200 && data.success) {
                console.log(`[SMS Gateway] Manual sent successfully. Campaign ID: ${data.data?.campaign_id}`);
            } else {
                errorMessage = data.message || response.statusText;
                console.error(`[SMS Gateway] Manual failed: ${errorMessage}`);
                status = 'failed';
            }
        } catch (err) {
            errorMessage = err.message;
            console.error('[SMS Gateway] Manual HTTP request failed:', errorMessage);
            status = 'failed';
        }
    } else {
        // Fallback simulation mode
        console.log(`[SMS Gateway Simulated Manual Dispatch] To: ${contact} | Msg: ${message}`);
    }

    // Write log entry to database
    const log = await SmsLog.create({
        supplierName: recipientName || 'Custom Manual Recipient',
        supplierPhone: contact,
        message,
        status
    });

    if (status === 'failed') {
        res.status(500);
        throw new Error(errorMessage || 'Failed to dispatch SMS through gateway');
    }

    res.json({
        success: true,
        data: log
    });
});
