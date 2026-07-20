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
    checkProjectStockAndShortages, reserveProjectMaterials, issueProjectMaterials
} from '../controllers/aluController.js';
import {
    getAluQuotations, getAluQuotationById, createAluQuotation,
    updateAluQuotation, deleteAluQuotation, reviseAluQuotation,
    convertAluQuotationToOrder, exportAluQuotationToCNC,
    approveAluQuotationDiscount, getWastageVarianceReport,
    getProjectCostingSheet
} from '../controllers/aluQuotationController.js';

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

// Project stock checks & reservations
router.get('/projects/:id/stock-check', checkProjectStockAndShortages);
router.post('/projects/:id/reserve-materials', reserveProjectMaterials);
router.post('/projects/:id/issue-materials', issueProjectMaterials);
router.get('/projects/:id/costing-sheet', getProjectCostingSheet);

export default router;
