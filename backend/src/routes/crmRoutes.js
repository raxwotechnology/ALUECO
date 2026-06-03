import express from 'express';
import {
    getInquiries,
    createInquiry,
    updateInquiry,
    transitionInquiry,
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
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// ── Inquiry Routes ─────────────────────────────────────────────────────────────
router.get('/inquiries/conversion-rate', getConversionRate);
router.get('/inquiries',     getInquiries);
router.post('/inquiries',    createInquiry);
router.put('/inquiries/:id', updateInquiry);
router.delete('/inquiries/:id', deleteInquiry);

// State machine transition endpoint
// PUT /api/crm/inquiries/:id/transition  { nextStatus: "quoted", lostReason?: "..." }
router.put('/inquiries/:id/transition', transitionInquiry);

// ── Quotation Routes ───────────────────────────────────────────────────────────
router.get('/quotations',       getQuotations);
router.get('/quotations/:id',   getQuotationById);
router.post('/quotations',      createQuotation);
router.put('/quotations/:id',   updateQuotation);
router.delete('/quotations/:id', deleteQuotation);
router.post('/quotations/:id/convert-to-order', convertQuotationToOrder);

export default router;
