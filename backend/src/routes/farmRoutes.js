import express from 'express';
import { createFarm, getFarms, getFarmById, updateFarm, deleteFarm } from '../controllers/farmController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(requirePermission('grn.manage'), getFarms)
    .post(requirePermission('grn.manage'), createFarm);

router.route('/:id')
    .get(requirePermission('grn.manage'), getFarmById)
    .put(requirePermission('grn.manage'), updateFarm)
    .delete(requirePermission('grn.manage'), deleteFarm);

export default router;
