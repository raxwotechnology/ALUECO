import DailyPnL from '../models/DailyPnL.js';
import SalesOrder from '../models/SalesOrder.js';
import ProductionBatch from '../models/ProductionBatch.js';
import PettyCash from '../models/PettyCash.js';
import excelService from '../services/excelService.js';

export const getPnLRecords = async (req, res) => {
    try {
        const records = await DailyPnL.find().sort({ date: -1 });
        res.json({ success: true, data: records });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPnLRecord = async (req, res) => {
    try {
        const { date, ...expenses } = req.body;
        
        // Calculate totals
        const totalExpenses = Object.values(expenses).reduce((acc, v) => acc + (Number(v) || 0), 0) - (Number(expenses.totalRevenue) || 0);
        // Wait, totalExpenses should only include expense fields. 
        // Let's be more explicit.
        const expenseFields = ['rawMaterial', 'labourSalary', 'supervisorQC', 'electricity', 'firewood', 'packing', 'transport', 'communication', 'other'];
        const totalExp = expenseFields.reduce((acc, field) => acc + (Number(req.body[field]) || 0), 0);
        const revenue = Number(req.body.totalRevenue) || 0;
        const netProfit = revenue - totalExp;

        const record = await DailyPnL.create({
            ...req.body,
            totalExpenses: totalExp,
            netProfit: netProfit,
            createdBy: req.user._id
        });

        // Sync to Excel
        await excelService.updateExcelRow('pnl', record);

        res.status(201).json({ success: true, data: record });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePnLRecord = async (req, res) => {
    try {
        const expenseFields = ['rawMaterial', 'labourSalary', 'supervisorQC', 'electricity', 'firewood', 'packing', 'transport', 'communication', 'other'];
        const totalExp = expenseFields.reduce((acc, field) => acc + (Number(req.body[field]) || 0), 0);
        const revenue = Number(req.body.totalRevenue) || 0;
        const netProfit = revenue - totalExp;

        const record = await DailyPnL.findByIdAndUpdate(
            req.params.id,
            { ...req.body, totalExpenses: totalExp, netProfit: netProfit },
            { new: true }
        );

        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

        // Sync to Excel
        await excelService.updateExcelRow('pnl', record);

        res.json({ success: true, data: record });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deletePnLRecord = async (req, res) => {
    try {
        const record = await DailyPnL.findByIdAndDelete(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

        // Sync to Excel (Delete row)
        await excelService.deleteExcelRow('pnl', record);

        res.json({ success: true, message: 'Record deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDailyPnLCalculation = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date parameter is required' });
        }

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        // 1. Revenue: Sales orders from that day (approved / non-draft, non-cancelled)
        const orders = await SalesOrder.find({
            deletedAt: null,
            orderDate: { $gte: start, $lte: end },
            status: { $nin: ['draft', 'cancelled'] }
        });
        const totalRevenue = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

        // 2. Production costs (raw material, labor)
        const batches = await ProductionBatch.find({
            deletedAt: null,
            date: { $gte: start, $lte: end }
        });
        const batchRawMaterial = batches.reduce((sum, b) => sum + (b.materialCost || 0), 0);
        const batchLabourSalary = batches.reduce((sum, b) => sum + (b.laborCost || 0), 0);

        // 3. Petty Cash expenses from that day
        const pettyCashExpenses = await PettyCash.find({
            deletedAt: null,
            transactionType: 'expense',
            date: { $gte: start, $lte: end }
        });
        const pettyRawMaterial = pettyCashExpenses.reduce((sum, pc) => sum + (pc.rawMaterial_cost || 0), 0);
        const pettyLabourSalary = pettyCashExpenses.reduce((sum, pc) => sum + (pc.miscWages || 0), 0);
        const firewood = pettyCashExpenses.reduce((sum, pc) => sum + (pc.wood || 0), 0);
        const packing = pettyCashExpenses.reduce((sum, pc) => sum + (pc.packingMaterials || 0), 0);
        const transport = pettyCashExpenses.reduce((sum, pc) => sum + (pc.transport || 0), 0);
        const other = pettyCashExpenses.reduce((sum, pc) => {
            return sum + (pc.welfare || 0) + (pc.fuel || 0) + (pc.maintenance || 0) + (pc.stationary || 0) + (pc.chemicals || 0);
        }, 0);

        const rawMaterial = batchRawMaterial + pettyRawMaterial;
        const labourSalary = batchLabourSalary + pettyLabourSalary;

        res.json({
            success: true,
            data: {
                totalRevenue: +totalRevenue.toFixed(2),
                rawMaterial: +rawMaterial.toFixed(2),
                labourSalary: +labourSalary.toFixed(2),
                supervisorQC: 0,
                electricity: 0,
                firewood: +firewood.toFixed(2),
                packing: +packing.toFixed(2),
                transport: +transport.toFixed(2),
                communication: 0,
                other: +other.toFixed(2)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
