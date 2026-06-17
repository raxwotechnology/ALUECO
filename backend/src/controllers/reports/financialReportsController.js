import asyncHandler from 'express-async-handler';
import Invoice from '../../models/Invoice.js';
import Bill from '../../models/Bill.js';
import Payment from '../../models/Payment.js';
import Customer from '../../models/Customer.js';
import MonthlyTarget from '../../models/MonthlyTarget.js';
import DailyPnL from '../../models/DailyPnL.js';
import PettyCash from '../../models/PettyCash.js';
import ProductionBatch from '../../models/ProductionBatch.js';
import Attendance from '../../models/Attendance.js';
import TripLog from '../../models/TripLog.js';
import Employee from '../../models/Employee.js';

/**
 * GET /api/reports/financial/snapshot
 * Revenue vs expenses, A/R + A/P, collection efficiency for a period
 */
export const getFinancialSnapshot = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const [revenue, expenses, collected, paid, arTotal, apTotal] = await Promise.all([
        Invoice.aggregate([
            { $match: { deletedAt: null, invoiceDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        Bill.aggregate([
            { $match: { deletedAt: null, billDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        Payment.aggregate([
            { $match: { deletedAt: null, direction: 'received', paymentDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payment.aggregate([
            { $match: { deletedAt: null, direction: 'paid', paymentDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Invoice.aggregate([
            { $match: { deletedAt: null, paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue', 'Unpaid', 'Partially Paid', 'Overdue', 'partially paid'] } } },
            {
                $group: {
                    _id: null,
                    current: { $sum: { $cond: [{ $eq: ['$agingBucket', 'current'] }, '$balanceDue', 0] } },
                    b1_30: { $sum: { $cond: [{ $eq: ['$agingBucket', '1_30'] }, '$balanceDue', 0] } },
                    b31_60: { $sum: { $cond: [{ $eq: ['$agingBucket', '31_60'] }, '$balanceDue', 0] } },
                    b61_90: { $sum: { $cond: [{ $eq: ['$agingBucket', '61_90'] }, '$balanceDue', 0] } },
                    b91_plus: { $sum: { $cond: [{ $eq: ['$agingBucket', '91_plus'] }, '$balanceDue', 0] } },
                    total: { $sum: '$balanceDue' },
                },
            },
        ]),
        Bill.aggregate([
            { $match: { deletedAt: null, paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue', 'Unpaid', 'Partially Paid', 'Overdue', 'partially paid'] } } },
            {
                $group: {
                    _id: null,
                    current: { $sum: { $cond: [{ $eq: ['$agingBucket', 'current'] }, '$balanceDue', 0] } },
                    b1_30: { $sum: { $cond: [{ $eq: ['$agingBucket', '1_30'] }, '$balanceDue', 0] } },
                    b31_60: { $sum: { $cond: [{ $eq: ['$agingBucket', '31_60'] }, '$balanceDue', 0] } },
                    b61_90: { $sum: { $cond: [{ $eq: ['$agingBucket', '61_90'] }, '$balanceDue', 0] } },
                    b91_plus: { $sum: { $cond: [{ $eq: ['$agingBucket', '91_plus'] }, '$balanceDue', 0] } },
                    total: { $sum: '$balanceDue' },
                },
            },
        ]),
    ]);

    const revenueTotal = revenue[0]?.total || 0;
    const expensesTotal = expenses[0]?.total || 0;
    const collectedTotal = collected[0]?.total || 0;
    const paidTotal = paid[0]?.total || 0;

    res.json({
        success: true,
        data: {
            period: { start, end },
            revenue: +revenueTotal.toFixed(2),
            expenses: +expensesTotal.toFixed(2),
            grossProfit: +(revenueTotal - expensesTotal).toFixed(2),
            collected: +collectedTotal.toFixed(2),
            paid: +paidTotal.toFixed(2),
            netCashFlow: +(collectedTotal - paidTotal).toFixed(2),
            collectionEfficiency: revenueTotal > 0 ? +((collectedTotal / revenueTotal) * 100).toFixed(1) : 0,
            accountsReceivable: arTotal[0] || { current: 0, b1_30: 0, b31_60: 0, b61_90: 0, b91_plus: 0, total: 0 },
            accountsPayable: apTotal[0] || { current: 0, b1_30: 0, b31_60: 0, b61_90: 0, b91_plus: 0, total: 0 },
        },
    });
});

/**
 * GET /api/reports/financial/targets
 * Retrieve all monthly revenue targets
 */
export const getTargets = asyncHandler(async (req, res) => {
    const targets = await MonthlyTarget.find().sort({ year: -1, month: -1 });
    res.json({ success: true, data: targets });
});

/**
 * POST /api/reports/financial/targets
 * Create or update a monthly revenue target
 */
export const setTarget = asyncHandler(async (req, res) => {
    const { year, month, revenueTarget, productionTarget, expenditureTarget, notes } = req.body;

    if (!year || !month || revenueTarget === undefined) {
        res.status(400);
        throw new Error('Year, Month, and Revenue Target are required');
    }

    const target = await MonthlyTarget.findOneAndUpdate(
        { year, month },
        {
            revenueTarget: Number(revenueTarget),
            productionTarget: Number(productionTarget) || 0,
            expenditureTarget: Number(expenditureTarget) || 0,
            notes,
            updatedBy: req.user._id
        },
        { new: true, upsert: true }
    );

    res.json({ success: true, data: target });
});

/**
 * GET /api/reports/financial/variance
 * Computes Target vs Actual Commercial Invoices revenue, Net Profit/Loss, and checks milestones.
 */
export const getVarianceReport = asyncHandler(async (req, res) => {
    const { year, month } = req.query;
    
    const y = Number(year) || new Date().getFullYear();
    const m = Number(month) || (new Date().getMonth() + 1);

    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);

    // 1. Fetch Target
    const target = await MonthlyTarget.findOne({ year: y, month: m });
    const targetRevenue = target?.revenueTarget || 0;
    const targetProduction = target?.productionTarget || 0;
    const targetExpenditure = target?.expenditureTarget || 0;

    // 2. Fetch Verified Commercial Invoices (non-proforma, approved/sent/paid, not cancelled)
    const invoices = await Invoice.find({
        invoiceType: 'commercial',
        status: { $nin: ['cancelled', 'draft'] },
        invoiceDate: { $gte: start, $lte: end }
    });
    const actualRevenue = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

    // 3. Fetch Expenses from Daily P&L for that month
    const dailyPnLs = await DailyPnL.find({
        date: { $gte: start, $lte: end }
    });
    const actualExpenses = dailyPnLs.reduce((sum, pnl) => sum + pnl.totalExpenses, 0);

    // Calculate details for Daily P&L breakdowns
    const expensesBreakdown = {
        rawMaterial: dailyPnLs.reduce((s, p) => s + (p.rawMaterial || 0), 0),
        labourSalary: dailyPnLs.reduce((s, p) => s + (p.labourSalary || 0), 0),
        supervisorQC: dailyPnLs.reduce((s, p) => s + (p.supervisorQC || 0), 0),
        electricity: dailyPnLs.reduce((s, p) => s + (p.electricity || 0), 0),
        firewood: dailyPnLs.reduce((s, p) => s + (p.firewood || 0), 0),
        packing: dailyPnLs.reduce((s, p) => s + (p.packing || 0), 0),
        transport: dailyPnLs.reduce((s, p) => s + (p.transport || 0), 0),
        communication: dailyPnLs.reduce((s, p) => s + (p.communication || 0), 0),
        other: dailyPnLs.reduce((s, p) => s + (p.other || 0), 0)
    };

    // 4. Fetch Actual Production Output from Production Batches (completed this month)
    const batches = await mongoose.model('ProductionBatch').find({
        status: 'completed',
        date: { $gte: start, $lte: end },
        deletedAt: null
    });
    const actualProduction = batches.reduce((sum, b) => sum + (b.outputWeight_total || 0), 0);
    const productionVariance = actualProduction - targetProduction;
    const productionPercentageAchieved = targetProduction > 0 ? (actualProduction / targetProduction) * 100 : 0;

    // 5. Fetch Actual Petty Cash Expenditures (approved expenses this month)
    const pettyExpenses = await mongoose.model('PettyCash').find({
        transactionType: 'expense',
        status: 'approved',
        date: { $gte: start, $lte: end },
        deletedAt: null
    });
    const actualExpenditure = pettyExpenses.reduce((sum, pe) => sum + (pe.amount || 0), 0);
    const expenditureVariance = actualExpenditure - targetExpenditure;
    const isExpenditureLimitExceeded = targetExpenditure > 0 && actualExpenditure > targetExpenditure;

    // 6. Compute Variance Metrics
    const revenueVariance = actualRevenue - targetRevenue;
    const percentageAchieved = targetRevenue > 0 ? (actualRevenue / targetRevenue) * 100 : 0;
    const netProfitLoss = actualRevenue - actualExpenses;

    // 7. Determine Compliance Milestones
    let milestoneStatus = 'Behind';
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === y && (now.getMonth() + 1) === m;

    if (percentageAchieved >= 100) {
        milestoneStatus = 'Target Achieved';
    } else if (isCurrentMonth) {
        const currentDay = now.getDate();
        const totalDays = new Date(y, m, 0).getDate();
        const expectedRunRatePct = (currentDay / totalDays) * 100;

        if (percentageAchieved >= expectedRunRatePct) {
            milestoneStatus = 'On Track';
        } else {
            milestoneStatus = 'Behind';
        }
    } else {
        milestoneStatus = 'Target Missed';
    }

    res.json({
        success: true,
        data: {
            year: y,
            month: m,
            targetRevenue: +targetRevenue.toFixed(2),
            actualRevenue: +actualRevenue.toFixed(2),
            revenueVariance: +revenueVariance.toFixed(2),
            percentageAchieved: +percentageAchieved.toFixed(1),
            targetProduction: +targetProduction.toFixed(2),
            actualProduction: +actualProduction.toFixed(2),
            productionVariance: +productionVariance.toFixed(2),
            productionPercentageAchieved: +productionPercentageAchieved.toFixed(1),
            targetExpenditure: +targetExpenditure.toFixed(2),
            actualExpenditure: +actualExpenditure.toFixed(2),
            expenditureVariance: +expenditureVariance.toFixed(2),
            isExpenditureLimitExceeded,
            actualExpenses: +actualExpenses.toFixed(2),
            netProfitLoss: +netProfitLoss.toFixed(2),
            milestoneStatus,
            expensesBreakdown,
            invoiceCount: invoices.length,
            targetNotes: target?.notes || ''
        }
    });
});

/**
 * GET /api/reports/financial/comparison
 * Compares two selected months side-by-side
 */
export const getSalesComparison = asyncHandler(async (req, res) => {
    const { yearA, monthA, yearB, monthB } = req.query;

    if (!yearA || !monthA || !yearB || !monthB) {
        res.status(400);
        throw new Error('yearA, monthA, yearB, monthB are required');
    }

    const fetchMonthData = async (y, m) => {
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59, 999);

        // Revenue
        const invoices = await Invoice.find({
            invoiceType: 'commercial',
            status: { $nin: ['cancelled', 'draft'] },
            invoiceDate: { $gte: start, $lte: end }
        });
        const revenue = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

        // Product categories / volume
        const productsMap = {};
        invoices.forEach(inv => {
            inv.items.forEach(item => {
                const name = item.productName || 'Unknown';
                productsMap[name] = (productsMap[name] || 0) + (item.quantity || 0);
            });
        });
        
        const topProducts = Object.entries(productsMap)
            .map(([name, qty]) => ({ name, quantity: qty }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        // Expenses
        const dailyPnLs = await DailyPnL.find({ date: { $gte: start, $lte: end } });
        const expenses = dailyPnLs.reduce((sum, p) => sum + p.totalExpenses, 0);

        return {
            year: y,
            month: m,
            revenue: +revenue.toFixed(2),
            expenses: +expenses.toFixed(2),
            netProfit: +(revenue - expenses).toFixed(2),
            invoiceCount: invoices.length,
            topProducts
        };
    };

    const [dataA, dataB] = await Promise.all([
        fetchMonthData(Number(yearA), Number(monthA)),
        fetchMonthData(Number(yearB), Number(monthB))
    ]);

    const revenueGrowthPct = dataA.revenue > 0 ? ((dataB.revenue - dataA.revenue) / dataA.revenue) * 100 : 0;
    const netProfitGrowthPct = dataA.netProfit > 0 ? ((dataB.netProfit - dataA.netProfit) / dataA.netProfit) * 100 : 0;

    res.json({
        success: true,
        data: {
            monthA: dataA,
            monthB: dataB,
            comparisons: {
                revenueGrowthPercent: +revenueGrowthPct.toFixed(1),
                netProfitGrowthPercent: +netProfitGrowthPct.toFixed(1),
                invoiceCountChange: dataB.invoiceCount - dataA.invoiceCount
            }
        }
    });
});

/**
 * GET /api/reports/shift-wise
 * Shift-wise Multi-Filter Reporting Dashboard (Attendance, Production, Logistics)
 */
export const getShiftWiseReport = asyncHandler(async (req, res) => {
    const { startDate, endDate, shift } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const shiftFilter = shift ? shift.toLowerCase() : null; // 'day' or 'night'

    // 1. Production Yield aggregates by shift
    const batchFilter = { deletedAt: null, date: { $gte: start, $lte: end } };
    const batches = await ProductionBatch.find(batchFilter);

    const production = {
        dayShift: {
            inputKg: batches.reduce((s, b) => s + (b.inputWeight_day || 0), 0),
            outputKg: batches.reduce((s, b) => s + (b.outputWeight_day || 0), 0),
            staff: batches.reduce((s, b) => s + (b.staff_day || 0) + (b.otherStaff_day || 0), 0),
            woodKg: batches.reduce((s, b) => s + (b.firewoodKg_day || 0), 0),
            efficiency: 0
        },
        nightShift: {
            inputKg: batches.reduce((s, b) => s + (b.inputWeight_night || 0), 0),
            outputKg: batches.reduce((s, b) => s + (b.outputWeight_night || 0), 0),
            staff: batches.reduce((s, b) => s + (b.staff_night || 0) + (b.otherStaff_night || 0), 0),
            woodKg: batches.reduce((s, b) => s + (b.firewoodKg_night || 0), 0),
            efficiency: 0
        }
    };

    if (production.dayShift.inputKg > 0) {
        production.dayShift.efficiency = +((production.dayShift.outputKg / production.dayShift.inputKg) * 100).toFixed(1);
    }
    if (production.nightShift.inputKg > 0) {
        production.nightShift.efficiency = +((production.nightShift.outputKg / production.nightShift.inputKg) * 100).toFixed(1);
    }

    // 2. Attendance & Wages by shift
    const attendances = await Attendance.find({
        date: { $gte: start, $lte: end }
    }).populate('shiftId').populate('employeeId');

    const hr = {
        dayShift: { presentCount: 0, permanentCount: 0, traineeCount: 0, overtimeHours: 0, estimatedWages: 0, epfContribution: 0, etfContribution: 0 },
        nightShift: { presentCount: 0, permanentCount: 0, traineeCount: 0, overtimeHours: 0, estimatedWages: 0, epfContribution: 0, etfContribution: 0 }
    };

    attendances.forEach(att => {
        if (att.status !== 'present' && att.status !== 'late' && att.status !== 'half_day') return;
        
        const isNight = att.shiftId?.isOvernight || att.shiftId?.name?.toLowerCase().includes('night');
        const targetShift = isNight ? hr.nightShift : hr.dayShift;
        
        targetShift.presentCount += att.status === 'half_day' ? 0.5 : 1;
        
        const emp = att.employeeId;
        if (emp) {
            if (emp.employeeCategory === 'Trainee') {
                targetShift.traineeCount++;
            } else {
                targetShift.permanentCount++;
            }

            // OT hours calculation with automated OT cutoff hours cap
            const otCutoff = emp.otCutoffHours || Infinity;
            const otHours = Math.min(att.overtimeMinutes / 60, otCutoff);
            targetShift.overtimeHours += otHours;

            // Hourly wage estimation
            const hourlyRate = emp.basicWageRate || 0;
            const hoursWorked = att.totalWorkedMinutes / 60;
            const basicWage = hoursWorked * hourlyRate;
            
            // EPF/ETF calculations from employee rates
            const epfRate = emp.epfRate || 8;
            const etfRate = emp.etfRate || 3;
            
            const epfAmt = basicWage * (epfRate / 100);
            const etfAmt = basicWage * (etfRate / 100);

            targetShift.estimatedWages += basicWage;
            targetShift.epfContribution += epfAmt;
            targetShift.etfContribution += etfAmt;
        }
    });

    // 3. Logistics / Trip logs by shift
    const tripFilter = { deletedAt: null, startDate: { $gte: start, $lte: end } };
    if (shiftFilter) tripFilter.shift = shiftFilter;

    const trips = await TripLog.find(tripFilter);
    const logistics = {
        dayShift: { tripsCount: 0, distanceKm: 0, fuelConsumed: 0, cost: 0, items: [] },
        nightShift: { tripsCount: 0, distanceKm: 0, fuelConsumed: 0, cost: 0, items: [] }
    };

    trips.forEach(trip => {
        const isNight = trip.shift === 'night';
        const targetLog = isNight ? logistics.nightShift : logistics.dayShift;

        targetLog.tripsCount++;
        targetLog.distanceKm += trip.distanceKm || 0;
        targetLog.fuelConsumed += trip.fuelConsumed || 0;
        targetLog.cost += trip.totalCost || 0;

        if (trip.itemsTransported && trip.itemsTransported.length > 0) {
            trip.itemsTransported.forEach(item => {
                targetLog.items.push(`${item.item} (${item.quantity} ${item.uom || ''})`);
            });
        }
    });

    // Clean decimals
    const sanitizeObj = (obj) => {
        Object.keys(obj).forEach(k => {
            if (typeof obj[k] === 'number') {
                obj[k] = +obj[k].toFixed(2);
            }
        });
    };

    sanitizeObj(production.dayShift);
    sanitizeObj(production.nightShift);
    sanitizeObj(hr.dayShift);
    sanitizeObj(hr.nightShift);
    sanitizeObj(logistics.dayShift);
    sanitizeObj(logistics.nightShift);

    // Final multi-type response
    const result = {
        period: { start, end },
        dayShift: {
            production: production.dayShift,
            hr: hr.dayShift,
            logistics: logistics.dayShift
        },
        nightShift: {
            production: production.nightShift,
            hr: hr.nightShift,
            logistics: logistics.nightShift
        }
    };

    if (shiftFilter === 'day') {
        res.json({ success: true, data: { period: result.period, dayShift: result.dayShift } });
    } else if (shiftFilter === 'night') {
        res.json({ success: true, data: { period: result.period, nightShift: result.nightShift } });
    } else {
        res.json({ success: true, data: result });
    }
});