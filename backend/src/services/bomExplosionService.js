import mongoose from 'mongoose';
import StockItem from '../models/StockItem.js';
import StockReservation from '../models/StockReservation.js';
import Product from '../models/Product.js';
import AluQuotation from '../models/AluQuotation.js';
import SalesOrder from '../models/SalesOrder.js';
import { decreaseStock } from './stockService.js';

/**
 * Compile all material requirements for a project/sales order.
 */
export const getProjectMaterialRequirements = async (salesOrder) => {
    const quotation = await AluQuotation.findById(salesOrder.quotationId);
    if (!quotation) {
        throw new Error(`Quotation not found for Sales Order ${salesOrder.orderNumber}`);
    }

    const summary = {};

    // 1. Accumulate Profiles
    if (quotation.cuttingOptimizationResults) {
        for (const profileCode in quotation.cuttingOptimizationResults) {
            const opt = quotation.cuttingOptimizationResults[profileCode];
            const barCount = opt.bars?.length || 0;
            if (barCount > 0) {
                const key = `profile_${profileCode}`;
                summary[key] = {
                    itemCode: profileCode,
                    name: opt.description || `Profile ${profileCode}`,
                    type: 'profile',
                    requiredQty: barCount,
                    unitOfMeasure: 'bar'
                };
            }
        }
    }

    // 2. Accumulate Glass
    // Glass is optimized by sheet or calculated in sqft.
    // Let's aggregate total sqft area per glass type
    quotation.items.forEach(item => {
        if (item.glassItems) {
            item.glassItems.forEach(g => {
                const key = `glass_${g.glassType}`;
                if (!summary[key]) {
                    summary[key] = {
                        itemCode: g.glassType,
                        name: `${g.glassType} Glass`,
                        type: 'glass',
                        requiredQty: 0,
                        unitOfMeasure: 'sqft'
                    };
                }
                summary[key].requiredQty += g.areaSqFt;
            });
        }
    });

    // 3. Accumulate Accessories
    quotation.items.forEach(item => {
        if (item.accessories) {
            item.accessories.forEach(acc => {
                const key = `accessory_${acc.code}`;
                if (!summary[key]) {
                    summary[key] = {
                        itemCode: acc.code,
                        name: acc.name,
                        type: 'accessory',
                        requiredQty: 0,
                        unitOfMeasure: 'pcs'
                    };
                }
                summary[key].requiredQty += acc.qty;
            });
        }
    });

    // Round quantities to 2 decimals
    return Object.values(summary).map(req => ({
        ...req,
        requiredQty: parseFloat(req.requiredQty.toFixed(2))
    }));
};

/**
 * Explodes the BOM and checks current warehouse stock availability.
 * Computes the reserved quantities and any shortages.
 */
export const checkStockAndShortages = async (salesOrderId, warehouseId) => {
    const salesOrder = await SalesOrder.findById(salesOrderId);
    if (!salesOrder) throw new Error('Sales Order not found');

    const requirements = await getProjectMaterialRequirements(salesOrder);
    const results = {
        salesOrderId: salesOrder._id,
        orderNumber: salesOrder.orderNumber,
        warehouseId,
        canFulfillAll: true,
        items: []
    };

    for (const req of requirements) {
        // Find matching product in catalog
        const product = await Product.findOne({ productCode: req.itemCode });
        const productId = product ? product._id : null;

        // Find stock levels in this warehouse
        const stockItem = productId ? await StockItem.findOne({ productId, warehouseId }) : null;

        const availableQty = stockItem ? (stockItem.quantities.available || 0) : 0;
        const reservedForThis = 0; // check reservations later if any exist

        const toReserve = Math.min(availableQty, req.requiredQty);
        const shortage = Math.max(0, req.requiredQty - toReserve);

        if (shortage > 0) {
            results.canFulfillAll = false;
        }

        results.items.push({
            itemCode: req.itemCode,
            name: req.name,
            type: req.type,
            requiredQty: req.requiredQty,
            unitOfMeasure: req.unitOfMeasure,
            availableStock: availableQty,
            toReserve: parseFloat(toReserve.toFixed(2)),
            shortage: parseFloat(shortage.toFixed(2)),
            productId
        });
    }

    return results;
};

/**
 * Create actual reservations in the database for the sales order.
 */
export const reserveStockForProject = async (salesOrderId, warehouseId, userId, session) => {
    const check = await checkStockAndShortages(salesOrderId, warehouseId);
    const reservationsCreated = [];

    for (const item of check.items) {
        if (item.toReserve > 0 && item.productId) {
            // Find StockItem
            const stockItem = await StockItem.findOne({
                productId: item.productId,
                warehouseId
            }).session(session);

            if (stockItem) {
                // Deduct from open stock & increase reserved
                stockItem.quantities.reserved = +(stockItem.quantities.reserved + item.toReserve).toFixed(2);
                await stockItem.save({ session });

                // Create StockReservation entry
                const reservation = await StockReservation.create([{
                    productId: item.productId,
                    warehouseId,
                    quantity: item.toReserve,
                    unitOfMeasure: item.unitOfMeasure,
                    sourceDocument: {
                        type: 'sales_order',
                        id: salesOrderId,
                        number: check.orderNumber
                    },
                    reservedBy: userId,
                    status: 'active'
                }], { session });

                reservationsCreated.push(reservation[0]);
            }
        }
    }

    return {
        success: true,
        canFulfillAll: check.canFulfillAll,
        reservations: reservationsCreated,
        shortages: check.items.filter(i => i.shortage > 0)
    };
};

/**
 * Release all active reservations for a project.
 */
export const releaseProjectReservations = async (salesOrderId, reason, session) => {
    const reservations = await StockReservation.find({
        'sourceDocument.id': salesOrderId,
        status: 'active'
    }).session(session);

    for (const r of reservations) {
        const stockItem = await StockItem.findOne({
            productId: r.productId,
            warehouseId: r.warehouseId
        }).session(session);

        if (stockItem) {
            stockItem.quantities.reserved = Math.max(0, +(stockItem.quantities.reserved - r.quantity).toFixed(2));
            await stockItem.save({ session });
        }

        r.status = 'cancelled';
        r.cancelledAt = new Date();
        r.cancellationReason = reason || 'Manual release / cancellation';
        await r.save({ session });
    }

    return reservations.length;
};

/**
 * Issue reserved materials from warehouse store to production.
 * Decreases physical onHand inventory and clears the reservations.
 */
export const issueMaterialsToProduction = async (salesOrderId, warehouseId, userId, session) => {
    const salesOrder = await SalesOrder.findById(salesOrderId).session(session);
    if (!salesOrder) throw new Error('Sales Order not found');

    const reservations = await StockReservation.find({
        'sourceDocument.id': salesOrderId,
        warehouseId,
        status: 'active'
    }).session(session);

    if (reservations.length === 0) {
        throw new Error('No active stock reservations found for this project in the selected warehouse. Please reserve materials first.');
    }

    for (const r of reservations) {
        // Decrease reserved count
        const stockItem = await StockItem.findOne({
            productId: r.productId,
            warehouseId: r.warehouseId
        }).session(session);

        if (stockItem) {
            stockItem.quantities.reserved = Math.max(0, +(stockItem.quantities.reserved - r.quantity).toFixed(2));
            await stockItem.save({ session });
        }

        // Physically decrease stock
        await decreaseStock({
            productId: r.productId,
            warehouseId: r.warehouseId,
            quantity: r.quantity,
            movementType: 'production_issue',
            sourceDocument: {
                type: 'sales_order',
                id: salesOrderId,
                number: salesOrder.orderNumber
            },
            reason: `Issued materials to production for project ${salesOrder.orderNumber}`,
            userId,
            session
        });

        // Mark reservation as fulfilled
        r.status = 'fulfilled';
        r.fulfilledAt = new Date();
        await r.save({ session });
    }

    // Update sales order production status
    salesOrder.productionStatus = 'in_production';
    await salesOrder.save({ session });

    return {
        success: true,
        issuedItemCount: reservations.length
    };
};
