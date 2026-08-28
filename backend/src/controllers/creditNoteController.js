import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import CreditNote from '../models/CreditNote.js';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import AuditLog from '../models/AuditLog.js';
import { updateCustomerBalance } from './invoiceController.js';

/**
 * POST /api/credit-notes — manual credit note (not from return)
 */
export const createCreditNote = asyncHandler(async (req, res) => {
    const { customerId, amount, reason, description, invoiceId } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) { res.status(404); throw new Error('Customer not found'); }

    const cn = new CreditNote({
        customerId: customer._id,
        customerSnapshot: { name: customer.displayName, code: customer.customerCode },
        amount,
        reason: reason || 'other',
        description,
        invoiceId,
        createdBy: req.user._id,
    });
    await cn.save();

    await updateCustomerBalance(customer._id);

    res.status(201).json({ success: true, data: cn });
});

export const getCreditNotes = asyncHandler(async (req, res) => {
    const { customerId, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [notes, total] = await Promise.all([
        CreditNote.find(filter)
            .populate('customerId', 'displayName customerCode')
            .populate('customerReturnId', 'rmaNumber')
            .sort({ issueDate: -1 }).skip(skip).limit(Number(limit)),
        CreditNote.countDocuments(filter),
    ]);

    res.json({
        success: true, count: notes.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: notes,
    });
});

export const getCreditNoteById = asyncHandler(async (req, res) => {
    const cn = await CreditNote.findById(req.params.id)
        .populate('customerId', 'displayName customerCode')
        .populate('customerReturnId', 'rmaNumber')
        .populate('applications.invoiceId', 'invoiceNumber')
        .populate('applications.appliedBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName');
    if (!cn) { res.status(404); throw new Error('Credit note not found'); }
    res.json({ success: true, data: cn });
});

/**
 * POST /api/credit-notes/:id/apply
 * Apply credit note to an invoice
 */
export const applyCreditNote = asyncHandler(async (req, res) => {
    const { invoiceId, amount } = req.body;
    const cn = await CreditNote.findById(req.params.id);
    if (!cn) { res.status(404); throw new Error('Credit note not found'); }
    if (cn.status === 'fully_applied' || cn.status === 'cancelled') {
        res.status(400); throw new Error(`Credit note is ${cn.status}`);
    }
    if (amount > cn.remainingAmount) {
        res.status(400); throw new Error(`Cannot apply more than remaining (${cn.remainingAmount})`);
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
    if (invoice.customerId.toString() !== cn.customerId.toString()) {
        res.status(400); throw new Error('Credit note and invoice must be for the same customer');
    }
    if (amount > invoice.balanceDue) {
        res.status(400); throw new Error(`Cannot apply more than invoice balance (${invoice.balanceDue})`);
    }

    const previousInvoiceStatus = invoice.paymentStatus;
    const previousAmountPaid = invoice.amountPaid;
    const previousBalanceDue = invoice.balanceDue;

    cn.applications.push({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amountApplied: amount,
        appliedBy: req.user._id,
    });
    await cn.save();

    invoice.amountPaid = +(invoice.amountPaid + amount).toFixed(2);
    invoice.balanceDue = +(invoice.grandTotal - invoice.amountPaid).toFixed(2);
    invoice.lastPaymentDate = new Date();
    
    // Update payment status based on new amountPaid
    if (invoice.amountPaid >= invoice.grandTotal) {
        invoice.paymentStatus = 'paid';
        if (!invoice.fullyPaidAt) invoice.fullyPaidAt = new Date();
    } else if (invoice.amountPaid > 0) {
        invoice.paymentStatus = 'partially_paid';
    } else {
        invoice.paymentStatus = 'unpaid';
    }
    
    await invoice.save();

    await updateCustomerBalance(cn.customerId);

    // Create audit log entry
    await AuditLog.create({
        action: 'CREDIT_NOTE_APPLIED',
        module: 'credit_notes',
        documentId: cn._id,
        documentCode: cn.creditNoteNumber,
        description: `Credit note ${cn.creditNoteNumber} applied to invoice ${invoice.invoiceNumber}`,
        changes: {
            creditNoteId: cn._id,
            invoiceId: invoice._id,
            amountApplied: amount,
            previousInvoiceStatus: previousInvoiceStatus,
            newInvoiceStatus: invoice.paymentStatus,
            previousAmountPaid: previousAmountPaid,
            newAmountPaid: invoice.amountPaid,
            previousBalanceDue: previousBalanceDue,
            newBalanceDue: invoice.balanceDue,
        },
        previousData: {
            invoiceStatus: previousInvoiceStatus,
            amountPaid: previousAmountPaid,
            balanceDue: previousBalanceDue,
        },
        performedBy: req.user._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Credit applied to invoice', data: cn });
});