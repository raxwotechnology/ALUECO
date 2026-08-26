import asyncHandler from 'express-async-handler';
import AluPurchaseOrder from '../models/AluPurchaseOrder.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * Get all AluEco Purchase Orders / Shortages
 */
export const getAluPurchaseOrders = asyncHandler(async (req, res) => {
    const { status, search, sourceType, priority, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
        filter.status = status;
    }
    if (sourceType && sourceType !== 'all') {
        filter.sourceType = sourceType;
    }
    if (priority && priority !== 'all') {
        filter.priority = priority;
    }
    if (search) {
        filter.$or = [
            { poNumber: { $regex: search, $options: 'i' } },
            { projectName: { $regex: search, $options: 'i' } },
            { customerName: { $regex: search, $options: 'i' } },
            { 'items.itemCode': { $regex: search, $options: 'i' } },
            { 'items.productName': { $regex: search, $options: 'i' } },
        ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
        AluPurchaseOrder.find(filter)
            .populate('quotationId', 'quoteNumber projectName totalAmount')
            .populate('salesOrderId', 'orderNumber grandTotal status')
            .populate('items.supplierId', 'displayName companyName')
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        AluPurchaseOrder.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: orders,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
});

/**
 * Get single AluEco PO by ID
 */
export const getAluPurchaseOrderById = asyncHandler(async (req, res) => {
    const order = await AluPurchaseOrder.findById(req.params.id)
        .populate('quotationId', 'quoteNumber projectName')
        .populate('salesOrderId', 'orderNumber grandTotal')
        .populate('items.productId', 'name productCode basePrice')
        .populate('items.supplierId', 'displayName companyName phone email')
        .populate('createdBy', 'firstName lastName');

    if (!order) {
        res.status(404);
        throw new Error('AluEco Purchase Order not found');
    }

    res.json({ success: true, data: order });
});

/**
 * Create Manual AluEco PO
 */
export const createAluPurchaseOrder = asyncHandler(async (req, res) => {
    const { items = [], projectName, customerName, priority, expectedDate, notes } = req.body;

    if (!items || items.length === 0) {
        res.status(400);
        throw new Error('At least one material item is required');
    }

    // Validate 15-char item code limit & uppercase
    for (const item of items) {
        if (!item.itemCode) {
            res.status(400);
            throw new Error('Item Code is required for all material entries');
        }
        item.itemCode = item.itemCode.trim().toUpperCase();
        if (item.itemCode.length > 15) {
            res.status(400);
            throw new Error(`Item Code "${item.itemCode}" exceeds maximum allowed length of 15 characters`);
        }
        item.requiredQuantity = Number(item.requiredQuantity) || 0;
        item.receivedQuantity = Number(item.receivedQuantity) || 0;
        item.pendingQuantity = Math.max(0, item.requiredQuantity - item.receivedQuantity);
    }

    const order = await AluPurchaseOrder.create({
        sourceType: 'manual_entry',
        projectName: projectName || 'General Aluminium Stock Requisition',
        customerName: customerName || '',
        items,
        priority: priority || 'normal',
        expectedDate: expectedDate || null,
        notes: notes || '',
        status: 'pending',
        createdBy: req.user._id,
    });

    await createAuditLog({
        action: 'CREATE',
        module: 'Purchasing',
        documentId: order._id,
        documentCode: order.poNumber,
        description: `Created manual AluEco PO ${order.poNumber} with ${items.length} items`,
        req
    });

    res.status(201).json({ success: true, data: order });
});

/**
 * Update AluEco PO
 */
export const updateAluPurchaseOrder = asyncHandler(async (req, res) => {
    const order = await AluPurchaseOrder.findById(req.params.id);
    if (!order) {
        res.status(404);
        throw new Error('AluEco Purchase Order not found');
    }

    const { items, projectName, customerName, priority, expectedDate, notes, status } = req.body;

    if (projectName !== undefined) order.projectName = projectName;
    if (customerName !== undefined) order.customerName = customerName;
    if (priority !== undefined) order.priority = priority;
    if (expectedDate !== undefined) order.expectedDate = expectedDate;
    if (notes !== undefined) order.notes = notes;
    if (status !== undefined) order.status = status;

    if (items && Array.isArray(items)) {
        for (const item of items) {
            if (item.itemCode) {
                item.itemCode = item.itemCode.trim().toUpperCase();
                if (item.itemCode.length > 15) {
                    res.status(400);
                    throw new Error(`Item Code "${item.itemCode}" exceeds maximum allowed length of 15 characters`);
                }
            }
        }
        order.items = items;
    }

    order.updatedBy = req.user._id;
    await order.save();

    res.json({ success: true, data: order });
});

/**
 * Add a single item to an existing or new general AluEco PO
 */
export const addManualItemToAluPO = asyncHandler(async (req, res) => {
    let { itemCode, materialType, productName, requiredQuantity, unitOfMeasure, estimatedUnitCost, supplierId, notes, poId } = req.body;

    if (!itemCode || !productName || !requiredQuantity) {
        res.status(400);
        throw new Error('Item Code, Product Name and Required Quantity are required');
    }

    itemCode = itemCode.trim().toUpperCase();
    if (itemCode.length > 15) {
        res.status(400);
        throw new Error(`Item Code "${itemCode}" exceeds maximum allowed length of 15 characters`);
    }

    let order;
    if (poId) {
        order = await AluPurchaseOrder.findById(poId);
        if (!order) {
            res.status(404);
            throw new Error('Specified AluEco PO not found');
        }
    } else {
        // Find latest open manual PO or create a new one
        order = await AluPurchaseOrder.findOne({ sourceType: 'manual_entry', status: { $in: ['pending', 'partially_received'] } }).sort({ createdAt: -1 });
        if (!order) {
            order = new AluPurchaseOrder({
                sourceType: 'manual_entry',
                projectName: 'Manual Material Requisitions',
                status: 'pending',
                createdBy: req.user._id,
                items: []
            });
        }
    }

    const qty = Number(requiredQuantity) || 0;
    const cost = Number(estimatedUnitCost) || 0;

    order.items.push({
        itemCode,
        materialType: materialType || 'raw_material',
        productName: productName.trim(),
        requiredQuantity: qty,
        receivedQuantity: 0,
        pendingQuantity: qty,
        unitOfMeasure: unitOfMeasure || 'pcs',
        estimatedUnitCost: cost,
        estimatedTotalCost: +(qty * cost).toFixed(2),
        supplierId: supplierId || null,
        status: 'pending',
        notes: notes || '',
    });

    order.updatedBy = req.user._id;
    await order.save();

    res.status(201).json({ success: true, message: 'Item added to AluEco PO successfully', data: order });
});

/**
 * Delete / Cancel AluEco PO
 */
export const deleteAluPurchaseOrder = asyncHandler(async (req, res) => {
    const order = await AluPurchaseOrder.findById(req.params.id);
    if (!order) {
        res.status(404);
        throw new Error('AluEco Purchase Order not found');
    }

    order.status = 'cancelled';
    order.deletedAt = new Date();
    await order.save();

    res.json({ success: true, message: 'AluEco Purchase Order cancelled successfully' });
});

/**
 * Summary Statistics for AluEco PO Dashboard
 */
export const getAluPOSummaryStats = asyncHandler(async (req, res) => {
    const orders = await AluPurchaseOrder.find({ status: { $ne: 'cancelled' } });

    let totalPendingOrders = 0;
    let totalPartiallyReceived = 0;
    let totalFulfilled = 0;
    let totalPendingItemCount = 0;
    let totalShortageValue = 0;

    orders.forEach(order => {
        if (order.status === 'pending') totalPendingOrders++;
        else if (order.status === 'partially_received') totalPartiallyReceived++;
        else if (order.status === 'fulfilled') totalFulfilled++;

        order.items.forEach(item => {
            if (item.status === 'pending' || item.status === 'partially_received') {
                totalPendingItemCount += item.pendingQuantity || 0;
                totalShortageValue += (item.pendingQuantity || 0) * (item.estimatedUnitCost || 0);
            }
        });
    });

    res.json({
        success: true,
        data: {
            totalOrders: orders.length,
            totalPendingOrders,
            totalPartiallyReceived,
            totalFulfilled,
            totalPendingItemCount: +totalPendingItemCount.toFixed(2),
            totalShortageValue: +totalShortageValue.toFixed(2)
        }
    });
});
