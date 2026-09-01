import express from 'express';
import {
    createRepair, getRepairs, getRepairById, updateRepair,
    startRepair, completeRepair,
} from '../controllers/repairOrderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(requirePermission('repairs.view'), getRepairs)
    .post(requirePermission('repairs.manage'), createRepair);

router.route('/:id')
    .get(requirePermission('repairs.view'), getRepairById)
    .put(requirePermission('repairs.manage'), updateRepair);

router.patch('/:id/start', requirePermission('repairs.manage'), startRepair);
router.patch('/:id/complete', requirePermission('repairs.manage'), completeRepair);

export default router;