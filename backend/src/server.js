import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import uomRoutes from './routes/uomRoutes.js';
import productRoutes from './routes/productRoutes.js';
import customerGroupRoutes from './routes/customerGroupRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import userRoutes from './routes/userRoutes.js';
import salesOrderRoutes from './routes/salesOrderRoutes.js';
import warehouseRoutes from './routes/warehouseRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import grnRoutes from './routes/grnRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import billRoutes from './routes/billRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import bomRoutes from './routes/bomRoutes.js';
import productionOrderRoutes from './routes/productionOrderRoutes.js';
import customerReturnRoutes from './routes/customerReturnRoutes.js';
import creditNoteRoutes from './routes/creditNoteRoutes.js';
import damageRoutes from './routes/damageRoutes.js';
import supplierReturnRoutes from './routes/supplierReturnRoutes.js';
import repairRoutes from './routes/repairRoutes.js';
import hrRoutes from './routes/hrRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import farmRoutes from './routes/farmRoutes.js';
import farmHarvestRoutes from './routes/farmHarvestRoutes.js';
import inventoryRecipeRoutes from './routes/inventoryRecipeRoutes.js';

import reportsRoutes from './routes/reportsRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import importRoutes from './routes/importRoutes.js';
import syncRoutes from './routes/syncRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import processTemplateRoutes from './routes/processTemplateRoutes.js';
import productionBatchRoutes from './routes/productionBatchRoutes.js';
import qcRoutes from './routes/qcRoutes.js';
import crmRoutes from './routes/crmRoutes.js';
import exportShipmentRoutes from './routes/exportShipmentRoutes.js';
import pettyCashRoutes from './routes/pettyCashRoutes.js';
import fixedAssetRoutes from './routes/fixedAssetRoutes.js';
import fleetRoutes from './routes/fleetRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import bankAccountRoutes from './routes/bankAccountRoutes.js';
import machineRoutes from './routes/machineRoutes.js';
import { initSocket } from './services/socketService.js';
import './services/autoBackupService.js'; // Initialize automated backup listener
import { initCertificationAlerts } from './services/certificationAlertService.js';
import gatePassRoutes from './routes/gatePassRoutes.js';
import aluRoutes from './routes/aluRoutes.js';

import { seedDefaults } from './utils/seedDefaults.js';

import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Load environment variables
dotenv.config();


connectDB().then(async () => {
    await seedDefaults();
    try {
        // Drop problematic legacy index if it exists
        const { default: PettyCash } = await import('./models/PettyCash.js');
        await PettyCash.collection.dropIndex('voucherCode_1').catch(() => {});
        const { default: ProductionBatch } = await import('./models/ProductionBatch.js');
        await ProductionBatch.collection.dropIndex('batchCode_1').catch(() => {});
        await ProductionBatch.collection.dropIndex('batchNumber_1').catch(() => {});

        
        const { default: excelService } = await import('./services/excelService.js');
        await excelService.syncAllFilesToDB();
    } catch (err) {
        console.error('[Startup] Excel Sync failed:', err.message);
    }
});

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(cors({
    origin: function (origin, callback) {
        const defaultOrigins = [
            'https://alueco.onrender.com',
            'https://export-lanka.netlify.app',
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:5000'
        ];
        const allowedOrigins = process.env.FRONTEND_URL 
            ? process.env.FRONTEND_URL.split(',').map(o => o.trim()) 
            : [];
        const allAllowed = [...new Set([...allowedOrigins, ...defaultOrigins])];
        if (!origin || allAllowed.includes(origin) || allAllowed.includes(origin.replace(/\/$/, ''))) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging in dev
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Rate limiting for auth routes (prevents brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 login attempts per 15 min
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/uoms', uomRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customer-groups', customerGroupRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/grns', grnRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/farm-harvests', farmHarvestRoutes);
app.use('/api/inventory-recipes', inventoryRecipeRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/boms', bomRoutes);
app.use('/api/production-orders', productionOrderRoutes);
app.use('/api/customer-returns', customerReturnRoutes);
app.use('/api/credit-notes', creditNoteRoutes);
app.use('/api/damages', damageRoutes);
app.use('/api/supplier-returns', supplierReturnRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/import', importRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/process-templates', processTemplateRoutes);
app.use('/api/production-batches', productionBatchRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/export-shipments', exportShipmentRoutes);
app.use('/api/finance/petty-cash', pettyCashRoutes);
app.use('/api/finance/fixed-assets', fixedAssetRoutes);
app.use('/api/finance/bank-accounts', bankAccountRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/production/machines', machineRoutes);
app.use('/api/gate-passes', gatePassRoutes);
app.use('/api/alu', aluRoutes);


// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

// Serve static files in production (React build)
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get('/*splat', (req, res, next) => {
        // Skip for API routes so they can reach notFound/errorHandler
        if (req.originalUrl.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
}

// Error handling (must be LAST)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
const io = initSocket(httpServer);
// Initialise certification expiry alert cron (daily 08:00 AM)
initCertificationAlerts(io);

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});