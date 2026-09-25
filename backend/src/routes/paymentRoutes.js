import express from 'express';
import {
    createPayment, getPayments, getPaymentById, clearPaymentCheque, updatePaymentChequeStatus, deletePayment
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();
router.use(protect);

// Debug logging
router.use((req, res, next) => {
    console.log(`[PaymentRoutes] ${req.method} ${req.originalUrl} - params:`, req.params);
    next();
});

router
    .route('/')
    .get(requirePermission('payments.view'), getPayments)
    .post(requirePermission('payments.manage'), createPayment);

router.route('/:id')
    .get(requirePermission('payments.view'), getPaymentById)
    .delete(requirePermission('payments.manage'), deletePayment);

router.put('/:id/clear', requirePermission('payments.manage'), clearPaymentCheque);
router.put('/:id/status', requirePermission('payments.manage'), updatePaymentChequeStatus);

export default router;
