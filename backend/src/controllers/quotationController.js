import asyncHandler from 'express-async-handler';
import Quotation from '../models/Quotation.js';
import Inquiry from '../models/Inquiry.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * @desc    Create a quotation from an inquiry
 * @route   POST /api/quotations
 * @access  Private
 */
export const createQuotation = asyncHandler(async (req, res) => {
    if (req.body.customerId === '') delete req.body.customerId;
    if (req.body.inquiryId === '') delete req.body.inquiryId;
    if (req.body.inquiry === '') delete req.body.inquiry;

    // Auto-register unregistered customer if customerName is provided but customerId is not
    if (!req.body.customerId && req.body.customerName) {
        const { default: Customer } = await import('../models/Customer.js');
        let customer = await Customer.findOne({
            displayName: { $regex: new RegExp('^' + req.body.customerName.trim() + '$', 'i') }
        });
        if (!customer) {
            customer = new Customer({
                displayName: req.body.customerName.trim(),
                companyName: req.body.customerName.trim(),
                primaryContact: {
                    email: req.body.customerEmail || undefined,
                    phone: req.body.customerPhone || undefined
                },
                billingAddress: req.body.customerAddress ? {
                    line1: req.body.customerAddress,
                    city: '',
                    country: 'Sri Lanka'
                } : undefined,
                status: 'active',
                createdBy: req.user._id
            });
            await customer.save();
        }
        req.body.customerId = customer._id;
    }

    const quotation = await Quotation.create({
        ...req.body,
        createdBy: req.user._id,
        version: 1
    });

    const quoteVal = quotation.grandTotal || quotation.totalAmount || 0;
    const officerName = req.user ? (req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()) : 'Sales Officer';
    const followDate = quotation.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // If linked to an existing inquiry, update that inquiry's details
    if (quotation.inquiryId) {
        await Inquiry.findByIdAndUpdate(quotation.inquiryId, {
            quotationNo: quotation.quoteNumber,
            quotationValue: quoteVal,
            status: 'Quotation Sent',
            $push: {
                quotations: quotation._id,
                followUpHistory: {
                    date: new Date(),
                    salesOfficer: officerName,
                    user: req.user?._id,
                    note: `Quotation #${quotation.quoteNumber} issued (Amount: Rs. ${quoteVal.toLocaleString()})`,
                    nextFollowUpDate: followDate
                }
            }
        });
    } else {
        // Direct quotation creation -> auto-create new Inquiry/Lead on Inquiry Dashboard
        try {
            const reqSummary = quotation.items?.map(i => i.productName || 'Item').filter(Boolean).join(', ') || 'Custom Quotation Items';
            const newInq = await Inquiry.create({
                customerName: quotation.customerName || 'Customer',
                companyName: quotation.customerName || 'Customer',
                contactPerson: quotation.customerName || 'Customer',
                contactNo: quotation.customerPhone,
                phone: quotation.customerPhone,
                email: quotation.customerEmail,
                projectLocation: quotation.customerAddress || 'Colombo',
                requirement: reqSummary,
                inquirySource: 'Direct',
                source: 'Direct',
                quotationNo: quotation.quoteNumber,
                quotationValue: quoteVal,
                quotations: [quotation._id],
                status: 'Quotation Sent',
                result: 'Pending',
                nextFollowUpDate: followDate,
                followUpDate: followDate,
                notes: `Direct quotation #${quotation.quoteNumber}`,
                followUpHistory: [{
                    date: new Date(),
                    salesOfficer: officerName,
                    user: req.user?._id,
                    note: `Quotation #${quotation.quoteNumber} generated directly (Quoted Value: Rs. ${quoteVal.toLocaleString()})`,
                    nextFollowUpDate: followDate
                }],
                createdBy: req.user?._id
            });

            quotation.inquiryId = newInq._id;
            await quotation.save();
        } catch (inqErr) {
            console.warn('Failed to auto-create lead from quotation:', inqErr.message);
        }
    }

    createAuditLog({
        action: 'create',
        module: 'crm',
        documentId: quotation._id,
        documentCode: quotation.quoteNumber,
        description: `Generated quotation ${quotation.quoteNumber} for inquiry ${quotation.inquiryId || 'manual'}`,
        req
    });

    res.status(201).json({ success: true, data: quotation });
});

/**
 * @desc    Get quotations
 * @route   GET /api/quotations
 * @access  Private
 */
export const getQuotations = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { deletedAt: null };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [quotations, total] = await Promise.all([
        Quotation.find(filter)
            .populate('customerId', 'displayName companyName')
            .populate('items.product', 'name productCode')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Quotation.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: quotations,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
    });
});

/**
 * @desc    Get quotation by ID
 * @route   GET /api/quotations/:id
 * @access  Private
 */
export const getQuotationById = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id)
        .populate('customerId', 'displayName companyName primaryContact billingAddress')
        .populate('items.product', 'name productCode uom basePrice sku')
        .populate('createdBy', 'firstName lastName');

    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    res.json({ success: true, data: quotation });
});

/**
 * @desc    Update a quotation
 * @route   PUT /api/crm/quotations/:id
 * @access  Private
 */
export const updateQuotation = asyncHandler(async (req, res) => {
    if (req.body.customerId === '') delete req.body.customerId;
    if (req.body.inquiryId === '') delete req.body.inquiryId;
    if (req.body.inquiry === '') delete req.body.inquiry;

    // Auto-register unregistered customer if customerName is provided but customerId is not
    if (!req.body.customerId && req.body.customerName) {
        const { default: Customer } = await import('../models/Customer.js');
        let customer = await Customer.findOne({
            displayName: { $regex: new RegExp('^' + req.body.customerName.trim() + '$', 'i') }
        });
        if (!customer) {
            customer = new Customer({
                displayName: req.body.customerName.trim(),
                companyName: req.body.customerName.trim(),
                primaryContact: {
                    email: req.body.customerEmail || undefined,
                    phone: req.body.customerPhone || undefined
                },
                billingAddress: req.body.customerAddress ? {
                    line1: req.body.customerAddress,
                    city: '',
                    country: 'Sri Lanka'
                } : undefined,
                status: 'active',
                createdBy: req.user._id
            });
            await customer.save();
        }
        req.body.customerId = customer._id;
    }

    const quotation = await Quotation.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user._id },
        { new: true, runValidators: true }
    );

    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    createAuditLog({
        action: 'update',
        module: 'crm',
        documentId: quotation._id,
        description: `Updated quotation ${quotation.quoteNumber}`,
        req
    });

    res.json({ success: true, data: quotation });
});

/**
 * @desc    Delete a quotation (soft)
 * @route   DELETE /api/crm/quotations/:id
 * @access  Private
 */
export const deleteQuotation = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }
    quotation.deletedAt = new Date();
    await quotation.save();

    createAuditLog({
        action: 'delete',
        module: 'crm',
        documentId: quotation._id,
        description: `Deleted quotation ${quotation.quoteNumber}`,
        req
    });

    res.json({ success: true, message: 'Quotation deleted' });
});

/**
 * @desc    Convert quotation to sales order
 * @route   POST /api/crm/quotations/:id/convert
 * @access  Private
 */
export const convertQuotationToOrder = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    if (quotation.status !== 'accepted') {
        res.status(400);
        throw new Error('Only accepted quotations can be converted');
    }

    // Logic to create SalesOrder would go here
    // For now, mark as converted
    quotation.status = 'converted';
    await quotation.save();

    createAuditLog({
        action: 'update',
        module: 'crm',
        documentId: quotation._id,
        description: `Converted quotation ${quotation.quoteNumber} to order`,
        req
    });

    res.json({ success: true, message: 'Quotation converted successfully', data: quotation });
});
