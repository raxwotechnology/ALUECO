import express from 'express';
import { openShift, getActiveShift, closeShift } from '../controllers/posShiftController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/open', openShift);
router.get('/active', getActiveShift);
router.post('/close', closeShift);

export default router;
