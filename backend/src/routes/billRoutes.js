import express from 'express';
import {
    createBill, createFromGrn, getBills, getBillById,
    getPayablesAging, changeBillStatus,
} from '../controllers/billController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createBillSchema, createFromGrnSchema } from '../validators/billValidator.js';

const router = express.Router();
router.use(protect);

router.get('/aging/summary', requirePermission('reports.financial'), getPayablesAging);

router
    .route('/')
    .get(requirePermission('bills.view'), getBills)
    .post(requirePermission('bills.manage'), validate(createBillSchema), createBill);

router.post('/from-grn',
    requirePermission('bills.manage'),
    validate(createFromGrnSchema),
    createFromGrn);

router.route('/:id').get(requirePermission('bills.view'), getBillById);
router.patch('/:id/status', requirePermission('bills.manage'), changeBillStatus);

export default router;