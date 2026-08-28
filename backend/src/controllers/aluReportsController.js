import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';

/**
 * @desc    Get Project-wise Profit & Loss (P&L) Report
 * @route   GET /api/alu/reports/project-pnl
 * @access  Private
 */
export const getProjectWisePnLReport = asyncHandler(async (req, res) => {
    const SalesOrder = mongoose.model('SalesOrder');
    const StockMovement = mongoose.model('StockMovement');
    const PettyCash = mongoose.model('PettyCash');
    const AluQuotation = mongoose.model('AluQuotation');

    const salesOrders = await SalesOrder.find({
        $or: [
            { businessType: 'alueco' },
            { quotationId: { $ne: null } }
        ]
    })
    .populate('quotationId')
    .sort({ createdAt: -1 })
    .lean();

    const report = [];

    for (const so of salesOrders) {
        const quotation = so.quotationId || (await AluQuotation.findById(so.quotationId).lean());
        const revenue = so.grandTotal || quotation?.finalSellingPrice || 0;

        // Actual Material Issued
        const movements = await StockMovement.find({
            'sourceDocument.id': so._id,
            movementType: 'production_issue'
        }).lean();
        const materialCost = movements.reduce((sum, m) => sum + ((m.quantity || 0) * (m.costPerUnit || 0)), 0) ||
                             ((quotation?.totalAluminiumCost || 0) + (quotation?.totalGlassCost || 0) + (quotation?.totalAccessoriesCost || 0));

        const laborCost = quotation?.totalLabourCost || 0;
        const transportCost = quotation?.transportCost || 0;

        const expenses = await PettyCash.find({ salesOrderId: so._id }).lean();
        const siteExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        const totalDirectCost = materialCost + laborCost + transportCost + siteExpenses;
        const grossProfit = revenue - (materialCost + laborCost);
        const netProfit = revenue - totalDirectCost;
        const netMarginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        report.push({
            salesOrderId: so._id,
            orderNumber: so.orderNumber,
            projectName: so.projectName || 'Aluminium Works',
            customerName: so.customerSnapshot?.name || so.customerName || 'Client',
            contractValue: revenue,
            materialCost: parseFloat(materialCost.toFixed(2)),
            laborCost: parseFloat(laborCost.toFixed(2)),
            transportCost: parseFloat(transportCost.toFixed(2)),
            siteExpenses: parseFloat(siteExpenses.toFixed(2)),
            totalDirectCost: parseFloat(totalDirectCost.toFixed(2)),
            grossProfit: parseFloat(grossProfit.toFixed(2)),
            netProfit: parseFloat(netProfit.toFixed(2)),
            netMarginPercent: parseFloat(netMarginPercent.toFixed(2))
        });
    }

    res.json({
        success: true,
        data: report
    });
});

/**
 * @desc    Standalone Separated Reporting Engine for Alueco Data
 * @route   GET /api/alu/reports/analytics
 * @access  Private
 */
export const getAluSeparatedAnalytics = asyncHandler(async (req, res) => {
    const SalesOrder = mongoose.model('SalesOrder');
    const StockItem = mongoose.model('StockItem');
    const Product = mongoose.model('Product');
    const AluScrap = mongoose.model('AluScrap');

    // 1. Aluminium Products & Stock
    const aluProducts = await Product.find({
        $or: [
            { businessType: 'alueco' },
            { productType: 'raw_material' },
            { category: 'Aluminium Stock' }
        ]
    }).lean();

    const aluProductIds = aluProducts.map(p => p._id);
    const stockItems = await StockItem.find({ productId: { $in: aluProductIds } }).lean();

    const totalStockValuation = stockItems.reduce((sum, s) => sum + ((s.quantity || 0) * (s.averageCost || 0)), 0);

    // 2. Total Alueco Sales
    const aluecoOrders = await SalesOrder.find({
        $or: [
            { businessType: 'alueco' },
            { quotationId: { $ne: null } }
        ]
    }).lean();

    const totalSalesVolume = aluecoOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    // 3. Scrap Inventory Stats
    const scrapItems = await AluScrap.find({ status: 'available' }).lean();
    const totalScrapLengthMm = scrapItems.reduce((sum, sc) => sum + (sc.lengthMm || 0), 0);

    res.json({
        success: true,
        data: {
            totalStockValuation: parseFloat(totalStockValuation.toFixed(2)),
            totalSalesVolume: parseFloat(totalSalesVolume.toFixed(2)),
            totalScrapLengthMeters: parseFloat((totalScrapLengthMm / 1000).toFixed(2)),
            activeProjectsCount: aluecoOrders.length,
            totalRawMaterialTypes: aluProducts.length
        }
    });
});

/**
 * @desc    Supplier Payables & Customer Receivables Aging Report for Alueco
 * @route   GET /api/alu/reports/aging
 * @access  Private
 */
export const getSupplierAndCustomerAging = asyncHandler(async (req, res) => {
    const Bill = mongoose.model('Bill');
    const SalesOrder = mongoose.model('SalesOrder');
    const Payment = mongoose.model('Payment');

    const now = new Date();

    // 1. Supplier Payables Aging
    const unpaidBills = await Bill.find({
        status: { $in: ['unpaid', 'partially_paid'] }
    }).populate('supplierId', 'displayName phone').lean();

    const supplierAging = {
        current_0_30: 0,
        days_31_60: 0,
        days_61_90: 0,
        days_90_plus: 0,
        totalOutstanding: 0,
        bills: []
    };

    unpaidBills.forEach(bill => {
        const due = bill.dueDate ? new Date(bill.dueDate) : new Date(bill.billDate || bill.createdAt);
        const diffDays = Math.floor((now - due) / (1000 * 60 * 60 * 24));
        const amount = bill.balanceDue || (bill.grandTotal - (bill.amountPaid || 0));

        if (amount > 0) {
            supplierAging.totalOutstanding += amount;
            if (diffDays <= 30) supplierAging.current_0_30 += amount;
            else if (diffDays <= 60) supplierAging.days_31_60 += amount;
            else if (diffDays <= 90) supplierAging.days_61_90 += amount;
            else supplierAging.days_90_plus += amount;

            supplierAging.bills.push({
                billId: bill._id,
                billNumber: bill.billNumber,
                supplierName: bill.supplierId?.displayName || bill.supplierSnapshot?.name || 'Vendor',
                dueDate: bill.dueDate,
                diffDays: diffDays > 0 ? diffDays : 0,
                amountDue: amount
            });
        }
    });

    // 2. Customer Receivables Aging (Projects)
    const salesOrders = await SalesOrder.find({
        $or: [
            { businessType: 'alueco' },
            { quotationId: { $ne: null } }
        ]
    }).lean();

    const orderIds = salesOrders.map(so => so._id);
    const payments = await Payment.find({ salesOrderId: { $in: orderIds } }).lean();

    const customerAging = {
        current_0_30: 0,
        days_31_60: 0,
        days_61_90: 0,
        days_90_plus: 0,
        totalOutstanding: 0,
        receivables: []
    };

    salesOrders.forEach(so => {
        const orderPayments = payments.filter(p => String(p.salesOrderId) === String(so._id));
        const totalPaid = orderPayments.reduce((s, p) => s + (p.amount || 0), 0);
        const amountDue = Math.max(0, (so.grandTotal || 0) - totalPaid);

        if (amountDue > 0) {
            const created = new Date(so.createdAt);
            const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));

            customerAging.totalOutstanding += amountDue;
            if (diffDays <= 30) customerAging.current_0_30 += amountDue;
            else if (diffDays <= 60) customerAging.days_31_60 += amountDue;
            else if (diffDays <= 90) customerAging.days_61_90 += amountDue;
            else customerAging.days_90_plus += amountDue;

            customerAging.receivables.push({
                salesOrderId: so._id,
                orderNumber: so.orderNumber,
                projectName: so.projectName || 'Aluminium Works',
                customerName: so.customerSnapshot?.name || so.customerName || 'Client',
                diffDays,
                amountDue
            });
        }
    });

    res.json({
        success: true,
        data: {
            supplierAging: {
                ...supplierAging,
                current_0_30: parseFloat(supplierAging.current_0_30.toFixed(2)),
                days_31_60: parseFloat(supplierAging.days_31_60.toFixed(2)),
                days_61_90: parseFloat(supplierAging.days_61_90.toFixed(2)),
                days_90_plus: parseFloat(supplierAging.days_90_plus.toFixed(2)),
                totalOutstanding: parseFloat(supplierAging.totalOutstanding.toFixed(2))
            },
            customerAging: {
                ...customerAging,
                current_0_30: parseFloat(customerAging.current_0_30.toFixed(2)),
                days_31_60: parseFloat(customerAging.days_31_60.toFixed(2)),
                days_61_90: parseFloat(customerAging.days_61_90.toFixed(2)),
                days_90_plus: parseFloat(customerAging.days_90_plus.toFixed(2)),
                totalOutstanding: parseFloat(customerAging.totalOutstanding.toFixed(2))
            }
        }
    });
});
