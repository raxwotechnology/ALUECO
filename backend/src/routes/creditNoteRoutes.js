import express from 'express';
import {
    createCreditNote, getCreditNotes, getCreditNoteById, applyCreditNote,
} from '../controllers/creditNoteController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(requirePermission('credit_notes.view'), getCreditNotes)
    .post(requirePermission('credit_notes.manage'), createCreditNote);

router.route('/:id').get(requirePermission('credit_notes.view'), getCreditNoteById);
router.post('/:id/apply', requirePermission('credit_notes.manage'), applyCreditNote);

export default router;