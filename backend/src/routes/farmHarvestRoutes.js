import express from 'express';
import { createFarmHarvest, getFarmHarvests, approveFarmHarvest } from '../controllers/farmHarvestController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(requirePermission('grn.manage'), getFarmHarvests)
    .post(requirePermission('grn.manage'), createFarmHarvest);

router.route('/:id/approve')
    .post(requirePermission('grn.manage'), approveFarmHarvest);

export default router;
