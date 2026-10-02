import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import SalesOrder from '../models/SalesOrder.js';
import Warehouse from '../models/Warehouse.js';
import { decreaseStock, increaseStock } from '../services/stockService.js';
import StockItem from '../models/StockItem.js';
import StockMovement from '../models/StockMovement.js';
import Product from '../models/Product.js';
import AuditLog from '../models/AuditLog.js';
import { broadcast } from '../services/socketService.js';

const deductStockForInvoice = async (invoice, userId) => {
    if (invoice.invoiceType === 'proforma') return; // Proforma NEVER impacts stock
    if (invoice.stockDeducted) return;
    // Sales orders already deduct stock on approval (salesOrderController:602), so do not deduct twice
    if (invoice.salesOrderIds && invoice.salesOrderIds.length > 0) {
        invoice.stockDeducted = true;
        invoice.stockDeductionError = null;
        await invoice.save();
        return;
    }

    let whId = invoice.warehouseId;
    if (!whId) {
        const wh = await Warehouse.findOne({ deletedAt: null });
        whId = wh?._id;
    }
    if (!whId) {
        invoice.stockDeductionError = 'No active warehouse found for stock deduction';
        await invoice.save();
        throw new Error('No active warehouse found for stock deduction');
    }

    const warehouse = await Warehouse.findById(whId);
    const allowNegative = warehouse?.settings?.allowNegativeStock || false;

    // Check availability first if negative stock is not allowed
    if (!allowNegative) {
        for (const item of invoice.items) {
            if (!item.productId) continue;
            const stockItem = await StockItem.findOne({
                productId: item.productId,
                warehouseId: whId,
            });
            const openStock = stockItem?.quantities?.openStock || 0;
            if (!stockItem || openStock < item.quantity) {
                const errMsg = `Insufficient stock for "${item.productName || item.productId}". Available: ${openStock}, Required: ${item.quantity}`;
                invoice.stockDeducted = false;
                invoice.stockDeductionError = errMsg;
                await invoice.save();
                throw new Error(errMsg);
            }
        }
    }

    const deductedMovements = [];
    try {
        for (const item of invoice.items) {
            if (!item.productId) continue;
            const result = await decreaseStock({
                productId: item.productId,
                warehouseId: whId,
                quantity: item.quantity,
                movementType: 'sale_dispatch',
                sourceDocument: {
                    type: 'invoice',
                    id: invoice._id,
                    number: invoice.invoiceNumber,
                },
                reason: `Inventory deduction for Commercial Invoice ${invoice.invoiceNumber}`,
                userId,
                allowNegative,
            });
            if (result?.movement) {
                deductedMovements.push(result.movement);
            }
        }

        invoice.stockDeducted = true;
        invoice.warehouseId = whId;
        invoice.stockDeductionError = null;
        await invoice.save();
    } catch (err) {
        // Rollback any items deducted in this attempt
        for (const m of deductedMovements) {
            try {
                await increaseStock({
                    productId: m.productId,
                    warehouseId: m.warehouseId || whId,
                    batchNumber: m.batchNumber || null,
                    quantity: m.quantity,
                    costPerUnit: m.costPerUnit || 0,
                    movementType: 'sale_return',
                    sourceDocument: {
                        type: 'invoice',
                        id: invoice._id,
                        number: invoice.invoiceNumber,
                    },
                    reason: `Rollback deduction failure for invoice ${invoice.invoiceNumber}`,
                    userId,
                });
            } catch (rbErr) {
                console.warn('[Invoice Stock Deduction Rollback]', rbErr.message);
            }
        }

        invoice.stockDeducted = false;
        invoice.stockDeductionError = err.message;
        await invoice.save();
        throw new Error(`Stock deduction failed for invoice ${invoice.invoiceNumber}: ${err.message}`);
    }
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
    try {
        await deductStockForInvoice(invoice, req.user._id);
    } catch (deductErr) {
        // Rollback/delete the incomplete invoice if initial deduction failed
        await Invoice.findByIdAndDelete(invoice._id);
        res.status(400);
        throw deductErr;
    }
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
        stockDeducted: true, // Stock was already deducted when sales order was approved
        warehouseId: orders[0]?.sourceWarehouseId,
        createdBy: req.user._id,
    });

    await invoice.save();

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

    if (['approved', 'sent', 'viewed', 'paid'].includes(status)) {
        await deductStockForInvoice(invoice, req.user._id);
    }

    if (status === 'sent') invoice.sentAt = new Date();
    if (status === 'cancelled' || status === 'void') {
        invoice.cancelledBy = req.user._id;
        invoice.cancelledAt = new Date();
        invoice.cancellationReason = reason;
        invoice.paymentStatus = 'cancelled';

        // ─── RESTORE STOCK ON CANCEL / VOID ───
        if (invoice.stockDeducted) {
            const outgoingMovements = await StockMovement.find({
                'sourceDocument.id': invoice._id,
                direction: 'out',
            });

            if (outgoingMovements.length > 0) {
                const existingReturns = await StockMovement.find({
                    'sourceDocument.id': invoice._id,
                    direction: 'in',
                    movementType: 'sale_return',
                });

                const returnedQtyMap = {};
                for (const ret of existingReturns) {
                    const key = `${ret.productId}_${ret.batchNumber || 'nobatch'}_${ret.warehouseId}`;
                    returnedQtyMap[key] = (returnedQtyMap[key] || 0) + (ret.quantity || 0);
                }

                for (const movement of outgoingMovements) {
                    const key = `${movement.productId}_${movement.batchNumber || 'nobatch'}_${movement.warehouseId}`;
                    const alreadyReturned = returnedQtyMap[key] || 0;
                    const netQtyToReturn = Math.max(0, movement.quantity - alreadyReturned);

                    if (netQtyToReturn > 0) {
                        try {
                            await increaseStock({
                                productId: movement.productId,
                                warehouseId: movement.warehouseId || invoice.warehouseId,
                                batchNumber: movement.batchNumber || null,
                                quantity: netQtyToReturn,
                                costPerUnit: movement.costPerUnit || 0,
                                movementType: 'sale_return',
                                sourceDocument: {
                                    type: 'invoice',
                                    id: invoice._id,
                                    number: invoice.invoiceNumber,
                                },
                                reason: reason || `Invoice ${invoice.invoiceNumber} cancelled — stock restored`,
                                userId: req.user._id,
                            });
                            returnedQtyMap[key] = alreadyReturned + netQtyToReturn;
                        } catch (stockErr) {
                            console.warn(`[Invoice Stock Return] Failed for movement ${movement._id}:`, stockErr.message);
                        }
                    }
                }
            } else if (!invoice.salesOrderIds || invoice.salesOrderIds.length === 0) {
                // Fallback for direct invoices without StockMovement records
                let whId = invoice.warehouseId;
                if (!whId) {
                    const wh = await Warehouse.findOne({ deletedAt: null });
                    whId = wh?._id;
                }
                for (const item of invoice.items) {
                    if (!item.productId) continue;
                    try {
                        const stockItem = await StockItem.findOne({
                            productId: item.productId,
                            warehouseId: whId,
                        });
                        const product = !stockItem ? await Product.findById(item.productId) : null;
                        const originalCost = stockItem?.costPerUnit
                            || product?.costs?.averageCost
                            || product?.costs?.lastPurchaseCost
                            || item.unitPrice
                            || 0;

                        await increaseStock({
                            productId: item.productId,
                            warehouseId: whId,
                            quantity: item.quantity,
                            costPerUnit: originalCost,
                            movementType: 'sale_return',
                            sourceDocument: {
                                type: 'invoice',
                                id: invoice._id,
                                number: invoice.invoiceNumber,
                            },
                            reason: reason || `Invoice ${invoice.invoiceNumber} cancelled — stock restored`,
                            userId: req.user._id,
                        });
                    } catch (stockErr) {
                        console.warn(`[Invoice Stock Return] Failed for ${item.productName}:`, stockErr.message);
                    }
                }
            }

            invoice.stockDeducted = false;
        }

        // If invoice was created from sales orders, revert sales order status if applicable
        if (invoice.salesOrderIds && invoice.salesOrderIds.length > 0) {
            for (const soId of invoice.salesOrderIds) {
                const so = await SalesOrder.findById(soId);
                if (so && so.status === 'invoiced') {
                    so.status = 'delivered';
                    await so.save();
                }
            }
        }
    }

    invoice.status = status;
    invoice.updatedBy = req.user._id;

    await invoice.save();
    await updateCustomerBalance(invoice.customerId);

    res.json({ success: true, data: invoice });
});

/**
 * PATCH /api/invoices/:id/payment-status
 * Manually update payment status (for write-offs, disputes, etc.)
 */
export const updateInvoicePaymentStatus = asyncHandler(async (req, res) => {
    const { paymentStatus, amountPaid, reason } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) { res.status(404); throw new Error('Invoice not found'); }

    const validStatuses = ['unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled', 'written_off'];
    if (!validStatuses.includes(paymentStatus)) {
        res.status(400);
        throw new Error(`Invalid payment status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Store previous state for audit log
    const previousStatus = invoice.paymentStatus;
    const previousAmountPaid = invoice.amountPaid;
    const previousBalanceDue = invoice.balanceDue;

    // Update payment status
    invoice.paymentStatus = paymentStatus;

    // If amountPaid is provided, update it
    if (amountPaid !== undefined) {
        invoice.amountPaid = Number(amountPaid);
        invoice.balanceDue = Math.max(0, +(invoice.grandTotal - invoice.amountPaid).toFixed(2));
    }

    // If marked as paid or written_off, set fullyPaidAt
    if (['paid', 'written_off'].includes(paymentStatus) && !invoice.fullyPaidAt) {
        invoice.fullyPaidAt = new Date();
    }

    // If written_off, add to notes
    if (paymentStatus === 'written_off' && reason) {
        invoice.internalNotes = (invoice.internalNotes || '') + `\n\nWritten off on ${new Date().toLocaleDateString()}: ${reason}`;
    }

    await invoice.save();
    await updateCustomerBalance(invoice.customerId);

    // Create audit log entry
    await AuditLog.create({
        action: 'PAYMENT_STATUS_UPDATE',
        module: 'invoices',
        documentId: invoice._id,
        documentCode: invoice.invoiceNumber,
        description: `Invoice payment status changed from ${previousStatus} to ${paymentStatus}`,
        changes: {
            paymentStatus: { from: previousStatus, to: paymentStatus },
            amountPaid: { from: previousAmountPaid, to: invoice.amountPaid },
            balanceDue: { from: previousBalanceDue, to: invoice.balanceDue },
        },
        previousData: {
            paymentStatus: previousStatus,
            amountPaid: previousAmountPaid,
            balanceDue: previousBalanceDue,
        },
        performedBy: req.user._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
    });

    // Broadcast payment status change notification
    try {
        broadcast('payment_status_changed', {
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            customerId: invoice.customerId,
            previousStatus: previousStatus,
            newStatus: paymentStatus,
            amountPaid: invoice.amountPaid,
            balanceDue: invoice.balanceDue,
            changedBy: req.user._id,
            timestamp: new Date(),
        });
        
        broadcast('financial_update', {
            message: `Invoice ${invoice.invoiceNumber} payment status changed to ${paymentStatus}`,
        });
    } catch (error) {
        console.error('Failed to broadcast payment status change:', error);
    }

    res.json({ success: true, data: invoice, message: `Payment status updated to ${paymentStatus}` });
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