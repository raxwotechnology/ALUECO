import ExcelJS from 'exceljs';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import PettyCash from '../models/PettyCash.js';
import ProductionBatch from '../models/ProductionBatch.js';
import DailyPnL from '../models/DailyPnL.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExcelService {
    constructor() {
        this.masterFiles = {
            petty_cash: 'DHY Petty cash - New Link (1).xlsx',
            production: 'DHY Production - New Link (3).xlsx',
            pnl: 'March 2026 BE DHY (2).xlsx',
        };
        
        // Column mapping for Petty Cash
        this.pettyCashMap = {
            date: 1, refNo: 2, item: 3, supplier: 4, amount: 5,
            rawMaterial_nos: 6, rawMaterial_rate: 7, rawMaterial_cost: 8,
            chemicals: 9, transport: 10, welfare: 11, fuel: 12,
            maintenance: 13, stationary: 14, miscWages: 15, wood: 16,
            packingMaterials: 17, balance: 20
        };

        // Column mapping for Production
        this.productionMap = {
            sn: 1, date: 2, batchNo: 3, product: 4,
            staff_day: 5, staff_night: 6, staff_total: 7,
            otherStaff_day: 8, otherStaff_night: 9, otherStaff_total: 10,
            inputWeight_day: 11, inputWeight_night: 12, inputWeight_total: 13,
            rejects_day: 14, rejects_night: 15,
            weightBeforeDrying_day: 16, weightBeforeDrying_night: 17,
            outputWeight_day: 18, outputWeight_night: 19, outputWeight_total: 20,
            powder: 21, teaBag: 22, remark: 23
        };

        // Column mapping for P&L (March 2026 BE DHY)
        this.pnlMap = {
            date: 1, day: 2, rawMaterial: 3, labourSalary: 4,
            supervisorQC: 5, electricity: 6, firewood: 7, packing: 8,
            transport: 9, communication: 10, other: 11,
            totalExpenses: 12, totalRevenue: 13, netProfit: 14, notes: 15
        };

        // Column mapping for Bookings (Sales Orders)
        this.salesOrderMap = {
            orderNumber: 1, orderDate: 2, customer: 3, items: 4,
            totalAmount: 5, status: 6
        };
    }

    /**
     * Resolve the master file path
     */
    async _resolvePath(type) {
        const fileName = this.masterFiles[type];
        if (!fileName) return null; // No Excel file configured for this type — skip silently
        const candidates = [
            path.resolve(process.cwd(), fileName),
            path.resolve(process.cwd(), '..', fileName),
            path.resolve(__dirname, '../../../', fileName),
        ];

        for (const p of candidates) {
            if (await fs.pathExists(p)) return p;
        }
        return null;
    }

    /**
     * SYNC ALL: Read from Excel and Upsert to DB
     * Called on Startup
     */
    async syncAllFilesToDB() {
        console.log('[ExcelService] Starting full synchronization from Master files...');
        
        await this._syncPettyCash();
        await this._syncProduction();
        await this._syncPnL();
        
        console.log('[ExcelService] Initial sync completed successfully.');
    }

    async _syncPettyCash() {
        const filePath = await this._resolvePath('petty_cash');
        if (!filePath) return;

        const workbook = xlsx.readFile(filePath, { cellDates: true });
        for (const sheetName of workbook.SheetNames) {
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            const records = this._parsePettyCashRows(rows);
            if (records.length > 0) {
                await PettyCash.bulkWrite(records.map(r => ({
                    updateOne: {
                        filter: { date: r.date, refNo: r.refNo, item: r.item },
                        update: { $set: r },
                        upsert: true
                    }
                })));
            }
        }
    }

    _parsePettyCashRows(rows) {
        // Simple positional parsing based on user's Master file structure
        const records = [];
        rows.slice(1).forEach(row => {
            if (!row[0] || !row[2]) return; // Skip if no date or no item
            records.push({
                date: this._parseDate(row[0]),
                refNo: String(row[1] || ''),
                item: String(row[2] || ''),
                supplier: String(row[3] || ''),
                amount: Number(row[4]) || 0,
                rawMaterial_nos: Number(row[5]) || 0,
                rawMaterial_rate: Number(row[6]) || 0,
                rawMaterial_cost: Number(row[7]) || 0,
                chemicals: Number(row[8]) || 0,
                transport: Number(row[9]) || 0,
                welfare: Number(row[10]) || 0,
                fuel: Number(row[11]) || 0,
                maintenance: Number(row[12]) || 0,
                stationary: Number(row[13]) || 0,
                miscWages: Number(row[14]) || 0,
                wood: Number(row[15]) || 0,
                packingMaterials: Number(row[16]) || 0,
                balance: Number(row[19]) || 0
            });
        });
        return records;
    }

    async _syncProduction() {
        const filePath = await this._resolvePath('production');
        if (!filePath) return;

        const workbook = xlsx.readFile(filePath, { cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]]; // Production Summary usually first
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        
        const records = rows.slice(2).map(row => {
            if (!row[2]) return null; // No batch number
            return {
                sn: Number(row[0]) || 0,
                date: this._parseDate(row[1]),
                batchNo: String(row[2]),
                product: String(row[3] || ''),
                staff_day: Number(row[4]) || 0,
                staff_night: Number(row[5]) || 0,
                staff_total: Number(row[6]) || 0,
                otherStaff_day: Number(row[7]) || 0,
                otherStaff_night: Number(row[8]) || 0,
                otherStaff_total: Number(row[9]) || 0,
                inputWeight_day: Number(row[10]) || 0,
                inputWeight_night: Number(row[11]) || 0,
                inputWeight_total: Number(row[12]) || 0,
                rejects_day: Number(row[13]) || 0,
                rejects_night: Number(row[14]) || 0,
                weightBeforeDrying_day: Number(row[15]) || 0,
                weightBeforeDrying_night: Number(row[16]) || 0,
                outputWeight_day: Number(row[17]) || 0,
                outputWeight_night: Number(row[18]) || 0,
                outputWeight_total: Number(row[19]) || 0,
                powder: String(row[20] || ''),
                teaBag: String(row[21] || ''),
                remark: String(row[22] || '')
            };
        }).filter(Boolean);

        if (records.length > 0) {
            await ProductionBatch.bulkWrite(records.map(r => ({
                updateOne: {
                    filter: { batchNo: r.batchNo },
                    update: { $set: r },
                    upsert: true
                }
            })));
        }
    }

    async _syncPnL() {
        const filePath = await this._resolvePath('pnl');
        if (!filePath) return;

        const workbook = xlsx.readFile(filePath, { cellDates: true });
        const sheet = workbook.Sheets['Daily P&L'] || workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        
        const records = rows.slice(1).map(row => {
            if (!row[0]) return null;
            return {
                date: this._parseDate(row[0]),
                day: Number(row[1]) || 0,
                rawMaterial: Number(row[2]) || 0,
                labourSalary: Number(row[3]) || 0,
                supervisorQC: Number(row[4]) || 0,
                electricity: Number(row[5]) || 0,
                firewood: Number(row[6]) || 0,
                packing: Number(row[7]) || 0,
                transport: Number(row[8]) || 0,
                communication: Number(row[9]) || 0,
                other: Number(row[10]) || 0,
                totalExpenses: Number(row[11]) || 0,
                totalRevenue: Number(row[12]) || 0,
                netProfit: Number(row[13]) || 0,
                notes: String(row[14] || '')
            };
        }).filter(Boolean);

        if (records.length > 0) {
            await DailyPnL.bulkWrite(records.map(r => ({
                updateOne: {
                    filter: { date: r.date },
                    update: { $set: r },
                    upsert: true
                }
            })));
        }
    }

    /**
     * BI-DIRECTIONAL: Update row in Excel when UI changes
     */
    async updateExcelRow(type, data) {
        const filePath = await this._resolvePath(type);
        if (!filePath) return;

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        let worksheet;
        if (type === 'petty_cash') {
            const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const monthName = months[new Date(data.date).getMonth()];
            worksheet = workbook.getWorksheet(monthName) || workbook.worksheets[0];
        } else if (type === 'sales_order') {
            worksheet = workbook.getWorksheet('Bookings') || workbook.worksheets[0];
        } else {
            worksheet = workbook.worksheets[0];
        }

        const map = type === 'petty_cash' ? this.pettyCashMap : 
                    type === 'production' ? this.productionMap :
                    type === 'pnl' ? this.pnlMap :
                    this.salesOrderMap;
        let rowToUpdate;

        worksheet.eachRow((row, rowNum) => {
            if (rowToUpdate) return;
            if (type === 'production') {
                if (String(row.getCell(3).value) === String(data.batchNo)) rowToUpdate = row;
            } else if (type === 'petty_cash') {
                const sameDate = this._formatDate(row.getCell(1).value) === this._formatDate(data.date);
                const sameItem = String(row.getCell(3).value) === String(data.item);
                if (sameDate && sameItem) rowToUpdate = row;
            } else if (type === 'pnl') {
                if (this._formatDate(row.getCell(1).value) === this._formatDate(data.date)) rowToUpdate = row;
            } else if (type === 'sales_order') {
                if (String(row.getCell(1).value) === String(data.orderNumber)) rowToUpdate = row;
            }
        });

        if (rowToUpdate) {
            Object.entries(map).forEach(([key, col]) => {
                if (data[key] !== undefined) rowToUpdate.getCell(col).value = data[key];
            });
            await workbook.xlsx.writeFile(filePath);
        } else {
            // If not found, append it
            await this.appendExcelRow(type, data);
        }
    }

    async appendExcelRow(type, data) {
        const filePath = await this._resolvePath(type);
        if (!filePath) return;

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = type === 'sales_order' ? (workbook.getWorksheet('Bookings') || workbook.worksheets[0]) : workbook.worksheets[0];
        const map = type === 'petty_cash' ? this.pettyCashMap : 
                    type === 'production' ? this.productionMap :
                    type === 'pnl' ? this.pnlMap :
                    this.salesOrderMap;
        
        const newRow = worksheet.addRow([]);
        Object.entries(map).forEach(([key, col]) => {
            newRow.getCell(col).value = data[key];
        });
        
        await workbook.xlsx.writeFile(filePath);
    }

    async deleteExcelRow(type, data) {
        const filePath = await this._resolvePath(type);
        if (!filePath) return;

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = type === 'sales_order' ? (workbook.getWorksheet('Bookings') || workbook.worksheets[0]) : workbook.worksheets[0];

        let targetRowNum = -1;
        worksheet.eachRow((row, rowNum) => {
            if (targetRowNum !== -1) return;
            if (type === 'production') {
                if (String(row.getCell(3).value) === String(data.batchNo)) targetRowNum = rowNum;
            } else if (type === 'petty_cash') {
                const sameDate = this._formatDate(row.getCell(1).value) === this._formatDate(data.date);
                const sameItem = String(row.getCell(3).value) === String(data.item);
                if (sameDate && sameItem) targetRowNum = rowNum;
            } else if (type === 'sales_order' || type === 'pnl') {
                const identifier = type === 'sales_order' ? data.orderNumber : data.date;
                const cellVal = type === 'sales_order' ? row.getCell(1).value : row.getCell(1).value;
                if (type === 'pnl') {
                    if (this._formatDate(cellVal) === this._formatDate(identifier)) targetRowNum = rowNum;
                } else {
                    if (String(cellVal) === String(identifier)) targetRowNum = rowNum;
                }
            }
        });

        if (targetRowNum !== -1) {
            worksheet.spliceRows(targetRowNum, 1);
            await workbook.xlsx.writeFile(filePath);
        }
    }

    // Generic Parsers for ImportController
    async parseExcelRows(filePath, sheetSearchPattern = null) {
        const workbook = xlsx.readFile(filePath, { cellDates: true, dateNF: 'yyyy-mm-dd' });
        let sheetName = workbook.SheetNames[0];
        if (sheetSearchPattern) {
            const found = workbook.SheetNames.find(n => n.toLowerCase().includes(sheetSearchPattern.toLowerCase()));
            if (found) sheetName = found;
        }
        return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });
    }

    async parseAllSheets(filePath) {
        const workbook = xlsx.readFile(filePath, { cellDates: true, dateNF: 'yyyy-mm-dd' });
        return workbook.SheetNames.map(sheetName => ({
            sheetName,
            rows: xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null })
        }));
    }

    validateRow(row, type) {
        if (type === 'petty_cash' && (!row.item || !row.date)) return 'Missing date or item';
        if (type === 'production' && !row.batchNo) return 'Missing batch number';
        return null;
    }

    // Helpers
    _parseDate(v) {
        if (v instanceof Date) return v;
        const d = new Date(v);
        return isNaN(d.getTime()) ? new Date() : d;
    }

    _formatDate(v) {
        if (!v) return '';
        const d = new Date(v);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    }
}

export default new ExcelService();
