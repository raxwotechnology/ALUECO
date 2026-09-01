import asyncHandler from 'express-async-handler';
import ExcelJS from 'exceljs';
import PettyCash from '../models/PettyCash.js';
import ProductionBatch from '../models/ProductionBatch.js';
import DailyPnL from '../models/DailyPnL.js';
import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import { reportService } from '../services/reportService.js';

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

export const exportMonthlyPerformance = asyncHandler(async (req, res) => {
    const { month } = req.query; // YYYY-MM
    if (!month) {
        res.status(400);
        throw new Error('Month parameter is required (Format: YYYY-MM)');
    }

    const [year, monthIndex] = month.split('-').map(Number);
    const startDate = new Date(year, monthIndex - 1, 1);
    const endDate = new Date(year, monthIndex, 0, 23, 59, 59, 999);

    // Fetch all collections
    const [invoices, batches, pettyCash, pnls] = await Promise.all([
        Invoice.find({ invoiceDate: { $gte: startDate, $lte: endDate }, deletedAt: null }).sort({ invoiceDate: 1 }),
        ProductionBatch.find({ date: { $gte: startDate, $lte: endDate }, deletedAt: null }).sort({ date: 1 }),
        PettyCash.find({ date: { $gte: startDate, $lte: endDate }, transactionType: 'expense', status: 'approved', deletedAt: null }).sort({ date: 1 }),
        DailyPnL.find({ date: { $gte: startDate, $lte: endDate }, deletedAt: null }).sort({ date: 1 })
    ]);

    const workbook = new ExcelJS.Workbook();

    // Helper to style sheet headers
    const applyHeaderStyle = (sheet, columns) => {
        sheet.columns = columns;
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo 600
        headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
        sheet.views = [{ showGridLines: true }];
    };

    // ── SHEET 1: Summary Dashboard ──
    const summarySheet = workbook.addWorksheet('Summary Dashboard');
    summarySheet.views = [{ showGridLines: true }];
    
    // Header block
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `Monthly Performance Report - ${month}`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF4F46E5' } };
    titleCell.alignment = { horizontal: 'center' };
    
    summarySheet.addRow([]); // Blank row
    
    // Metrics rows
    summarySheet.addRow(['Metric Group', 'KPI Description', 'Value', 'Unit']);
    const tableHeader = summarySheet.getRow(3);
    tableHeader.font = { bold: true };
    tableHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };

    const totalSalesValue = invoices.reduce((s, inv) => s + (inv.grandTotal || 0), 0);
    const paidSalesValue = invoices.filter(inv => inv.paymentStatus === 'paid').reduce((s, inv) => s + (inv.grandTotal || 0), 0);
    const totalInputKg = batches.reduce((s, b) => s + (b.inputWeight_total || 0), 0);
    const totalOutputKg = batches.reduce((s, b) => s + (b.outputWeight_total || 0), 0);
    const avgEfficiency = batches.length > 0 ? (batches.reduce((s, b) => s + (b.efficiencyPercentage || 0), 0) / batches.length) : 0;
    const totalPettyCashExpenses = pettyCash.reduce((s, pc) => s + (pc.amount || 0), 0);
    const totalPnlExpenses = pnls.reduce((s, p) => s + (p.totalExpenses || 0), 0);
    const totalPnlRevenue = pnls.reduce((s, p) => s + (p.totalRevenue || 0), 0);
    const netProfit = totalPnlRevenue - totalPnlExpenses;

    const summaryData = [
        ['Sales', 'Total Invoiced Value', totalSalesValue, 'LKR'],
        ['Sales', 'Collected Revenue (Paid)', paidSalesValue, 'LKR'],
        ['Sales', 'Invoices Count', invoices.length, 'Invoices'],
        ['Production', 'Total Input Material', totalInputKg, 'kg'],
        ['Production', 'Total Output Yield', totalOutputKg, 'kg'],
        ['Production', 'Average Production Yield Efficiency', avgEfficiency / 100, 'Percent'],
        ['Finance', 'Approved Petty Cash Expenses', totalPettyCashExpenses, 'LKR'],
        ['Finance', 'Total P&L Operating Expenses', totalPnlExpenses, 'LKR'],
        ['Finance', 'Total P&L Revenue', totalPnlRevenue, 'LKR'],
        ['Finance', 'Net Profit / (Loss)', netProfit, 'LKR']
    ];

    summaryData.forEach(row => {
        const r = summarySheet.addRow(row);
        // Format columns
        if (row[3] === 'LKR') {
            r.getCell(3).numFmt = '"Rs. "#,##0.00;("Rs. "#,##0.00);"-"';
        } else if (row[3] === 'Percent') {
            r.getCell(3).numFmt = '0.0%';
        }
    });

    summarySheet.getColumn(1).width = 20;
    summarySheet.getColumn(2).width = 40;
    summarySheet.getColumn(3).width = 25;
    summarySheet.getColumn(4).width = 15;

    // ── SHEET 2: Sales Invoices ──
    const salesSheet = workbook.addWorksheet('Sales Invoices');
    applyHeaderStyle(salesSheet, [
        { header: 'Invoice Date', key: 'invoiceDate', width: 15 },
        { header: 'Invoice No', key: 'invoiceNumber', width: 18 },
        { header: 'Customer', key: 'customerName', width: 25 },
        { header: 'Payment Status', key: 'paymentStatus', width: 18 },
        { header: 'Invoiced Amount', key: 'grandTotal', width: 22 }
    ]);
    invoices.forEach(inv => {
        const row = salesSheet.addRow({
            invoiceDate: inv.invoiceDate ? inv.invoiceDate.toISOString().split('T')[0] : 'N/A',
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName || (inv.customerId ? inv.customerId.displayName : 'N/A'),
            paymentStatus: inv.paymentStatus,
            grandTotal: inv.grandTotal || 0
        });
        row.getCell(5).numFmt = '"Rs. "#,##0.00;("Rs. "#,##0.00);"-"';
    });

    // ── SHEET 3: Production Yield ──
    const prodSheet = workbook.addWorksheet('Production Yield');
    applyHeaderStyle(prodSheet, [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Batch No', key: 'batchNo', width: 18 },
        { header: 'Product', key: 'product', width: 25 },
        { header: 'Input Weight (kg)', key: 'inputWeight_total', width: 20 },
        { header: 'Output Weight (kg)', key: 'outputWeight_total', width: 20 },
        { header: 'Efficiency %', key: 'efficiencyPercentage', width: 18 }
    ]);
    batches.forEach(b => {
        const row = prodSheet.addRow({
            date: b.date ? b.date.toISOString().split('T')[0] : 'N/A',
            batchNo: b.batchNo,
            product: b.product,
            inputWeight_total: b.inputWeight_total || 0,
            outputWeight_total: b.outputWeight_total || 0,
            efficiencyPercentage: (b.efficiencyPercentage || 0) / 100
        });
        row.getCell(4).numFmt = '#,##0.00';
        row.getCell(5).numFmt = '#,##0.00';
        row.getCell(6).numFmt = '0.0%';
    });

    // ── SHEET 4: Petty Cash Expenses ──
    const cashSheet = workbook.addWorksheet('Petty Cash Expenses');
    applyHeaderStyle(cashSheet, [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Ref No', key: 'refNo', width: 18 },
        { header: 'Description', key: 'item', width: 30 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Amount', key: 'amount', width: 22 }
    ]);
    pettyCash.forEach(pc => {
        const row = cashSheet.addRow({
            date: pc.date ? pc.date.toISOString().split('T')[0] : 'N/A',
            refNo: pc.refNo || '—',
            item: pc.item || pc.description || '—',
            category: pc.category,
            amount: pc.amount || 0
        });
        row.getCell(5).numFmt = '"Rs. "#,##0.00;("Rs. "#,##0.00);"-"';
    });

    // ── SHEET 5: Daily P&L Ledger ──
    const pnlLedgerSheet = workbook.addWorksheet('Daily P&L Ledger');
    applyHeaderStyle(pnlLedgerSheet, [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Raw Material', key: 'rawMaterial', width: 18 },
        { header: 'Labour Salary', key: 'labourSalary', width: 18 },
        { header: 'QC / Supervisor', key: 'supervisorQC', width: 18 },
        { header: 'Electricity', key: 'electricity', width: 18 },
        { header: 'Firewood', key: 'firewood', width: 18 },
        { header: 'Packing', key: 'packing', width: 18 },
        { header: 'Transport', key: 'transport', width: 18 },
        { header: 'Communication', key: 'communication', width: 18 },
        { header: 'Other Costs', key: 'other', width: 18 },
        { header: 'Total Expenses', key: 'totalExpenses', width: 20 },
        { header: 'Total Revenue', key: 'totalRevenue', width: 20 },
        { header: 'Net Profit', key: 'netProfit', width: 20 }
    ]);
    pnls.forEach(p => {
        const row = pnlLedgerSheet.addRow({
            date: p.date ? p.date.toISOString().split('T')[0] : 'N/A',
            rawMaterial: p.rawMaterial || 0,
            labourSalary: p.labourSalary || 0,
            supervisorQC: p.supervisorQC || 0,
            electricity: p.electricity || 0,
            firewood: p.firewood || 0,
            packing: p.packing || 0,
            transport: p.transport || 0,
            communication: p.communication || 0,
            other: p.other || 0,
            totalExpenses: p.totalExpenses || 0,
            totalRevenue: p.totalRevenue || 0,
            netProfit: p.netProfit || 0
        });
        for (let col = 2; col <= 13; col++) {
            row.getCell(col).numFmt = '"Rs. "#,##0.00;("Rs. "#,##0.00);"-"';
        }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Monthly-Performance-Report-${month}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
});

export const exportModuleData = asyncHandler(async (req, res) => {
    const { module, format } = req.params;
    
    let rows = [];
    let columns = [];
    let title = '';
    let filename = '';

    if (module === 'products') {
        const data = await Product.find().populate('categoryId').populate('brandId');
        rows = data.map(p => ({
            productCode: p.productCode || '',
            name: p.name || '',
            sku: p.sku || '',
            categoryName: p.categoryId?.name || '',
            brandName: p.brandId?.name || '',
            basePrice: p.basePrice || 0,
            status: p.status || '',
        }));
        columns = [
            { header: 'Code', key: 'productCode', width: 25 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'SKU', key: 'sku', width: 20 },
            { header: 'Category', key: 'categoryName', width: 25 },
            { header: 'Brand', key: 'brandName', width: 20 },
            { header: 'Price (LKR)', key: 'basePrice', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
        ];
        title = 'Product Catalog Report';
        filename = 'products_export';
    } else if (module === 'customers') {
        const data = await Customer.find().populate('customerGroupId');
        rows = data.map(c => ({
            customerCode: c.customerCode || '',
            displayName: c.displayName || '',
            groupName: c.customerGroupId?.name || '—',
            phone: c.primaryContact?.phone || '—',
            email: c.primaryContact?.email || '—',
            balance: c.balance || 0,
            status: c.status || '',
        }));
        columns = [
            { header: 'Code', key: 'customerCode', width: 20 },
            { header: 'Name', key: 'displayName', width: 30 },
            { header: 'Group', key: 'groupName', width: 20 },
            { header: 'Phone', key: 'phone', width: 18 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Balance (LKR)', key: 'balance', width: 18 },
            { header: 'Status', key: 'status', width: 12 },
        ];
        title = 'Customer Directory Report';
        filename = 'customers_export';
    } else {
        res.status(400);
        throw new Error(`Module ${module} export not supported`);
    }

    if (format === 'excel' || format === 'xlsx') {
        const buffer = await reportService.generateExcel(title, columns, rows);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
        return res.send(buffer);
    } else if (format === 'csv') {
        const csvHeaders = columns.map(c => c.header).join(',');
        const csvRows = rows.map(row => 
            columns.map(col => {
                const val = row[col.key];
                const escaped = String(val ?? '').replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',')
        );
        const csvContent = [csvHeaders, ...csvRows].join('\n');
        res.setHeader('Content-Type', 'text/csv;charset=utf-8;');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        return res.send(csvContent);
    } else if (format === 'pdf') {
        const buffer = await reportService.generatePDF({
            title,
            columns,
            data: rows,
            user: {
                name: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'Admin',
                role: req.user?.role || 'User'
            }
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
        return res.send(buffer);
    } else {
        res.status(400);
        throw new Error(`Format ${format} export not supported`);
    }
});
