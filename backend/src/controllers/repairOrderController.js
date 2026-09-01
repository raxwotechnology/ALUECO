import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import RepairOrder from '../models/RepairOrder.js';
import Product from '../models/Product.js';
import { increaseStock } from '../services/stockService.js';

export const createRepair = asyncHandler(async (req, res) => {
    const { productId, quantity, sourceDocument, ...rest } = req.body;
    const product = await Product.findById(productId);
    if (!product) { res.status(404); throw new Error('Product not found'); }

    const repair = new RepairOrder({
        productId: product._id,
        productCode: product.productCode,
        productName: product.name,
        quantity,
        sourceType: rest.sourceType || 'manual',
        sourceDocument: sourceDocument || null,
        createdBy: req.user._id,
        ...rest,
    });
    await repair.save();

    res.status(201).json({ success: true, data: repair });
});

export const getRepairs = asyncHandler(async (req, res) => {
    const { status, productId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (productId) filter.productId = productId;

    const skip = (Number(page) - 1) * Number(limit);

    const [repairs, total] = await Promise.all([
        RepairOrder.find(filter)
            .populate('productId', 'name productCode')
            .populate('assignedTechnicianId', 'firstName lastName')
            .populate('customerReturnId', 'rmaNumber')
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        RepairOrder.countDocuments(filter),
    ]);

    res.json({
        success: true, count: repairs.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: repairs,
    });
});

export const getRepairById = asyncHandler(async (req, res) => {
    const r = await RepairOrder.findById(req.params.id)
        .populate('productId', 'name productCode')
        .populate('assignedTechnicianId', 'firstName lastName')
        .populate('customerReturnId', 'rmaNumber')
        .populate('returnedToWarehouseId', 'name warehouseCode')
        .populate('createdBy', 'firstName lastName');
    if (!r) { res.status(404); throw new Error('Repair order not found'); }
    res.json({ success: true, data: r });
});

export const updateRepair = asyncHandler(async (req, res) => {
    const r = await RepairOrder.findById(req.params.id);
    if (!r) { res.status(404); throw new Error('Repair order not found'); }
    if (r.status === 'completed_fixed' || r.status === 'completed_unfixable') {
        res.status(400); throw new Error('Cannot edit completed repairs');
    }
    Object.assign(r, req.body);
    await r.save();
    res.json({ success: true, data: r });
});

/**
 * PATCH /api/repairs/:id/complete
 * Complete repair. If fixable and disposition is return_to_stock, add stock back.
 */
export const completeRepair = asyncHandler(async (req, res) => {
    const {
        outcome, // 'fixed' | 'unfixable'
        disposition,
        actualLaborHours, actualLaborCost, actualPartsCost,
        returnedToWarehouseId,
        notes,
    } = req.body;

    const repair = await RepairOrder.findById(req.params.id);
    if (!repair) { res.status(404); throw new Error('Repair order not found'); }
    if (!['in_progress', 'awaiting_parts', 'pending'].includes(repair.status)) {
        res.status(400); throw new Error('Repair not in progress');
    }

    repair.actualLaborHours = actualLaborHours || 0;
    repair.actualLaborCost = actualLaborCost || 0;
    repair.actualPartsCost = actualPartsCost || 0;
    repair.completedAt = new Date();
    repair.disposition = disposition || 'pending';
    repair.notes = notes || repair.notes;

    if (outcome === 'fixed') {
        repair.status = 'completed_fixed';

        if (disposition === 'return_to_stock' && returnedToWarehouseId) {
            const product = await Product.findById(repair.productId);
            const result = await increaseStock({
                productId: repair.productId,
                warehouseId: returnedToWarehouseId,
                quantity: repair.quantity,
                costPerUnit: product?.costs?.averageCost || 0,
                movementType: 'repair_in',
                sourceDocument: {
                    type: 'repair_order',
                    id: repair._id,
                    number: repair.repairNumber,
                },
                reason: `Repaired and restocked from ${repair.repairNumber}`,
                userId: req.user._id,
            });
            repair.stockMovementId = result.movement._id;
            repair.returnedToWarehouseId = returnedToWarehouseId;
        }
    } else {
        repair.status = 'completed_unfixable';
    }

    await repair.save();

    res.json({ success: true, data: repair });
});

export const startRepair = asyncHandler(async (req, res) => {
    const r = await RepairOrder.findById(req.params.id);
    if (!r) { res.status(404); throw new Error('Repair not found'); }
    if (r.status !== 'pending') {
        res.status(400); throw new Error(`Cannot start repair with status '${r.status}'`);
    }
    r.status = 'in_progress';
    r.startedAt = new Date();
    r.assignedTechnicianId = req.body.assignedTechnicianId || req.user._id;
    await r.save();
    res.json({ success: true, data: r });
});