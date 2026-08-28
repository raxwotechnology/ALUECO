import express from 'express';
import {
    createSalesOrder, getSalesOrders, getSalesOrderById,
    updateSalesOrder, changeSalesOrderStatus, deleteSalesOrder,
} from '../controllers/salesOrderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission, requireAnyPermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createSalesOrderSchema, updateSalesOrderSchema } from '../validators/salesOrderValidator.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(requirePermission('sales.view'), getSalesOrders)
    .post(
        requirePermission('sales.create'),
        validate(createSalesOrderSchema),
        createSalesOrder
    );

router
    .route('/:id')
    .get(requirePermission('sales.view'), getSalesOrderById)
    .put(
        requirePermission('sales.edit'),
        updateSalesOrder
    )
    .delete(requirePermission('sales.delete'), deleteSalesOrder);

router.patch(
    '/:id/status',
    requireAnyPermission('sales.approve', 'inventory.adjust'),
    changeSalesOrderStatus
);

export default router;