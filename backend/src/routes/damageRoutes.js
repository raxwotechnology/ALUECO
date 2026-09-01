import express from 'express';
import {
    createDamage, getDamages, getDamageById, writeOffDamage, getDamageSummary, updateDamage,
} from '../controllers/damageController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/summary', requirePermission('reports.inventory'), getDamageSummary);

router.route('/')
    .get(requirePermission('damages.view'), getDamages)
    .post(requirePermission('damages.manage'), createDamage);

// Specific routes must come before general :id routes
router.patch('/:id/write-off', requirePermission('damages.manage'), writeOffDamage);

router.route('/:id')
    .get(requirePermission('damages.view'), getDamageById)
    .patch(requirePermission('damages.manage'), updateDamage);

export default router;