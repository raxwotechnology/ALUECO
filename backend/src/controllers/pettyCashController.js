import asyncHandler from 'express-async-handler';
import PettyCash from '../models/PettyCash.js';
import DailyPnL from '../models/DailyPnL.js';
import { createAuditLog } from '../utils/auditLogger.js';
import excelService from '../services/excelService.js';
import { getIO } from '../services/socketService.js';

const broadcastPettyCashBalance = async () => {
    try {
        const [summary] = await PettyCash.aggregate([
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
            },
            {
                $addFields: {
                    runningBalance: { $subtract: ['$totalReceipts', '$totalExpenses'] }
                }
            }
        ]);
        const balance = summary ? summary.runningBalance : 0;
        const io = getIO();
        io.emit('petty_cash_balance', { balance });
    } catch (err) {
        console.warn('[PettyCash Socket] Error:', err.message);
    }
};

/**
 * Automatically maps approved petty cash expenses for a specific date to the Daily P&L.
 */
export const syncPettyCashToPnL = async (dateInput) => {
    try {
        if (!dateInput) return;
        const dateObj = new Date(dateInput);
        const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

        // Fetch all approved petty cash expenses for this day
        const expenses = await PettyCash.find({
            date: { $gte: startOfDay, $lte: endOfDay },
            transactionType: 'expense',
            status: 'approved',
            deletedAt: null
        });

        // Sum amounts per category
        let rawMaterial = 0;
        let labourSalary = 0;
        let supervisorQC = 0;
        let electricity = 0;
        let firewood = 0;
        let packing = 0;
        let transport = 0;
        let communication = 0;
        let other = 0;

        for (const exp of expenses) {
            const cat = exp.category;
            const amt = exp.amount || 0;
            if (cat === 'Row materials') {
                rawMaterial += amt;
            } else if (cat === 'Chemicals') {
                other += amt;
            } else if (cat === 'Transport') {
                transport += amt;
            } else if (cat === 'Welfare') {
                other += amt;
            } else if (cat === 'Fuel') {
                transport += amt;
            } else if (cat === 'Maintenance') {
                other += amt;
            } else if (cat === 'Stationery') {
                communication += amt;
            } else if (cat === 'Misc wages') {
                labourSalary += amt;
            } else if (cat === 'Wood') {
                firewood += amt;
            } else if (cat === 'Packing material') {
                packing += amt;
            }
        }

        // Find or create DailyPnL for this day
        let pnlRecord = await DailyPnL.findOne({
            date: { $gte: startOfDay, $lte: endOfDay },
            deletedAt: null
        });

        if (!pnlRecord) {
            pnlRecord = new DailyPnL({
                date: startOfDay,
                day: startOfDay.getDate(),
                rawMaterial,
                labourSalary,
                supervisorQC: 0,
                electricity: 0,
                firewood,
                packing,
                transport,
                communication,
                other,
                totalRevenue: 0,
            });
        } else {
            pnlRecord.rawMaterial = rawMaterial;
            pnlRecord.labourSalary = labourSalary;
            pnlRecord.firewood = firewood;
            pnlRecord.packing = packing;
            pnlRecord.transport = transport;
            pnlRecord.communication = communication;
            pnlRecord.other = other;
        }

        const expenseFields = ['rawMaterial', 'labourSalary', 'supervisorQC', 'electricity', 'firewood', 'packing', 'transport', 'communication', 'other'];
        pnlRecord.totalExpenses = expenseFields.reduce((acc, field) => acc + (pnlRecord[field] || 0), 0);
        pnlRecord.netProfit = (pnlRecord.totalRevenue || 0) - pnlRecord.totalExpenses;

        await pnlRecord.save();
        
        // Sync to Excel
        await excelService.updateExcelRow('pnl', pnlRecord.toObject());
        console.log(`[PettyCash Sync] Synced P&L for date ${startOfDay.toISOString().split('T')[0]}`);
    } catch (error) {
        console.error(`[PettyCash Sync] Failed to sync to P&L:`, error.message);
    }
};

/**
 * @desc    Submit a petty cash expense or replenishment
 * @route   POST /api/finance/petty-cash
 * @access  Private
 */
export const createPettyCashEntry = asyncHandler(async (req, res) => {
    const txType = req.body.transactionType || 'expense';
    const entry = await PettyCash.create({
        ...req.body,
        createdBy: req.user._id,
        status: txType === 'expense' ? 'pending' : 'approved'
    });

    createAuditLog({
        action: 'create',
        module: 'finance',
        documentId: entry._id,
        description: `New petty cash ${entry.transactionType}: ${entry.item || entry.description || ''} (${entry.amount})`,
        req
    });

    res.status(201).json({ success: true, data: entry });
    
    // Sync to Excel
    excelService.appendExcelRow('petty_cash', entry.toObject()).catch(console.error);
    broadcastPettyCashBalance();

    if (entry.status === 'approved' && entry.transactionType === 'expense') {
        syncPettyCashToPnL(entry.date).catch(console.error);
    }
});

/**
 * @desc    Get petty cash ledger
 * @route   GET /api/finance/petty-cash
 * @access  Private
 */
export const getPettyCashEntries = asyncHandler(async (req, res) => {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = { deletedAt: null };
    if (status) filter.status = status;
    if (type) filter.type = type;
    const skip = (Number(page) - 1) * Number(limit);
    const [entries, total] = await Promise.all([
        PettyCash.find(filter)
            .populate('createdBy', 'firstName lastName')
            .sort({ date: -1 })
            .skip(skip)
            .limit(Number(limit)),
        PettyCash.countDocuments(filter)
    ]);
    res.json({ success: true, data: entries, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// Get a single petty cash entry by ID
export const getPettyCashEntryById = asyncHandler(async (req, res) => {
    const entry = await PettyCash.findOne({ _id: req.params.id, deletedAt: null })
        .populate('createdBy', 'firstName lastName');
    if (!entry) {
        res.status(404);
        throw new Error('Petty cash entry not found');
    }
    res.json({ success: true, data: entry });
});

// Update a petty cash entry
export const updatePettyCashEntry = asyncHandler(async (req, res) => {
    const oldEntry = await PettyCash.findOne({ _id: req.params.id, deletedAt: null });
    if (!oldEntry) {
        res.status(404);
        throw new Error('Petty cash entry not found');
    }

    const entry = await PettyCash.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { ...req.body, runValidators: true }, { new: true });
    if (!entry) {
        res.status(404);
        throw new Error('Petty cash entry not found');
    }
    createAuditLog({
        action: 'update',
        module: 'finance',
        documentId: entry._id,
        description: `Updated petty cash entry ${entry.refNo || entry._id}`,
        req
    });
    res.json({ success: true, data: entry });

    // Sync to Excel
    excelService.updateExcelRow('petty_cash', entry.toObject()).catch(console.error);
    broadcastPettyCashBalance();

    if (oldEntry.transactionType === 'expense' || entry.transactionType === 'expense') {
        syncPettyCashToPnL(oldEntry.date).catch(console.error);
        if (oldEntry.date && entry.date && new Date(oldEntry.date).toISOString().split('T')[0] !== new Date(entry.date).toISOString().split('T')[0]) {
            syncPettyCashToPnL(entry.date).catch(console.error);
        }
    }
});

// Soft delete a petty cash entry
export const deletePettyCashEntry = asyncHandler(async (req, res) => {
    const entry = await PettyCash.findOne({ _id: req.params.id, deletedAt: null });
    if (!entry) {
        res.status(404);
        throw new Error('Petty cash entry not found');
    }
    entry.deletedAt = new Date();
    await entry.save();
    createAuditLog({
        action: 'delete',
        module: 'finance',
        documentId: entry._id,
        description: `Deleted petty cash entry ${entry.refNo || entry._id}`,
        req
    });
    res.json({ success: true, message: 'Petty cash entry deleted' });
    
    // Sync to Excel
    excelService.deleteExcelRow('petty_cash', entry.toObject()).catch(console.error);
    broadcastPettyCashBalance();

    if (entry.transactionType === 'expense' && entry.status === 'approved') {
        syncPettyCashToPnL(entry.date).catch(console.error);
    }
});

/**
 * @desc    Approve/Reject petty cash expense
 * @route   PUT /api/finance/petty-cash/:id/status
 * @access  Private/Admin
 */
export const updatePettyCashStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const entry = await PettyCash.findByIdAndUpdate(
        req.params.id,
        { status, approvedBy: req.user._id },
        { new: true }
    );

    if (!entry) {
        res.status(404);
        throw new Error('Entry not found');
    }

    createAuditLog({
        action: 'update',
        module: 'finance',
        documentId: entry._id,
        description: `Petty cash entry ${status} by ${req.user.firstName}`,
        req
    });

    res.json({ success: true, data: entry });
    broadcastPettyCashBalance();

    if (entry.transactionType === 'expense') {
        syncPettyCashToPnL(entry.date).catch(console.error);
    }
});

/**
 * @desc    Get petty cash running balance and per-category breakdown
 * @route   GET /api/finance/petty-cash/balance
 * @access  Private
 *
 * Running Balance = Σ(receipt amounts) − Σ(expense amounts)
 */
export const getPettyCashBalance = asyncHandler(async (req, res) => {
    const { poolId = 'MAIN' } = req.query;

    const [summary] = await PettyCash.aggregate([
        { $match: { deletedAt: null, poolId } },
        { $sort:  { date: 1, createdAt: 1 } },
        {
            $group: {
                _id: null,
                totalReceipts: {
                    $sum: { $cond: [{ $eq: ['$transactionType', 'receipt'] }, '$amount', 0] }
                },
                totalExpenses: {
                    $sum: { $cond: [{ $eq: ['$transactionType', 'expense'] }, '$amount', 0] }
                },
                rawMaterials: { $sum: '$rawMaterial_cost' },
                chemicals:    { $sum: '$chemicals' },
                transport:    { $sum: '$transport' },
                welfare:      { $sum: '$welfare' },
                fuel:         { $sum: '$fuel' },
                maintenance:  { $sum: '$maintenance' },
                stationery:   { $sum: '$stationary' },
                miscWages:    { $sum: '$miscWages' },
                wood:         { $sum: '$wood' },
                packing:      { $sum: '$packingMaterials' },
                entryCount:   { $sum: 1 },
            }
        },
        {
            $addFields: {
                runningBalance: { $subtract: ['$totalReceipts', '$totalExpenses'] }
            }
        }
    ]);

    if (!summary) {
        return res.json({
            success: true,
            data: { poolId, totalReceipts: 0, totalExpenses: 0, runningBalance: 0, categories: {} }
        });
    }

    res.json({
        success: true,
        data: {
            poolId,
            totalReceipts:  summary.totalReceipts,
            totalExpenses:  summary.totalExpenses,
            runningBalance: summary.runningBalance,
            entryCount:     summary.entryCount,
            categories: {
                rawMaterials: summary.rawMaterials,
                chemicals:    summary.chemicals,
                transport:    summary.transport,
                welfare:      summary.welfare,
                fuel:         summary.fuel,
                maintenance:  summary.maintenance,
                stationery:   summary.stationery,
                miscWages:    summary.miscWages,
                wood:         summary.wood,
                packing:      summary.packing,
            }
        }
    });
});
