import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import StockItem from '../models/StockItem.js';
import StockMovement from '../models/StockMovement.js';
import StockReservation from '../models/StockReservation.js';
import {
    increaseStock, decreaseStock,
} from '../services/stockService.js';
import { generateJulianBatchCode } from '../utils/julianDate.js';

/**
 * GET /api/stock
 * List stock items with filters
 */
export const getStockItems = asyncHandler(async (req, res) => {
    const {
        search, productId, warehouseId, lowStock,
        page = 1, limit = 50,
    } = req.query;

    const filter = {};
    if (productId) filter.productId = productId;
    if (warehouseId) filter.warehouseId = warehouseId;
    if (search) {
        filter.$or = [
            { productCode: { $regex: search, $options: 'i' } },
            { productName: { $regex: search, $options: 'i' } },
        ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    let items = await StockItem.find(filter)
        .populate('productId', 'name productCode sku stockLevels type')
        .populate('warehouseId', 'name warehouseCode')
        .sort({ productName: 1 })
        .skip(skip)
        .limit(Number(limit));

    // Filter low-stock in-memory (depends on product's reorderLevel)
    if (lowStock === 'true') {
        items = items.filter((s) => {
            const reorder = s.productId?.stockLevels?.reorderLevel || 0;
            return s.quantities.onHand <= reorder && reorder > 0;
        });
    }

    const total = await StockItem.countDocuments(filter);

    res.json({
        success: true,
        count: items.length,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        data: items,
    });
});

/**
 * GET /api/stock/by-product/:productId
 * Get stock for a product across all warehouses
 */
export const getStockByProduct = asyncHandler(async (req, res) => {
    const items = await StockItem.find({ productId: req.params.productId })
        .populate('warehouseId', 'name warehouseCode type');

    const totalOnHand = items.reduce((s, i) => s + i.quantities.onHand, 0);
    const totalReserved = items.reduce((s, i) => s + i.quantities.reserved, 0);
    const totalAvailable = totalOnHand - totalReserved;

    res.json({
        success: true,
        data: {
            items,
            totals: { onHand: totalOnHand, reserved: totalReserved, available: totalAvailable },
        },
    });
});

/**
 * GET /api/stock/movements
 * List movements (audit trail)
 */
export const getStockMovements = asyncHandler(async (req, res) => {
    const {
        productId, warehouseId, movementType,
        startDate, endDate,
        page = 1, limit = 50,
    } = req.query;

    const filter = {};
    if (productId) filter.productId = productId;
    if (warehouseId) {
        filter.$or = [
            { warehouseId },
            { fromWarehouseId: warehouseId },
            { toWarehouseId: warehouseId },
        ];
    }
    if (movementType) filter.movementType = movementType;

    if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [movements, total] = await Promise.all([
        StockMovement.find(filter)
            .populate('productId', 'name productCode')
            .populate('warehouseId', 'name warehouseCode')
            .populate('fromWarehouseId', 'name warehouseCode')
            .populate('toWarehouseId', 'name warehouseCode')
            .populate('performedBy', 'firstName lastName')
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(Number(limit)),
        StockMovement.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: movements.length,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        data: movements,
    });
});

/**
 * POST /api/stock/opening
 * Enter opening stock for one or multiple products
 * Body: { warehouseId, items: [{ productId, quantity, costPerUnit }], notes }
 */
export const createOpeningStock = asyncHandler(async (req, res) => {
    const { warehouseId, items, notes } = req.body;

    if (!warehouseId) { res.status(400); throw new Error('warehouseId is required'); }
    if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400); throw new Error('At least one item is required');
    }

    const session = await mongoose.startSession();
    const results = [];

    try {
        await session.withTransaction(async () => {
            for (const item of items) {
                if (!item.productId || !item.quantity) continue;
                const result = await increaseStock({
                    productId: item.productId,
                    warehouseId,
                    quantity: Number(item.quantity),
                    costPerUnit: Number(item.costPerUnit) || 0,
                    movementType: 'opening_stock',
                    sourceDocument: { type: 'opening_stock', number: 'OPENING' },
                    reason: 'Opening stock entry',
                    notes,
                    userId: req.user._id,
                    session,
                });
                results.push(result);
            }
        });
        res.status(201).json({
            success: true,
            message: `Opening stock recorded for ${results.length} items`,
            data: results.map((r) => ({
                stockItem: r.stockItem,
                movementNumber: r.movement.movementNumber,
            })),
        });
    } finally {
        session.endSession();
    }
});

/**
 * POST /api/stock/transfer
 * Transfer stock between warehouses
 * Body: { fromWarehouseId, toWarehouseId, items: [{ productId, quantity }], notes }
 */
export const transferStock = asyncHandler(async (req, res) => {
    const { fromWarehouseId, toWarehouseId, items, notes } = req.body;

    if (!fromWarehouseId || !toWarehouseId) {
        res.status(400); throw new Error('fromWarehouseId and toWarehouseId are required');
    }
    if (fromWarehouseId === toWarehouseId) {
        res.status(400); throw new Error('From and to warehouses must be different');
    }
    if (!items?.length) { res.status(400); throw new Error('At least one item is required'); }

    const session = await mongoose.startSession();
    const movements = [];

    try {
        await session.withTransaction(async () => {
            for (const item of items) {
                if (!item.productId || !item.quantity) continue;

                // Decrease at source
                const out = await decreaseStock({
                    productId: item.productId,
                    warehouseId: fromWarehouseId,
                    quantity: Number(item.quantity),
                    movementType: 'transfer_out',
                    sourceDocument: { type: 'stock_transfer', number: 'TRF' },
                    reason: 'Stock transfer',
                    notes,
                    userId: req.user._id,
                    session,
                });

                // Increase at destination (use source cost to preserve valuation)
                const inMove = await increaseStock({
                    productId: item.productId,
                    warehouseId: toWarehouseId,
                    quantity: Number(item.quantity),
                    costPerUnit: out.stockItem.costPerUnit,
                    movementType: 'transfer_in',
                    sourceDocument: { type: 'stock_transfer', number: 'TRF' },
                    reason: 'Stock transfer',
                    notes,
                    userId: req.user._id,
                    session,
                });

                movements.push({ out: out.movement, in: inMove.movement });
            }
        });

        res.status(201).json({
            success: true,
            message: `Transferred ${movements.length} items`,
            data: movements,
        });
    } finally {
        session.endSession();
    }
});

/**
 * POST /api/stock/adjustment
 * Manual stock adjustment
 * Body: { warehouseId, items: [{ productId, adjustmentQuantity (positive or negative), reason }], notes }
 */
export const adjustStock = asyncHandler(async (req, res) => {
    const { warehouseId, items, notes, reason } = req.body;

    if (!warehouseId) { res.status(400); throw new Error('warehouseId is required'); }
    if (!items?.length) { res.status(400); throw new Error('At least one item is required'); }

    const session = await mongoose.startSession();
    const results = [];

    try {
        await session.withTransaction(async () => {
            for (const item of items) {
                const qty = Number(item.adjustmentQuantity);
                if (!item.productId || !qty) continue;

                const absQty = Math.abs(qty);

                if (qty > 0) {
                    const result = await increaseStock({
                        productId: item.productId,
                        warehouseId,
                        quantity: absQty,
                        costPerUnit: Number(item.costPerUnit) || 0,
                        movementType: 'adjustment_in',
                        sourceDocument: { type: 'stock_adjustment', number: 'ADJ' },
                        reason: item.reason || reason || 'Stock adjustment',
                        notes,
                        userId: req.user._id,
                        session,
                    });
                    results.push(result.movement);
                } else {
                    const result = await decreaseStock({
                        productId: item.productId,
                        warehouseId,
                        quantity: absQty,
                        movementType: 'adjustment_out',
                        sourceDocument: { type: 'stock_adjustment', number: 'ADJ' },
                        reason: item.reason || reason || 'Stock adjustment',
                        notes,
                        userId: req.user._id,
                        session,
                    });
                    results.push(result.movement);
                }
            }
        });

        res.status(201).json({
            success: true,
            message: `Adjusted ${results.length} items`,
            data: results,
        });
    } finally {
        session.endSession();
    }
});

/**
 * GET /api/stock/reservations
 * List active reservations
 */
export const getReservations = asyncHandler(async (req, res) => {
    const { productId, warehouseId, status = 'active' } = req.query;
    const filter = { status };
    if (productId) filter.productId = productId;
    if (warehouseId) filter.warehouseId = warehouseId;

    const reservations = await StockReservation.find(filter)
        .populate('productId', 'name productCode')
        .populate('warehouseId', 'name warehouseCode')
        .populate('reservedBy', 'firstName lastName')
        .sort({ reservedAt: -1 });

    res.json({ success: true, count: reservations.length, data: reservations });
});

/**
 * POST /api/stock/convert
 * Stock conversion from Raw Materials to Finished Goods and logging Production Batch
 */
export const convertStock = asyncHandler(async (req, res) => {
    const {
        sourceProductId,
        destinationProductId,
        warehouseId,
        inputQuantity,
        outputQuantity,
        notes,
    } = req.body;

    if (!sourceProductId || !destinationProductId || !warehouseId || !inputQuantity || !outputQuantity) {
        res.status(400);
        throw new Error('All fields (sourceProductId, destinationProductId, warehouseId, inputQuantity, outputQuantity) are required');
    }

    const Product = mongoose.model('Product');
    const sourceProduct = await Product.findById(sourceProductId);
    const destProduct = await Product.findById(destinationProductId);

    if (!sourceProduct) {
        res.status(404);
        throw new Error('Source product not found');
    }
    if (!destProduct) {
        res.status(404);
        throw new Error('Destination product not found');
    }

    const session = await mongoose.startSession();
    let productionBatch = null;

    try {
        await session.withTransaction(async () => {
            // 1. Decrease source product stock
            const decResult = await decreaseStock({
                productId: sourceProductId,
                warehouseId,
                quantity: Number(inputQuantity),
                movementType: 'production_issue',
                sourceDocument: { type: 'stock_conversion', number: 'CONV' },
                reason: `Converted to ${destProduct.name}`,
                notes,
                userId: req.user._id,
                session,
            });

            // 2. Generate batch number & Increase destination product stock
            const batchCode = generateJulianBatchCode('CONV');

            await increaseStock({
                productId: destinationProductId,
                warehouseId,
                quantity: Number(outputQuantity),
                costPerUnit: decResult.unitCost * (Number(inputQuantity) / Number(outputQuantity)),
                movementType: 'production_receipt',
                batchNumber: batchCode,
                sourceDocument: { type: 'stock_conversion', number: 'CONV' },
                reason: `Converted from ${sourceProduct.name}`,
                notes,
                userId: req.user._id,
                session,
            });

            // 3. Automatically log a completed ProductionBatch
            const ProductionBatchModel = mongoose.model('ProductionBatch');
            const batchResult = await ProductionBatchModel.create([{
                date: new Date(),
                supplierShortCode: 'CONV',
                product: destProduct.name,
                productId: destinationProductId,
                warehouseId,
                inputWeight_day: Number(inputQuantity),
                outputWeight_day: Number(outputQuantity),
                processingStage: 'completed',
                qcStatus: 'approved',
                status: 'completed',
                remark: notes || `Direct stock conversion from ${sourceProduct.name} (${inputQuantity} ${sourceProduct.unitOfMeasure || 'kg'}) to ${destProduct.name} (${outputQuantity} ${destProduct.unitOfMeasure || 'kg'})`,
                createdBy: req.user._id,
                updatedBy: req.user._id,
            }], { session });
            productionBatch = batchResult[0];
        });

        res.status(201).json({
            success: true,
            message: 'Stock converted successfully and production batch logged',
            data: {
                sourceProductId,
                destinationProductId,
                warehouseId,
                inputQuantity,
                outputQuantity,
                productionBatch
            }
        });
    } catch (error) {
        res.status(400);
        throw new Error(error.message || 'Stock conversion failed');
    } finally {
        session.endSession();
    }
});