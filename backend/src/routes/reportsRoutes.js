import express from 'express';
import {
    getDashboardKpis, getRevenueChart, getTopProducts, getTopCustomers,
} from '../controllers/dashboardController.js';
import {
    getSalesSummary, getSalesByProduct, getSalesByCustomer, getSalesTrend,
} from '../controllers/reports/salesReportsController.js';
import {
    getStockValuation, getStockMovement, getSlowFastMovers, getLowStockReport,
} from '../controllers/reports/inventoryReportsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
    getPnLRecords, createPnLRecord, updatePnLRecord, deletePnLRecord
} from '../controllers/dailyPnLController.js';
import {
    getProductionSummary, getProductionByProduct, getProductionWastage,
} from '../controllers/reports/productionReportsController.js';
import {
    getReturnsSummary, getDamagesReport,
} from '../controllers/reports/returnsReportsController.js';
import {
    getFinancialSnapshot,
    getTargets,
    setTarget,
    getVarianceReport,
    getSalesComparison,
    getShiftWiseReport,
} from '../controllers/reports/financialReportsController.js';
import {
    getHeadcountReport, getAttendanceReport, getLeavePatternsReport, getPayrollSummaryReport,
} from '../controllers/reports/hrReportsController.js';

const router = express.Router();
router.use(protect);

// Production
router.get('/production/summary', requirePermission('reports.production'), getProductionSummary);
router.get('/production/by-product', requirePermission('reports.production'), getProductionByProduct);
router.get('/production/wastage', requirePermission('reports.production'), getProductionWastage);

// Returns & Damages
router.get('/returns/summary', requirePermission('reports.sales'), getReturnsSummary);
router.get('/damages/summary', requirePermission('reports.inventory'), getDamagesReport);

// Financial
router.get('/financial/snapshot', requirePermission('reports.financial'), getFinancialSnapshot);
router.get('/financial/targets', requirePermission('reports.financial'), getTargets);
router.post('/financial/targets', requirePermission('reports.financial'), setTarget);
router.get('/financial/variance', requirePermission('reports.financial'), getVarianceReport);
router.get('/financial/comparison', requirePermission('reports.financial'), getSalesComparison);
router.get('/pnl/records', requirePermission('reports.financial'), getPnLRecords);
router.post('/pnl/records', requirePermission('reports.financial'), createPnLRecord);
router.put('/pnl/records/:id', requirePermission('reports.financial'), updatePnLRecord);
router.delete('/pnl/records/:id', requirePermission('reports.financial'), deletePnLRecord);

// HR
router.get('/hr/headcount', requirePermission('reports.hr'), getHeadcountReport);
router.get('/hr/attendance-summary', requirePermission('reports.hr'), getAttendanceReport);
router.get('/hr/leave-patterns', requirePermission('reports.hr'), getLeavePatternsReport);
router.get('/hr/payroll-summary', requirePermission('reports.hr'), getPayrollSummaryReport);
router.get('/hr/shift-wise', requirePermission('reports.hr'), getShiftWiseReport);

// Dashboard
router.get('/dashboard/kpis', requirePermission('dashboard.view'), getDashboardKpis);
router.get('/dashboard/revenue-chart', requirePermission('dashboard.view'), getRevenueChart);
router.get('/dashboard/top-products', requirePermission('dashboard.view'), getTopProducts);
router.get('/dashboard/top-customers', requirePermission('dashboard.view'), getTopCustomers);

// Sales reports
router.get('/sales/summary', requirePermission('reports.sales'), getSalesSummary);
router.get('/sales/by-product', requirePermission('reports.sales'), getSalesByProduct);
router.get('/sales/by-customer', requirePermission('reports.sales'), getSalesByCustomer);
router.get('/sales/trend', requirePermission('reports.sales'), getSalesTrend);

// Inventory reports
router.get('/inventory/valuation', requirePermission('reports.inventory'), getStockValuation);
router.get('/inventory/movement', requirePermission('reports.inventory'), getStockMovement);
router.get('/inventory/slow-fast-movers', requirePermission('reports.inventory'), getSlowFastMovers);
router.get('/inventory/low-stock', requirePermission('reports.inventory'), getLowStockReport);

// ── ALE: COGS & Production Efficiency Reports ──────────────────────────────────
import ProductionBatch from '../models/ProductionBatch.js';
import Invoice from '../models/Invoice.js';
import PettyCash from '../models/PettyCash.js';

/**
 * @route   GET /api/reports/production/cogs
 * @desc    Dynamic COGS calculation per production batch
 *          COGS = RawMaterialCost + Firewood + Packing + Transport (from petty cash)
 * @access  Private / reports.financial
 */
router.get('/production/cogs', requirePermission('reports.financial'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const matchDate = {};
        if (startDate) matchDate.$gte = new Date(startDate);
        if (endDate)   matchDate.$lte = new Date(endDate);

        const batchFilter = { deletedAt: null };
        if (startDate || endDate) batchFilter.date = matchDate;

        const batches = await ProductionBatch.find(batchFilter)
            .select('batchNo date product inputWeight_total outputWeight_total efficiencyPercentage firewoodKg_day firewoodKg_night processingStage qcStatus supplierId')
            .populate('supplierId', 'displayName supplierShortCode isOwnFarm internalTransferPrice')
            .sort({ date: -1 });

        // Get petty cash daily totals for the period (wood + packing + transport)
        const cashFilter = { deletedAt: null, transactionType: 'expense' };
        if (startDate || endDate) cashFilter.date = matchDate;

        const [cashSummary] = await PettyCash.aggregate([
            { $match: cashFilter },
            {
                $group: {
                    _id:       { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                    wood:      { $sum: '$wood' },
                    packing:   { $sum: '$packingMaterials' },
                    transport: { $sum: '$transport' },
                }
            }
        ]);

        // Map cash data by date
        const cashByDate = {};
        if (Array.isArray(cashSummary)) {
            cashSummary.forEach(d => { cashByDate[d._id] = d; });
        }

        const result = batches.map(b => {
            const dateKey   = b.date ? b.date.toISOString().slice(0, 10) : null;
            const dayExpenses = cashByDate[dateKey] || {};

            // Raw material cost: use supplier's internalTransferPrice if Own Farm, else estimate
            const ratePerKg = b.supplierId?.isOwnFarm
                ? (b.supplierId.internalTransferPrice || 0)
                : 0; // Enrich from GRN in future

            const firewoodKgTotal = (b.firewoodKg_day || 0) + (b.firewoodKg_night || 0);

            return {
                batchNo:             b.batchNo,
                date:                b.date,
                product:             b.product,
                inputKg:             b.inputWeight_total,
                outputKg:            b.outputWeight_total,
                efficiencyPct:       b.efficiencyPercentage,
                qcStatus:            b.qcStatus,
                costs: {
                    rawMaterial:  parseFloat((b.inputWeight_total * ratePerKg).toFixed(2)),
                    wood:         dayExpenses.wood      || 0,
                    packing:      dayExpenses.packing   || 0,
                    transport:    dayExpenses.transport || 0,
                    total:        parseFloat(((b.inputWeight_total * ratePerKg) + (dayExpenses.wood || 0) + (dayExpenses.packing || 0) + (dayExpenses.transport || 0)).toFixed(2)),
                },
                cogPerKg: b.outputWeight_total > 0
                    ? parseFloat((((b.inputWeight_total * ratePerKg) + (dayExpenses.wood || 0) + (dayExpenses.packing || 0) + (dayExpenses.transport || 0)) / b.outputWeight_total).toFixed(2))
                    : 0,
            };
        });

        res.json({ success: true, data: result, count: result.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * @route   GET /api/reports/financial/pnl-safe
 * @desc    P&L revenue — STRICTLY excludes proforma invoices
 *          Only 'commercial' invoices with paymentStatus='paid' count as revenue
 * @access  Private / reports.financial
 */
router.get('/financial/pnl-safe', requirePermission('reports.financial'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const match = {
            invoiceType:   { $ne: 'proforma' },  // ← CRITICAL: exclude proformas
            paymentStatus: 'paid',
            deletedAt:     null,
        };
        if (startDate || endDate) {
            match.invoiceDate = {};
            if (startDate) match.invoiceDate.$gte = new Date(startDate);
            if (endDate)   match.invoiceDate.$lte = new Date(endDate);
        }

        const [revenue] = await Invoice.aggregate([
            { $match: match },
            {
                $group: {
                    _id:          null,
                    totalRevenue: { $sum: '$grandTotal' },
                    invoiceCount: { $sum: 1 },
                    avgOrderVal:  { $avg: '$grandTotal' },
                }
            }
        ]);

        res.json({
            success: true,
            note: 'Proforma invoices are excluded. Only paid commercial invoices are counted.',
            data: revenue || { totalRevenue: 0, invoiceCount: 0, avgOrderVal: 0 }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;