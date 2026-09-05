import asyncHandler from 'express-async-handler';
import DamageRecord from '../models/DamageRecord.js';
import Product from '../models/Product.js';
import RepairOrder from '../models/RepairOrder.js';
import SupplierReturn from '../models/SupplierReturn.js';
import { decreaseStock } from '../services/stockService.js';

/**
 * POST /api/damages
 * Manually record damage (warehouse, transit, etc.)
 * If adjustStock=true, will also decrement physical stock
 */
export const createDamage = asyncHandler(async (req, res) => {
    const {
        productId, quantity, warehouseId, source, description,
        disposition, costPerUnit, adjustStock,
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) { res.status(404); throw new Error('Product not found'); }

    const damage = new DamageRecord({
        productId: product._id,
        productCode: product.productCode,
        productName: product.name,
        quantity,
        unitOfMeasure: product.unitOfMeasure,
        costPerUnit: costPerUnit ?? (product.costs?.averageCost || product.costs?.lastPurchaseCost || 0),
        warehouseId,
        source: source || 'warehouse_damage',
        description,
        disposition: disposition || 'pending',
        reportedBy: req.user._id,
    });
    await damage.save();

    if (adjustStock) {
        const result = await decreaseStock({
            productId: product._id,
            warehouseId,
            quantity,
            movementType: 'damage',
            sourceDocument: {
                type: 'damage_record',
                id: damage._id,
                number: damage.damageNumber,
            },
            reason: description || 'Damage recorded',
            userId: req.user._id,
            useBalanceStock: true,
        });
        damage.stockMovementId = result.movement._id;
        damage.stockAdjusted = true;
        await damage.save();
    }

    // If disposition is 'repair', create a repair order
    if (disposition === 'repair') {
        const repair = new RepairOrder({
            productId: product._id,
            productCode: product.productCode,
            productName: product.name,
            quantity,
            sourceType: 'damage',
            sourceDocument: {
                type: 'damage_record',
                id: damage._id,
                number: damage.damageNumber,
            },
            issueDescription: description || 'Damage recorded',
            status: 'pending',
            createdBy: req.user._id,
        });
        await repair.save();
        damage.repairOrderId = repair._id;
    }

    // If disposition is 'return_to_supplier', create a supplier return
    if (disposition === 'return_to_supplier') {
        const supplierReturn = new SupplierReturn({
            warehouseId,
            returnDate: new Date(),
            sourceDocument: {
                type: 'damage_record',
                id: damage._id,
                number: damage.damageNumber,
            },
            items: [{
                productId: product._id,
                productCode: product.productCode,
                productName: product.name,
                quantity,
                unitOfMeasure: product.unitOfMeasure,
                unitPrice: costPerUnit ?? (product.costs?.averageCost || product.costs?.lastPurchaseCost || 0),
                reason: 'damage',
                reasonDescription: description || 'Damage recorded',
            }],
            notes: `Created from damage record ${damage.damageNumber}`,
            createdBy: req.user._id,
        });
        await supplierReturn.save();
        damage.supplierReturnId = supplierReturn._id;
    }
    
    // Return the damage record with populated references
    const damageWithPopulate = await DamageRecord.findById(damage._id)
        .populate('productId', 'name productCode')
        .populate('warehouseId', 'name warehouseCode')
        .populate('reportedBy', 'firstName lastName')
        .populate('repairOrderId', 'repairNumber status')
        .populate('supplierReturnId', 'returnNumber status');
    
    res.status(201).json({ success: true, data: damageWithPopulate });
});

export const getDamages = asyncHandler(async (req, res) => {
    const {
        productId, warehouseId, source, disposition,
        startDate, endDate,
        page = 1, limit = 20,
    } = req.query;

    const filter = {};
    if (productId) filter.productId = productId;
    if (warehouseId) filter.warehouseId = warehouseId;
    if (source) filter.source = source;
    if (disposition) filter.disposition = disposition;
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [damages, total] = await Promise.all([
        DamageRecord.find(filter)
            .populate('productId', 'name productCode')
            .populate('warehouseId', 'name warehouseCode')
            .populate('reportedBy', 'firstName lastName')
            .populate('repairOrderId', 'repairNumber status')
            .populate('supplierReturnId', 'returnNumber status')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        DamageRecord.countDocuments(filter),
    ]);

    res.json({
        success: true, count: damages.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: damages,
    });
});

export const getDamageById = asyncHandler(async (req, res) => {
    const d = await DamageRecord.findById(req.params.id)
        .populate('productId', 'name productCode')
        .populate('warehouseId', 'name warehouseCode')
        .populate('reportedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .populate('repairOrderId', 'repairNumber status')
        .populate('supplierReturnId', 'returnNumber status');
    if (!d) { res.status(404); throw new Error('Damage record not found'); }
    res.json({ success: true, data: d });
});

/**
 * PATCH /api/damages/:id/write-off
 */
export const writeOffDamage = asyncHandler(async (req, res) => {
    const damage = await DamageRecord.findById(req.params.id);
    if (!damage) { res.status(404); throw new Error('Damage record not found'); }

    damage.writtenOff = true;
    damage.writtenOffAt = new Date();
    damage.writeOffValue = damage.totalValue;
    damage.approvedBy = req.user._id;
    damage.approvedAt = new Date();
    await damage.save();

    res.json({ success: true, data: damage });
});

/**
 * PATCH /api/damages/:id
 * Update damage record. If disposition changes to 'repair', create a repair order.
 * If disposition changes to 'return_to_supplier', create a supplier return.
 */
export const updateDamage = asyncHandler(async (req, res) => {
    const damage = await DamageRecord.findById(req.params.id).setOptions({ includeDeleted: true });
    if (!damage) { 
        res.status(404); 
        throw new Error('Damage record not found'); 
    }

    const { disposition, description, approvedBy } = req.body;
    const oldDisposition = damage.disposition;

    // Update fields
    if (disposition !== undefined) damage.disposition = disposition;
    if (description !== undefined) damage.description = description;
    if (approvedBy) {
        damage.approvedBy = approvedBy;
        damage.approvedAt = new Date();
    }

    // If disposition changed to 'repair' and no repair order exists, create one
    if (disposition === 'repair' && oldDisposition !== 'repair' && !damage.repairOrderId) {
        const repair = new RepairOrder({
            productId: damage.productId,
            productCode: damage.productCode,
            productName: damage.productName,
            quantity: damage.quantity,
            sourceType: 'damage',
            sourceDocument: {
                type: 'damage_record',
                id: damage._id,
                number: damage.damageNumber,
            },
            issueDescription: description || damage.description || 'Damage recorded',
            status: 'pending',
            createdBy: req.user._id,
        });
        await repair.save();
        damage.repairOrderId = repair._id;
    }

    // If disposition changed to 'return_to_supplier' and no supplier return exists, create one
    if (disposition === 'return_to_supplier' && oldDisposition !== 'return_to_supplier' && !damage.supplierReturnId) {
        const supplierReturn = new SupplierReturn({
            warehouseId: damage.warehouseId,
            returnDate: new Date(),
            sourceDocument: {
                type: 'damage_record',
                id: damage._id,
                number: damage.damageNumber,
            },
            items: [{
                productId: damage.productId,
                productCode: damage.productCode,
                productName: damage.productName,
                quantity: damage.quantity,
                unitOfMeasure: damage.unitOfMeasure,
                unitPrice: damage.costPerUnit,
                reason: 'damage',
                reasonDescription: description || damage.description || 'Damage recorded',
            }],
            notes: `Created from damage record ${damage.damageNumber}`,
            createdBy: req.user._id,
        });
        await supplierReturn.save();
        damage.supplierReturnId = supplierReturn._id;
    }

    await damage.save();

    const populated = await DamageRecord.findById(damage._id).setOptions({ includeDeleted: true })
        .populate('productId', 'name productCode')
        .populate('warehouseId', 'name warehouseCode')
        .populate('reportedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .populate('repairOrderId', 'repairNumber status')
        .populate('supplierReturnId', 'returnNumber status');

    res.json({ success: true, data: populated });
});

export const getDamageSummary = asyncHandler(async (req, res) => {
    const result = await DamageRecord.aggregate([
        { $match: { deletedAt: null } },
        {
            $group: {
                _id: '$source',
                count: { $sum: 1 },
                totalValue: { $sum: '$totalValue' },
            },
        },
    ]);

    const totalCount = result.reduce((s, r) => s + r.count, 0);
    const totalValue = result.reduce((s, r) => s + r.totalValue, 0);

    res.json({ success: true, data: { bySource: result, totalCount, totalValue } });
});