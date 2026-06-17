import mongoose from 'mongoose';
import StockItem from '../models/StockItem.js';
import StockMovement from '../models/StockMovement.js';
import StockReservation from '../models/StockReservation.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import { getIO } from './socketService.js';

export const checkAndAlertLowStock = async (productId, session) => {
    try {
        const product = await Product.findById(productId).session(session || null);
        if (product && (product.productType === 'finished_good' || product.productType === 'trading')) {
            // Aggregate total quantities across all warehouses
            const stockItems = await StockItem.find({ productId }).session(session || null);
            const totalQty = stockItems.reduce((sum, item) => sum + (item.quantities?.onHand || 0), 0);
            
            if (totalQty < 10) {
                const io = getIO();
                io.emit('low_stock_alert', {
                    productId: product._id,
                    productCode: product.productCode,
                    productName: product.name,
                    quantity: totalQty,
                    message: `LOW STOCK: ${product.name} is strictly below 10 units! Current stock: ${totalQty}`
                });
            }
        }
    } catch (err) {
        console.warn('[LowStock Socket] Error:', err.message);
    }
};

/**
 * Increase stock (purchases, opening stock, adjustments in, transfers in, returns).
 * Uses weighted-average costing.
 *
 * @param {Object} params
 * @param {ObjectId|String} params.productId
 * @param {ObjectId|String} params.warehouseId
 * @param {Number} params.quantity
 * @param {Number} params.costPerUnit
 * @param {String} params.movementType
 * @param {String} [params.batchNumber]
 * @param {Object} [params.sourceDocument] - { type, id, number }
 * @param {String} [params.reason]
 * @param {String} [params.notes]
 * @param {ObjectId} params.userId
 * @param {Object} [params.session] - mongoose session for transactions
 */
export const increaseStock = async ({
    productId, warehouseId, quantity, costPerUnit = 0,
    movementType, batchNumber = null,
    sourceDocument, reason, notes, userId, session,
}) => {
    if (!quantity || quantity <= 0) throw new Error('Quantity must be greater than 0');

    const product = await Product.findById(productId).session(session || null);
    if (!product) throw new Error(`Product ${productId} not found`);

    const warehouse = await Warehouse.findById(warehouseId).session(session || null);
    if (!warehouse) throw new Error(`Warehouse ${warehouseId} not found`);

    // Find or create stock item
    let stockItem = await StockItem.findOne({
        productId, warehouseId, batchNumber,
    }).session(session || null);

    const balanceBefore = stockItem?.quantities?.onHand || 0;

    if (!stockItem) {
        stockItem = new StockItem({
            productId,
            productCode: product.productCode,
            productName: product.name,
            warehouseId,
            batchNumber,
            unitOfMeasure: product.unitOfMeasure,
            costPerUnit,
            quantities: { onHand: quantity, reserved: 0, available: quantity },
        });
    } else {
        // Weighted average cost
        const oldValue = stockItem.quantities.onHand * stockItem.costPerUnit;
        const newValue = quantity * costPerUnit;
        const totalQty = stockItem.quantities.onHand + quantity;
        stockItem.costPerUnit = totalQty > 0 ? +((oldValue + newValue) / totalQty).toFixed(2) : costPerUnit;
        stockItem.quantities.onHand += quantity;
    }
    stockItem.lastMovementDate = new Date();
    await stockItem.save({ session: session || undefined });
    checkAndAlertLowStock(productId, session);

    // Record movement
    const movement = new StockMovement({
        productId,
        productCode: product.productCode,
        productName: product.name,
        batchNumber,
        movementType,
        direction: 'in',
        quantity,
        unitOfMeasure: product.unitOfMeasure,
        warehouseId,
        costPerUnit,
        totalCost: +(quantity * costPerUnit).toFixed(2),
        balanceBefore,
        balanceAfter: stockItem.quantities.onHand,
        sourceDocument,
        reason,
        notes,
        performedBy: userId,
    });
    await movement.save({ session: session || undefined });

    // Update product's last purchase cost & average cost
    if (movementType === 'purchase_receipt' || movementType === 'opening_stock') {
        await Product.findByIdAndUpdate(
            productId,
            { 'costs.lastPurchaseCost': costPerUnit, 'costs.averageCost': stockItem.costPerUnit },
            { session: session || null }
        );
    }

    return { stockItem, movement };
};

/**
 * Decrease stock (sales dispatch, adjustments out, transfers out, damage).
 * Uses stock item's current cost for cost tracking.
 */
export const decreaseStock = async ({
    productId, warehouseId, quantity,
    movementType, batchNumber = null,
    sourceDocument, reason, notes, userId, session,
    allowNegative = false,
}) => {
    if (!quantity || quantity <= 0) throw new Error('Quantity must be greater than 0');

    let stockItem = await StockItem.findOne({
        productId, warehouseId, batchNumber,
    }).session(session || null);

    if (!stockItem && !batchNumber) {
        // Fallback: If no batchNumber was requested, find any batch with stock, sorting by FIFO (createdAt: 1)
        stockItem = await StockItem.findOne({
            productId,
            warehouseId,
            'quantities.onHand': { $gt: 0 }
        })
        .sort({ createdAt: 1 })
        .session(session || null);

        // If still no stock item found with positive stock, just find any stock item for this product/warehouse to allow negative adjustments if allowed
        if (!stockItem) {
            stockItem = await StockItem.findOne({
                productId,
                warehouseId
            })
            .sort({ createdAt: 1 })
            .session(session || null);
        }
    }

    if (!stockItem) {
        throw new Error(`No stock found for this product in the selected warehouse`);
    }

    const balanceBefore = stockItem.quantities.onHand;

    if (!allowNegative && stockItem.quantities.onHand < quantity) {
        throw new Error(
            `Insufficient stock. On hand: ${stockItem.quantities.onHand}, requested: ${quantity}`
        );
    }

    stockItem.quantities.onHand -= quantity;
    stockItem.lastMovementDate = new Date();
    await stockItem.save({ session: session || undefined });
    checkAndAlertLowStock(productId, session);

    const product = await Product.findById(productId).session(session || null);

    const movement = new StockMovement({
        productId,
        productCode: product?.productCode,
        productName: product?.name,
        batchNumber: stockItem.batchNumber || batchNumber,
        movementType,
        direction: 'out',
        quantity,
        unitOfMeasure: stockItem.unitOfMeasure,
        warehouseId,
        costPerUnit: stockItem.costPerUnit,
        totalCost: +(quantity * stockItem.costPerUnit).toFixed(2),
        balanceBefore,
        balanceAfter: stockItem.quantities.onHand,
        sourceDocument,
        reason,
        notes,
        performedBy: userId,
    });
    await movement.save({ session: session || undefined });

    return { stockItem, movement };
};

/**
 * Reserve stock (called when sales order is approved).
 * Increases reserved qty; decreases available. Does not change onHand.
 */
export const reserveStock = async ({
    productId, warehouseId, quantity,
    sourceDocument, userId, session,
}) => {
    const stockItem = await StockItem.findOne({
        productId, warehouseId, batchNumber: null,
    }).session(session || null);

    if (!stockItem) throw new Error(`No stock found for product in selected warehouse`);

    const available = stockItem.quantities.onHand - stockItem.quantities.reserved;
    if (available < quantity) {
        throw new Error(
            `Insufficient available stock. Available: ${available}, requested: ${quantity}`
        );
    }

    stockItem.quantities.reserved += quantity;
    await stockItem.save({ session: session || undefined });

    const reservation = new StockReservation({
        productId,
        warehouseId,
        quantity,
        unitOfMeasure: stockItem.unitOfMeasure,
        sourceDocument,
        reservedBy: userId,
    });
    await reservation.save({ session: session || undefined });

    return { stockItem, reservation };
};

/**
 * Release reservations for a source document (e.g., when order cancelled).
 */
export const releaseReservations = async ({ sourceDocumentId, reason = '', session }) => {
    const reservations = await StockReservation.find({
        'sourceDocument.id': sourceDocumentId,
        status: 'active',
    }).session(session || null);

    for (const r of reservations) {
        const stockItem = await StockItem.findOne({
            productId: r.productId,
            warehouseId: r.warehouseId,
            batchNumber: r.batchNumber,
        }).session(session || null);

        if (stockItem) {
            stockItem.quantities.reserved = Math.max(0, stockItem.quantities.reserved - r.quantity);
            await stockItem.save({ session: session || undefined });
        }

        r.status = 'cancelled';
        r.cancelledAt = new Date();
        r.cancellationReason = reason;
        await r.save({ session: session || undefined });
    }

    return reservations.length;
};

/**
 * Fulfill reservations (called when order is dispatched).
 * Releases reservation + decreases onHand stock + creates movement.
 */
export const fulfillReservations = async ({
    sourceDocumentId, sourceDocumentNumber, userId, session,
}) => {
    const reservations = await StockReservation.find({
        'sourceDocument.id': sourceDocumentId,
        status: 'active',
    }).session(session || null);

    for (const r of reservations) {
        // Release reservation
        const stockItem = await StockItem.findOne({
            productId: r.productId,
            warehouseId: r.warehouseId,
            batchNumber: r.batchNumber,
        }).session(session || null);

        if (stockItem) {
            stockItem.quantities.reserved = Math.max(0, stockItem.quantities.reserved - r.quantity);
            await stockItem.save({ session: session || undefined });
        }

        // Decrease stock (dispatch)
        await decreaseStock({
            productId: r.productId,
            warehouseId: r.warehouseId,
            quantity: r.quantity,
            movementType: 'sale_dispatch',
            batchNumber: r.batchNumber,
            sourceDocument: {
                type: 'sales_order',
                id: sourceDocumentId,
                number: sourceDocumentNumber,
            },
            userId,
            session,
        });

        r.status = 'fulfilled';
        r.fulfilledAt = new Date();
        await r.save({ session: session || undefined });
    }

    return reservations.length;
};

/**
 * Get available stock for a product at a warehouse.
 */
export const getAvailableStock = async (productId, warehouseId) => {
    const item = await StockItem.findOne({ productId, warehouseId, batchNumber: null });
    if (!item) return { onHand: 0, reserved: 0, available: 0 };
    return {
        onHand: item.quantities.onHand,
        reserved: item.quantities.reserved,
        available: item.quantities.onHand - item.quantities.reserved,
    };
};