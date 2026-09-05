import asyncHandler from 'express-async-handler';
import Customer from '../models/Customer.js';
import backupEmitter, { BACKUP_EVENTS } from '../utils/backupEventEmitter.js';
import { createAuditLog } from '../utils/auditLogger.js';

export const createCustomer = asyncHandler(async (req, res) => {
    // Clean up empty string ID fields
    const payload = { ...req.body, createdBy: req.user._id };
    if (!payload.customerGroupId) delete payload.customerGroupId;
    if (!payload.assignedSalesRep) delete payload.assignedSalesRep;

    const customer = await Customer.create(payload);
    const populated = await Customer.findById(customer._id)
        .populate('customerGroupId', 'name code color')
        .populate('assignedSalesRep', 'firstName lastName');
    res.status(201).json({ success: true, data: populated });

    createAuditLog({
        action: 'create',
        module: 'customers',
        documentId: customer._id,
        documentCode: customer.customerCode,
        description: `Created new customer: ${customer.displayName}`,
        req
    });

    backupEmitter.emit(BACKUP_EVENTS.CUSTOMER_CHANGED);
});

export const getCustomers = asyncHandler(async (req, res) => {
    const {
        search, customerGroupId, status, assignedSalesRep,
        onCreditHold, isOverdue,
        page = 1, limit = 20,
        sortBy = 'createdAt', sortOrder = 'desc',
    } = req.query;

    const filter = {};

    if (search) {
        filter.$or = [
            { displayName: { $regex: search, $options: 'i' } },
            { companyName: { $regex: search, $options: 'i' } },
            { customerCode: { $regex: search, $options: 'i' } },
            { 'primaryContact.phone': { $regex: search, $options: 'i' } },
        ];
    }
    if (customerGroupId) filter.customerGroupId = customerGroupId;
    if (status) filter.status = status;
    if (assignedSalesRep) filter.assignedSalesRep = assignedSalesRep;
    if (onCreditHold !== undefined) filter['creditStatus.onCreditHold'] = onCreditHold === 'true';
    if (isOverdue !== undefined) filter['creditStatus.isOverdue'] = isOverdue === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [customers, total] = await Promise.all([
        Customer.find(filter)
            .populate('customerGroupId', 'name code color')
            .populate('assignedSalesRep', 'firstName lastName')
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit)),
        Customer.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: customers.length,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        data: customers,
    });
});

export const getCustomerById = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id)
        .populate('customerGroupId', 'name code color defaultDiscountPercent')
        .populate('assignedSalesRep', 'firstName lastName email phone')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName');

    if (!customer) { res.status(404); throw new Error('Customer not found'); }
    res.json({ success: true, data: customer });
});

export const updateCustomer = asyncHandler(async (req, res) => {
    const payload = { ...req.body, updatedBy: req.user._id };
    if (payload.customerGroupId === '') payload.customerGroupId = null;
    if (payload.assignedSalesRep === '') payload.assignedSalesRep = null;

    const oldData = await Customer.findById(req.params.id);
    const customer = await Customer.findByIdAndUpdate(req.params.id, payload, {
        new: true, runValidators: true,
    })
        .populate('customerGroupId', 'name code color')
        .populate('assignedSalesRep', 'firstName lastName');

    if (!customer) { res.status(404); throw new Error('Customer not found'); }
    res.json({ success: true, data: customer });

    createAuditLog({
        action: 'update',
        module: 'customers',
        documentId: customer._id,
        documentCode: customer.customerCode,
        description: `Updated customer: ${customer.displayName}`,
        changes: req.body,
        previousData: oldData,
        req
    });

    backupEmitter.emit(BACKUP_EVENTS.CUSTOMER_CHANGED);
});

export const deleteCustomer = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) { res.status(404); throw new Error('Customer not found'); }
    customer.deletedAt = new Date();
    customer.status = 'inactive';
    await customer.save();
    res.json({ success: true, message: 'Customer deleted' });

    createAuditLog({
        action: 'delete',
        module: 'customers',
        documentId: customer._id,
        documentCode: customer.customerCode,
        description: `Soft-deleted customer: ${customer.displayName}`,
        req
    });

    backupEmitter.emit(BACKUP_EVENTS.CUSTOMER_CHANGED);
});

// Toggle credit hold
export const toggleCreditHold = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) { res.status(404); throw new Error('Customer not found'); }

    customer.creditStatus.onCreditHold = !customer.creditStatus.onCreditHold;
    customer.creditStatus.creditHoldReason = customer.creditStatus.onCreditHold ? reason : null;
    await customer.save();

    res.json({
        success: true,
        message: customer.creditStatus.onCreditHold ? 'Customer placed on credit hold' : 'Credit hold removed',
        data: customer,
    });

    createAuditLog({
        action: 'update',
        module: 'customers',
        documentId: customer._id,
        documentCode: customer.customerCode,
        description: customer.creditStatus.onCreditHold ? 'Placed customer on credit hold' : 'Removed customer from credit hold',
        req
    });

    backupEmitter.emit(BACKUP_EVENTS.CUSTOMER_CHANGED);
});

// Get customer statement with running ledger and payment linkage
export const getCustomerStatement = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const customer = await Customer.findById(id);
    if (!customer) { res.status(404); throw new Error('Customer not found'); }

    const { default: Invoice } = await import('../models/Invoice.js');
    const { default: Payment } = await import('../models/Payment.js');

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const invoiceQuery = { customerId: id, status: { $ne: 'cancelled' } };
    if (Object.keys(dateFilter).length > 0) invoiceQuery.invoiceDate = dateFilter;

    const paymentQuery = { customerId: id, status: { $ne: 'cancelled' } };
    if (Object.keys(dateFilter).length > 0) paymentQuery.paymentDate = dateFilter;

    const [invoices, payments] = await Promise.all([
        Invoice.find(invoiceQuery).sort({ invoiceDate: 1 }),
        Payment.find(paymentQuery).sort({ paymentDate: 1 })
    ]);

    // Build timeline ledger entries
    const ledger = [];
    invoices.forEach(inv => {
        ledger.push({
            date: inv.invoiceDate,
            type: 'INVOICE',
            refNumber: inv.invoiceNumber,
            description: `Sales Invoice #${inv.invoiceNumber}`,
            debit: inv.grandTotal,
            credit: 0,
            id: inv._id,
            status: inv.paymentStatus,
            dueDate: inv.dueDate,
            daysPastDue: inv.daysPastDue
        });
    });

    payments.forEach(pay => {
        const linkedInvoices = (pay.allocations || []).map(a => a.documentNumber).filter(Boolean).join(', ');
        ledger.push({
            date: pay.paymentDate,
            type: 'PAYMENT',
            refNumber: pay.paymentNumber,
            description: `Payment Received (${pay.method ? pay.method.toUpperCase().replace('_', ' ') : 'N/A'})${linkedInvoices ? ` - Linked Inv: ${linkedInvoices}` : ''}`,
            method: pay.method,
            chequeNumber: pay.chequeNumber,
            chequeStatus: pay.chequeStatus,
            linkedInvoices,
            debit: 0,
            credit: pay.amount,
            unallocatedAmount: pay.unallocatedAmount || 0,
            id: pay._id
        });
    });

    // Sort chronologically
    ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let runningBalance = 0;
    ledger.forEach(entry => {
        runningBalance += (entry.debit - entry.credit);
        entry.runningBalance = +runningBalance.toFixed(2);
    });

    const totalInvoiced = invoices.reduce((sum, i) => sum + i.grandTotal, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalAdvance = payments.reduce((sum, p) => sum + (p.unallocatedAmount || 0), 0);
    const outstandingBalance = +(totalInvoiced - totalPaid).toFixed(2);

    res.json({
        success: true,
        data: {
            customer,
            summary: {
                totalInvoiced: +totalInvoiced.toFixed(2),
                totalPaid: +totalPaid.toFixed(2),
                outstandingBalance: Math.max(0, outstandingBalance),
                advanceAmount: +totalAdvance.toFixed(2),
                currentBalance: customer.creditStatus?.currentBalance || Math.max(0, outstandingBalance)
            },
            ledger
        }
    });
});

// Get financial summary for all customers (Row view)
export const getCustomerFinancials = asyncHandler(async (req, res) => {
    const { default: Invoice } = await import('../models/Invoice.js');
    const { default: Payment } = await import('../models/Payment.js');

    const [customers, invoiceAgg, paymentAgg] = await Promise.all([
        Customer.find({ deletedAt: null }).select('displayName customerCode companyName primaryContact creditStatus status'),
        Invoice.aggregate([
            { $match: { status: { $ne: 'cancelled' }, deletedAt: null } },
            {
                $group: {
                    _id: '$customerId',
                    totalInvoiced: { $sum: '$grandTotal' },
                    totalUnpaid: { $sum: '$balanceDue' }
                }
            }
        ]),
        Payment.aggregate([
            { $match: { status: { $ne: 'cancelled' }, deletedAt: null } },
            {
                $group: {
                    _id: '$customerId',
                    totalPaid: { $sum: '$amount' },
                    totalAdvance: { $sum: '$unallocatedAmount' }
                }
            }
        ])
    ]);

    const invMap = {};
    invoiceAgg.forEach(i => { if (i._id) invMap[i._id.toString()] = i; });

    const payMap = {};
    paymentAgg.forEach(p => { if (p._id) payMap[p._id.toString()] = p; });

    const rows = customers.map(c => {
        const cId = c._id.toString();
        const inv = invMap[cId] || { totalInvoiced: 0, totalUnpaid: 0 };
        const pay = payMap[cId] || { totalPaid: 0, totalAdvance: 0 };

        return {
            _id: c._id,
            customerCode: c.customerCode,
            displayName: c.displayName,
            companyName: c.companyName,
            phone: c.primaryContact?.phone || '—',
            status: c.status,
            totalInvoiceAmount: +inv.totalInvoiced.toFixed(2),
            paidAmount: +pay.totalPaid.toFixed(2),
            unpaidAmount: +inv.totalUnpaid.toFixed(2),
            advanceAmount: +pay.totalAdvance.toFixed(2)
        };
    });

    res.json({ success: true, count: rows.length, data: rows });
});