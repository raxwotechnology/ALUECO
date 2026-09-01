import express from 'express';
import { getMyNotifications, markAsRead, markAllRead } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markAsRead);

export default router;
