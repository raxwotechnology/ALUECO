import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.get('/', getSettings);
router.put('/', protect, requirePermission('admin.settings'), updateSettings);

export default router;
