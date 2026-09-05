import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import ProductionOrder from '../models/ProductionOrder.js';
import BillOfMaterials from '../models/BillOfMaterials.js';
import Product from '../models/Product.js';
import StockItem from '../models/StockItem.js';
import {
    increaseStock, decreaseStock,
} from '../services/stockService.js';

/**
 * POST /api/production-orders
 * Create a production order from a BOM
 */
export const createProductionOrder = asyncHandler(async (req, res) => {
    const {
        bomId, plannedQuantity, sourceWarehouseId, outputWarehouseId,
        plannedStartDate, plannedEndDate, priority, sourceType,
        sourceSalesOrderId, notes, internalNotes, referenceLink,
    } = req.body;

    const bom = await BillOfMaterials.findById(bomId)
        .populate('components.productId', 'productCode name unitOfMeasure costs')
        .populate('finishedProductId', 'productCode name unitOfMeasure');

    if (!bom) { res.status(404); throw new Error('BOM not found'); }
    if (bom.status !== 'active') { res.status(400); throw new Error('BOM is not active'); }

    const batchMultiplier = plannedQuantity / bom.outputQuantity;

    // Build consumption plan
    const consumption = bom.components.map((c) => {
        const effectiveQty = c.quantity * batchMultiplier * (1 + (c.wastagePercent || 0) / 100);
        return {
            productId: c.productId._id,
            productCode: c.productCode,
            productName: c.productName,
            componentType: c.componentType,
            plannedQuantity: +effectiveQty.toFixed(4),
            unitOfMeasure: c.unitOfMeasure,
            warehouseId: sourceWarehouseId,
            standardCost: c.standardCost || 0,
        };
    });

    // Build labor plan
    const labor = bom.labor.map((l) => ({
        laborType: l.laborType,
        description: l.description,
        plannedHours: (l.hours || 0) * batchMultiplier,
        hourlyRate: l.hourlyRate || 0,
    }));

    // Build output plan
    const output = [{
        productId: bom.finishedProductId._id,
        productCode: bom.finishedProductCode,
        productName: bom.finishedProductName,
        plannedQuantity,
        unitOfMeasure: bom.outputUnitOfMeasure,
        warehouseId: outputWarehouseId,
    }];

    const po = new ProductionOrder({
        bomId: bom._id,
        bomCode: bom.bomCode,
        bomName: bom.name,
        finishedProductId: bom.finishedProductId._id,
        finishedProductName: bom.finishedProductName,
        finishedProductCode: bom.finishedProductCode,
        plannedQuantity,
        batchMultiplier,
        sourceWarehouseId,
        outputWarehouseId,
        plannedStartDate,
        plannedEndDate,
        priority: priority || 'normal',
        sourceType: sourceType || 'manual',
        sourceSalesOrderId,
        consumption,
        labor,
        output,
        notes,
        internalNotes,
        referenceLink,
        status: 'draft',
        createdBy: req.user._id,
    });

    await po.save();

    const populated = await ProductionOrder.findById(po._id)
        .populate('bomId', 'name bomCode')
        .populate('finishedProductId', 'name productCode')
        .populate('sourceWarehouseId', 'name warehouseCode')
        .populate('outputWarehouseId', 'name warehouseCode')
        .populate('consumption.productId', 'name productCode');

    res.status(201).json({ success: true, data: populated });
});

/**
 * GET /api/production-orders
 */
export const getProductionOrders = asyncHandler(async (req, res) => {
    const {
        search, status, bomId, finishedProductId, priority,
        startDate, endDate,
        page = 1, limit = 20,
    } = req.query;

    const filter = {};
    if (search) {
        filter.$or = [
            { productionNumber: { $regex: search, $options: 'i' } },
            { finishedProductName: { $regex: search, $options: 'i' } },
            { bomCode: { $regex: search, $options: 'i' } },
        ];
    }
    if (status) filter.status = status;
    if (bomId) filter.bomId = bomId;
    if (finishedProductId) filter.finishedProductId = finishedProductId;
    if (priority) filter.priority = priority;
    if (startDate || endDate) {
        filter.plannedStartDate = {};
        if (startDate) filter.plannedStartDate.$gte = new Date(startDate);
        if (endDate) filter.plannedStartDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
        ProductionOrder.find(filter)
            .populate('bomId', 'name bomCode')
            .populate('finishedProductId', 'name productCode')
            .populate('sourceWarehouseId', 'name warehouseCode')
            .populate('outputWarehouseId', 'name warehouseCode')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        ProductionOrder.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: orders.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: orders,
    });
});

/**
 * GET /api/production-orders/:id
 */
export const getProductionOrderById = asyncHandler(async (req, res) => {
    const po = await ProductionOrder.findById(req.params.id)
        .populate('bomId', 'name bomCode version outputQuantity')
        .populate('finishedProductId', 'name productCode unitOfMeasure')
        .populate('sourceWarehouseId', 'name warehouseCode')
        .populate('outputWarehouseId', 'name warehouseCode')
        .populate('consumption.productId', 'name productCode unitOfMeasure')
        .populate('consumption.stockMovementId', 'movementNumber')
        .populate('output.productId', 'name productCode unitOfMeasure')
        .populate('output.stockMovementId', 'movementNumber')
        .populate('approvedBy', 'firstName lastName')
        .populate('startedBy', 'firstName lastName')
        .populate('completedBy', 'firstName lastName')
        .populate('cancelledBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName');

    if (!po) { res.status(404); throw new Error('Production order not found'); }
    res.json({ success: true, data: po });
});

/**
 * PATCH /api/production-orders/:id/approve
 */
export const approveProductionOrder = asyncHandler(async (req, res) => {
    const po = await ProductionOrder.findById(req.params.id);
    if (!po) { res.status(404); throw new Error('Production order not found'); }
    if (po.status !== 'draft') {
        res.status(400); throw new Error(`Cannot approve order with status '${po.status}'`);
    }

    po.status = 'planned';
    po.approvedBy = req.user._id;
    po.approvedAt = new Date();
    po.updatedBy = req.user._id;
    await po.save();

    res.json({ success: true, data: po });
});

/**
 * PATCH /api/production-orders/:id/start
 * Start production — validates that materials are available (but doesn't consume yet)
 */
export const startProductionOrder = asyncHandler(async (req, res) => {
    const po = await ProductionOrder.findById(req.params.id);
    if (!po) { res.status(404); throw new Error('Production order not found'); }
    if (!['planned', 'materials_reserved', 'on_hold'].includes(po.status)) {
        res.status(400); throw new Error(`Cannot start order with status '${po.status}'`);
    }

    // Check material availability at source warehouse
    for (const c of po.consumption) {
        const stockItem = await StockItem.findOne({
            productId: c.productId,
            warehouseId: c.warehouseId || po.sourceWarehouseId,
            batchNumber: null,
        });
        const available = stockItem ? (stockItem.quantities.onHand - stockItem.quantities.reserved) : 0;
        if (available < c.plannedQuantity) {
            res.status(400);
            throw new Error(`Insufficient ${c.productName}: need ${c.plannedQuantity}, available ${available}`);
        }
    }

    po.status = 'in_progress';
    po.actualStartDate = new Date();
    po.startedBy = req.user._id;
    po.updatedBy = req.user._id;
    await po.save();

    res.json({ success: true, data: po });
});

/**
 * PATCH /api/production-orders/:id/complete
 * Complete production — atomically:
 *   1. Consume raw materials (stock out)
 *   2. Create finished goods (stock in)
 *   3. Record labor costs
 *   4. Update status
 */
export const completeProductionOrder = asyncHandler(async (req, res) => {
    const {
        actualConsumption = [], actualLabor = [], output = [],
        overheadCost = 0, notes,
    } = req.body;

    const po = await ProductionOrder.findById(req.params.id);
    if (!po) { res.status(404); throw new Error('Production order not found'); }
    if (!['in_progress', 'on_hold'].includes(po.status)) {
        res.status(400); throw new Error(`Cannot complete order with status '${po.status}'`);
    }

    // 1. Update consumption with actuals and decrease raw material stock
    const consumptionMap = new Map(actualConsumption.map((ac) => [ac.consumptionItemId, ac]));

    for (const c of po.consumption) {
        const actual = consumptionMap.get(c._id.toString()) || { actualQuantity: c.plannedQuantity };
        const qtyToConsume = Number(actual.actualQuantity) || 0;

        if (qtyToConsume > 0) {
            const result = await decreaseStock({
                productId: c.productId,
                warehouseId: c.warehouseId || po.sourceWarehouseId,
                quantity: qtyToConsume,
                movementType: 'production_consume',
                sourceDocument: {
                    type: 'production_order',
                    id: po._id,
                    number: po.productionNumber,
                },
                reason: `Material consumed for ${po.productionNumber}`,
                notes: actual.notes,
                userId: req.user._id,
            });
            c.actualQuantity = qtyToConsume;
            c.actualCost = +(qtyToConsume * result.stockItem.costPerUnit).toFixed(2);
            c.stockMovementId = result.movement._id;
            c.consumedAt = new Date();
        }
    }

    // 2. Update labor
    const laborMap = new Map();
    po.labor.forEach((l) => laborMap.set(l._id.toString(), l));

    for (const al of actualLabor) {
        if (al.laborLogId) {
            // Update existing labor log
            const l = laborMap.get(al.laborLogId);
            if (l) {
                l.actualHours = Number(al.actualHours) || 0;
                l.actualCost = +(l.actualHours * (al.hourlyRate ?? l.hourlyRate ?? 0)).toFixed(2);
                if (al.hourlyRate !== undefined) l.hourlyRate = Number(al.hourlyRate);
                if (al.workerId) l.workerId = al.workerId;
            }
        } else {
            // New labor entry
            po.labor.push({
                laborType: al.laborType || 'general',
                description: al.description,
                plannedHours: 0,
                actualHours: Number(al.actualHours) || 0,
                hourlyRate: Number(al.hourlyRate) || 0,
                actualCost: +((Number(al.actualHours) || 0) * (Number(al.hourlyRate) || 0)).toFixed(2),
                workerId: al.workerId,
            });
        }
    }

    // 3. Calculate total actual cost BEFORE creating output
    const actualMaterialCost = po.consumption.reduce((s, c) => s + (c.actualCost || 0), 0);
    const actualLaborCost = po.labor.reduce((s, l) => s + (l.actualCost || 0), 0);
    const totalActualCost = actualMaterialCost + actualLaborCost + (overheadCost || 0);

    // 4. Update output with actuals and increase finished goods stock
    let totalProduced = 0;
    const outputMap = new Map();
    po.output.forEach((o, idx) => outputMap.set(idx, o));

    for (let i = 0; i < output.length; i++) {
        const outItem = output[i];
        const poOutput = po.output[i] || po.output[0];

        const actualQty = Number(outItem.actualQuantity) || 0;
        const damagedQty = Number(outItem.damagedQuantity) || 0;
        const rejectedQty = Number(outItem.rejectedQuantity) || 0;

        totalProduced += actualQty;

        poOutput.actualQuantity = actualQty;
        poOutput.damagedQuantity = damagedQty;
        poOutput.rejectedQuantity = rejectedQty;
        poOutput.qcStatus = outItem.qcStatus || 'passed';
        poOutput.batchNumber = outItem.batchNumber;
        poOutput.manufactureDate = outItem.manufactureDate ? new Date(outItem.manufactureDate) : new Date();
        poOutput.expiryDate = outItem.expiryDate ? new Date(outItem.expiryDate) : undefined;
        poOutput.producedAt = new Date();

        // Cost per unit = total cost / total good output
        const costPerUnit = totalProduced > 0 ? totalActualCost / totalProduced : 0;
        poOutput.costPerUnit = +costPerUnit.toFixed(2);

        if (actualQty > 0) {
            const result = await increaseStock({
                productId: poOutput.productId,
                warehouseId: poOutput.warehouseId || po.outputWarehouseId,
                quantity: actualQty,
                costPerUnit: +costPerUnit.toFixed(2),
                movementType: 'production_output',
                batchNumber: outItem.batchNumber || null,
                sourceDocument: {
                    type: 'production_order',
                    id: po._id,
                    number: po.productionNumber,
                },
                reason: `Produced via ${po.productionNumber}`,
                notes: outItem.notes,
                userId: req.user._id,
            });
            poOutput.stockMovementId = result.movement._id;
        }

        // Damaged goods → separate movement to 'scrap' (optional, just audit)
        if (damagedQty > 0) {
            // We don't have a scrap warehouse yet — just log as a damage movement
            const StockMovement = (await import('../models/StockMovement.js')).default;
            const Product = (await import('../models/Product.js')).default;
            const product = await Product.findById(poOutput.productId);
            const damageMovement = new StockMovement({
                productId: poOutput.productId,
                productCode: product?.productCode,
                productName: product?.name,
                movementType: 'production_scrap',
                direction: 'out',
                quantity: damagedQty,
                unitOfMeasure: poOutput.unitOfMeasure,
                warehouseId: poOutput.warehouseId || po.outputWarehouseId,
                sourceDocument: {
                    type: 'production_order',
                    id: po._id,
                    number: po.productionNumber,
                },
                reason: 'Damaged during production',
                performedBy: req.user._id,
                balanceBefore: 0,
                balanceAfter: 0,
            });
            await damageMovement.save();
        }
    }

    po.overheadCost = overheadCost;
    po.status = totalProduced >= po.plannedQuantity ? 'completed' : 'partially_completed';
    po.actualEndDate = new Date();
    po.completedBy = req.user._id;
    po.updatedBy = req.user._id;
    if (notes) po.notes = po.notes ? `${po.notes}\n---\n${notes}` : notes;

    await po.save();

    const populated = await ProductionOrder.findById(po._id)
        .populate('bomId', 'name bomCode')
        .populate('finishedProductId', 'name productCode')
        .populate('sourceWarehouseId', 'name warehouseCode')
        .populate('outputWarehouseId', 'name warehouseCode')
        .populate('consumption.productId', 'name productCode')
        .populate('output.productId', 'name productCode');

    res.json({
        success: true,
        message: `Production ${po.status === 'completed' ? 'completed' : 'partially completed'}. Stock updated.`,
        data: populated,
    });
});

/**
 * PATCH /api/production-orders/:id/cancel
 */
export const cancelProductionOrder = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const po = await ProductionOrder.findById(req.params.id);
    if (!po) { res.status(404); throw new Error('Production order not found'); }
    if (!['draft', 'planned', 'materials_reserved', 'in_progress', 'on_hold'].includes(po.status)) {
        res.status(400); throw new Error(`Cannot cancel order with status '${po.status}'`);
    }

    po.status = 'cancelled';
    po.cancelledBy = req.user._id;
    po.cancelledAt = new Date();
    po.cancellationReason = reason;
    po.updatedBy = req.user._id;
    await po.save();

    res.json({ success: true, data: po });
});

/**
 * PATCH /api/production-orders/:id/hold
 */
export const holdProductionOrder = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const po = await ProductionOrder.findById(req.params.id);
    if (!po) { res.status(404); throw new Error('Production order not found'); }
    if (!['planned', 'in_progress', 'materials_reserved'].includes(po.status)) {
        res.status(400); throw new Error(`Cannot hold order with status '${po.status}'`);
    }

    po.status = 'on_hold';
    if (reason) po.internalNotes = po.internalNotes ? `${po.internalNotes}\nHOLD: ${reason}` : `HOLD: ${reason}`;
    po.updatedBy = req.user._id;
    await po.save();

    res.json({ success: true, data: po });
});

/**
 * DELETE /api/production-orders/:id (draft only)
 */
export const deleteProductionOrder = asyncHandler(async (req, res) => {
    const po = await ProductionOrder.findById(req.params.id);
    if (!po) { res.status(404); throw new Error('Production order not found'); }
    if (po.status !== 'draft') {
        res.status(400); throw new Error('Only draft orders can be deleted');
    }
    po.deletedAt = new Date();
    await po.save();
    res.json({ success: true, message: 'Draft production order deleted' });
});