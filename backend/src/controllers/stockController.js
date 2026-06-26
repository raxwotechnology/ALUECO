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
        stockType,
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

    if (stockType === 'open') {
        filter['quantities.openStock'] = { $gt: 0 };
    } else if (stockType === 'balance') {
        filter['quantities.balanceStock'] = { $gt: 0 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    let items = await StockItem.find(filter)
        .populate('productId', 'name productCode sku stockLevels type productType')
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
        laborCost = 0,
        overheadCost = 0,
        notes,
        batchNumber = null,
        openQuantity, // accept openQuantity
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
                batchNumber: batchNumber || null,
            });

            // 2. Generate batch number & Increase destination product stock
            const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const batchCode = `${generateJulianBatchCode('CONV')}-${uniqueSuffix}`;

            const sourceUnitCost = decResult.stockItem?.costPerUnit || sourceProduct.basePrice || 0;
            const materialCost = sourceUnitCost * Number(inputQuantity);
            const totalProductionCost = materialCost + Number(laborCost) + Number(overheadCost);
            const destCostPerUnit = outputQuantity > 0 ? +(totalProductionCost / outputQuantity).toFixed(2) : 0;

            await increaseStock({
                productId: destinationProductId,
                warehouseId,
                quantity: Number(outputQuantity),
                costPerUnit: destCostPerUnit,
                movementType: 'production_receipt',
                batchNumber: batchCode,
                sourceDocument: { type: 'stock_conversion', number: 'CONV' },
                reason: `Converted from ${sourceProduct.name}`,
                notes,
                userId: req.user._id,
                session,
                openQuantity: openQuantity !== undefined && openQuantity !== null ? Number(openQuantity) : undefined, // pass openQuantity
            });

            // 3. Automatically log a completed ProductionBatch
            const ProductionBatchModel = mongoose.model('ProductionBatch');
            const batchResult = await ProductionBatchModel.create([{
                batchNo: batchCode,
                date: new Date(),
                supplierShortCode: 'CONV',
                product: destProduct.name,
                productId: destinationProductId,
                warehouseId,
                inputWeight_day: Number(inputQuantity),
                outputWeight_day: Number(outputQuantity),
                materialCost: Number(materialCost.toFixed(2)),
                laborCost: Number(Number(laborCost).toFixed(2)),
                overheadCost: Number(Number(overheadCost).toFixed(2)),
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

/**
 * POST /api/stock/convert-bom
 * BOM-based stock conversion from Raw Materials to Finished Goods and logging Production Batch
 */
export const convertStockBom = asyncHandler(async (req, res) => {
    const {
        bomId,
        warehouseId,
        mainProductId,
        inputQuantity,
        notes,
    } = req.body;

    if (!bomId || !warehouseId || !mainProductId || !inputQuantity) {
        res.status(400);
        throw new Error('All fields (bomId, warehouseId, mainProductId, inputQuantity) are required');
    }

    const BillOfMaterials = mongoose.model('BillOfMaterials');
    const Warehouse = mongoose.model('Warehouse');
    const Product = mongoose.model('Product');

    const bom = await BillOfMaterials.findById(bomId).populate('finishedProductId');
    if (!bom) {
        res.status(404);
        throw new Error('BOM not found');
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
        res.status(404);
        throw new Error('Warehouse not found');
    }

    const mainProduct = await Product.findById(mainProductId);
    if (!mainProduct) {
        res.status(404);
        throw new Error('Main product not found');
    }

    // Find the main product inside the BOM components
    const component = bom.components.find(c => c.productId && c.productId.toString() === mainProductId.toString());
    if (!component) {
        res.status(400);
        throw new Error(`The selected product (${mainProduct.name}) is not a component of the selected BOM (${bom.name})`);
    }

    // Calculate batch multiplier based on main raw material
    const multiplier = Number(inputQuantity) / component.quantity;
    const outputQuantity = multiplier * bom.outputQuantity;

    // Start mongoose transaction session
    const session = await mongoose.startSession();
    let productionBatch = null;

    try {
        await session.withTransaction(async () => {
            let totalMaterialCost = 0;

            // 1. Decrease stock for all components in the BOM
            for (const comp of bom.components) {
                if (!comp.productId) continue;

                const reqQty = comp.quantity * multiplier;
                const decResult = await decreaseStock({
                    productId: comp.productId,
                    warehouseId,
                    quantity: reqQty,
                    movementType: 'production_issue',
                    sourceDocument: { type: 'stock_conversion', number: 'CONV-BOM' },
                    reason: `Consumed in BOM conversion: ${bom.bomCode}`,
                    notes,
                    userId: req.user._id,
                    session,
                    allowNegative: warehouse.settings?.allowNegativeStock || false
                });

                const unitCost = decResult.stockItem?.costPerUnit || comp.standardCost || 0;
                totalMaterialCost += unitCost * reqQty;
            }

            // 2. Generate unique batch code
            const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const finishedProductCode = bom.finishedProductCode || 'FIN';
            const batchCode = `${generateJulianBatchCode(finishedProductCode)}-${uniqueSuffix}`;

            // 3. Calculate destination cost per unit
            const finalLaborCost = req.body.laborCost !== undefined ? Number(req.body.laborCost) : ((bom.totalLaborCost || 0) * multiplier);
            const finalOverheadCost = req.body.overheadCost !== undefined ? Number(req.body.overheadCost) : ((bom.totalOverheadCost || 0) * multiplier);
            const totalProductionCost = totalMaterialCost + finalLaborCost + finalOverheadCost;
            const destCostPerUnit = outputQuantity > 0 ? +(totalProductionCost / outputQuantity).toFixed(2) : 0;

            // 4. Increase stock for finished goods
            await increaseStock({
                productId: bom.finishedProductId._id,
                warehouseId,
                quantity: outputQuantity,
                costPerUnit: destCostPerUnit,
                movementType: 'production_receipt',
                batchNumber: batchCode,
                sourceDocument: { type: 'stock_conversion', number: 'CONV-BOM' },
                reason: `Produced from BOM conversion: ${bom.bomCode}`,
                notes,
                userId: req.user._id,
                session,
            });

            // 5. Create completed ProductionBatch
            const ProductionBatchModel = mongoose.model('ProductionBatch');
            const batchResult = await ProductionBatchModel.create([{
                batchNo: batchCode,
                date: new Date(),
                supplierShortCode: 'CONV',
                product: bom.finishedProductName,
                productId: bom.finishedProductId._id,
                warehouseId,
                inputWeight_day: Number(inputQuantity),
                outputWeight_day: Number(outputQuantity),
                materialCost: Number(totalMaterialCost.toFixed(2)),
                laborCost: Number(finalLaborCost.toFixed(2)),
                overheadCost: Number(finalOverheadCost.toFixed(2)),
                processingStage: 'completed',
                qcStatus: 'approved',
                status: 'completed',
                remark: notes || `BOM conversion using ${bom.bomCode} (${bom.name}) with ${inputQuantity} ${component.unitOfMeasure || 'kg'} of ${component.productName}`,
                createdBy: req.user._id,
                updatedBy: req.user._id,
            }], { session });
            
            productionBatch = batchResult[0];
        });

        res.status(201).json({
            success: true,
            message: 'Stock converted using BOM successfully and production batch logged',
            data: {
                bomId,
                warehouseId,
                mainProductId,
                inputQuantity,
                outputQuantity,
                productionBatch
            }
        });
    } catch (error) {
        res.status(400);
        throw new Error(error.message || 'BOM-based stock conversion failed');
    } finally {
        session.endSession();
    }
});

/**
 * POST /api/stock/convert-recipe
 * Conversion using a simple Inventory Recipe (1-to-1 crop-to-finished-good)
 */
export const convertStockRecipe = asyncHandler(async (req, res) => {
    const {
        recipeId,
        warehouseId,
        inputQuantity,
        laborCost = 0,
        overheadCost = 0,
        notes,
        batchNumber = null,
        openQuantity, // accept openQuantity
    } = req.body;

    if (!recipeId || !warehouseId || !inputQuantity) {
        res.status(400);
        throw new Error('All fields (recipeId, warehouseId, inputQuantity) are required');
    }

    const InventoryRecipe = mongoose.model('InventoryRecipe');
    const Product = mongoose.model('Product');
    const Warehouse = mongoose.model('Warehouse');

    const recipe = await InventoryRecipe.findById(recipeId)
        .populate('sourceProductId')
        .populate('destinationProductId');

    if (!recipe) {
        res.status(404);
        throw new Error('Inventory Recipe not found');
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
        res.status(404);
        throw new Error('Warehouse not found');
    }

    const sourceProduct = recipe.sourceProductId;
    const destProduct = recipe.destinationProductId;

    // Calculate yield output quantity based on recipe ratio
    const multiplier = Number(inputQuantity) / recipe.inputQuantity;
    const outputQuantity = multiplier * recipe.outputQuantity;

    const session = await mongoose.startSession();
    let productionBatch = null;

    try {
        await session.withTransaction(async () => {
            // 1. Decrease source product stock
            const decResult = await decreaseStock({
                productId: sourceProduct._id,
                warehouseId,
                quantity: Number(inputQuantity),
                movementType: 'production_issue',
                sourceDocument: { type: 'stock_conversion', number: 'CONV-RECIPE' },
                reason: `Consumed in Recipe: ${recipe.recipeCode} (${recipe.name})`,
                notes,
                userId: req.user._id,
                session,
                allowNegative: warehouse.settings?.allowNegativeStock || false,
                batchNumber: batchNumber || null,
            });

            const sourceUnitCost = decResult.stockItem?.costPerUnit || sourceProduct.basePrice || 0;
            const materialCost = sourceUnitCost * Number(inputQuantity);
            const totalProductionCost = materialCost + Number(laborCost) + Number(overheadCost);
            const destCostPerUnit = outputQuantity > 0 ? +(totalProductionCost / outputQuantity).toFixed(2) : 0;

            // 2. Generate batch number
            const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const finishedProductCode = destProduct.productCode || 'FIN';
            const batchCode = `${generateJulianBatchCode(finishedProductCode)}-${uniqueSuffix}`;

            // 3. Increase destination product stock
            await increaseStock({
                productId: destProduct._id,
                warehouseId,
                quantity: outputQuantity,
                costPerUnit: destCostPerUnit,
                movementType: 'production_receipt',
                batchNumber: batchCode,
                sourceDocument: { type: 'stock_conversion', number: 'CONV-RECIPE' },
                reason: `Produced from Recipe: ${recipe.recipeCode} (${recipe.name})`,
                notes,
                userId: req.user._id,
                session,
                openQuantity: openQuantity !== undefined && openQuantity !== null ? Number(openQuantity) : undefined, // pass openQuantity
            });

            // 4. Log ProductionBatch with costing details
            const ProductionBatchModel = mongoose.model('ProductionBatch');
            const batchResult = await ProductionBatchModel.create([{
                batchNo: batchCode,
                date: new Date(),
                supplierShortCode: 'CONV',
                product: destProduct.name,
                productId: destProduct._id,
                warehouseId,
                inputWeight_day: Number(inputQuantity),
                outputWeight_day: Number(outputQuantity),
                materialCost: Number(materialCost.toFixed(2)),
                laborCost: Number(Number(laborCost).toFixed(2)),
                overheadCost: Number(Number(overheadCost).toFixed(2)),
                processingStage: 'completed',
                qcStatus: 'approved',
                status: 'completed',
                remark: notes || `Recipe conversion using ${recipe.recipeCode} (${recipe.name}) with ${inputQuantity} ${sourceProduct.unitOfMeasure || 'kg'} of ${sourceProduct.name}`,
                createdBy: req.user._id,
                updatedBy: req.user._id,
            }], { session });

            productionBatch = batchResult[0];
        });

        res.status(201).json({
            success: true,
            message: 'Stock converted using recipe successfully and production batch logged',
            data: {
                recipeId,
                warehouseId,
                inputQuantity,
                outputQuantity,
                productionBatch
            }
        });
    } catch (error) {
        res.status(400);
        throw new Error(error.message || 'Recipe conversion failed');
    } finally {
        session.endSession();
    }
});

/**
 * POST /api/stock/release
 * Release a quantity from balanceStock to openStock
 */
export const releaseStock = asyncHandler(async (req, res) => {
    const { productId, warehouseId, batchNumber = null, quantity, notes } = req.body;

    if (!productId || !warehouseId || !quantity || Number(quantity) <= 0) {
        res.status(400);
        throw new Error('productId, warehouseId and a positive quantity are required');
    }

    const StockItem = mongoose.model('StockItem');
    const StockMovement = mongoose.model('StockMovement');
    const Product = mongoose.model('Product');

    const product = await Product.findById(productId);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    const stockItem = await StockItem.findOne({ productId, warehouseId, batchNumber });
    if (!stockItem) {
        res.status(404);
        throw new Error('Stock item record not found in the selected warehouse');
    }

    const balanceStock = stockItem.quantities.balanceStock || 0;
    if (balanceStock < Number(quantity)) {
        res.status(400);
        throw new Error(`Insufficient balance stock. Available balance stock: ${balanceStock}, requested: ${quantity}`);
    }

    const balanceBefore = stockItem.quantities.onHand;

    // Shift quantity from balanceStock to openStock
    stockItem.quantities.balanceStock = balanceStock - Number(quantity);
    stockItem.quantities.openStock = (stockItem.quantities.openStock || 0) + Number(quantity);
    stockItem.quantities.onHand = stockItem.quantities.openStock + stockItem.quantities.balanceStock;
    stockItem.lastMovementDate = new Date();

    await stockItem.save();

    // Log a stock release movement
    const movement = new StockMovement({
        productId,
        productCode: product.productCode,
        productName: product.name,
        batchNumber,
        movementType: 'stock_release',
        direction: 'internal',
        quantity: Number(quantity),
        unitOfMeasure: product.unitOfMeasure,
        warehouseId,
        costPerUnit: stockItem.costPerUnit,
        totalCost: +(Number(quantity) * stockItem.costPerUnit).toFixed(2),
        balanceBefore,
        balanceAfter: stockItem.quantities.onHand,
        sourceDocument: { type: 'stock_release', number: 'RELEASE' },
        reason: 'Released from balance to open stock',
        notes: notes || '',
        performedBy: req.user._id,
    });
    await movement.save();

    res.status(200).json({
        success: true,
        message: 'Stock released from balance to open stock successfully',
        data: {
            productId,
            warehouseId,
            batchNumber,
            quantity: Number(quantity),
            stockItem,
            movement
        }
    });
});

export const updateStockItem = asyncHandler(async (req, res) => {
    const { batchNumber, manufactureDate, expiryDate, openStock, balanceStock, costPerUnit } = req.body;
    const stockItem = await StockItem.findById(req.params.id);

    if (!stockItem) {
        res.status(404);
        throw new Error('Stock item not found');
    }

    if (batchNumber !== undefined) stockItem.batchNumber = batchNumber;
    if (manufactureDate !== undefined) stockItem.manufactureDate = manufactureDate;
    if (expiryDate !== undefined) stockItem.expiryDate = expiryDate;
    
    if (openStock !== undefined) stockItem.quantities.openStock = Number(openStock);
    if (balanceStock !== undefined) stockItem.quantities.balanceStock = Number(balanceStock);
    if (costPerUnit !== undefined) stockItem.costPerUnit = Number(costPerUnit);

    await stockItem.save();
    res.json({ success: true, message: 'Stock item updated successfully', data: stockItem });
});

export const deleteStockItem = asyncHandler(async (req, res) => {
    const stockItem = await StockItem.findById(req.params.id);

    if (!stockItem) {
        res.status(404);
        throw new Error('Stock item not found');
    }

    await StockItem.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Stock item deleted successfully' });
});