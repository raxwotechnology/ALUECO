import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import CustomerReturn from '../models/CustomerReturn.js';
import CreditNote from '../models/CreditNote.js';
import Customer from '../models/Customer.js';
import SalesOrder from '../models/SalesOrder.js';
import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import DamageRecord from '../models/DamageRecord.js';
import RepairOrder from '../models/RepairOrder.js';
import { increaseStock } from '../services/stockService.js';
import { updateCustomerBalance } from './invoiceController.js';

/**
 * PATCH /api/customer-returns/:id/status
 */
export const updateReturnStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const returnRecord = await CustomerReturn.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
    );
    if (!returnRecord) {
        res.status(404);
        throw new Error('Return not found');
    }
    res.json({ success: true, data: returnRecord });
});

/**
 * POST /api/customer-returns
 */
export const createReturn = asyncHandler(async (req, res) => {
    const { customerId, items, salesOrderIds = [], invoiceIds = [], ...rest } = req.body;

    let customer = null;
    if (customerId) {
        customer = await Customer.findById(customerId);
        if (!customer) { res.status(404); throw new Error('Customer not found'); }
    }

    // Handle simple returns without items (for basic return logging)
    if (!items || items.length === 0) {
        const ret = new CustomerReturn({
            customerId: customer?._id,
            customerSnapshot: customer ? {
                name: customer.displayName,
                code: customer.customerCode,
                phone: customer.primaryContact?.phone,
            } : {
                name: rest.customerName || 'Unknown',
                code: '',
                phone: '',
            },
            salesOrderIds,
            invoiceIds,
            items: [], // Empty items array for simple returns
            ...rest,
            createdBy: req.user._id,
        });

        await ret.save();

        const populated = await CustomerReturn.findById(ret._id)
            .populate('customerId', 'displayName customerCode');

        res.status(201).json({ success: true, data: populated });
        return;
    }

    // Complex returns with items require customer
    if (!customer) { res.status(400); throw new Error('Customer is required for returns with items'); }

    // Enrich items for complex returns with product details
    const productIds = items.filter((i) => i.productId).map((i) => i.productId);
    const productCodes = items.filter((i) => !i.productId && i.productCode).map((i) => i.productCode);

    const [productsById, productsByCode] = await Promise.all([
        Product.find({ _id: { $in: productIds } }).setOptions({ includeDeleted: true }),
        Product.find({ productCode: { $in: productCodes } }).setOptions({ includeDeleted: true }),
    ]);

    const pMap = new Map();
    productsById.forEach((p) => pMap.set(p._id.toString(), p));
    productsByCode.forEach((p) => pMap.set(p.productCode, p));

    const enrichedItems = items.map((i) => {
        const p = i.productId ? pMap.get(i.productId.toString()) : pMap.get(i.productCode);
        if (!p) throw new Error(`Product ${i.productId || i.productCode} not found`);
        return {
            productId: p._id,
            productCode: p.productCode,
            productName: p.name,
            unitOfMeasure: p.unitOfMeasure,
            quantityReturned: i.quantityReturned,
            unitPrice: i.unitPrice,
            reason: i.reason,
            reasonDescription: i.reasonDescription,
            refundable: i.refundable !== false,
            restockingFeePercent: i.restockingFeePercent || 0,
            salesOrderId: i.salesOrderId,
            invoiceId: i.invoiceId,
            salesOrderLineId: i.salesOrderLineId,
        };
    });

    const ret = new CustomerReturn({
        customerId: customer._id,
        customerSnapshot: {
            name: customer.displayName,
            code: customer.customerCode,
            phone: customer.primaryContact?.phone,
        },
        salesOrderIds,
        invoiceIds,
        items: enrichedItems,
        ...rest,
        createdBy: req.user._id,
    });

    await ret.save();

    const populated = await CustomerReturn.findById(ret._id)
        .populate('customerId', 'displayName customerCode')
        .populate('items.productId', 'name productCode');

    res.status(201).json({ success: true, data: populated });
});

/**
 * GET /api/customer-returns
 */
export const getReturns = asyncHandler(async (req, res) => {
    const {
        search, customerId, status, startDate, endDate,
        page = 1, limit = 20,
    } = req.query;

    const filter = {};
    if (search) {
        filter.$or = [
            { rmaNumber: { $regex: search, $options: 'i' } },
            { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
        ];
    }
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;
    if (startDate || endDate) {
        filter.requestDate = {};
        if (startDate) filter.requestDate.$gte = new Date(startDate);
        if (endDate) filter.requestDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [returns, total] = await Promise.all([
        CustomerReturn.find(filter)
            .populate('customerId', 'displayName customerCode')
            .sort({ requestDate: -1 }).skip(skip).limit(Number(limit)),
        CustomerReturn.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: returns.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: returns,
    });
});

/**
 * GET /api/customer-returns/:id
 */
export const getReturnById = asyncHandler(async (req, res) => {
    const ret = await CustomerReturn.findById(req.params.id)
        .populate('customerId', 'displayName customerCode primaryContact')
        .populate('items.productId', 'name productCode unitOfMeasure')
        .populate('items.stockMovementId', 'movementNumber')
        .populate('salesOrderIds', 'orderNumber')
        .populate('invoiceIds', 'invoiceNumber')
        .populate('approvedBy', 'firstName lastName')
        .populate('receivedBy', 'firstName lastName')
        .populate('inspectedBy', 'firstName lastName')
        .populate('creditNoteId', 'creditNoteNumber amount')
        .populate('refundPaymentId', 'paymentNumber amount')
        .populate('createdBy', 'firstName lastName');

    if (!ret) { res.status(404); throw new Error('Return not found'); }
    res.json({ success: true, data: ret });
});

/**
 * PATCH /api/customer-returns/:id/approve
 */
export const approveReturn = asyncHandler(async (req, res) => {
    const ret = await CustomerReturn.findById(req.params.id);
    if (!ret) { res.status(404); throw new Error('Return not found'); }
    if (ret.status !== 'draft') {
        res.status(400); throw new Error(`Cannot approve return with status '${ret.status}'`);
    }

    ret.status = 'approved';
    ret.approvedBy = req.user._id;
    ret.approvedAt = new Date();
    await ret.save();

    res.json({ success: true, data: ret });
});

/**
 * PATCH /api/customer-returns/:id/reject
 */
export const rejectReturn = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const ret = await CustomerReturn.findById(req.params.id);
    if (!ret) { res.status(404); throw new Error('Return not found'); }

    ret.status = 'rejected';
    ret.rejectedBy = req.user._id;
    ret.rejectedAt = new Date();
    ret.rejectionReason = reason;
    await ret.save();

    res.json({ success: true, data: ret });
});

/**
 * PATCH /api/customer-returns/:id/receive
 * Mark goods as received (physically back in warehouse)
 */
export const receiveReturn = asyncHandler(async (req, res) => {
    const { warehouseId, receivedDate } = req.body;
    const ret = await CustomerReturn.findById(req.params.id);
    if (!ret) { res.status(404); throw new Error('Return not found'); }
    if (ret.status !== 'approved') {
        res.status(400); throw new Error('Return must be approved before receiving goods');
    }

    ret.status = 'received';
    ret.returnToWarehouseId = warehouseId;
    ret.receivedDate = receivedDate ? new Date(receivedDate) : new Date();
    ret.receivedBy = req.user._id;
    await ret.save();

    res.json({ success: true, data: ret });
});

/**
 * PATCH /api/customer-returns/:id/process
 * The big one: inspect items, assign disposition (restock / scrap / repair), update stock atomically
 */
export const processReturn = asyncHandler(async (req, res) => {
    const { items: itemUpdates = [], refundMethod } = req.body;

    const ret = await CustomerReturn.findById(req.params.id);
    if (!ret) { res.status(404); throw new Error('Return not found'); }
    if (!['received', 'inspecting'].includes(ret.status)) {
        res.status(400); throw new Error(`Return status must be 'received' to process, currently '${ret.status}'`);
    }

    const updatesMap = new Map(itemUpdates.map((u) => [u.itemId, u]));

    for (const item of ret.items) {
        const update = updatesMap.get(item._id.toString());
        if (!update) continue;

        item.condition = update.condition || item.condition;
        item.disposition = update.disposition || item.disposition;
        item.inspectionNotes = update.inspectionNotes;
        if (update.refundAmount !== undefined) item.refundAmount = +update.refundAmount;
        if (update.refundable !== undefined) item.refundable = update.refundable;

        // DISPOSITION: restock → add stock back
        if (item.disposition === 'restock' && !item.restockedAt) {
            const product = await Product.findById(item.productId).setOptions({ includeDeleted: true });
            const result = await increaseStock({
                productId: item.productId,
                warehouseId: ret.returnToWarehouseId,
                quantity: item.quantityReturned,
                costPerUnit: product?.costs?.averageCost || product?.costs?.lastPurchaseCost || item.unitPrice,
                movementType: 'sale_return',
                sourceDocument: {
                    type: 'customer_return',
                    id: ret._id,
                    number: ret.rmaNumber,
                },
                reason: `Restocked from return ${ret.rmaNumber}`,
                userId: req.user._id,
            });
            item.stockMovementId = result.movement._id;
            item.restockedAt = new Date();
            item.restockedToWarehouseId = ret.returnToWarehouseId;
        }

        // DISPOSITION: scrap → damage register
        if (item.disposition === 'scrap' && !item.damageRecordId) {
            const damage = new DamageRecord({
                productId: item.productId,
                productCode: item.productCode,
                productName: item.productName,
                quantity: item.quantityReturned,
                unitOfMeasure: item.unitOfMeasure,
                costPerUnit: item.unitPrice,
                warehouseId: ret.returnToWarehouseId,
                source: 'customer_return',
                sourceDocument: {
                    type: 'customer_return',
                    id: ret._id,
                    number: ret.rmaNumber,
                },
                description: item.inspectionNotes || `From return ${ret.rmaNumber}`,
                disposition: 'scrap',
                reportedBy: req.user._id,
                approvedBy: req.user._id,
                approvedAt: new Date(),
            });
            await damage.save();
            item.damageRecordId = damage._id;
        }

        // DISPOSITION: repair → create repair order
        if (item.disposition === 'repair' && !item.repairOrderId) {
            const repair = new RepairOrder({
                productId: item.productId,
                productCode: item.productCode,
                productName: item.productName,
                quantity: item.quantityReturned,
                sourceType: 'customer_return',
                customerReturnId: ret._id,
                issueDescription: item.inspectionNotes || item.reasonDescription || 'Returned item needs repair',
                createdBy: req.user._id,
            });
            await repair.save();
            item.repairOrderId = repair._id;
        }
    }

    ret.status = 'processed';
    ret.inspectedBy = req.user._id;
    if (refundMethod) ret.refundMethod = refundMethod;

    await ret.save();

    const populated = await CustomerReturn.findById(ret._id)
        .populate('customerId', 'displayName customerCode')
        .populate('items.productId', 'name productCode');

    res.json({ success: true, message: 'Return processed. Stock and records updated.', data: populated });
});

/**
 * PATCH /api/customer-returns/:id/issue-credit-note
 * Issue a credit note for the refund amount
 */
export const issueCreditNote = asyncHandler(async (req, res) => {
    const ret = await CustomerReturn.findById(req.params.id);
    if (!ret) { res.status(404); throw new Error('Return not found'); }
    if (ret.status !== 'processed') {
        res.status(400); throw new Error('Return must be processed first');
    }
    if (ret.creditNoteId) {
        res.status(400); throw new Error('Credit note already issued for this return');
    }

    const customer = await Customer.findById(ret.customerId);

    const creditNote = new CreditNote({
        customerId: customer._id,
        customerSnapshot: {
            name: customer.displayName,
            code: customer.customerCode,
        },
        amount: ret.netRefundAmount,
        reason: 'return',
        description: `Credit note for return ${ret.rmaNumber}`,
        customerReturnId: ret._id,
        createdBy: req.user._id,
    });
    await creditNote.save();

    ret.status = 'completed';
    ret.completedDate = new Date();
    ret.refundMethod = 'credit_note';
    ret.creditNoteId = creditNote._id;
    await ret.save();

    await updateCustomerBalance(customer._id);

    res.json({ success: true, data: { return: ret, creditNote } });
});

/**
 * PATCH /api/customer-returns/:id/complete
 * Mark complete (for cases without credit note, e.g., cash refund handled separately)
 */
export const completeReturn = asyncHandler(async (req, res) => {
    const ret = await CustomerReturn.findById(req.params.id);
    if (!ret) { res.status(404); throw new Error('Return not found'); }
    if (ret.status !== 'processed') {
        res.status(400); throw new Error('Return must be processed first');
    }
    ret.status = 'completed';
    ret.completedDate = new Date();
    await ret.save();

    res.json({ success: true, data: ret });
});

/**
 * GET /api/returns/eligible-orders?customerId=...
 * Returns the customer's orders that are eligible for return
 * (delivered/invoiced/completed AND not fully returned)
 */
export const getEligibleOrders = asyncHandler(async (req, res) => {
    const { customerId } = req.query;
    if (!customerId) {
        res.status(400); throw new Error('customerId required');
    }

    // Get customer's orders that are physically delivered
    const orders = await SalesOrder.find({
        customerId,
        status: { $in: ['delivered', 'invoiced', 'completed'] },
        deletedAt: null,
    })
        .select('orderNumber orderDate items grandTotal')
        .populate('items.productId', 'name productCode')
        .sort({ orderDate: -1 });

    // Get all returns for these orders
    const orderIds = orders.map((o) => o._id);
    const returns = await CustomerReturn.find({
        salesOrderIds: { $in: orderIds },
        status: { $nin: ['rejected', 'cancelled'] },
        deletedAt: null,
    }).select('salesOrderIds items');

    // Build a map: orderId → { (productId or productCode) → totalReturned }
    const returnedMap = new Map();
    returns.forEach((ret) => {
        const associatedOrderIds = ret.salesOrderIds && ret.salesOrderIds.length > 0
            ? ret.salesOrderIds.map(id => id.toString())
            : [];

        ret.items.forEach((ri) => {
            const itemOrderId = ri.salesOrderId
                ? ri.salesOrderId.toString()
                : (associatedOrderIds.length > 0 ? associatedOrderIds[0] : null);

            if (!itemOrderId) return;

            if (!returnedMap.has(itemOrderId)) {
                returnedMap.set(itemOrderId, new Map());
            }
            const productMap = returnedMap.get(itemOrderId);

            let pKey = ri.productCode;
            if (ri.productId) {
                pKey = ri.productId._id ? ri.productId._id.toString() : ri.productId.toString();
            }
            if (!pKey) return;

            productMap.set(pKey, (productMap.get(pKey) || 0) + (ri.quantityReturned || 0));
        });
    });

    // Filter out orders where every item has been fully returned
    const eligibleOrders = orders.filter((order) => {
        const productMap = returnedMap.get(order._id.toString()) || new Map();
        return order.items.some((item) => {
            let pKey = item.productCode;
            if (item.productId) {
                pKey = item.productId._id ? item.productId._id.toString() : item.productId.toString();
            }
            if (!pKey) return false;

            const returned = productMap.get(pKey) || 0;
            return returned < item.orderedQuantity;
        });
    });

    // For each eligible order, attach remaining-returnable quantities so the UI knows
    const enriched = eligibleOrders.map((order) => {
        const productMap = returnedMap.get(order._id.toString()) || new Map();
        const items = order.items.map((item) => {
            let pKey = item.productCode;
            if (item.productId) {
                pKey = item.productId._id ? item.productId._id.toString() : item.productId.toString();
            }

            const returned = pKey ? (productMap.get(pKey) || 0) : 0;
            return {
                ...item.toObject(),
                alreadyReturnedQuantity: returned,
                remainingReturnableQuantity: Math.max(0, item.orderedQuantity - returned),
            };
        });
        return { ...order.toObject(), items };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
});