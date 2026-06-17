import asyncHandler from 'express-async-handler';
import Product from '../../models/Product.js';
import Invoice from '../../models/Invoice.js';
import PettyCash from '../../models/PettyCash.js';
import StockItem from '../../models/StockItem.js';
import ProductionBatch from '../../models/ProductionBatch.js';

// Helper: Get start of a UTC week (Monday-based)
const getStartOfWeekStr = (date) => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setUTCDate(diff));
    return startOfWeek.toISOString().split('T')[0];
};

/**
 * GET /api/reports/predictions/dashboard
 * Returns unified analytical forecasts for Sales, Stockout Risks, and Expenses
 */
export const getPredictionsDashboard = asyncHandler(async (req, res) => {
    // ----------------------------------------------------
    // 1. SALES & REVENUE FORECASTING (Last 6 Months)
    // ----------------------------------------------------
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const invoices = await Invoice.find({
        deletedAt: null,
        invoiceType: { $ne: 'proforma' },
        paymentStatus: 'paid',
        invoiceDate: { $gte: sixMonthsAgo }
    }).sort({ invoiceDate: 1 });

    // Build timeline of weekly sales
    const weeklySalesMap = {};
    const today = new Date();
    
    // Initialize all weeks from 6 months ago until today with 0
    let tempDate = new Date(sixMonthsAgo);
    while (tempDate <= today) {
        const weekKey = getStartOfWeekStr(tempDate);
        weeklySalesMap[weekKey] = 0;
        tempDate.setDate(tempDate.getDate() + 7);
    }
    // Make sure current week is included
    weeklySalesMap[getStartOfWeekStr(today)] = 0;

    // Fill in actual sales totals
    invoices.forEach(inv => {
        const weekKey = getStartOfWeekStr(inv.invoiceDate);
        if (weeklySalesMap[weekKey] !== undefined) {
            weeklySalesMap[weekKey] += inv.grandTotal || 0;
        } else {
            weeklySalesMap[weekKey] = inv.grandTotal || 0;
        }
    });

    // Convert map to sorted array
    const salesHistory = Object.entries(weeklySalesMap)
        .map(([week, total]) => ({ week, total: +total.toFixed(2) }))
        .sort((a, b) => a.week.localeCompare(b.week));

    const numWeeks = salesHistory.length;
    let salesSlope = 0;
    let salesIntercept = 0;

    if (numWeeks >= 2) {
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        salesHistory.forEach((item, idx) => {
            sumX += idx;
            sumY += item.total;
            sumXY += idx * item.total;
            sumXX += idx * idx;
        });

        const denominator = (numWeeks * sumXX) - (sumX * sumX);
        if (denominator !== 0) {
            salesSlope = ((numWeeks * sumXY) - (sumX * sumY)) / denominator;
            salesIntercept = (sumY - (salesSlope * sumX)) / numWeeks;
        } else {
            salesIntercept = sumY / numWeeks;
        }
    } else if (numWeeks === 1) {
        salesIntercept = salesHistory[0].total;
    }

    // Forecast next 8 weeks
    const salesForecast = [];
    let expectedNext4Weeks = 0;
    let expectedNext8Weeks = 0;

    for (let i = 0; i < 8; i++) {
        const targetIdx = numWeeks + i;
        let expected = salesSlope * targetIdx + salesIntercept;
        expected = Math.max(0, expected); // No negative sales

        // High & Low scenarios (std dev estimate or basic scale)
        const low = Math.max(0, expected * 0.85);
        const high = expected * 1.15;

        // Calculate calendar date for the forecasted week
        const forecastDate = new Date();
        forecastDate.setDate(today.getDate() + (i + 1) * 7);
        const weekStr = getStartOfWeekStr(forecastDate);

        salesForecast.push({
            week: weekStr,
            expected: +expected.toFixed(2),
            low: +low.toFixed(2),
            high: +high.toFixed(2),
            isForecast: true
        });

        if (i < 4) expectedNext4Weeks += expected;
        expectedNext8Weeks += expected;
    }

    // ----------------------------------------------------
    // 2. STOCK DEPLETION & SALES VELOCITY (Last 30 Days)
    // ----------------------------------------------------
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [allProducts, stockItems, recentSales] = await Promise.all([
        Product.find({ deletedAt: null, status: 'active' }).select('name productCode basePrice unitOfMeasure stockLevels.minimumLevel'),
        StockItem.aggregate([
            { $match: { productId: { $ne: null }, 'quantities.available': { $gt: 0 } } },
            {
                $group: {
                    _id: '$productId',
                    availableStock: { $sum: '$quantities.available' },
                    onHandStock: { $sum: '$quantities.onHand' }
                }
            }
        ]),
        Invoice.aggregate([
            {
                $match: {
                    deletedAt: null,
                    invoiceType: { $ne: 'proforma' },
                    invoiceDate: { $gte: thirtyDaysAgo }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    qtySold: { $sum: '$items.quantity' }
                }
            }
        ])
    ]);

    // Create maps for fast lookup
    const stockMap = {};
    stockItems.forEach(item => {
        if (!item._id) return; // skip orphaned stock items with null productId
        stockMap[item._id.toString()] = {
            available: item.availableStock,
            onHand: item.onHandStock
        };
    });

    const salesVelocityMap = {};
    recentSales.forEach(item => {
        if (!item._id) return; // skip invoice line items with null productId
        salesVelocityMap[item._id.toString()] = item.qtySold / 30; // units per day
    });

    const stockDepletion = allProducts.map(prod => {
        const stockInfo = stockMap[prod._id.toString()] || { available: 0, onHand: 0 };
        const velocity = salesVelocityMap[prod._id.toString()] || 0; // units/day
        const daysRemaining = velocity > 0 ? (stockInfo.available / velocity) : Infinity;

        let riskLevel = 'healthy';
        if (velocity > 0) {
            if (daysRemaining <= 7) riskLevel = 'critical';
            else if (daysRemaining <= 15) riskLevel = 'warning';
        } else if (stockInfo.available === 0) {
            riskLevel = 'critical'; // out of stock and no recent sales, still critical
        }

        return {
            productId: prod._id,
            productName: prod.name,
            productCode: prod.productCode,
            unitOfMeasure: prod.unitOfMeasure || 'units',
            availableStock: stockInfo.available,
            minStockLevel: prod.stockLevels?.minimumLevel || 0,
            dailySalesRate: +velocity.toFixed(3),
            daysRemaining: daysRemaining === Infinity ? 9999 : +daysRemaining.toFixed(1), // cap Infinity for easier sorting
            riskLevel
        };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining); // items at risk first

    // ----------------------------------------------------
    // 3. OPERATIONAL EXPENSE (CASH OUTFLOW) FORECAST (Last 60 Days)
    // ----------------------------------------------------
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(today.getDate() - 60);

    const pettyCashExpenses = await PettyCash.find({
        deletedAt: null,
        transactionType: 'expense',
        date: { $gte: sixtyDaysAgo }
    }).sort({ date: 1 });

    const weeklyExpenseMap = {};
    let tempDateExp = new Date(sixtyDaysAgo);
    while (tempDateExp <= today) {
        const weekKey = getStartOfWeekStr(tempDateExp);
        weeklyExpenseMap[weekKey] = 0;
        tempDateExp.setDate(tempDateExp.getDate() + 7);
    }
    weeklyExpenseMap[getStartOfWeekStr(today)] = 0;

    pettyCashExpenses.forEach(exp => {
        const weekKey = getStartOfWeekStr(exp.date);
        if (weeklyExpenseMap[weekKey] !== undefined) {
            weeklyExpenseMap[weekKey] += exp.amount || 0;
        } else {
            weeklyExpenseMap[weekKey] = exp.amount || 0;
        }
    });

    const expenseHistory = Object.entries(weeklyExpenseMap)
        .map(([week, total]) => ({ week, total: +total.toFixed(2) }))
        .sort((a, b) => a.week.localeCompare(b.week));

    const numExpWeeks = expenseHistory.length;
    let expSlope = 0;
    let expIntercept = 0;

    if (numExpWeeks >= 2) {
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        expenseHistory.forEach((item, idx) => {
            sumX += idx;
            sumY += item.total;
            sumXY += idx * item.total;
            sumXX += idx * idx;
        });

        const denominator = (numExpWeeks * sumXX) - (sumX * sumX);
        if (denominator !== 0) {
            expSlope = ((numExpWeeks * sumXY) - (sumX * sumY)) / denominator;
            expIntercept = (sumY - (expSlope * sumX)) / numExpWeeks;
        } else {
            expIntercept = sumY / numExpWeeks;
        }
    } else if (numExpWeeks === 1) {
        expIntercept = expenseHistory[0].total;
    }

    const expenseForecast = [];
    let expectedNextMonthExpenses = 0;

    for (let i = 0; i < 4; i++) {
        const targetIdx = numExpWeeks + i;
        let expected = expSlope * targetIdx + expIntercept;
        expected = Math.max(0, expected);

        const forecastDate = new Date();
        forecastDate.setDate(today.getDate() + (i + 1) * 7);
        const weekStr = getStartOfWeekStr(forecastDate);

        expenseForecast.push({
            week: weekStr,
            expected: +expected.toFixed(2),
            isForecast: true
        });

        expectedNextMonthExpenses += expected;
    }

    // Return unified predictive results
    res.json({
        success: true,
        data: {
            salesHistory,
            salesForecast,
            salesProjections: {
                next4Weeks: +expectedNext4Weeks.toFixed(2),
                next8Weeks: +expectedNext8Weeks.toFixed(2),
                weeklyTrendDirection: salesSlope > 0 ? 'increasing' : (salesSlope < 0 ? 'decreasing' : 'stable'),
                weeklyGrowthRate: numWeeks > 0 ? +(salesSlope / (salesIntercept || 1) * 100).toFixed(2) : 0
            },
            stockDepletion,
            expenseHistory,
            expenseForecast,
            expenseProjections: {
                next4Weeks: +expectedNextMonthExpenses.toFixed(2),
                weeklyTrendDirection: expSlope > 0 ? 'increasing' : (expSlope < 0 ? 'decreasing' : 'stable')
            }
        }
    });
});
