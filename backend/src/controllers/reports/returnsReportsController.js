import asyncHandler from 'express-async-handler';
import CustomerReturn from '../../models/CustomerReturn.js';
import DamageRecord from '../../models/DamageRecord.js';

/**
 * GET /api/reports/returns/summary?startDate=&endDate=
 */
export const getReturnsSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const [summary, byReason, byCustomer, byStatus] = await Promise.all([
        CustomerReturn.aggregate([
            { $match: { deletedAt: null, requestDate: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    totalReturns: { $sum: 1 },
                    totalValue: { $sum: '$totalReturnValue' },
                    totalRefunded: { $sum: '$netRefundAmount' },
                },
            },
        ]),
        CustomerReturn.aggregate([
            { $match: { deletedAt: null, requestDate: { $gte: start, $lte: end } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.reason',
                    count: { $sum: 1 },
                    value: { $sum: { $multiply: ['$items.quantityReturned', '$items.unitPrice'] } },
                },
            },
            { $sort: { count: -1 } },
        ]),
        CustomerReturn.aggregate([
            { $match: { deletedAt: null, requestDate: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: '$customerId',
                    customerName: { $first: '$customerSnapshot.name' },
                    customerCode: { $first: '$customerSnapshot.code' },
                    returnCount: { $sum: 1 },
                    totalValue: { $sum: '$totalReturnValue' },
                },
            },
            { $sort: { returnCount: -1 } },
            { $limit: 10 },
        ]),
        CustomerReturn.aggregate([
            { $match: { deletedAt: null, requestDate: { $gte: start, $lte: end } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
    ]);

    res.json({
        success: true,
        data: {
            summary: summary[0] || { totalReturns: 0, totalValue: 0, totalRefunded: 0 },
            byReason, byCustomer, byStatus,
        },
    });
});

/**
 * GET /api/reports/damages/summary
 */
export const getDamagesReport = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const [summary, bySource, byProduct] = await Promise.all([
        DamageRecord.aggregate([
            { $match: { deletedAt: null, createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: null, count: { $sum: 1 }, totalValue: { $sum: '$totalValue' } } },
        ]),
        DamageRecord.aggregate([
            { $match: { deletedAt: null, createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: '$source', count: { $sum: 1 }, value: { $sum: '$totalValue' } } },
            { $sort: { value: -1 } },
        ]),
        DamageRecord.aggregate([
            { $match: { deletedAt: null, createdAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: '$productId',
                    productCode: { $first: '$productCode' },
                    productName: { $first: '$productName' },
                    count: { $sum: 1 },
                    quantity: { $sum: '$quantity' },
                    value: { $sum: '$totalValue' },
                },
            },
            { $sort: { value: -1 } },
            { $limit: 20 },
        ]),
    ]);

    res.json({
        success: true,
        data: {
            summary: summary[0] || { count: 0, totalValue: 0 },
            bySource, byProduct,
        },
    });
});