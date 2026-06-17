import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import SalesOrder from '../models/SalesOrder.js';
import Warehouse from '../models/Warehouse.js';
import { decreaseStock } from '../services/stockService.js';

const deductStockForInvoice = async (invoice, userId) => {
    if (invoice.invoiceType === 'proforma') return; // Proforma NEVER impacts stock
    if (invoice.stockDeducted) return;

    let whId = invoice.warehouseId;
    if (!whId) {
        const wh = await Warehouse.findOne({ deletedAt: null });
        whId = wh?._id;
    }
    if (!whId) return;

    for (const item of invoice.items) {
        if (!item.productId) continue;
        try {
            await decreaseStock({
                productId: item.productId,
                warehouseId: whId,
                quantity: item.quantity,
                movementType: 'sale_dispatch',
                sourceDocument: {
                    type: 'invoice',
                    id: invoice._id,
                    number: invoice.invoiceNumber
                },
                reason: `Inventory deduction for Commercial Invoice ${invoice.invoiceNumber}`,
                userId
            });
        } catch (err) {
            console.warn(`[Invoice Stock Deduction] Failed for ${item.productName}:`, err.message);
        }
    }

    invoice.stockDeducted = true;
    invoice.warehouseId = whId;
    await invoice.save();
};

/**
 * Helper: recalculate customer credit balance
 */
const updateCustomerBalance = async (customerId, session) => {
    const result = await Invoice.aggregate([
        {
            $match: {
                customerId: new mongoose.Types.ObjectId(customerId),
                paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue'] },
                deletedAt: null,
            },
        },
        {
            $group: {
                _id: null,
                totalBalance: { $sum: '$balanceDue' },
                overdueAmount: {
                    $sum: {
                        $cond: [{ $in: ['$paymentStatus', ['overdue']] }, '$balanceDue', 0],
                    },
                },
            },
        },
    ]).session(session || null);

    const summary = result[0] || { totalBalance: 0, overdueAmount: 0 };

    const customer = await Customer.findById(customerId).session(session || null);
    if (customer) {
        customer.creditStatus.currentBalance = +summary.totalBalance.toFixed(2);
        customer.creditStatus.overdueAmount = +summary.overdueAmount.toFixed(2);
        customer.creditStatus.isOverdue = summary.overdueAmount > 0;
        customer.creditStatus.availableCredit = Math.max(
            0,
            (customer.paymentTerms?.creditLimit || 0) - customer.creditStatus.currentBalance
        );
        await customer.save({ session: session || undefined });
    }
};

/**
 * POST /api/invoices
 * Create manual invoice
 */
export const createInvoice = asyncHandler(async (req, res) => {
    const { customerId, items, dueDate, ...rest } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) { res.status(404); throw new Error('Customer not found'); }

    // Auto-calc due date if not provided
    let finalDueDate = dueDate;
    if (!finalDueDate && customer.paymentTerms?.type === 'credit') {
        const d = new Date(rest.invoiceDate || Date.now());
        d.setDate(d.getDate() + (customer.paymentTerms.creditDays || 0));
        finalDueDate = d;
    }

    const invoice = new Invoice({
        customerId: customer._id,
        customerSnapshot: {
            name: customer.displayName,
            code: customer.customerCode,
            taxRegistrationNumber: customer.taxRegistrationNumber,
            contactName: customer.primaryContact?.name,
        },
        billingAddress: customer.billingAddress,
        shippingAddress: customer.shippingAddresses?.find((a) => a.isDefault) || customer.billingAddress,
        salesRepId: customer.assignedSalesRep,
        paymentTerms: {
            type: customer.paymentTerms?.type || 'cod',
            creditDays: customer.paymentTerms?.creditDays || 0,
        },
        dueDate: finalDueDate,
        items,
        ...rest,
        createdBy: req.user._id,
    });

    await invoice.save();
    await deductStockForInvoice(invoice, req.user._id);
    await updateCustomerBalance(customer._id);

    const populated = await Invoice.findById(invoice._id)
        .populate('customerId', 'displayName customerCode')
        .populate('salesOrderIds', 'orderNumber');

    res.status(201).json({ success: true, data: populated });
});

/**
 * POST /api/invoices/from-sales-order
 * Generate an invoice from one or more delivered sales orders
 */
export const createFromSalesOrder = asyncHandler(async (req, res) => {
    const { salesOrderIds, invoiceDate, invoiceType = 'standard', notes } = req.body;

    const orders = await SalesOrder.find({
        _id: { $in: salesOrderIds },
        status: { $in: ['delivered', 'completed'] },
    }).populate('customerId');

    if (orders.length === 0) {
        res.status(400);
        throw new Error('No delivered orders found for the given IDs');
    }

    // Check all orders have a valid customer and belong to the same customer
    const validOrders = orders.filter(o => o.customerId);
    if (validOrders.length !== orders.length) {
        res.status(400);
        throw new Error('Some selected sales orders have missing or invalid customer references');
    }

    const customerIds = [...new Set(validOrders.map((o) => o.customerId._id.toString()))];
    if (customerIds.length > 1) {
        res.status(400);
        throw new Error('All sales orders must belong to the same customer');
    }

    const customer = validOrders[0].customerId;

    // Merge line items from all orders
    const invoiceItems = [];
    validOrders.forEach((order) => {
        order.items.forEach((orderItem) => {
            const qty = orderItem.deliveredQuantity || orderItem.orderedQuantity;
            if (qty <= 0) return;
            invoiceItems.push({
                productId: orderItem.productId,
                productCode: orderItem.productCode,
                productName: orderItem.productName,
                description: orderItem.description,
                quantity: qty,
                unitOfMeasure: orderItem.unitOfMeasure,
                unitPrice: orderItem.unitPrice,
                discountPercent: orderItem.discountPercent,
                taxRate: orderItem.taxRate,
                taxable: orderItem.taxable,
                salesOrderLineId: orderItem._id,
            });
        });
    });

    // Due date from customer terms
    const d = new Date(invoiceDate || Date.now());
    if (customer.paymentTerms?.type === 'credit') {
        d.setDate(d.getDate() + (customer.paymentTerms.creditDays || 0));
    }

    const invoice = new Invoice({
        customerId: customer._id,
        customerSnapshot: {
            name: customer.displayName,
            code: customer.customerCode,
            taxRegistrationNumber: customer.taxRegistrationNumber,
            contactName: customer.primaryContact?.name,
        },
        billingAddress: customer.billingAddress,
        shippingAddress: orders[0].shippingAddress || customer.billingAddress,
        salesOrderIds: orders.map((o) => o._id),
        salesOrderNumbers: orders.map((o) => o.orderNumber),
        invoiceType,
        invoiceDate: invoiceDate || new Date(),
        dueDate: customer.paymentTerms?.type === 'credit' ? d : undefined,
        salesRepId: orders[0].salesRepId,
        paymentTerms: {
            type: customer.paymentTerms?.type || 'cod',
            creditDays: customer.paymentTerms?.creditDays || 0,
        },
        items: invoiceItems,
        notes,
        status: 'approved',
        createdBy: req.user._id,
    });

    await invoice.save();
    await deductStockForInvoice(invoice, req.user._id);

    // Update sales orders to "invoiced" or "completed"
    for (const order of orders) {
        if (order.status === 'delivered') {
            order.status = 'invoiced';
            await order.save();
        }
    }

    await updateCustomerBalance(customer._id);

    const populated = await Invoice.findById(invoice._id)
        .populate('customerId', 'displayName customerCode')
        .populate('salesOrderIds', 'orderNumber');

    res.status(201).json({ success: true, data: populated });
});

/**
 * GET /api/invoices
 */
export const getInvoices = asyncHandler(async (req, res) => {
    const {
        search, customerId, paymentStatus, status, agingBucket,
        startDate, endDate,
        page = 1, limit = 20,
        sortBy = 'invoiceDate', sortOrder = 'desc',
    } = req.query;

    const filter = {};
    if (search) {
        filter.$or = [
            { invoiceNumber: { $regex: search, $options: 'i' } },
            { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
            { 'customerSnapshot.code': { $regex: search, $options: 'i' } },
        ];
    }
    if (customerId) filter.customerId = customerId;
    if (paymentStatus) {
        // Support comma-separated values: "unpaid,partially_paid,overdue"
        const statuses = paymentStatus.split(',').map((s) => s.trim()).filter(Boolean);
        filter.paymentStatus = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
    if (status) filter.status = status;
    if (agingBucket) filter.agingBucket = agingBucket;
    if (startDate || endDate) {
        filter.invoiceDate = {};
        if (startDate) filter.invoiceDate.$gte = new Date(startDate);
        if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [invoices, total] = await Promise.all([
        Invoice.find(filter)
            .populate('customerId', 'displayName customerCode')
            .populate('salesOrderIds', 'orderNumber')
            .sort(sortObj).skip(skip).limit(Number(limit)),
        Invoice.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: invoices.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: invoices,
    });
});

/**
 * GET /api/invoices/:id
 */
export const getInvoiceById = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id)
        .populate('customerId', 'displayName customerCode taxRegistrationNumber primaryContact paymentTerms creditStatus')
        .populate('salesOrderIds', 'orderNumber orderDate')
        .populate('salesRepId', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .populate('cancelledBy', 'firstName lastName');
    if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
    res.json({ success: true, data: invoice });
});

/**
 * GET /api/invoices/aging/summary
 * Accounts receivable aging summary
 */
export const getAgingSummary = asyncHandler(async (req, res) => {
    const { customerId } = req.query;
    const match = {
        paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue', 'Unpaid', 'Partially Paid', 'Overdue', 'partially paid'] },
        deletedAt: null,
    };
    if (customerId) match.customerId = new mongoose.Types.ObjectId(customerId);

    const aggregation = await Invoice.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$agingBucket',
                count: { $sum: 1 },
                total: { $sum: '$balanceDue' },
            },
        },
    ]);

    const buckets = { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '91_plus': 0 };
    const counts = { ...buckets };
    aggregation.forEach((row) => {
        if (row._id in buckets) {
            buckets[row._id] = row.total;
            counts[row._id] = row.count;
        }
    });

    const totalOutstanding = Object.values(buckets).reduce((s, v) => s + v, 0);

    res.json({
        success: true,
        data: { buckets, counts, totalOutstanding },
    });
});

/**
 * PATCH /api/invoices/:id/status
 */
export const changeInvoiceStatus = asyncHandler(async (req, res) => {
    const { status, reason } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) { res.status(404); throw new Error('Invoice not found'); }

    const allowed = {
        draft: ['approved', 'cancelled'],
        approved: ['sent', 'cancelled'],
        sent: ['viewed', 'cancelled'],
        viewed: ['cancelled'],
        paid: ['void'],
    };

    if (!allowed[invoice.status]?.includes(status)) {
        res.status(400);
        throw new Error(`Cannot change status from '${invoice.status}' to '${status}'`);
    }

    invoice.status = status;
    invoice.updatedBy = req.user._id;

    if (['approved', 'sent', 'viewed', 'paid'].includes(status)) {
        await deductStockForInvoice(invoice, req.user._id);
    }

    if (status === 'sent') invoice.sentAt = new Date();
    if (status === 'cancelled') {
        invoice.cancelledBy = req.user._id;
        invoice.cancelledAt = new Date();
        invoice.cancellationReason = reason;
        invoice.paymentStatus = 'cancelled';
    }

    await invoice.save();
    await updateCustomerBalance(invoice.customerId);

    res.json({ success: true, data: invoice });
});

/**
 * DELETE /api/invoices/:id
 */
export const deleteInvoice = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
    if (invoice.status !== 'draft') {
        res.status(400); throw new Error('Only draft invoices can be deleted');
    }
    invoice.deletedAt = new Date();
    await invoice.save();
    res.json({ success: true, message: 'Draft invoice deleted' });
});

// Exported for use by payments module
export { updateCustomerBalance };