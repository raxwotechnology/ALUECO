import express from 'express';
import {
    createSupplierReturn, getSupplierReturns, getSupplierReturnById,
    sendSupplierReturn, recordSupplierCredit, updateSupplierReturnStatus,
} from '../controllers/supplierReturnController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(requirePermission('supplier_returns.view'), getSupplierReturns)
    .post(requirePermission('supplier_returns.manage'), createSupplierReturn);

router.route('/:id').get(requirePermission('supplier_returns.view'), getSupplierReturnById);

router.patch('/:id/status', requirePermission('supplier_returns.manage'), updateSupplierReturnStatus);
router.patch('/:id/send', requirePermission('supplier_returns.manage'), sendSupplierReturn);
router.patch('/:id/record-credit', requirePermission('supplier_returns.manage'), recordSupplierCredit);

export default router;