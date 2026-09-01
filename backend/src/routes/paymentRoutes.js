import express from 'express';
import {
    createPayment, getPayments, getPaymentById, clearPaymentCheque, updatePaymentChequeStatus
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(requirePermission('payments.view'), getPayments)
    .post(requirePermission('payments.manage'), createPayment);

router.route('/:id').get(requirePermission('payments.view'), getPaymentById);
router.put('/:id/clear', requirePermission('payments.manage'), clearPaymentCheque);
router.put('/:id/status', requirePermission('payments.manage'), updatePaymentChequeStatus);

export default router;