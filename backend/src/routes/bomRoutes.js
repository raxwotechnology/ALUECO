import express from 'express';
import {
    createBom, getBoms, getBomById, updateBom, deleteBom,
    checkMaterialAvailability,
} from '../controllers/bomController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createBomSchema, updateBomSchema } from '../validators/bomValidator.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(requirePermission('bom.view'), getBoms)
    .post(requirePermission('bom.manage'), validate(createBomSchema), createBom);

router
    .route('/:id')
    .get(requirePermission('bom.view'), getBomById)
    .put(requirePermission('bom.manage'), validate(updateBomSchema), updateBom)
    .delete(requirePermission('bom.manage'), deleteBom);

router.get('/:id/check-availability', requirePermission('bom.view'), checkMaterialAvailability);

export default router;