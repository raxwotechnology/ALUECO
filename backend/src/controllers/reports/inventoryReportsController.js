import asyncHandler from 'express-async-handler';
import StockItem from '../../models/StockItem.js';
import StockMovement from '../../models/StockMovement.js';
import Product from '../../models/Product.js';

/**
 * GET /api/reports/inventory/valuation?warehouseId=
 * Total stock value per product and warehouse
 */
export const getStockValuation = asyncHandler(async (req, res) => {
    const { warehouseId, businessType = 'all' } = req.query;
    const matchStage = {};
    if (warehouseId) matchStage.warehouseId = warehouseId;

    const productMatch = { 'product.deletedAt': null };
    if (businessType === 'alueco') {
        productMatch.$or = [
            { 'product.name': { $regex: /alu|profile|glass|accessory|hardware|gasket|sliding|casement|window|door/i } },
            { 'product.productCode': { $regex: /^(ALU|AP|AG|ACC|PRF|GLS)/i } },
        ];
    } else if (businessType === 'normal') {
        productMatch.$and = [
            { 'product.name': { $not: { $regex: /alu|profile|glass|sliding|casement|aluminium/i } } },
            { 'product.productCode': { $not: { $regex: /^(ALU|AP|AG|ACC|PRF|GLS)/i } } }
        ];
    }

    const data = await StockItem.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: 'products', localField: 'productId', foreignField: '_id', as: 'product',
            },
        },
        { $unwind: '$product' },
        { $match: productMatch },
        {
            $lookup: {
                from: 'warehouses', localField: 'warehouseId', foreignField: '_id', as: 'warehouse',
            },
        },
        { $unwind: '$warehouse' },
        {
            $project: {
                productId: '$product._id',
                productCode: '$product.productCode',
                productName: '$product.name',
                productType: '$product.productType',
                warehouseName: '$warehouse.name',
                warehouseCode: '$warehouse.warehouseCode',
                onHand: '$quantities.onHand',
                reserved: '$quantities.reserved',
                available: { $subtract: [{ $ifNull: ['$quantities.openStock', '$quantities.onHand'] }, '$quantities.reserved'] },
                costPerUnit: 1,
                totalValue: { $multiply: ['$quantities.onHand', '$costPerUnit'] },
                batchNumber: 1,
            },
        },
        { $sort: { totalValue: -1 } },
    ]);

    const totalValue = data.reduce((s, r) => s + (r.totalValue || 0), 0);
    const totalUnits = data.reduce((s, r) => s + (r.onHand || 0), 0);

    // Group by product type
    const byType = data.reduce((acc, r) => {
        const type = r.productType || 'unknown';
        if (!acc[type]) acc[type] = { type, units: 0, value: 0, items: 0 };
        acc[type].units += r.onHand || 0;
        acc[type].value += r.totalValue || 0;
        acc[type].items += 1;
        return acc;
    }, {});

    res.json({
        success: true,
        data: {
            summary: {
                totalValue: +totalValue.toFixed(2),
                totalUnits,
                productCount: data.length,
            },
            byProductType: Object.values(byType).map((t) => ({
                ...t,
                value: +t.value.toFixed(2),
            })),
            items: data.map((r) => ({
                ...r,
                totalValue: +(r.totalValue || 0).toFixed(2),
            })),
        },
    });
});

/**
 * GET /api/reports/inventory/movement?startDate=&endDate=&productId=
 * Movement ledger
 */
export const getStockMovement = asyncHandler(async (req, res) => {
    const { startDate, endDate, productId, warehouseId, limit = 200 } = req.query;
    const filter = {};
    if (productId) filter.productId = productId;
    if (warehouseId) filter.warehouseId = warehouseId;
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
        }
    }

    const movements = await StockMovement.find(filter)
        .populate('productId', 'name productCode')
        .populate('warehouseId', 'name warehouseCode')
        .populate('performedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(Number(limit));

    res.json({ success: true, count: movements.length, data: movements });
});

/**
 * GET /api/reports/inventory/slow-fast-movers?days=90
 * ABC analysis + identifies slow and fast movers
 */
export const getSlowFastMovers = asyncHandler(async (req, res) => {
    const { days = 90 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    // Revenue per product in the period
    const revenueByProduct = await StockMovement.aggregate([
        {
            $match: {
                createdAt: { $gte: since },
                movementType: { $in: ['sale_dispatch'] },
                direction: 'out',
            },
        },
        {
            $group: {
                _id: '$productId',
                unitsSold: { $sum: '$quantity' },
                movements: { $sum: 1 },
            },
        },
        {
            $lookup: {
                from: 'products', localField: '_id', foreignField: '_id', as: 'product',
            },
        },
        { $unwind: '$product' },
        { $match: { 'product.deletedAt': null, 'product.canBeSold': true } },
        {
            $project: {
                productId: '$product._id',
                productCode: '$product.productCode',
                productName: '$product.name',
                unitsSold: 1,
                movements: 1,
                unitPrice: '$product.basePrice',
                revenue: { $multiply: ['$unitsSold', '$product.basePrice'] },
            },
        },
        { $sort: { revenue: -1 } },
    ]);

    // Total revenue
    const totalRevenue = revenueByProduct.reduce((s, r) => s + r.revenue, 0);

    // ABC classification
    // A = top 80% of revenue, B = next 15%, C = bottom 5%
    let cumulativeRevenue = 0;
    const classified = revenueByProduct.map((r) => {
        cumulativeRevenue += r.revenue;
        const percentCumulative = totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 0;
        let abcClass;
        if (percentCumulative <= 80) abcClass = 'A';
        else if (percentCumulative <= 95) abcClass = 'B';
        else abcClass = 'C';
        return { ...r, revenue: +r.revenue.toFixed(2), cumulativePercent: +percentCumulative.toFixed(1), abcClass };
    });

    // Products with NO sales in the period (slow/dead movers)
    const soldProductIds = new Set(revenueByProduct.map((r) => r._id.toString()));
    const allSellable = await Product.find({
        deletedAt: null, canBeSold: true, status: 'active',
    }).select('_id productCode name basePrice');
    const deadMovers = allSellable
        .filter((p) => !soldProductIds.has(p._id.toString()))
        .map((p) => ({
            productId: p._id, productCode: p.productCode,
            productName: p.name, unitsSold: 0, revenue: 0, abcClass: 'D',
        }));

    res.json({
        success: true,
        data: {
            period: { days: Number(days), since },
            totalRevenue: +totalRevenue.toFixed(2),
            classification: {
                A: classified.filter((c) => c.abcClass === 'A'),
                B: classified.filter((c) => c.abcClass === 'B'),
                C: classified.filter((c) => c.abcClass === 'C'),
                D: deadMovers, // dead stock
            },
            summary: {
                fastMovers: classified.filter((c) => c.abcClass === 'A').length,
                mediumMovers: classified.filter((c) => c.abcClass === 'B').length,
                slowMovers: classified.filter((c) => c.abcClass === 'C').length,
                deadStock: deadMovers.length,
            },
        },
    });
});

/**
 * GET /api/reports/inventory/low-stock
 */
export const getLowStockReport = asyncHandler(async (req, res) => {
    const data = await StockItem.aggregate([
        {
            $group: {
                _id: '$productId',
                totalOnHand: { $sum: '$quantities.onHand' },
                totalReserved: { $sum: '$quantities.reserved' },
            },
        },
        {
            $lookup: {
                from: 'products', localField: '_id', foreignField: '_id', as: 'product',
            },
        },
        { $unwind: '$product' },
        { $match: { 'product.deletedAt': null } },
        {
            $project: {
                productId: '$_id',
                productCode: '$product.productCode',
                productName: '$product.name',
                productType: '$product.productType',
                onHand: '$totalOnHand',
                reserved: '$totalReserved',
                available: { $subtract: ['$totalOnHand', '$totalReserved'] },
                reorderLevel: '$product.stockLevels.reorderLevel',
                minimumStock: '$product.stockLevels.minimumStock',
            },
        },
        {
            $addFields: {
                shortage: { $subtract: ['$reorderLevel', '$available'] },
                isCritical: { $lte: ['$available', '$minimumStock'] },
            },
        },
        { $match: { $expr: { $lte: ['$available', '$reorderLevel'] } } },
        { $sort: { shortage: -1 } },
    ]);

    res.json({ success: true, data });
});

/**
 * GET /api/reports/inventory/daily-status
 * Shows opening stock, received, issued, closing stock, and closing value for each product.
 */
export const getDailyStockStatus = asyncHandler(async (req, res) => {
    const { startDate, endDate, productId, warehouseId } = req.query;

    // Default dates: last 30 days if not provided
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);

    // 1. Fetch all products
    const productQuery = { deletedAt: null };
    if (productId) productQuery._id = productId;
    const products = await Product.find(productQuery).select('name productCode productType unitOfMeasure basePrice');

    // 2. Fetch current stock items to find current on-hand and cost
    const stockQuery = {};
    if (productId) stockQuery.productId = productId;
    if (warehouseId) stockQuery.warehouseId = warehouseId;
    const stockItems = await StockItem.find(stockQuery);

    // Group current on-hand and total cost values by productId
    const currentStockMap = {};
    stockItems.forEach(item => {
        const pId = item.productId ? item.productId.toString() : 'unknown';
        if (!currentStockMap[pId]) {
            currentStockMap[pId] = { onHand: 0, totalValue: 0, costSum: 0, costCount: 0, openStock: 0, balanceStock: 0 };
        }
        currentStockMap[pId].onHand += item.quantities?.onHand || 0;
        currentStockMap[pId].openStock += item.quantities?.openStock || 0;
        currentStockMap[pId].balanceStock += item.quantities?.balanceStock || 0;
        currentStockMap[pId].totalValue += (item.quantities?.onHand || 0) * (item.costPerUnit || 0);
        currentStockMap[pId].costSum += item.costPerUnit || 0;
        currentStockMap[pId].costCount += 1;
    });

    // 3. For each product, calculate inventory metrics
    const reportData = [];

    for (const product of products) {
        const pId = product._id.toString();
        const currentData = currentStockMap[pId] || { onHand: 0, totalValue: 0, costSum: 0, costCount: 0, openStock: 0, balanceStock: 0 };

        // Average cost per unit is either current total value / current onHand,
        // or average of costPerUnit, or basePrice as fallback
        let costPerUnit = 0;
        if (currentData.onHand > 0) {
            costPerUnit = currentData.totalValue / currentData.onHand;
        } else if (currentData.costCount > 0) {
            costPerUnit = currentData.costSum / currentData.costCount;
        } else {
            costPerUnit = product.basePrice || 0;
        }

        // Fetch movements after endDate (to reverse back to endDate closing stock)
        const movementsAfterFilter = {
            productId: product._id,
            createdAt: { $gt: end }
        };
        if (warehouseId) movementsAfterFilter.warehouseId = warehouseId;
        const movementsAfter = await StockMovement.find(movementsAfterFilter).select('quantity direction');

        let adjustment = 0;
        movementsAfter.forEach(m => {
            if (m.direction === 'in') {
                adjustment -= m.quantity;
            } else if (m.direction === 'out') {
                adjustment += m.quantity;
            }
        });

        const closingStock = currentData.onHand + adjustment;

        // Fetch movements within range [startDate, endDate]
        const movementsInFilter = {
            productId: product._id,
            createdAt: { $gte: start, $lte: end }
        };
        if (warehouseId) movementsInFilter.warehouseId = warehouseId;
        const movementsInRange = await StockMovement.find(movementsInFilter).select('quantity direction movementType');

        let received = 0;
        let issued = 0;
        movementsInRange.forEach(m => {
            if (m.movementType === 'opening_stock') {
                return; // skip adding to received/issued
            }
            if (m.direction === 'in') {
                received += m.quantity;
            } else if (m.direction === 'out') {
                issued += m.quantity;
            }
        });

        const openingStock = closingStock - received + issued;
        const closingValue = closingStock * costPerUnit;

        reportData.push({
            productId: product._id,
            productCode: product.productCode,
            productName: product.name,
            productType: product.productType,
            unitOfMeasure: product.unitOfMeasure,
            openingStock: parseFloat(openingStock.toFixed(2)),
            received: parseFloat(received.toFixed(2)),
            issued: parseFloat(issued.toFixed(2)),
            closingStock: parseFloat(closingStock.toFixed(2)),
            openStock: parseFloat((currentData.openStock || 0).toFixed(2)),
            balanceStock: parseFloat((currentData.balanceStock || 0).toFixed(2)),
            costPerUnit: parseFloat(costPerUnit.toFixed(2)),
            closingValue: parseFloat(closingValue.toFixed(2))
        });
    }

    res.json({
        success: true,
        period: { start, end },
        data: reportData
    });
});