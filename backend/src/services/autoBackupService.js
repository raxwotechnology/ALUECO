import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import backupEmitter, { BACKUP_EVENTS } from '../utils/backupEventEmitter.js';
import { generateExcelReport, generatePDFReport } from './reportService.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, '../../backups');

/**
 * AutoBackupService
 * Automatically synchronizes database changes to external files.
 */
class AutoBackupService {
    constructor() {
        this.initialize();
    }

    async initialize() {
        try {
            await fs.ensureDir(BACKUP_DIR);
            this.registerListeners();
            console.log('✅ AutoBackupService initialized and listening for CRUD events.');
        } catch (error) {
            console.error('❌ Failed to initialize AutoBackupService:', error);
        }
    }

    registerListeners() {
        backupEmitter.on(BACKUP_EVENTS.PRODUCT_CHANGED, () => this.syncModule('products'));
        backupEmitter.on(BACKUP_EVENTS.CUSTOMER_CHANGED, () => this.syncModule('customers'));
    }

    async syncModule(module) {
        console.log(`🔄 Auto-backup triggered for module: ${module}`);
        try {
            const data = await this.fetchModuleData(module);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const moduleDir = path.join(BACKUP_DIR, module);
            await fs.ensureDir(moduleDir);

            // 1. Export JSON Backup
            await fs.writeJson(path.join(moduleDir, `snapshot_latest.json`), data, { spaces: 2 });
            
            // 2. Export CSV Backup
            const csvData = this.convertToCSV(data, module);
            await fs.writeFile(path.join(moduleDir, `snapshot_latest.csv`), csvData);

            // 3. Export Excel (Reusable service)
            const excelBuffer = await generateExcelReport(
                `${module.toUpperCase()} Global Sync`, 
                this.getColumns(module), 
                data
            );
            await fs.writeFile(path.join(moduleDir, `snapshot_latest.xlsx`), excelBuffer);

            // 4. Export PDF (Reusable service)
            const pdfBuffer = await generatePDFReport({
                title: `${module.toUpperCase()} Daily Snapshot`,
                columns: this.getColumns(module),
                data: data,
                user: {
                    name: 'SYSTEM_SYNC',
                    role: 'automated_task'
                }
            });
            await fs.writeFile(path.join(moduleDir, `snapshot_latest.pdf`), pdfBuffer);

            console.log(`✅ Auto-backup complete for ${module}. Files updated in ${moduleDir}`);
        } catch (error) {
            console.error(`❌ Auto-backup failed for ${module}:`, error);
        }
    }

    async fetchModuleData(module) {
        if (module === 'products') {
            const products = await Product.find({ deletedAt: null })
                .populate('categoryId', 'name')
                .populate('brandId', 'name')
                .lean();
            return products.map(p => ({
                ...p,
                categoryName: p.categoryId?.name || '—',
                brandName: p.brandId?.name || '—',
            }));
        }
        if (module === 'customers') {
            const customers = await Customer.find({ deletedAt: null })
                .populate('customerGroupId', 'name')
                .lean();
            return customers.map(c => ({
                ...c,
                groupName: c.customerGroupId?.name || '—',
                phone: c.primaryContact?.phone || '—',
            }));
        }
        return [];
    }

    getColumns(module) {
        if (module === 'products') {
            return [
                { header: 'Code', dataKey: 'productCode' },
                { header: 'Name', dataKey: 'name' },
                { header: 'SKU', dataKey: 'sku' },
                { header: 'Category', dataKey: 'categoryName' },
                { header: 'Brand', dataKey: 'brandName' },
                { header: 'Price', dataKey: 'basePrice' },
            ];
        }
        if (module === 'customers') {
            return [
                { header: 'Code', dataKey: 'customerCode' },
                { header: 'Name', dataKey: 'displayName' },
                { header: 'Group', dataKey: 'groupName' },
                { header: 'Phone', dataKey: 'phone' },
                { header: 'Balance', dataKey: 'balance' },
            ];
        }
        return [];
    }

    convertToCSV(data, module) {
        const columns = this.getColumns(module);
        const header = columns.map(c => c.header).join(',');
        const rows = data.map(item => 
            columns.map(col => {
                const val = item[col.dataKey] ?? '';
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(',')
        );
        return [header, ...rows].join('\n');
    }
}

export default new AutoBackupService();
