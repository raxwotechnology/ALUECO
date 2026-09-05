import express from 'express';
import {
    createUom,
    getUoms,
    updateUom,
    deleteUom,
} from '../controllers/uomController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createUomSchema, updateUomSchema } from '../validators/productValidator.js';

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(requirePermission('products.view'), getUoms)
    .post(requirePermission('uom.manage'), validate(createUomSchema), createUom);

router
    .route('/:id')
    .put(requirePermission('uom.manage'), validate(updateUomSchema), updateUom)
    .delete(requirePermission('uom.manage'), deleteUom);

export default router;