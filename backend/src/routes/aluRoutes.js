import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import {
    getProfiles, createProfile, updateProfile, deleteProfile,
    getGlass, createGlass, updateGlass, deleteGlass,
    getAccessories, createAccessory, updateAccessory, deleteAccessory,
    getApplications, createApplication, updateApplication, deleteApplication,
    getScraps, createScrap, updateScrap, deleteScrap,
    getJobCards, updateJobCardStatus,
    getSurveys, createSurvey, updateSurvey, deleteSurvey,
    checkProjectStockAndShortages, reserveProjectMaterials, issueProjectMaterials,
    getAluRawMaterials, createAluRawMaterial, processAluGrn, getProjectsMaterialsSummary
} from '../controllers/aluController.js';
import {
    getAluQuotations, getAluQuotationById, createAluQuotation,
    updateAluQuotation, deleteAluQuotation, reviseAluQuotation, duplicateAluQuotation,
    convertAluQuotationToOrder, exportAluQuotationToCNC,
    approveAluQuotationDiscount, getWastageVarianceReport,
    getProjectCostingSheet
} from '../controllers/aluQuotationController.js';
import {
    getAgreements, getAgreementById, createAgreement,
    updateAgreement, deleteAgreement
} from '../controllers/aluAgreementController.js';
import {
    getAluPurchaseOrders, getAluPurchaseOrderById, createAluPurchaseOrder,
    updateAluPurchaseOrder, deleteAluPurchaseOrder, addManualItemToAluPO,
    getAluPOSummaryStats, createGrnFromAluPO
} from '../controllers/aluPurchaseOrderController.js';
import {
    getAluProjectIncome, createAluIncome, getAluExpenses, createAluExpense,
    getAluProjectInvoices, calculateProjectProfitMargins,
    getAluFinanceSummary, getAluFinanceProjects
} from '../controllers/aluFinanceController.js';
import {
    getProjectWisePnLReport, getAluSeparatedAnalytics, getSupplierAndCustomerAging
} from '../controllers/aluReportsController.js';

const router = express.Router();

// Apply auth protection middleware to all aluminium endpoints
router.use(protect);

// File Upload
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
        success: true,
        data: {
            fileName: req.file.originalname,
            fileUrl
        }
    });
});

// Profiles CRUD
router.route('/profiles')
    .get(getProfiles)
    .post(createProfile);
router.route('/profiles/:id')
    .put(updateProfile)
    .delete(deleteProfile);

// Glass CRUD
router.route('/glass')
    .get(getGlass)
    .post(createGlass);
router.route('/glass/:id')
    .put(updateGlass)
    .delete(deleteGlass);

// Accessories CRUD
router.route('/accessories')
    .get(getAccessories)
    .post(createAccessory);
router.route('/accessories/:id')
    .put(updateAccessory)
    .delete(deleteAccessory);

// Application Templates CRUD
router.route('/applications')
    .get(getApplications)
    .post(createApplication);
router.route('/applications/:id')
    .put(updateApplication)
    .delete(deleteApplication);

// Quotation Operations
router.route('/quotations')
    .get(getAluQuotations)
    .post(createAluQuotation);
router.get('/reports/wastage-variance', getWastageVarianceReport);
router.route('/quotations/:id')
    .get(getAluQuotationById)
    .put(updateAluQuotation)
    .delete(deleteAluQuotation);
router.post('/quotations/:id/revise', reviseAluQuotation);
router.post('/quotations/:id/duplicate', duplicateAluQuotation);
router.put('/quotations/:id/approve-discount', approveAluQuotationDiscount);
router.post('/quotations/:id/convert-to-order', convertAluQuotationToOrder);
router.post('/quotations/:id/cnc-export', exportAluQuotationToCNC);

// Scrap Inventory CRUD
router.route('/scrap')
    .get(getScraps)
    .post(createScrap);
router.route('/scrap/:id')
    .put(updateScrap)
    .delete(deleteScrap);

// Job Cards Kanban
router.route('/job-cards')
    .get(getJobCards);
router.route('/job-cards/:id/status')
    .put(updateJobCardStatus);

// On-Site surveys
router.route('/surveys')
    .get(getSurveys)
    .post(createSurvey);
router.route('/surveys/:id')
    .put(updateSurvey)
    .delete(deleteSurvey);

// Project Agreements CRUD
router.route('/agreements')
    .get(getAgreements)
    .post(createAgreement);
router.route('/agreements/:id')
    .get(getAgreementById)
    .put(updateAgreement)
    .delete(deleteAgreement);

// Project stock checks & reservations
router.get('/projects/materials-summary', getProjectsMaterialsSummary);
router.get('/projects/:id/stock-check', checkProjectStockAndShortages);
router.post('/projects/:id/reserve-materials', reserveProjectMaterials);
router.post('/projects/:id/issue-materials', issueProjectMaterials);
router.get('/projects/:id/costing-sheet', getProjectCostingSheet);

// AluEco Purchase Orders & Shortage Management
router.get('/purchase-orders/summary-stats', getAluPOSummaryStats);
router.post('/purchase-orders/manual-item', addManualItemToAluPO);
router.route('/purchase-orders')
    .get(getAluPurchaseOrders)
    .post(createAluPurchaseOrder);
router.route('/purchase-orders/:id')
    .get(getAluPurchaseOrderById)
    .post(createGrnFromAluPO);
// AluEco Raw Materials & Dedicated GRN Intake
router.route('/raw-materials')
    .get(getAluRawMaterials)
    .post(createAluRawMaterial);
router.post('/grn', processAluGrn);

// Alueco Finance & Accounting
router.get('/finance/summary', getAluFinanceSummary);
router.get('/finance/projects', getAluFinanceProjects);
router.route('/finance/income')
    .get(getAluProjectIncome)
    .post(createAluIncome);
router.route('/finance/expenses')
    .get(getAluExpenses)
    .post(createAluExpense);
router.get('/finance/invoices', getAluProjectInvoices);
router.get('/finance/profit-engine', calculateProjectProfitMargins);

// Alueco Reports & Analytics
router.get('/reports/project-pnl', getProjectWisePnLReport);
router.get('/reports/analytics', getAluSeparatedAnalytics);
router.get('/reports/aging', getSupplierAndCustomerAging);

export default router;
