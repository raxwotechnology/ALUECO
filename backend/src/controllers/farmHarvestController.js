import asyncHandler from 'express-async-handler';
import FarmHarvest from '../models/FarmHarvest.js';
import Farm from '../models/Farm.js';
import Product from '../models/Product.js';
import { increaseStock } from '../services/stockService.js';
import { generateJulianBatchCode } from '../utils/julianDate.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { getIO } from '../services/socketService.js';
import mongoose from 'mongoose';

const autoGenerateBillFromHarvest = async (harvest, farm, userId, session) => {
    const billItems = harvest.items.map(item => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: item.unitPrice,
        taxRate: 0,
        taxable: false,
    }));

    if (billItems.length === 0) return;

    const Bill = (await import('../models/Bill.js')).default;

    const bill = new Bill({
        supplierInvoiceNumber: harvest.harvestNumber,
        supplierId: null,
        supplierSnapshot: {
            name: farm.name || 'Own Farm',
            code: farm.farmCode || 'FRM',
        },
        grnNumbers: [harvest.harvestNumber],
        billDate: harvest.harvestDate || new Date(),
        dueDate: harvest.harvestDate || new Date(),
        paymentTerms: {
            type: 'cash',
            creditDays: 0,
        },
        items: billItems,
        amountPaid: harvest.totalValue || 0,
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        createdBy: userId,
    });

    await bill.save({ session });
};

export const createFarmHarvest = asyncHandler(async (req, res) => {
    const { farmId, warehouseId, harvestDate, items, notes, status } = req.body;

    const farm = await Farm.findById(farmId);
    if (!farm) {
        res.status(404);
        throw new Error('Farm not found');
    }

    const harvestItems = [];
    for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) {
            res.status(404);
            throw new Error(`Product ${item.productId} not found`);
        }
        
        harvestItems.push({
            productId: item.productId,
            productCode: product.productCode,
            productName: product.name,
            quantity: Number(item.quantity) || 0,
            unitOfMeasure: product.unitOfMeasure,
            unitPrice: Number(item.unitPrice) || product.basePrice || 0,
            batchNumber: item.batchNumber || null
        });
    }

    const harvest = new FarmHarvest({
        farmId,
        farmName: farm.name,
        warehouseId,
        harvestDate: harvestDate || new Date(),
        items: harvestItems,
        notes,
        status: status || 'draft',
        createdBy: req.user._id
    });

    if (harvest.status === 'approved') {
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                await harvest.save({ session });
                for (const item of harvest.items) {
                    const farmCode = farm.farmCode || 'FRM';
                    const batchCode = generateJulianBatchCode(farmCode, harvest.harvestDate);
                    item.batchNumber = item.batchNumber || batchCode;

                    const result = await increaseStock({
                        productId: item.productId,
                        warehouseId: harvest.warehouseId,
                        quantity: item.quantity,
                        costPerUnit: item.unitPrice,
                        movementType: 'farm_harvest',
                        batchNumber: item.batchNumber,
                        sourceDocument: {
                            type: 'farm_harvest',
                            id: harvest._id,
                            number: harvest.harvestNumber,
                        },
                        reason: `Farm harvest intake from: ${farm.name}`,
                        userId: req.user._id,
                        session,
                    });
                    item.stockMovementId = result.movement._id;
                }
                await harvest.save({ session });
                await autoGenerateBillFromHarvest(harvest, farm, req.user._id, session);
            });
        } catch (err) {
            res.status(400);
            throw new Error(err.message || 'Harvest intake failed');
        } finally {
            session.endSession();
        }
    } else {
        await harvest.save();
    }

    // Broadcast stock updates
    try {
        const io = getIO();
        io.emit('stock_update', { message: `Farm harvest ${harvest.harvestNumber} recorded.` });
    } catch (err) {}

    res.status(201).json({ success: true, data: harvest });
});

export const getFarmHarvests = asyncHandler(async (req, res) => {
    const { farmId, warehouseId, status } = req.query;
    const filter = {};
    if (farmId) filter.farmId = farmId;
    if (warehouseId) filter.warehouseId = warehouseId;
    if (status) filter.status = status;

    const harvests = await FarmHarvest.find(filter)
        .populate('farmId', 'name farmCode')
        .populate('warehouseId', 'name warehouseCode')
        .populate('items.productId', 'name productCode')
        .sort({ harvestDate: -1 });

    res.json({ success: true, count: harvests.length, data: harvests });
});

export const approveFarmHarvest = asyncHandler(async (req, res) => {
    const harvest = await FarmHarvest.findById(req.params.id);
    if (!harvest) {
        res.status(404);
        throw new Error('Harvest not found');
    }
    if (harvest.status !== 'draft') {
        res.status(400);
        throw new Error('Harvest is already approved or completed');
    }

    const farm = await Farm.findById(harvest.farmId);
    if (!farm) {
        res.status(404);
        throw new Error('Farm not found');
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            for (const item of harvest.items) {
                const farmCode = farm.farmCode || 'FRM';
                const batchCode = generateJulianBatchCode(farmCode, harvest.harvestDate);
                item.batchNumber = item.batchNumber || batchCode;

                const result = await increaseStock({
                    productId: item.productId,
                    warehouseId: harvest.warehouseId,
                    quantity: item.quantity,
                    costPerUnit: item.unitPrice,
                    movementType: 'farm_harvest',
                    batchNumber: item.batchNumber,
                    sourceDocument: {
                        type: 'farm_harvest',
                        id: harvest._id,
                        number: harvest.harvestNumber,
                    },
                    reason: `Farm harvest intake from: ${farm.name}`,
                    userId: req.user._id,
                    session,
                });
                item.stockMovementId = result.movement._id;
            }
            harvest.status = 'approved';
            await harvest.save({ session });
            await autoGenerateBillFromHarvest(harvest, farm, req.user._id, session);
        });

        // Broadcast stock update
        try {
            const io = getIO();
            io.emit('stock_update', { message: `Farm harvest ${harvest.harvestNumber} approved.` });
        } catch (err) {}

        res.json({ success: true, message: 'Harvest approved, stock updated', data: harvest });
    } catch (err) {
        res.status(400);
        throw new Error(err.message || 'QA approval failed');
    } finally {
        session.endSession();
    }
});
