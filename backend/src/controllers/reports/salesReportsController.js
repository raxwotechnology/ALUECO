import asyncHandler from 'express-async-handler';
import SalesOrder from '../../models/SalesOrder.js';
import Invoice from '../../models/Invoice.js';
import Payment from '../../models/Payment.js';

/**
 * GET /api/reports/sales/summary?startDate=&endDate=&businessType=
 */
export const getSalesSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate, businessType = 'all' } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const matchFilter = {
        deletedAt: null,
        orderDate: { $gte: start, $lte: end },
        status: { $nin: ['draft', 'cancelled'] },
    };

    if (businessType === 'alueco') {
        matchFilter.$or = [
            { notes: { $regex: /aluminium|alu|quotation|quote/i } },
            { 'items.productName': { $regex: /sliding|casement|door|window|profile|glass|aluminium/i } }
        ];
    } else if (businessType === 'normal') {
        matchFilter.$and = [
            { notes: { $not: { $regex: /aluminium|alu/i } } },
            { 'items.productName': { $not: { $regex: /sliding|casement|door|window|aluminium/i } } }
        ];
    }

    // All orders in period (excluding draft/cancelled)
    const ordersAgg = await SalesOrder.aggregate([
        { $match: matchFilter },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalValue: { $sum: '$grandTotal' },
                avgOrderValue: { $avg: '$grandTotal' },
            },
        },
    ]);

    // Status breakdown
    const statusBreakdown = await SalesOrder.aggregate([
        {
            $match: {
                deletedAt: null,
                orderDate: { $gte: start, $lte: end },
            },
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                value: { $sum: '$grandTotal' },
            },
        },
    ]);

    // Invoice & payment info
    const [invoicesAgg, paymentsAgg] = await Promise.all([
        Invoice.aggregate([
            { $match: { deletedAt: null, invoiceDate: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$grandTotal' },
                    paid: { $sum: '$amountPaid' },
                    balance: { $sum: '$balanceDue' },
                    count: { $sum: 1 },
                },
            },
        ]),
        Payment.aggregate([
            {
                $match: {
                    deletedAt: null,
                    direction: 'received',
                    paymentDate: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: null,
                    collected: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
        ]),
    ]);

    const invoices = invoicesAgg[0] || { total: 0, paid: 0, balance: 0, count: 0 };
    const payments = paymentsAgg[0] || { collected: 0, count: 0 };

    const collectionEfficiency = invoices.total > 0
        ? +((payments.collected / invoices.total) * 100).toFixed(1)
        : 0;

    res.json({
        success: true,
        data: {
            period: { startDate: start, endDate: end },
            orders: ordersAgg[0] || { totalOrders: 0, totalValue: 0, avgOrderValue: 0 },
            statusBreakdown,
            invoices: {
                ...invoices,
                total: +invoices.total.toFixed(2),
                paid: +invoices.paid.toFixed(2),
                balance: +invoices.balance.toFixed(2),
            },
            payments: {
                collected: +payments.collected.toFixed(2),
                count: payments.count,
            },
            collectionEfficiency,
        },
    });
});

/**
 * GET /api/reports/sales/by-product?startDate=&endDate=&limit=50
 */
export const getSalesByProduct = asyncHandler(async (req, res) => {
    const { startDate, endDate, limit = 50, businessType = 'all' } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const matchFilter = {
        deletedAt: null,
        orderDate: { $gte: start, $lte: end },
        status: { $nin: ['draft', 'cancelled'] },
    };

    if (businessType === 'alueco') {
        matchFilter.$or = [
            { notes: { $regex: /aluminium|alu|quotation|quote/i } },
            { 'items.productName': { $regex: /sliding|casement|door|window|profile|glass|aluminium/i } }
        ];
    } else if (businessType === 'normal') {
        matchFilter.$and = [
            { notes: { $not: { $regex: /aluminium|alu/i } } },
            { 'items.productName': { $not: { $regex: /sliding|casement|door|window|aluminium/i } } }
        ];
    }

    const data = await SalesOrder.aggregate([
        { $match: matchFilter },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.productId',
                productCode: { $first: '$items.productCode' },
                productName: { $first: '$items.productName' },
                quantitySold: { $sum: '$items.orderedQuantity' },
                avgPrice: { $avg: '$items.unitPrice' },
                grossRevenue: { $sum: { $multiply: ['$items.orderedQuantity', '$items.unitPrice'] } },
                totalDiscount: { $sum: { $multiply: ['$items.orderedQuantity', '$items.unitPrice', { $divide: [{ $ifNull: ['$items.discountPercent', 0] }, 100] }] } },
                orderCount: { $sum: 1 },
            },
        },
        {
            $addFields: {
                netRevenue: { $subtract: ['$grossRevenue', '$totalDiscount'] },
            },
        },
        { $sort: { netRevenue: -1 } },
        { $limit: Number(limit) },
    ]);

    res.json({ success: true, data });
});

/**
 * GET /api/reports/sales/by-customer?startDate=&endDate=&limit=50
 */
export const getSalesByCustomer = asyncHandler(async (req, res) => {
    const { startDate, endDate, limit = 50 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const data = await SalesOrder.aggregate([
        {
            $match: {
                deletedAt: null,
                orderDate: { $gte: start, $lte: end },
                status: { $nin: ['draft', 'cancelled'] },
            },
        },
        {
            $group: {
                _id: '$customerId',
                customerCode: { $first: '$customerSnapshot.code' },
                customerName: { $first: '$customerSnapshot.name' },
                orderCount: { $sum: 1 },
                totalOrdered: { $sum: '$grandTotal' },
                avgOrderValue: { $avg: '$grandTotal' },
            },
        },
        { $sort: { totalOrdered: -1 } },
        { $limit: Number(limit) },
    ]);

    // Get payment info for these customers
    const customerIds = data.map((c) => c._id);
    const paymentsPerCustomer = await Invoice.aggregate([
        {
            $match: {
                deletedAt: null,
                customerId: { $in: customerIds },
                invoiceDate: { $gte: start, $lte: end },
            },
        },
        {
            $group: {
                _id: '$customerId',
                invoiced: { $sum: '$grandTotal' },
                paid: { $sum: '$amountPaid' },
                outstanding: { $sum: '$balanceDue' },
            },
        },
    ]);
    const paymentMap = new Map(paymentsPerCustomer.map((p) => [p._id.toString(), p]));

    const enriched = data.map((d) => {
        const pay = paymentMap.get(d._id.toString()) || { invoiced: 0, paid: 0, outstanding: 0 };
        return {
            ...d,
            totalOrdered: +d.totalOrdered.toFixed(2),
            avgOrderValue: +d.avgOrderValue.toFixed(2),
            invoiced: +pay.invoiced.toFixed(2),
            paid: +pay.paid.toFixed(2),
            outstanding: +pay.outstanding.toFixed(2),
        };
    });

    res.json({ success: true, data: enriched });
});

/**
 * GET /api/reports/sales/trend?startDate=&endDate=&groupBy=day|week|month
 */
export const getSalesTrend = asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    let groupExpr;
    if (groupBy === 'month') {
        groupExpr = { year: { $year: '$orderDate' }, month: { $month: '$orderDate' } };
    } else if (groupBy === 'week') {
        groupExpr = { year: { $year: '$orderDate' }, week: { $week: '$orderDate' } };
    } else {
        groupExpr = {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' },
            day: { $dayOfMonth: '$orderDate' },
        };
    }

    const data = await SalesOrder.aggregate([
        {
            $match: {
                deletedAt: null,
                orderDate: { $gte: start, $lte: end },
                status: { $nin: ['draft', 'cancelled'] },
            },
        },
        {
            $group: {
                _id: groupExpr,
                count: { $sum: 1 },
                total: { $sum: '$grandTotal' },
            },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
    ]);

    // Format labels
    const result = data.map((d) => {
        let label;
        if (groupBy === 'month') {
            label = `${d._id.year}-${String(d._id.month).padStart(2, '0')}`;
        } else if (groupBy === 'week') {
            label = `${d._id.year}-W${d._id.week}`;
        } else {
            label = `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`;
        }
        return { label, count: d.count, total: +d.total.toFixed(2) };
    });

    res.json({ success: true, data: result });
});