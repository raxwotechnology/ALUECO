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
    let quotation = null;
    if (salesOrder.quotationId) {
        quotation = await AluQuotation.findById(salesOrder.quotationId);
    } else if (salesOrder._id) {
        quotation = await AluQuotation.findById(salesOrder._id);
    }
    
    if (!quotation) {
        throw new Error(`Quotation not found for Sales Order ${salesOrder.orderNumber || salesOrder._id}`);
    }

    const summary = {};

    // 1. Accumulate Profiles
    if (quotation.cuttingOptimizationResults && Object.keys(quotation.cuttingOptimizationResults).length > 0) {
        for (const profileCode in quotation.cuttingOptimizationResults) {
            const opt = quotation.cuttingOptimizationResults[profileCode];
            const barCount = opt.bars?.length || 0;
            if (barCount > 0) {
                const key = `profile_${profileCode.toUpperCase()}`;
                summary[key] = {
                    itemCode: profileCode.toUpperCase(),
                    name: opt.description || `Profile ${profileCode}`,
                    type: 'profile',
                    requiredQty: barCount,
                    unitOfMeasure: 'bar'
                };
            }
        }
    } else {
        // Fallback to profileCuts from items
        (quotation.items || []).forEach(item => {
            (item.profileCuts || []).forEach(pc => {
                const code = (pc.code || pc.profileCode || '').toUpperCase();
                if (!code) return;
                const key = `profile_${code}`;
                if (!summary[key]) {
                    summary[key] = {
                        itemCode: code,
                        name: pc.description || pc.name || `Profile ${code}`,
                        type: 'profile',
                        totalMm: 0,
                        requiredQty: 0,
                        unitOfMeasure: 'bar'
                    };
                }
                summary[key].totalMm += (pc.length || 0) * (pc.qty || 1);
            });
        });
        Object.values(summary).forEach(p => {
            if (p.type === 'profile' && p.totalMm > 0) {
                p.requiredQty = Math.ceil(p.totalMm / 5800);
            }
        });
    }

    // 2. Accumulate Glass
    quotation.items.forEach(item => {
        if (item.glassItems) {
            item.glassItems.forEach(g => {
                const rawCode = g.glassCode || 'GLASS';
                const code = rawCode.toUpperCase();
                const key = `glass_${code}`;
                if (!summary[key]) {
                    summary[key] = {
                        itemCode: code,
                        name: g.type || `${code} Glass`,
                        type: 'glass',
                        requiredQty: 0,
                        unitOfMeasure: 'sqft'
                    };
                }
                summary[key].requiredQty += (g.areaSqFt || 0);
            });
        }
    });

    // 3. Accumulate Accessories
    quotation.items.forEach(item => {
        if (item.accessories) {
            item.accessories.forEach(acc => {
                const code = (acc.code || 'ACC').toUpperCase();
                const key = `accessory_${code}`;
                if (!summary[key]) {
                    summary[key] = {
                        itemCode: code,
                        name: acc.name || `Accessory ${code}`,
                        type: 'accessory',
                        requiredQty: 0,
                        unitOfMeasure: acc.unit || 'pcs'
                    };
                }
                summary[key].requiredQty += (acc.qty || 0);
            });
        }
    });

    // 4. Accumulate Gaskets & Rubber
    quotation.items.forEach(item => {
        if (item.gasketItems) {
            item.gasketItems.forEach(g => {
                const code = (g.code || g.gasketCode || 'GSK').toUpperCase();
                const key = `gasket_${code}`;
                if (!summary[key]) {
                    summary[key] = {
                        itemCode: code,
                        name: g.name || `Gasket ${code}`,
                        type: 'gasket',
                        requiredQty: 0,
                        unitOfMeasure: g.unit || 'm'
                    };
                }
                summary[key].requiredQty += (g.qty || 0);
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
    let salesOrder = await SalesOrder.findById(salesOrderId);
    if (!salesOrder) {
        salesOrder = await SalesOrder.findOne({ quotationId: salesOrderId });
    }
    if (!salesOrder) {
        const quotation = await AluQuotation.findById(salesOrderId);
        if (quotation) {
            salesOrder = { quotationId: quotation._id, orderNumber: quotation.quoteNumber, _id: quotation._id };
        } else {
            throw new Error('Sales Order / Project not found');
        }
    }

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
        const product = await Product.findOne({
            productCode: { $regex: new RegExp(`^${req.itemCode}$`, 'i') },
            deletedAt: null
        });
        const productId = product ? product._id : null;

        // Find stock levels in this warehouse or default
        let stockItem = null;
        if (productId) {
            if (warehouseId) {
                stockItem = await StockItem.findOne({ productId, warehouseId });
            }
            if (!stockItem) {
                stockItem = await StockItem.findOne({ productId });
            }
        }

        const availableQty = stockItem ? Math.max(0, (stockItem.quantities?.available !== undefined ? stockItem.quantities.available : ((stockItem.quantities?.openStock || stockItem.quantities?.onHand || 0) - (stockItem.quantities?.reserved || 0)))) : 0;

        const toReserve = Math.min(availableQty, req.requiredQty);
        const shortage = Math.max(0, req.requiredQty - toReserve);

        if (shortage > 0) {
            results.canFulfillAll = false;
        }

        let unitCost = 0;
        if (product) {
            unitCost = product.basePrice || product.costs?.lastPurchaseCost || product.costs?.averageCost || 0;
        }

        results.items.push({
            itemCode: req.itemCode,
            name: req.name,
            type: req.type,
            requiredQty: req.requiredQty,
            unitOfMeasure: product?.unitOfMeasure || req.unitOfMeasure,
            availableStock: availableQty,
            toReserve: parseFloat(toReserve.toFixed(2)),
            shortage: parseFloat(shortage.toFixed(2)),
            unitCost,
            productId
        });
    }

    return results;
};

/**
 * Create actual reservations in the database for the sales order.
 */
export const reserveStockForProject = async (salesOrderId, warehouseId, userId, session = null) => {
    let salesOrder = await SalesOrder.findById(salesOrderId);
    if (!salesOrder) {
        salesOrder = await SalesOrder.findOne({ quotationId: salesOrderId });
    }
    const check = await checkStockAndShortages(salesOrderId, warehouseId);
    const reservationsCreated = [];

    // Check if active reservations already exist for this project to avoid double reserving
    const existing = await StockReservation.find({
        'sourceDocument.id': salesOrder ? salesOrder._id : salesOrderId,
        status: 'active'
    });

    if (existing.length > 0) {
        return {
            success: true,
            alreadyReserved: true,
            reservations: existing,
            shortages: check.items.filter(i => i.shortage > 0)
        };
    }

    for (const item of check.items) {
        if (item.toReserve > 0 && item.productId) {
            let stockItem = null;
            if (warehouseId) {
                stockItem = await StockItem.findOne({ productId: item.productId, warehouseId });
            }
            if (!stockItem) {
                stockItem = await StockItem.findOne({ productId: item.productId });
            }

            if (stockItem) {
                // Deduct from available & increase reserved
                stockItem.quantities.reserved = +((stockItem.quantities.reserved || 0) + item.toReserve).toFixed(2);
                stockItem.quantities.available = Math.max(0, (stockItem.quantities.openStock || stockItem.quantities.onHand || 0) - stockItem.quantities.reserved);
                await stockItem.save();

                // Create StockReservation entry
                const reservation = await StockReservation.create([{
                    productId: item.productId,
                    warehouseId: stockItem.warehouseId || warehouseId,
                    quantity: item.toReserve,
                    unitOfMeasure: item.unitOfMeasure,
                    sourceDocument: {
                        type: 'sales_order',
                        id: salesOrder ? salesOrder._id : salesOrderId,
                        number: check.orderNumber
                    },
                    reservedBy: userId,
                    status: 'active'
                }]);

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
export const releaseProjectReservations = async (salesOrderId, reason, session = null) => {
    let salesOrder = await SalesOrder.findById(salesOrderId);
    if (!salesOrder) {
        salesOrder = await SalesOrder.findOne({ quotationId: salesOrderId });
    }
    const orderId = salesOrder ? salesOrder._id : salesOrderId;

    const reservations = await StockReservation.find({
        'sourceDocument.id': orderId,
        status: 'active'
    });

    for (const r of reservations) {
        const stockItem = await StockItem.findOne({
            productId: r.productId,
            warehouseId: r.warehouseId
        });

        if (stockItem) {
            stockItem.quantities.reserved = Math.max(0, +((stockItem.quantities.reserved || 0) - r.quantity).toFixed(2));
            stockItem.quantities.available = Math.max(0, (stockItem.quantities.openStock || stockItem.quantities.onHand || 0) - stockItem.quantities.reserved);
            await stockItem.save();
        }

        r.status = 'cancelled';
        r.cancelledAt = new Date();
        r.cancellationReason = reason || 'Manual release / cancellation';
        await r.save();
    }

    return reservations.length;
};

/**
 * Issue reserved materials from warehouse store to production.
 * Decreases physical onHand inventory and clears the reservations.
 */
export const issueMaterialsToProduction = async (salesOrderId, warehouseId, userId, session = null) => {
    let salesOrder = await SalesOrder.findById(salesOrderId);
    if (!salesOrder) {
        salesOrder = await SalesOrder.findOne({ quotationId: salesOrderId });
    }
    if (!salesOrder) throw new Error('Sales Order not found');

    const reservationFilter = {
        'sourceDocument.id': salesOrder._id,
        status: 'active'
    };
    if (warehouseId) {
        reservationFilter.warehouseId = warehouseId;
    }

    const reservations = await StockReservation.find(reservationFilter);

    if (reservations.length === 0) {
        throw new Error('No active stock reservations found for this project. Please reserve materials first.');
    }

    for (const r of reservations) {
        // Decrease reserved count
        const stockItem = await StockItem.findOne({
            productId: r.productId,
            warehouseId: r.warehouseId
        });

        if (stockItem) {
            stockItem.quantities.reserved = Math.max(0, +((stockItem.quantities.reserved || 0) - r.quantity).toFixed(2));
            await stockItem.save();
        }

        // Physically decrease stock
        await decreaseStock({
            productId: r.productId,
            warehouseId: r.warehouseId,
            quantity: r.quantity,
            movementType: 'production_issue',
            sourceDocument: {
                type: 'sales_order',
                id: salesOrder._id,
                number: salesOrder.orderNumber
            },
            reason: `Issued materials to production for project ${salesOrder.orderNumber}`,
            userId,
        });

        // Mark reservation as fulfilled
        r.status = 'fulfilled';
        r.fulfilledAt = new Date();
        await r.save();
    }

    // Update sales order production status
    salesOrder.productionStatus = 'in_production';
    await salesOrder.save();

    return {
        success: true,
        issuedItemCount: reservations.length
    };
};

/**
 * Helper to sync active converted projects that do not have active reservations yet.
 */
export const syncActiveProjectReservations = async (userId = null) => {
    const Warehouse = (await import('../models/Warehouse.js')).default;
    const defaultWarehouse = await Warehouse.findOne({ isDefault: true, deletedAt: null }) || await Warehouse.findOne({ deletedAt: null });
    if (!defaultWarehouse) return { synced: 0 };

    const activeOrders = await SalesOrder.find({
        businessType: 'alueco',
        status: { $nin: ['cancelled', 'completed'] },
        quotationId: { $ne: null }
    });

    let synced = 0;
    for (const order of activeOrders) {
        const hasActive = await StockReservation.findOne({
            'sourceDocument.id': order._id,
            status: 'active'
        });
        if (!hasActive) {
            try {
                await reserveStockForProject(order._id, defaultWarehouse._id, userId || order.createdBy);
                synced++;
            } catch (err) {
                console.warn(`[Sync Reservation Error] Order ${order.orderNumber}:`, err.message);
            }
        }
    }
    return { synced };
};
