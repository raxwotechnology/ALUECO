import express from 'express';
import { createGrn, getGrns, getGrnById, approveGrnQA } from '../controllers/grnController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createGrnSchema } from '../validators/purchaseOrderValidator.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(requirePermission('grn.manage'), getGrns)
    .post(requirePermission('grn.manage'), validate(createGrnSchema), createGrn);

router.route('/:id').get(requirePermission('grn.manage'), getGrnById);
router.route('/:id/approve').post(requirePermission('grn.manage'), approveGrnQA);

export default router;