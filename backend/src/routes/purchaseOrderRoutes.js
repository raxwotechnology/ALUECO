import express from 'express';
import {
    createPurchaseOrder, getPurchaseOrders, getPurchaseOrderById,
    updatePurchaseOrder, changePurchaseOrderStatus, deletePurchaseOrder, duplicatePurchaseOrder
} from '../controllers/purchaseOrderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createPurchaseOrderSchema, updatePurchaseOrderSchema } from '../validators/purchaseOrderValidator.js';

const router = express.Router();
router.use(protect);

router.post('/:id/duplicate', requirePermission('purchasing.create'), duplicatePurchaseOrder);

router
    .route('/')
    .get(requirePermission('purchasing.view'), getPurchaseOrders)
    .post(requirePermission('purchasing.create'), validate(createPurchaseOrderSchema), createPurchaseOrder);

router
    .route('/:id')
    .get(requirePermission('purchasing.view'), getPurchaseOrderById)
    .put(requirePermission('purchasing.edit'), validate(updatePurchaseOrderSchema), updatePurchaseOrder)
    .delete(requirePermission('purchasing.delete'), deletePurchaseOrder);

router.patch('/:id/status',
    requirePermission('purchasing.approve'),
    changePurchaseOrderStatus
);

export default router;