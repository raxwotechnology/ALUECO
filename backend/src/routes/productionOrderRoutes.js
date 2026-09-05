import express from 'express';
import {
    createProductionOrder, getProductionOrders, getProductionOrderById,
    approveProductionOrder, startProductionOrder, completeProductionOrder,
    cancelProductionOrder, holdProductionOrder, deleteProductionOrder,
} from '../controllers/productionOrderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
    createProductionOrderSchema, completeProductionSchema,
} from '../validators/productionOrderValidator.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(requirePermission('production.view'), getProductionOrders)
    .post(
        requirePermission('production.manage'),
        validate(createProductionOrderSchema),
        createProductionOrder
    );

router
    .route('/:id')
    .get(requirePermission('production.view'), getProductionOrderById)
    .delete(requirePermission('production.manage'), deleteProductionOrder);

router.patch('/:id/approve',
    requirePermission('production.manage'),
    approveProductionOrder);

router.patch('/:id/start',
    requirePermission('production.manage'),
    startProductionOrder);

router.patch('/:id/complete',
    requirePermission('production.manage'),
    validate(completeProductionSchema),
    completeProductionOrder);

router.patch('/:id/hold',
    requirePermission('production.manage'),
    holdProductionOrder);

router.patch('/:id/cancel',
    requirePermission('production.manage'),
    cancelProductionOrder);

export default router;