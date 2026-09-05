import asyncHandler from 'express-async-handler';
import ProductionOrder from '../../models/ProductionOrder.js';
import DamageRecord from '../../models/DamageRecord.js';

/**
 * GET /api/reports/production/summary?startDate=&endDate=
 */
export const getProductionSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const [summary, byStatus] = await Promise.all([
        ProductionOrder.aggregate([
            { $match: { deletedAt: null, createdAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalPlannedQty: { $sum: '$plannedQuantity' },
                    totalProducedQty: { $sum: '$totalProduced' },
                    totalPlannedCost: { $sum: '$totalPlannedCost' },
                    totalActualCost: { $sum: '$totalActualCost' },
                    totalVariance: { $sum: '$costVariance' },
                },
            },
        ]),
        ProductionOrder.aggregate([
            { $match: { deletedAt: null, createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: '$status', count: { $sum: 1 }, quantity: { $sum: '$plannedQuantity' } } },
        ]),
    ]);

    const s = summary[0] || { totalOrders: 0, totalPlannedQty: 0, totalProducedQty: 0, totalPlannedCost: 0, totalActualCost: 0, totalVariance: 0 };
    const yieldPct = s.totalPlannedQty > 0 ? +((s.totalProducedQty / s.totalPlannedQty) * 100).toFixed(1) : 0;
    const variancePct = s.totalPlannedCost > 0 ? +((s.totalVariance / s.totalPlannedCost) * 100).toFixed(1) : 0;

    res.json({
        success: true,
        data: {
            period: { start, end },
            summary: {
                ...s,
                yieldPercent: yieldPct,
                variancePercent: variancePct,
                totalPlannedCost: +s.totalPlannedCost.toFixed(2),
                totalActualCost: +s.totalActualCost.toFixed(2),
                totalVariance: +s.totalVariance.toFixed(2),
            },
            byStatus,
        },
    });
});

/**
 * GET /api/reports/production/by-product
 */
export const getProductionByProduct = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const data = await ProductionOrder.aggregate([
        {
            $match: {
                deletedAt: null,
                status: { $in: ['completed', 'partially_completed'] },
                actualEndDate: { $gte: start, $lte: end },
            },
        },
        {
            $group: {
                _id: '$finishedProductId',
                productCode: { $first: '$finishedProductCode' },
                productName: { $first: '$finishedProductName' },
                orderCount: { $sum: 1 },
                totalPlanned: { $sum: '$plannedQuantity' },
                totalProduced: { $sum: '$totalProduced' },
                totalPlannedCost: { $sum: '$totalPlannedCost' },
                totalActualCost: { $sum: '$totalActualCost' },
                avgCostPerUnit: { $avg: '$costPerUnit' },
            },
        },
        {
            $addFields: {
                yieldPercent: {
                    $cond: [
                        { $gt: ['$totalPlanned', 0] },
                        { $multiply: [{ $divide: ['$totalProduced', '$totalPlanned'] }, 100] },
                        0,
                    ],
                },
            },
        },
        { $sort: { totalProduced: -1 } },
    ]);

    res.json({
        success: true, data: data.map((d) => ({
            ...d, totalActualCost: +d.totalActualCost.toFixed(2),
            totalPlannedCost: +d.totalPlannedCost.toFixed(2),
            avgCostPerUnit: +(d.avgCostPerUnit || 0).toFixed(2),
            yieldPercent: +d.yieldPercent.toFixed(1),
        }))
    });
});

/**
 * GET /api/reports/production/wastage
 */
export const getProductionWastage = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const wastage = await DamageRecord.aggregate([
        {
            $match: {
                deletedAt: null,
                source: 'production_reject',
                createdAt: { $gte: start, $lte: end },
            },
        },
        {
            $group: {
                _id: '$productId',
                productCode: { $first: '$productCode' },
                productName: { $first: '$productName' },
                count: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalValue: { $sum: '$totalValue' },
            },
        },
        { $sort: { totalValue: -1 } },
    ]);

    const totalValue = wastage.reduce((s, w) => s + w.totalValue, 0);

    res.json({
        success: true,
        data: {
            totalWastageValue: +totalValue.toFixed(2),
            totalIncidents: wastage.length,
            byProduct: wastage.map((w) => ({
                ...w, totalValue: +w.totalValue.toFixed(2),
            })),
        },
    });
});