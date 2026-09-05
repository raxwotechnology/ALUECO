import asyncHandler from 'express-async-handler';
import SalesOrder from '../models/SalesOrder.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import StockItem from '../models/StockItem.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Bill from '../models/Bill.js';
import ProductionOrder from '../models/ProductionOrder.js';
import CustomerReturn from '../models/CustomerReturn.js';
import BankAccount from '../models/BankAccount.js';
import Inquiry from '../models/Inquiry.js';
import Attendance from '../models/Attendance.js';
import Payroll from '../models/Payroll.js';
import GoodsReceiptNote from '../models/GoodsReceiptNote.js';
import PettyCash from '../models/PettyCash.js';
import ProductionBatch from '../models/ProductionBatch.js';
import MonthlyTarget from '../models/MonthlyTarget.js';

/**
 * GET /api/dashboard/kpis
 * Main admin dashboard key metrics
 */
export const getDashboardKpis = asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(today); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    // Revenue (invoiced amount this month vs last month)
    const [currentMonthInvoices, lastMonthInvoices] = await Promise.all([
        Invoice.aggregate([
            { $match: { deletedAt: null, invoiceDate: { $gte: startOfMonth, $lt: tomorrow } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
        ]),
        Invoice.aggregate([
            { $match: { deletedAt: null, invoiceDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
        ]),
    ]);

    const revenueThisMonth = currentMonthInvoices[0]?.total || 0;
    const revenueLastMonth = lastMonthInvoices[0]?.total || 0;
    const revenueGrowth = revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1)
        : 0;

    // Orders metrics
    const [todaysOrders, monthOrders, pendingApproval, pendingDispatch] = await Promise.all([
        SalesOrder.countDocuments({ deletedAt: null, orderDate: { $gte: today, $lt: tomorrow } }),
        SalesOrder.countDocuments({ deletedAt: null, orderDate: { $gte: startOfMonth } }),
        SalesOrder.countDocuments({ deletedAt: null, status: 'draft' }),
        SalesOrder.countDocuments({ deletedAt: null, status: 'approved' }),
    ]);

    // Outstanding receivables (unpaid + overdue)
    const [arTotal, overdueAr] = await Promise.all([
        Invoice.aggregate([
            { $match: { deletedAt: null, paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue', 'Unpaid', 'Partially Paid', 'Overdue', 'partially paid'] } } },
            { $group: { _id: null, total: { $sum: '$balanceDue' } } },
        ]),
        Invoice.aggregate([
            { $match: { deletedAt: null, paymentStatus: { $in: ['overdue', 'Overdue'] } } },
            { $group: { _id: null, total: { $sum: '$balanceDue' }, count: { $sum: 1 } } },
        ]),
    ]);

    // Outstanding payables
    const apTotal = await Bill.aggregate([
        { $match: { deletedAt: null, paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue', 'Unpaid', 'Partially Paid', 'Overdue', 'partially paid'] } } },
        { $group: { _id: null, total: { $sum: '$balanceDue' } } },
    ]);

    // Stock alerts
    const lowStockProducts = await StockItem.aggregate([
        {
            $group: {
                _id: '$productId',
                totalAvailable: { $sum: { $subtract: [{ $ifNull: ['$quantities.openStock', '$quantities.onHand'] }, '$quantities.reserved'] } },
            },
        },
        {
            $lookup: {
                from: 'products', localField: '_id', foreignField: '_id', as: 'product',
            },
        },
        { $unwind: '$product' },
        {
            $match: {
                'product.deletedAt': null,
                'product.canBeSold': true,
                $expr: { $lte: ['$totalAvailable', '$product.stockLevels.reorderLevel'] },
            },
        },
        {
            $project: {
                productId: '$_id', productCode: '$product.productCode',
                productName: '$product.name', available: '$totalAvailable',
                reorderLevel: '$product.stockLevels.reorderLevel',
            },
        },
        { $limit: 10 },
    ]);

    // Production status
    const [activeProduction, productionThisMonth] = await Promise.all([
        ProductionOrder.countDocuments({ deletedAt: null, status: 'in_progress' }),
        ProductionOrder.countDocuments({
            deletedAt: null,
            status: { $in: ['completed', 'partially_completed'] },
            actualEndDate: { $gte: startOfMonth },
        }),
    ]);

    // Returns this month
    const returnsThisMonth = await CustomerReturn.countDocuments({
        deletedAt: null,
        requestDate: { $gte: startOfMonth },
    });

    // Customer stats
    const [totalCustomers, newCustomersThisMonth, customersOnHold] = await Promise.all([
        Customer.countDocuments({ deletedAt: null, status: 'active' }),
        Customer.countDocuments({ deletedAt: null, createdAt: { $gte: startOfMonth } }),
        Customer.countDocuments({ deletedAt: null, 'creditStatus.onCreditHold': true }),
    ]);

    res.json({
        success: true,
        data: {
            revenue: {
                thisMonth: +revenueThisMonth.toFixed(2),
                lastMonth: +revenueLastMonth.toFixed(2),
                growth: +revenueGrowth,
                invoiceCount: currentMonthInvoices[0]?.count || 0,
            },
            orders: {
                today: todaysOrders,
                thisMonth: monthOrders,
                pendingApproval,
                pendingDispatch,
            },
            receivables: {
                total: +(arTotal[0]?.total || 0).toFixed(2),
                overdue: +(overdueAr[0]?.total || 0).toFixed(2),
                overdueCount: overdueAr[0]?.count || 0,
            },
            payables: {
                total: +(apTotal[0]?.total || 0).toFixed(2),
            },
            stock: {
                lowStockCount: lowStockProducts.length,
                lowStockItems: lowStockProducts,
            },
            production: {
                active: activeProduction,
                completedThisMonth: productionThisMonth,
            },
            returns: {
                thisMonth: returnsThisMonth,
            },
            customers: {
                total: totalCustomers,
                newThisMonth: newCustomersThisMonth,
                onHold: customersOnHold,
            },
        },
    });
});

/**
 * GET /api/dashboard/revenue-chart?period=month|week&months=6
 */
export const getRevenueChart = asyncHandler(async (req, res) => {
    const months = Number(req.query.months) || 6;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const data = await Invoice.aggregate([
        { $match: { deletedAt: null, invoiceDate: { $gte: startDate } } },
        {
            $group: {
                _id: {
                    year: { $year: '$invoiceDate' },
                    month: { $month: '$invoiceDate' },
                },
                revenue: { $sum: '$grandTotal' },
                count: { $sum: 1 },
            },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Fill in missing months with 0
    const result = [];
    for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
        const found = data.find((x) => x._id.year === d.getFullYear() && x._id.month === d.getMonth() + 1);
        result.push({
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            monthLabel: d.toLocaleDateString('en-LK', { month: 'short', year: '2-digit' }),
            revenue: found ? +found.revenue.toFixed(2) : 0,
            invoiceCount: found?.count || 0,
        });
    }

    res.json({ success: true, data: result });
});

/**
 * GET /api/dashboard/top-products?limit=10&period=month
 */
export const getTopProducts = asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 10;
    const period = req.query.period || 'month';

    const now = new Date();
    let startDate;
    if (period === 'week') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === 'year') startDate = new Date(now.getFullYear(), 0, 1);
    else startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    const data = await SalesOrder.aggregate([
        {
            $match: {
                deletedAt: null,
                orderDate: { $gte: startDate },
                status: { $nin: ['draft', 'cancelled'] },
            },
        },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.productId',
                productName: { $first: '$items.productName' },
                productCode: { $first: '$items.productCode' },
                quantitySold: { $sum: '$items.orderedQuantity' },
                revenue: { $sum: { $multiply: ['$items.orderedQuantity', '$items.unitPrice'] } },
                orderCount: { $sum: 1 },
            },
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
    ]);

    res.json({ success: true, data });
});

/**
 * GET /api/dashboard/top-customers?limit=10&period=month
 */
export const getTopCustomers = asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 10;
    const period = req.query.period || 'month';

    const now = new Date();
    let startDate;
    if (period === 'week') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === 'year') startDate = new Date(now.getFullYear(), 0, 1);
    else startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    const data = await Invoice.aggregate([
        { $match: { deletedAt: null, invoiceDate: { $gte: startDate } } },
        {
            $group: {
                _id: '$customerId',
                customerName: { $first: '$customerSnapshot.name' },
                customerCode: { $first: '$customerSnapshot.code' },
                totalInvoiced: { $sum: '$grandTotal' },
                totalPaid: { $sum: '$amountPaid' },
                invoiceCount: { $sum: 1 },
            },
        },
        { $sort: { totalInvoiced: -1 } },
        { $limit: limit },
    ]);

    res.json({ success: true, data });
});

/**
 * GET /api/reports/dashboard/department-metrics
 * Returns aggregated metrics for General, Operations, Finance, Sales, and HR department tabs
 */
export const getDepartmentDashboardMetrics = asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Fetch targets for current month
    const targetDoc = await MonthlyTarget.findOne({
        year: today.getFullYear(),
        month: today.getMonth() + 1
    });
    const targetProduction = targetDoc?.productionTarget || 0;
    const targetExpenditure = targetDoc?.expenditureTarget || 0;

    // 1. General Management (MD)
    const [recentInvoices, recentGrns, recentBatches, recentOrders] = await Promise.all([
        Invoice.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(5).populate('customerId', 'displayName'),
        GoodsReceiptNote.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(5),
        ProductionBatch.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(5),
        SalesOrder.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(5).populate('customerId', 'displayName')
    ]);

    // 2. Operations
    const lowestStock = await StockItem.aggregate([
        {
            $lookup: {
                from: 'products', localField: 'productId', foreignField: '_id', as: 'product'
            }
        },
        { $unwind: '$product' },
        { $match: { 'product.deletedAt': null } },
        {
            $project: {
                name: '$product.name',
                productCode: '$product.productCode',
                productType: '$product.productType',
                available: { $subtract: [{ $ifNull: ['$quantities.openStock', '$quantities.onHand'] }, '$quantities.reserved'] },
                unit: '$unitOfMeasure'
            }
        },
        { $sort: { available: 1 } },
        { $limit: 5 }
    ]);

    const [activeProd, completedProdThisMonth] = await Promise.all([
        ProductionOrder.countDocuments({ status: 'in_progress', deletedAt: null }),
        ProductionOrder.countDocuments({ status: 'completed', actualEndDate: { $gte: startOfMonth }, deletedAt: null })
    ]);

    // Calculate actual finished output (kg) for completed batches this month
    const completedBatchesThisMonth = await ProductionBatch.find({
        status: 'completed',
        date: { $gte: startOfMonth },
        deletedAt: null
    });
    const actualProductionThisMonth = completedBatchesThisMonth.reduce((sum, b) => sum + (b.outputWeight_total || 0), 0);

    // 3. Finance
    const bankAccounts = await BankAccount.find({ deletedAt: null });
    const bankSummary = bankAccounts.map(b => ({
        bankName: b.bankName,
        accountNumber: b.accountNumber,
        balance: b.balance || 0
    }));
    const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    const [pettySummary] = await PettyCash.aggregate([
        { $match: { deletedAt: null, poolId: 'MAIN' } },
        {
            $group: {
                _id: null,
                totalReceipts: {
                    $sum: { $cond: [{ $eq: ['$transactionType', 'receipt'] }, '$amount', 0] }
                },
                totalExpenses: {
                    $sum: { $cond: [{ $eq: ['$transactionType', 'expense'] }, '$amount', 0] }
                }
            }
        }
    ]);
    const pettyCashBalance = pettySummary ? (pettySummary.totalReceipts - pettySummary.totalExpenses) : 0;

    const [arTotal, apTotal] = await Promise.all([
        Invoice.aggregate([
            { $match: { deletedAt: null, paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue', 'Unpaid', 'Partially Paid', 'Overdue', 'partially paid'] } } },
            { $group: { _id: null, total: { $sum: '$balanceDue' } } }
        ]),
        Bill.aggregate([
            { $match: { deletedAt: null, paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue', 'Unpaid', 'Partially Paid', 'Overdue', 'partially paid'] } } },
            { $group: { _id: null, total: { $sum: '$balanceDue' } } }
        ])
    ]);

    // Calculate actual approved petty cash expenses for the current month
    const pettyExpensesThisMonth = await PettyCash.find({
        transactionType: 'expense',
        status: 'approved',
        date: { $gte: startOfMonth },
        deletedAt: null
    });
    const actualExpenditureThisMonth = pettyExpensesThisMonth.reduce((sum, pe) => sum + (pe.amount || 0), 0);

    const categoryTotals = {};
    pettyExpensesThisMonth.forEach(pe => {
        const cat = pe.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (pe.amount || 0);
    });
    const pettyCategories = Object.keys(categoryTotals).map(cat => ({
        category: cat,
        amount: categoryTotals[cat]
    })).sort((a, b) => b.amount - a.amount);

    // 4. Sales
    const funnelStages = await Inquiry.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const pipelineFunnel = funnelStages.map(s => ({
        stage: s._id,
        count: s.count
    }));

    const topProducts = await SalesOrder.aggregate([
        {
            $match: {
                deletedAt: null,
                orderDate: { $gte: startOfMonth },
                status: { $nin: ['draft', 'cancelled'] }
            }
        },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.productId',
                productName: { $first: '$items.productName' },
                quantitySold: { $sum: '$items.orderedQuantity' },
                revenue: { $sum: { $multiply: ['$items.orderedQuantity', '$items.unitPrice'] } }
            }
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
    ]);

    // 5. HR
    const attendanceToday = await Attendance.countDocuments({
        date: { $gte: today, $lt: tomorrow },
        deletedAt: null
    });

    const activePayrolls = await Payroll.find({
        month: new Date().toISOString().slice(0, 7),
        deletedAt: null
    });
    let totalEpfEmployer = 0;
    let totalEpfEmployee = 0;
    let totalEtf = 0;
    let totalNetSalary = 0;

    activePayrolls.forEach(p => {
        totalEpfEmployer += p.epfEmployer || 0;
        totalEpfEmployee += p.epfEmployee || 0;
        totalEtf += p.etf || 0;
        totalNetSalary += p.netSalary || 0;
    });

    res.json({
        success: true,
        data: {
            general: {
                recentInvoices,
                recentGrns,
                recentBatches,
                recentOrders
            },
            operations: {
                lowestStock,
                activeProduction: activeProd,
                completedProductionThisMonth: completedProdThisMonth,
                targetProduction,
                actualProduction: actualProductionThisMonth,
                productionPercentage: targetProduction > 0 ? +((actualProductionThisMonth / targetProduction) * 100).toFixed(1) : 0
            },
            finance: {
                bankSummary,
                totalBankBalance,
                pettyCashBalance,
                receivables: arTotal[0]?.total || 0,
                payables: apTotal[0]?.total || 0,
                targetExpenditure,
                actualExpenditure: actualExpenditureThisMonth,
                isLimitExceeded: targetExpenditure > 0 && actualExpenditureThisMonth > targetExpenditure,
                pettyCategories
            },
            sales: {
                pipelineFunnel,
                topProducts
            },
            hr: {
                attendanceToday,
                payrollStats: {
                    epfEmployer: totalEpfEmployer,
                    epfEmployee: totalEpfEmployee,
                    etf: totalEtf,
                    netSalary: totalNetSalary,
                    totalPayrolls: activePayrolls.length
                }
            }
        }
    });
});