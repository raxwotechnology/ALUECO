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

        // Smart stock check: Check specified warehouse first, then all warehouses
        let stockItem = null;
        let bestWarehouseId = warehouseId;
        let maxAvailable = 0;

        if (productId) {
            // Check specified warehouse first
            if (warehouseId) {
                stockItem = await StockItem.findOne({ productId, warehouseId });
                if (stockItem) {
                    const available = Math.max(0, (stockItem.quantities?.available !== undefined ? stockItem.quantities.available : ((stockItem.quantities?.openStock || stockItem.quantities?.onHand || 0) - (stockItem.quantities?.reserved || 0))));
                    if (available > maxAvailable) {
                        maxAvailable = available;
                        bestWarehouseId = warehouseId;
                    }
                }
            }

            // If no stock in specified warehouse or we want to check all warehouses, find best warehouse
            if (maxAvailable === 0 || !warehouseId) {
                const allStockItems = await StockItem.find({ productId });
                for (const item of allStockItems) {
                    const available = Math.max(0, (item.quantities?.available !== undefined ? item.quantities.available : ((item.quantities?.openStock || item.quantities?.onHand || 0) - (item.quantities?.reserved || 0))));
                    if (available > maxAvailable) {
                        maxAvailable = available;
                        stockItem = item;
                        bestWarehouseId = item.warehouseId;
                    }
                }
            }
        }

        // Recalculate available from fresh stock data
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
            productId,
            warehouseId: bestWarehouseId
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
    // Check both SalesOrder ID and Quotation ID
    const existing = await StockReservation.find({
        status: 'active',
        $or: [
            { 'sourceDocument.id': salesOrder ? salesOrder._id : salesOrderId },
            { 'sourceDocument.id': salesOrder?.quotationId }
        ]
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
            // Use the warehouse from check results (best warehouse with stock)
            const targetWarehouseId = item.warehouseId || warehouseId;
            let stockItem = await StockItem.findOne({ productId: item.productId, warehouseId: targetWarehouseId });

            if (!stockItem) {
                // Fallback to any warehouse with this product
                stockItem = await StockItem.findOne({ productId: item.productId });
            }

            if (stockItem) {
                // Refresh stock data before reservation to ensure we have latest quantities
                const freshStockItem = await StockItem.findById(stockItem._id);
                if (freshStockItem) {
                    stockItem = freshStockItem;
                }

                // Deduct from available & increase reserved
                stockItem.quantities.reserved = +((stockItem.quantities.reserved || 0) + item.toReserve).toFixed(2);
                stockItem.quantities.available = Math.max(0, (stockItem.quantities.openStock || stockItem.quantities.onHand || 0) - stockItem.quantities.reserved);
                await stockItem.save();

                // Create StockReservation entry
                const reservation = await StockReservation.create([{
                    productId: item.productId,
                    warehouseId: stockItem.warehouseId || targetWarehouseId,
                    quantity: item.toReserve,
                    unitOfMeasure: item.unitOfMeasure,
                    sourceDocument: {
                        type: 'sales_order',
                        id: salesOrder ? salesOrder._id : salesOrderId,
                        number: check.orderNumber,
                        projectName: salesOrder?.projectName
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

    // Find reservations - check both SalesOrder ID and Quotation ID
    const reservations = await StockReservation.find({
        status: 'active',
        $or: [
            { 'sourceDocument.id': orderId },
            { 'sourceDocument.id': salesOrder?.quotationId }
        ]
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
 * Automatically reserves materials if no active reservations exist.
 */
export const issueMaterialsToProduction = async (salesOrderId, warehouseId, userId, session = null) => {
    let salesOrder = await SalesOrder.findById(salesOrderId);
    if (!salesOrder) {
        salesOrder = await SalesOrder.findOne({ quotationId: salesOrderId });
    }
    
    // If still no SalesOrder, check if it's a quotation and create a temp object
    if (!salesOrder) {
        const quotation = await AluQuotation.findById(salesOrderId);
        if (quotation) {
            // Create a temporary salesOrder-like object for processing
            salesOrder = {
                _id: quotation._id,
                quotationId: quotation._id,
                orderNumber: quotation.quoteNumber,
                projectName: quotation.projectName,
                customerName: quotation.customerName
            };
        } else {
            throw new Error('Sales Order or Quotation not found');
        }
    }

    // Find reservations - check both SalesOrder ID and Quotation ID
    const reservationFilter = {
        status: 'active',
        $or: [
            { 'sourceDocument.id': salesOrder._id },
            { 'sourceDocument.id': salesOrder.quotationId }
        ]
    };
    if (warehouseId) {
        reservationFilter.warehouseId = warehouseId;
    }

    let reservations = await StockReservation.find(reservationFilter);

    // If no reservations exist, automatically reserve materials first
    if (reservations.length === 0) {
        console.log('[issueMaterialsToProduction] No active reservations found. Auto-reserving materials...');
        const reserveResult = await reserveStockForProject(salesOrder._id, warehouseId, userId, session);
        
        if (!reserveResult.success) {
            throw new Error('Failed to reserve materials. Please check stock availability.');
        }
        
        if (reserveResult.reservations.length === 0) {
            const shortageInfo = reserveResult.shortages && reserveResult.shortages.length > 0
                ? ` Shortages: ${reserveResult.shortages.map(s => `${s.itemCode} (${s.shortage})`).join(', ')}`
                : '';
            throw new Error(`No materials available to reserve.${shortageInfo} Please ensure stock is available in the warehouse.`);
        }
        
        // Re-fetch reservations after auto-reservation
        reservations = await StockReservation.find(reservationFilter);
        console.log(`[issueMaterialsToProduction] Auto-reserved ${reservations.length} items`);
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
                number: salesOrder.orderNumber || salesOrder._id,
                projectName: salesOrder.projectName
            },
            reason: `Issued materials to production for project ${salesOrder.orderNumber || salesOrder.projectName || salesOrder._id}`,
            userId,
        });

        // Mark reservation as fulfilled
        r.status = 'fulfilled';
        r.fulfilledAt = new Date();
        await r.save();
    }

    // Update sales order production status if it's a real SalesOrder
    // If it's a quotation (temp object), update the quotation status instead
    if (salesOrder && typeof salesOrder.save === 'function') {
        salesOrder.productionStatus = 'in_production';
        await salesOrder.save();
    } else if (salesOrder.quotationId) {
        // Update quotation status
        await AluQuotation.findByIdAndUpdate(salesOrder.quotationId, { status: 'in_production' });
    }

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
