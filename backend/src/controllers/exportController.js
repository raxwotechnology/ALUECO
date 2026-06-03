import asyncHandler from 'express-async-handler';
import ExcelJS from 'exceljs';
import PettyCash from '../models/PettyCash.js';
import ProductionBatch from '../models/ProductionBatch.js';
import DailyPnL from '../models/DailyPnL.js';

export const exportPettyCash = asyncHandler(async (req, res) => {
    const data = await PettyCash.find().sort({ date: -1 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Petty Cash');

    sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Voucher', key: 'voucherCode', width: 15 },
        { header: 'Type', key: 'type', width: 12 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Paid To', key: 'paidTo', width: 20 },
        { header: 'Status', key: 'status', width: 12 },
    ];

    data.forEach(item => {
        sheet.addRow({
            ...item.toObject(),
            date: item.date.toISOString().split('T')[0]
        });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=petty-cash-export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});

export const exportProduction = asyncHandler(async (req, res) => {
    const data = await ProductionBatch.find().populate('productId').sort({ createdAt: -1 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Production');

    sheet.columns = [
        { header: 'Batch Number', key: 'batchNumber', width: 15 },
        { header: 'Product', key: 'productName', width: 25 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Input Weight', key: 'totalInputWeight', width: 12 },
        { header: 'Output Weight', key: 'totalOutputWeight', width: 12 },
        { header: 'Wastage', key: 'totalWastage', width: 10 },
        { header: 'Completion Date', key: 'actualCompletionDate', width: 15 },
    ];

    data.forEach(item => {
        sheet.addRow({
            batchNumber: item.batchNumber,
            productName: item.productId?.name || item.product || 'N/A',
            status: item.status,
            totalInputWeight: item.totalInputWeight,
            totalOutputWeight: item.totalOutputWeight,
            totalWastage: item.totalWastage,
            actualCompletionDate: item.actualCompletionDate ? item.actualCompletionDate.toISOString().split('T')[0] : 'N/A',
        });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=production-export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});

export const exportPnL = asyncHandler(async (req, res) => {
    const data = await DailyPnL.find().sort({ date: -1 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Daily P&L');

    sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Revenue', key: 'totalRevenue', width: 15 },
        { header: 'COGS', key: 'totalCogs', width: 15 },
        { header: 'Gross Profit', key: 'grossProfit', width: 15 },
        { header: 'Expenses', key: 'operatingExpenses', width: 15 },
        { header: 'Other Income', key: 'otherIncome', width: 15 },
        { header: 'Net Profit', key: 'netProfit', width: 15 },
        { header: 'Margin %', key: 'marginPercent', width: 12 },
    ];

    data.forEach(item => {
        sheet.addRow({
            ...item.toObject(),
            date: item.date.toISOString().split('T')[0]
        });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=pnl-export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});
