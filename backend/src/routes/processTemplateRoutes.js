import express from 'express';
import {
    getProcessTemplates,
    createProcessTemplate,
    getProcessTemplateById,
    updateProcessTemplate,
    deleteProcessTemplate
} from '../controllers/processTemplateController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getProcessTemplates)
    .post(authorize('admin', 'manager'), createProcessTemplate);

router.route('/:id')
    .get(getProcessTemplateById)
    .put(authorize('admin', 'manager'), updateProcessTemplate)
    .delete(authorize('admin', 'manager'), deleteProcessTemplate);

export default router;
