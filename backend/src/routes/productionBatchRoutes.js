import express from 'express';
import {
    getProductionBatches,
    createProductionBatch,
    startProductionBatch,
    completeProductionBatch,
    updateProductionBatchStatus
} from '../controllers/productionBatchController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getProductionBatches)
    .post(authorize('admin', 'manager', 'production_staff'), createProductionBatch);

router.put('/:id/start', authorize('admin', 'manager', 'production_staff'), startProductionBatch);
router.put('/:id/complete', authorize('admin', 'manager', 'production_staff'), completeProductionBatch);
router.put('/:id/status', authorize('admin', 'manager', 'production_staff'), updateProductionBatchStatus);

export default router;

