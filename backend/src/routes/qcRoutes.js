import express from 'express';
import { recordQCResult, getQCResultsByBatch } from '../controllers/qcController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/results', authorize('admin', 'manager', 'production_staff'), recordQCResult);
router.get('/results/:batchId', getQCResultsByBatch);

export default router;
