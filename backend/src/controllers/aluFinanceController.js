import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';

/** Resolve all Alueco sales order IDs (job cards, invoices, tags, notes, etc.) */
async function getAluecoOrderIds() {
    const AluJobCard = mongoose.model('AluJobCard');
    const SalesOrder = mongoose.model('SalesOrder');
    const Invoice = mongoose.model('Invoice');

    const jobOrderIds = (await AluJobCard.find().select('salesOrderId').lean())
        .map((j) => j.salesOrderId)
        .filter(Boolean);

    const invoiceOrderIds = (await Invoice.find({
        deletedAt: null,
        $or: [
            { businessType: 'alueco' },
            { invoiceNumber: { $regex: /^INV-ALU/i } },
            { notes: { $regex: /Sales Order.*Quotation/i } },
        ],
    }).select('salesOrderIds').lean())
        .flatMap((inv) => inv.salesOrderIds || [])
        .filter(Boolean);

    const salesOrders = await SalesOrder.find({
        $or: [
            { businessType: 'alueco' },
            { quotationId: { $ne: null } },
            { _id: { $in: [...jobOrderIds, ...invoiceOrderIds] } },
            { orderNumber: { $regex: /^SO-ALU/i } },
            { notes: { $regex: /Aluminium Quotation/i } },
        ],
        deletedAt: null,
    })
        .select('_id')
        .lean();

    return salesOrders.map((so) => so._id);
}

/** Build filter for Alueco sales orders */
async function getAluecoSalesOrderFilter() {
    const orderIds = await getAluecoOrderIds();
    return {
        _id: { $in: orderIds },
        deletedAt: null,
    };
}

/** Find payments linked to a sales order (direct field or allocation) */
function getPaymentsForOrder(orderId, payments) {
    const id = String(orderId);
    return payments.filter((p) => {
        if (p.salesOrderId && String(p.salesOrderId) === id) return true;
        return (p.allocations || []).some(
            (a) => a.documentType === 'sales_order' && String(a.documentId) === id
        );
    });
}

/** Apply payment amount to sales order milestones */
function applyPaymentToSalesOrder(so, payAmount, paymentDate) {
    so.totalPaid = +((so.totalPaid || 0) + payAmount).toFixed(2);

    let remaining = payAmount;
    for (const stage of so.paymentSchedule || []) {
        if (stage.status === 'pending' && remaining > 0) {
            if (remaining >= stage.amount) {
                stage.status = 'paid';
                stage.paidAt = paymentDate;
                remaining -= stage.amount;
            } else {
                remaining = 0;
            }
        }
    }

    if (so.totalPaid >= (so.advanceAmount || 0) && !so.advanceReceived) {
        so.advanceReceived = true;
        if (so.productionStatus === 'waiting_payment') {
            so.productionStatus = 'ready_for_production';
        }
    }
}

/** Alueco petty-cash expense filter */
const ALUECO_EXPENSE_FILTER = {
    transactionType: 'expense',
    $or: [
        { isAlueco: true },
        { department: 'Alueco' },
        { category: { $in: ['Site Expense', 'Aluminium Project Expense', 'Labor', 'Transport', 'Materials', 'Scaffolding', 'Equipment Rental', 'Other'] } },
        { refNo: { $regex: /^ALU-EXP/i } },
    ],
};

function mapExpenseRow(e) {
    return {
        ...e,
        voucherNumber: e.refNo || e.voucherNumber || '—',
        description: e.item || e.description || '—',
        paidTo: e.supplier || e.paidTo || '—',
    };
}

/**
 * @desc    Finance overview — income, expenses, receivables, net balance
 * @route   GET /api/alu/finance/summary
 */
export const getAluFinanceSummary = asyncHandler(async (req, res) => {
    const SalesOrder = mongoose.model('SalesOrder');
    const Payment = mongoose.model('Payment');
    const PettyCash = mongoose.model('PettyCash');

    const filter = await getAluecoSalesOrderFilter();
    const salesOrders = await SalesOrder.find(filter).lean();
    const orderIds = salesOrders.map((so) => so._id);

    const payments = await Payment.find({
        $or: [
            { salesOrderId: { $in: orderIds } },
            { isAlueco: true },
            { 'allocations.documentType': 'sales_order', 'allocations.documentId': { $in: orderIds } },
        ],
    }).lean();

    const expenses = await PettyCash.find(ALUECO_EXPENSE_FILTER).lean();

    let totalIncomeCollected = 0;
    let totalProjectValue = 0;
    let totalReceivables = 0;

    for (const so of salesOrders) {
        const orderPayments = getPaymentsForOrder(so._id, payments);
        const fromPayments = orderPayments.reduce((s, p) => s + (p.amount || 0), 0);
        const received = Math.max(so.totalPaid || 0, fromPayments);
        const projectValue = so.grandTotal || 0;
        totalIncomeCollected += received;
        totalProjectValue += projectValue;
        totalReceivables += Math.max(0, projectValue - received);
    }

    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const netBalance = totalIncomeCollected - totalExpenses;

    res.json({
        success: true,
        data: {
            totalIncomeCollected: +totalIncomeCollected.toFixed(2),
            totalExpenses: +totalExpenses.toFixed(2),
            netBalance: +netBalance.toFixed(2),
            totalProjectValue: +totalProjectValue.toFixed(2),
            totalReceivables: +totalReceivables.toFixed(2),
            totalActiveProjects: salesOrders.length,
            expenseCount: expenses.length,
            paymentCount: payments.length,
        },
    });
});

/**
 * @desc    Get Income Tracking for Alueco Projects
 * @route   GET /api/alu/finance/income
 */
export const getAluProjectIncome = asyncHandler(async (req, res) => {
    const SalesOrder = mongoose.model('SalesOrder');
    const Payment = mongoose.model('Payment');

    const filter = await getAluecoSalesOrderFilter();
    const salesOrders = await SalesOrder.find(filter)
        .populate('customerId', 'displayName phone email')
        .sort({ createdAt: -1 })
        .lean();

    const orderIds = salesOrders.map((so) => so._id);

    const payments = await Payment.find({
        $or: [
            { salesOrderId: { $in: orderIds } },
            { isAlueco: true },
            { 'allocations.documentType': 'sales_order', 'allocations.documentId': { $in: orderIds } },
        ],
    })
        .sort({ paymentDate: -1 })
        .lean();

    const projectIncomeSummary = salesOrders.map((so) => {
        const orderPayments = getPaymentsForOrder(so._id, payments);
        const fromPayments = orderPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalReceived = Math.max(so.totalPaid || 0, fromPayments);
        const grandTotal = so.grandTotal || 0;
        const balanceDue = Math.max(0, grandTotal - totalReceived);
        const paymentStatus = totalReceived >= grandTotal && grandTotal > 0
            ? 'Paid'
            : totalReceived > 0
                ? 'Partial'
                : 'Unpaid';

        return {
            salesOrderId: so._id,
            orderNumber: so.orderNumber,
            projectName: so.projectName || so.notes?.match(/Project: (.+)/)?.[1] || 'Aluminium Works',
            customerName: so.customerSnapshot?.name || so.customerName || so.customerId?.displayName || 'N/A',
            projectValue: grandTotal,
            totalReceived,
            balanceDue,
            paymentStatus,
            paymentsCount: orderPayments.length,
            lastPaymentDate: orderPayments[0]?.paymentDate || null,
        };
    });

    const totalRevenueCollected = projectIncomeSummary.reduce((s, p) => s + p.totalReceived, 0);
    const totalPendingReceivables = projectIncomeSummary.reduce((s, p) => s + p.balanceDue, 0);

    const recentPayments = payments.slice(0, 20).map((p) => {
        const alloc = (p.allocations || []).find((a) => a.documentType === 'sales_order');
        const order = salesOrders.find(
            (so) => String(so._id) === String(p.salesOrderId || alloc?.documentId)
        );
        return {
            _id: p._id,
            paymentNumber: p.paymentNumber,
            amount: p.amount,
            method: p.method,
            paymentDate: p.paymentDate,
            partyName: p.partyName,
            orderNumber: order?.orderNumber || alloc?.documentNumber || '—',
            projectName: order?.projectName || '—',
            salesOrderId: p.salesOrderId || alloc?.documentId || null,
        };
    });

    res.json({
        success: true,
        data: {
            summary: {
                totalRevenueCollected,
                totalPendingReceivables,
                totalActiveProjects: salesOrders.length,
            },
            projects: projectIncomeSummary,
            recentPayments,
        },
    });
});

/**
 * @desc    Record customer payment / income for an Alueco project
 * @route   POST /api/alu/finance/income
 */
export const createAluIncome = asyncHandler(async (req, res) => {
    const Payment = mongoose.model('Payment');
    const SalesOrder = mongoose.model('SalesOrder');
    const Invoice = mongoose.model('Invoice');
    const Customer = mongoose.model('Customer');

    const { salesOrderId, amount, paymentDate, method, notes, reference, bankAccountId } = req.body;

    if (!salesOrderId) {
        res.status(400);
        throw new Error('Project is required');
    }
    if (!amount || Number(amount) <= 0) {
        res.status(400);
        throw new Error('Valid payment amount is required');
    }

    const payAmount = Number(amount);
    const so = await SalesOrder.findById(salesOrderId);
    if (!so) {
        res.status(404);
        throw new Error('Project not found');
    }

    const balanceDue = Math.max(0, (so.grandTotal || 0) - (so.totalPaid || 0));
    if (payAmount > balanceDue + 0.01) {
        res.status(400);
        throw new Error(`Amount exceeds balance due (LKR ${balanceDue.toLocaleString()})`);
    }

    const customerId = so.customerId || so.customer;
    let partyName = so.customerSnapshot?.name || so.customerName;
    if (customerId) {
        const customer = await Customer.findById(customerId).lean();
        partyName = customer?.displayName || partyName;
    }

    const payDate = paymentDate ? new Date(paymentDate) : new Date();

    const payment = await Payment.create({
        direction: 'received',
        customerId: customerId || undefined,
        salesOrderId: so._id,
        isAlueco: true,
        partyName: partyName || 'Customer',
        paymentDate: payDate,
        amount: payAmount,
        method: method || 'cash',
        transactionReference: reference || undefined,
        bankAccountId: bankAccountId || undefined,
        notes: notes || `Alueco project payment — ${so.orderNumber}`,
        allocations: [{
            documentType: 'sales_order',
            documentId: so._id,
            documentNumber: so.orderNumber,
            amount: payAmount,
        }],
        receivedBy: req.user._id,
        createdBy: req.user._id,
    });

    applyPaymentToSalesOrder(so, payAmount, payDate);
    await so.save();

    const invoice = await Invoice.findOne({ salesOrderIds: so._id, deletedAt: null });
    if (invoice) {
        invoice.amountPaid = +((invoice.amountPaid || 0) + payAmount).toFixed(2);
        invoice.balanceDue = Math.max(0, (invoice.grandTotal || 0) - invoice.amountPaid);
        invoice.lastPaymentDate = payDate;
        if (invoice.balanceDue <= 0) {
            invoice.paymentStatus = 'paid';
            invoice.fullyPaidAt = payDate;
        } else {
            invoice.paymentStatus = 'partially_paid';
        }
        await invoice.save();
    }

    res.status(201).json({
        success: true,
        data: payment,
        message: `Payment of LKR ${payAmount.toLocaleString()} recorded for ${so.orderNumber}`,
    });
});

/**
 * @desc    Get & Add Alueco Project Expenses
 * @route   GET /api/alu/finance/expenses
 * @route   POST /api/alu/finance/expenses
 */
export const getAluExpenses = asyncHandler(async (req, res) => {
    const PettyCash = mongoose.model('PettyCash');

    const expenses = await PettyCash.find(ALUECO_EXPENSE_FILTER)
        .populate('salesOrderId', 'orderNumber projectName customerName')
        .sort({ date: -1 })
        .lean();

    const mappedExpenses = expenses.map(mapExpenseRow);
    const totalExpense = mappedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const byCategory = {};
    for (const e of mappedExpenses) {
        const cat = e.category || 'Other';
        byCategory[cat] = (byCategory[cat] || 0) + (e.amount || 0);
    }

    res.json({
        success: true,
        data: {
            totalExpense,
            expenseCount: mappedExpenses.length,
            byCategory,
            expenses: mappedExpenses,
        },
    });
});

export const createAluExpense = asyncHandler(async (req, res) => {
    const PettyCash = mongoose.model('PettyCash');
    const { salesOrderId, voucherNumber, date, amount, category, description, paidTo, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
        res.status(400);
        throw new Error('Valid expense amount is required');
    }

    const expense = await PettyCash.create({
        refNo: voucherNumber || `ALU-EXP-${Date.now()}`,
        date: date || new Date(),
        amount: Number(amount),
        category: category || 'Site Expense',
        item: description || 'Alueco Project Operational Expense',
        supplier: paidTo || 'Vendor/Worker',
        transactionType: 'expense',
        department: 'Alueco',
        isAlueco: true,
        salesOrderId: salesOrderId || null,
        paymentMethod: paymentMethod || 'Cash',
        status: 'approved',
        createdBy: req.user._id,
    });

    res.status(201).json({
        success: true,
        data: mapExpenseRow(expense.toObject()),
    });
});

/**
 * @desc    List Alueco projects for finance dropdowns
 * @route   GET /api/alu/finance/projects
 */
export const getAluFinanceProjects = asyncHandler(async (req, res) => {
    const SalesOrder = mongoose.model('SalesOrder');
    const filter = await getAluecoSalesOrderFilter();

    const projects = await SalesOrder.find(filter)
        .populate('customerId', 'displayName')
        .select('orderNumber projectName customerName customerSnapshot grandTotal totalPaid')
        .sort({ createdAt: -1 })
        .lean();

    res.json({
        success: true,
        data: projects.map((so) => ({
            salesOrderId: so._id,
            orderNumber: so.orderNumber,
            projectName: so.projectName || 'Aluminium Works',
            customerName: so.customerSnapshot?.name || so.customerName || so.customerId?.displayName || 'N/A',
            projectValue: so.grandTotal || 0,
            totalReceived: so.totalPaid || 0,
            balanceDue: Math.max(0, (so.grandTotal || 0) - (so.totalPaid || 0)),
        })),
    });
});

/**
 * @desc    Get Project Invoices for Alueco
 * @route   GET /api/alu/finance/invoices
 */
export const getAluProjectInvoices = asyncHandler(async (req, res) => {
    const Invoice = mongoose.model('Invoice');
    const orderIds = await getAluecoOrderIds();

    const invoices = await Invoice.find({
        $or: [
            { businessType: 'alueco' },
            { salesOrderIds: { $in: orderIds } },
            { invoiceNumber: { $regex: /^INV-ALU/i } },
            { notes: { $regex: /Sales Order.*Quotation/i } },
        ],
        deletedAt: null,
    })
        .populate('customerId', 'displayName phone email')
        .populate('salesOrderIds', 'orderNumber projectName')
        .sort({ invoiceDate: -1 })
        .lean();

    const mapped = invoices.map((inv) => ({
        ...inv,
        customerName: inv.customerName || inv.customerSnapshot?.name || inv.customerId?.displayName || 'N/A',
        balanceDue: inv.balanceDue ?? Math.max(0, (inv.grandTotal || 0) - (inv.amountPaid || 0)),
    }));

    res.json({
        success: true,
        data: mapped,
    });
});

/**
 * @desc    Automated Profit Margin Engine per Project
 * @route   GET /api/alu/finance/profit-engine
 */
export const calculateProjectProfitMargins = asyncHandler(async (req, res) => {
    const SalesOrder = mongoose.model('SalesOrder');
    const StockMovement = mongoose.model('StockMovement');
    const PettyCash = mongoose.model('PettyCash');
    const AluQuotation = mongoose.model('AluQuotation');

    const filter = await getAluecoSalesOrderFilter();
    const salesOrders = await SalesOrder.find(filter)
        .populate('quotationId')
        .sort({ createdAt: -1 })
        .lean();

    const results = [];

    for (const so of salesOrders) {
        const quotation = so.quotationId || (so.quotationId ? await AluQuotation.findById(so.quotationId).lean() : null);

        const revenue = so.grandTotal || quotation?.finalSellingPrice || quotation?.calculatedSellingPrice || 0;

        const movements = await StockMovement.find({
            'sourceDocument.id': so._id,
            movementType: 'production_issue',
        }).lean();

        const actualMaterialCost = movements.reduce((sum, m) => sum + ((m.quantity || 0) * (m.costPerUnit || 0)), 0);
        const estimatedMaterialCost = (quotation?.totalAluminiumCost || 0) + (quotation?.totalGlassCost || 0) + (quotation?.totalAccessoriesCost || 0);
        const materialCost = actualMaterialCost > 0 ? actualMaterialCost : estimatedMaterialCost;

        const laborCost = quotation?.totalLabourCost || 0;
        const transportCost = quotation?.transportCost || 0;

        const projectExpenses = await PettyCash.find({
            $or: [
                { salesOrderId: so._id },
                { isAlueco: true, salesOrderId: so._id },
            ],
        }).lean();
        const siteExpensesCost = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        const totalDirectCost = materialCost + laborCost + transportCost + siteExpensesCost;
        const netProfit = revenue - totalDirectCost;
        const profitMarginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        results.push({
            salesOrderId: so._id,
            orderNumber: so.orderNumber,
            projectName: so.projectName || 'Aluminium Installation',
            customerName: so.customerSnapshot?.name || so.customerName || 'Client',
            status: so.status || 'In Progress',
            revenue: parseFloat(revenue.toFixed(2)),
            costBreakdown: {
                materialCost: parseFloat(materialCost.toFixed(2)),
                laborCost: parseFloat(laborCost.toFixed(2)),
                transportCost: parseFloat(transportCost.toFixed(2)),
                siteExpensesCost: parseFloat(siteExpensesCost.toFixed(2)),
                totalDirectCost: parseFloat(totalDirectCost.toFixed(2)),
            },
            netProfit: parseFloat(netProfit.toFixed(2)),
            profitMarginPercent: parseFloat(profitMarginPercent.toFixed(2)),
        });
    }

    const totalRevenue = results.reduce((s, r) => s + r.revenue, 0);
    const totalCost = results.reduce((s, r) => s + r.costBreakdown.totalDirectCost, 0);
    const overallNetProfit = totalRevenue - totalCost;
    const overallMarginPercent = totalRevenue > 0 ? (overallNetProfit / totalRevenue) * 100 : 0;

    res.json({
        success: true,
        data: {
            overallSummary: {
                totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                totalCost: parseFloat(totalCost.toFixed(2)),
                overallNetProfit: parseFloat(overallNetProfit.toFixed(2)),
                overallMarginPercent: parseFloat(overallMarginPercent.toFixed(2)),
                projectCount: results.length,
            },
            projects: results,
        },
    });
});
