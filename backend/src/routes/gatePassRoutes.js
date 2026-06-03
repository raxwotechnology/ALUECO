import express from 'express';
import {
    getGatePasses,
    getGatePassById,
    getGateScreen,
    createGatePass,
    updateGatePass,
    approveGatePass,
    rejectGatePass,
    recordExit,
    deleteGatePass,
} from '../controllers/gatePassController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

// Public-ish: security screen polling fallback (no auth required for screen display)
router.get('/screen', getGateScreen);

router.route('/')
    .get(getGatePasses)
    .post(createGatePass);

router.route('/:id')
    .get(getGatePassById)
    .put(updateGatePass)
    .delete(authorize('admin', 'manager'), deleteGatePass);

// Actions
router.put('/:id/approve', authorize('admin', 'manager'), approveGatePass);
router.put('/:id/reject',  authorize('admin', 'manager'), rejectGatePass);
router.put('/:id/exit',    recordExit);

export default router;
