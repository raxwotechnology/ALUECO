import express from 'express';
import {
    createWarehouse, getWarehouses, getWarehouseById,
    updateWarehouse, deleteWarehouse,
} from '../controllers/warehouseController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createWarehouseSchema, updateWarehouseSchema } from '../validators/warehouseValidator.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(requirePermission('inventory.view'), getWarehouses)
    .post(requirePermission('warehouses.manage'), validate(createWarehouseSchema), createWarehouse);

router
    .route('/:id')
    .get(requirePermission('inventory.view'), getWarehouseById)
    .put(requirePermission('warehouses.manage'), validate(updateWarehouseSchema), updateWarehouse)
    .delete(requirePermission('warehouses.manage'), deleteWarehouse);

export default router;