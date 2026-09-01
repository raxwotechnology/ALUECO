import mongoose from 'mongoose';
import StockItem from '../models/StockItem.js';
import StockMovement from '../models/StockMovement.js';
import StockReservation from '../models/StockReservation.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import { getIO } from './socketService.js';

export const checkAndAlertLowStock = async (productId, session) => {
    try {
        const product = await Product.findById(productId);
        if (product && (product.productType === 'finished_good' || product.productType === 'trading')) {
            // Aggregate total quantities across all warehouses
            const stockItems = await StockItem.find({ productId });
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
    sourceDocument, reason, notes, userId,
    openQuantity, // new parameter
    session, // kept for backward compatibility but not used
}) => {
    if (!quantity || quantity <= 0) throw new Error('Quantity must be greater than 0');

    const product = await Product.findById(productId);
    if (!product) throw new Error(`Product ${productId} not found`);

    if (product.status !== 'active') {
        product.status = 'active';
        await product.save();
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) throw new Error(`Warehouse ${warehouseId} not found`);

    // Find or create stock item
    let stockItem = await StockItem.findOne({
        productId, warehouseId, batchNumber,
    });

    const balanceBefore = stockItem?.quantities?.onHand || 0;

    let openQtyToAdd = quantity;
    let balanceQtyToAdd = 0;

    // Default incoming stock from GRNs (purchases), Farm Harvests, and Production Outputs to balanceStock (unreleased)
    // so that warehouse staff can release it to POS (openStock) when needed.
    const goesToBalanceByDefault = ['purchase_receipt', 'harvest_receipt', 'production_output', 'production_receipt'].includes(movementType);
    if (goesToBalanceByDefault) {
        openQtyToAdd = 0;
        balanceQtyToAdd = quantity;
    }

    if (openQuantity !== undefined && openQuantity !== null) {
        openQtyToAdd = Number(openQuantity);
        balanceQtyToAdd = Math.max(0, quantity - openQtyToAdd);
    }

    if (!stockItem) {
        stockItem = new StockItem({
            productId,
            productCode: product.productCode,
            productName: product.name,
            warehouseId,
            batchNumber,
            grnNumber: sourceDocument?.type === 'grn' ? sourceDocument.number : null,
            unitOfMeasure: product.unitOfMeasure,
            costPerUnit,
            quantities: {
                onHand: quantity,
                reserved: 0,
                available: openQtyToAdd,
                openStock: openQtyToAdd,
                balanceStock: balanceQtyToAdd,
            },
        });
    } else {
        // Weighted average cost
        const oldValue = (stockItem.quantities.onHand || 0) * stockItem.costPerUnit;
        const newValue = quantity * costPerUnit;
        const totalQty = (stockItem.quantities.onHand || 0) + quantity;
        stockItem.costPerUnit = totalQty > 0 ? +((oldValue + newValue) / totalQty).toFixed(2) : costPerUnit;

        stockItem.quantities.openStock = (stockItem.quantities.openStock || 0) + openQtyToAdd;
        stockItem.quantities.balanceStock = (stockItem.quantities.balanceStock || 0) + balanceQtyToAdd;
        stockItem.quantities.onHand = stockItem.quantities.openStock + stockItem.quantities.balanceStock;

        // Always update grnNumber when receiving via GRN
        if (sourceDocument?.type === 'grn') {
            stockItem.grnNumber = sourceDocument.number;
        }
    }
    stockItem.lastMovementDate = new Date();
    await stockItem.save();
    checkAndAlertLowStock(productId);

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
    await movement.save();

    // Update product's last purchase cost & average cost
    if (movementType === 'purchase_receipt' || movementType === 'opening_stock' || movementType === 'production_receipt') {
        const updateDoc = {
            'costs.lastPurchaseCost': costPerUnit,
            'costs.averageCost': stockItem.costPerUnit
        };
        if (!product.basePrice || product.basePrice === 0) {
            updateDoc.basePrice = costPerUnit;
        }
        await Product.findByIdAndUpdate(
            productId,
            updateDoc
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
    sourceDocument, reason, notes, userId,
    allowNegative = false,
    useBalanceStock = false,
    session, // kept for backward compatibility but not used
}) => {
    if (!quantity || quantity <= 0) throw new Error('Quantity must be greater than 0');

    const product = await Product.findById(productId);
    if (!product) throw new Error(`Product ${productId} not found`);

    // Case 1: Specific batch number requested
    if (batchNumber) {
        let stockItem = await StockItem.findOne({
            productId, warehouseId, batchNumber,
        });

        if (!stockItem) {
            if (allowNegative) {
                stockItem = new StockItem({
                    productId,
                    productCode: product.productCode,
                    productName: product.name,
                    warehouseId,
                    batchNumber,
                    unitOfMeasure: product.unitOfMeasure,
                    costPerUnit: product.costs?.lastPurchaseCost || 0,
                    quantities: { onHand: 0, reserved: 0, available: 0, openStock: 0, balanceStock: 0 },
                });
            } else {
                throw new Error(`No stock found for batch ${batchNumber} in the selected warehouse`);
            }
        }

        const balanceBefore = stockItem.quantities.onHand;
        const availableStock = useBalanceStock 
            ? (stockItem.quantities.balanceStock || 0)
            : (stockItem.quantities.openStock || 0);

        if (!allowNegative && availableStock < quantity) {
            const stockType = useBalanceStock ? 'balance' : 'open';
            throw new Error(
                `Insufficient ${stockType} stock in batch ${batchNumber}. ${stockType.charAt(0).toUpperCase() + stockType.slice(1)} stock: ${availableStock}, requested: ${quantity}`
            );
        }

        if (useBalanceStock) {
            if (allowNegative) {
                stockItem.quantities.balanceStock = (stockItem.quantities.balanceStock || 0) - quantity;
            } else {
                stockItem.quantities.balanceStock = Math.max(0, (stockItem.quantities.balanceStock || 0) - quantity);
            }
        } else {
            if (allowNegative) {
                stockItem.quantities.openStock = (stockItem.quantities.openStock || 0) - quantity;
            } else {
                stockItem.quantities.openStock = Math.max(0, (stockItem.quantities.openStock || 0) - quantity);
            }
        }
        stockItem.quantities.onHand = stockItem.quantities.openStock + (stockItem.quantities.balanceStock || 0);
        stockItem.lastMovementDate = new Date();
        await stockItem.save();
        checkAndAlertLowStock(productId);

        const movement = new StockMovement({
            productId,
            productCode: product.productCode,
            productName: product.name,
            batchNumber,
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
            reason: reason || `Stock decreased for batch ${batchNumber}`,
            notes,
            performedBy: userId,
            createdAt: new Date(),
        });
        await movement.save();

        return { stockItem, movement };
    }

    // Case 2: No specific batch number requested (FIFO depletion across batches)
    const stockItems = await StockItem.find({
        productId,
        warehouseId
    })
    .sort({ createdAt: 1 });

    const totalAvailable = stockItems.reduce((sum, item) => {
        if (useBalanceStock) {
            return sum + Math.max(0, item.quantities?.balanceStock || 0);
        }
        return sum + Math.max(0, item.quantities?.openStock || 0);
    }, 0);

    if (!allowNegative && totalAvailable < quantity) {
        const stockType = useBalanceStock ? 'balance' : 'open';
        throw new Error(
            `Insufficient ${stockType} stock. Total ${stockType} stock across all batches: ${totalAvailable}, requested: ${quantity}`
        );
    }

    let remainingQty = quantity;
    let totalCostOfDepleted = 0;
    let lastModifiedStockItem = null;
    let lastMovement = null;

    const positiveItems = stockItems.filter(item => {
        if (useBalanceStock) {
            return (item.quantities?.balanceStock || 0) > 0;
        }
        return (item.quantities?.openStock || 0) > 0;
    });

    for (const item of positiveItems) {
        if (remainingQty <= 0) break;

        const availableQty = useBalanceStock 
            ? (item.quantities.balanceStock || 0)
            : (item.quantities.openStock || 0);
        const qtyToDeduct = Math.min(availableQty, remainingQty);

        const balanceBefore = item.quantities.onHand;
        
        if (useBalanceStock) {
            item.quantities.balanceStock = (item.quantities.balanceStock || 0) - qtyToDeduct;
        } else {
            item.quantities.openStock = (item.quantities.openStock || 0) - qtyToDeduct;
        }
        item.quantities.onHand = item.quantities.openStock + (item.quantities.balanceStock || 0);
        item.lastMovementDate = new Date();
        await item.save();

        remainingQty -= qtyToDeduct;
        totalCostOfDepleted += qtyToDeduct * item.costPerUnit;
        lastModifiedStockItem = item;

        const movement = new StockMovement({
            productId,
            productCode: product.productCode,
            productName: product.name,
            batchNumber: item.batchNumber,
            movementType,
            direction: 'out',
            quantity: qtyToDeduct,
            unitOfMeasure: item.unitOfMeasure,
            warehouseId,
            costPerUnit: item.costPerUnit,
            totalCost: +(qtyToDeduct * item.costPerUnit).toFixed(2),
            balanceBefore,
            balanceAfter: item.quantities.onHand,
            sourceDocument,
            reason: reason || `FIFO depletion of batch ${item.batchNumber || 'Standard'}`,
            notes,
            performedBy: userId,
            createdAt: new Date(),
        });
        await movement.save();
        lastMovement = movement;
    }

    // If there is still remaining quantity to deduct (only possible if allowNegative is true)
    if (remainingQty > 0) {
        let targetItem = stockItems[0];
        if (!targetItem) {
            targetItem = new StockItem({
                productId,
                productCode: product.productCode,
                productName: product.name,
                warehouseId,
                batchNumber: null,
                unitOfMeasure: product.unitOfMeasure,
                costPerUnit: product.costs?.lastPurchaseCost || 0,
                quantities: { onHand: 0, reserved: 0, available: 0, openStock: 0, balanceStock: 0 },
            });
        }

        const balanceBefore = targetItem.quantities.onHand;
        
        if (useBalanceStock) {
            targetItem.quantities.balanceStock = (targetItem.quantities.balanceStock || 0) - remainingQty;
        } else {
            targetItem.quantities.openStock = (targetItem.quantities.openStock || 0) - remainingQty;
        }
        targetItem.quantities.onHand = targetItem.quantities.openStock + (targetItem.quantities.balanceStock || 0);
        targetItem.lastMovementDate = new Date();
        await targetItem.save();

        totalCostOfDepleted += remainingQty * targetItem.costPerUnit;
        lastModifiedStockItem = targetItem;

        const movement = new StockMovement({
            productId,
            productCode: product.productCode,
            productName: product.name,
            batchNumber: targetItem.batchNumber,
            movementType,
            direction: 'out',
            quantity: remainingQty,
            unitOfMeasure: targetItem.unitOfMeasure,
            warehouseId,
            costPerUnit: targetItem.costPerUnit,
            totalCost: +(remainingQty * targetItem.costPerUnit).toFixed(2),
            balanceBefore,
            balanceAfter: targetItem.quantities.onHand,
            sourceDocument,
            reason: reason || `Negative stock depletion of batch ${targetItem.batchNumber || 'Standard'}`,
            notes,
            performedBy: userId,
            createdAt: new Date(),
        });
        await movement.save();
        lastMovement = movement;
    }

    checkAndAlertLowStock(productId);

    // Return virtual stock item with weighted average cost of depleted items
    const virtualStockItem = lastModifiedStockItem.toObject ? lastModifiedStockItem.toObject() : { ...lastModifiedStockItem };
    virtualStockItem.costPerUnit = quantity > 0 ? +(totalCostOfDepleted / quantity).toFixed(2) : 0;

    return { stockItem: virtualStockItem, movement: lastMovement };
};

/**
 * Reserve stock (called when sales order is approved).
 * Increases reserved qty; decreases available. Does not change onHand.
 */
export const reserveStock = async ({
    productId, warehouseId, quantity,
    sourceDocument, userId, session, // kept for backward compatibility but not used
}) => {
    const stockItem = await StockItem.findOne({
        productId, warehouseId, batchNumber: null,
    });

    if (!stockItem) throw new Error(`No stock found for product in selected warehouse`);

    const available = stockItem.quantities.onHand - stockItem.quantities.reserved;
    if (available < quantity) {
        throw new Error(
            `Insufficient available stock. Available: ${available}, requested: ${quantity}`
        );
    }

    stockItem.quantities.reserved += quantity;
    await stockItem.save();

    const reservation = new StockReservation({
        productId,
        warehouseId,
        quantity,
        unitOfMeasure: stockItem.unitOfMeasure,
        sourceDocument,
        reservedBy: userId,
    });
    await reservation.save();

    return { stockItem, reservation };
};

/**
 * Release reservations for a source document (e.g., when order cancelled).
 */
export const releaseReservations = async ({ sourceDocumentId, reason = '', session }) => {
    const reservations = await StockReservation.find({
        'sourceDocument.id': sourceDocumentId,
        status: 'active',
    });

    for (const r of reservations) {
        const stockItem = await StockItem.findOne({
            productId: r.productId,
            warehouseId: r.warehouseId,
            batchNumber: r.batchNumber,
        });

        if (stockItem) {
            stockItem.quantities.reserved = Math.max(0, stockItem.quantities.reserved - r.quantity);
            await stockItem.save();
        }

        r.status = 'cancelled';
        r.cancelledAt = new Date();
        r.cancellationReason = reason;
        await r.save();
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
    });

    for (const r of reservations) {
        // Release reservation
        const stockItem = await StockItem.findOne({
            productId: r.productId,
            warehouseId: r.warehouseId,
            batchNumber: r.batchNumber,
        });

        if (stockItem) {
            stockItem.quantities.reserved = Math.max(0, stockItem.quantities.reserved - r.quantity);
            await stockItem.save();
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
        });

        r.status = 'fulfilled';
        r.fulfilledAt = new Date();
        await r.save();
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