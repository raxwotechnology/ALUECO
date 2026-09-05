import express from 'express';
import {
    createPettyCashEntry,
    getPettyCashEntries,
    getPettyCashBalance,
    updatePettyCashStatus,
    updatePettyCashEntry,
    deletePettyCashEntry,
    getPettyCashEntryById
} from '../controllers/pettyCashController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Running balance + category breakdown
// GET /api/finance/petty-cash/balance?poolId=MAIN
router.get('/balance', getPettyCashBalance);

router.route('/')
    .post(createPettyCashEntry)
    .get(getPettyCashEntries);

router.route('/:id')
    .get(getPettyCashEntryById)
    .put(updatePettyCashEntry)
    .delete(authorize('admin', 'manager'), deletePettyCashEntry);

router.put('/:id/status', authorize('admin', 'manager'), updatePettyCashStatus);

export default router;
