import express from 'express';
import {
    getInquiries,
    getInquiryById,
    createInquiry,
    updateInquiry,
    addFollowUpLog,
    transitionInquiry,
    getInquiryDashboardStats,
    getConversionRate,
    deleteInquiry
} from '../controllers/inquiryController.js';
import {
    createQuotation,
    getQuotations,
    getQuotationById,
    updateQuotation,
    deleteQuotation,
    convertQuotationToOrder
} from '../controllers/quotationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// ── Inquiry / Lead Follow-up Routes ───────────────────────────────────────────
router.get('/inquiries/stats',           getInquiryDashboardStats);
router.get('/inquiries/conversion-rate', getConversionRate);
router.get('/inquiries',                 getInquiries);
router.get('/inquiries/:id',             getInquiryById);
router.post('/inquiries',                createInquiry);
router.put('/inquiries/:id',             updateInquiry);
router.post('/inquiries/:id/follow-up',   addFollowUpLog);
router.delete('/inquiries/:id',          deleteInquiry);

// State machine transition endpoint
// PUT /api/crm/inquiries/:id/transition
router.put('/inquiries/:id/transition',  transitionInquiry);

// ── Quotation Routes ───────────────────────────────────────────────────────────
router.get('/quotations',       getQuotations);
router.get('/quotations/:id',   getQuotationById);
router.post('/quotations',      createQuotation);
router.put('/quotations/:id',   updateQuotation);
router.delete('/quotations/:id', deleteQuotation);
router.post('/quotations/:id/convert-to-order', convertQuotationToOrder);

export default router;

