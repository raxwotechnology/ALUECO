import express from 'express';
import { getMaintenanceRequests, createMaintenanceRequest, updateMaintenanceStatus } from '../controllers/maintenanceController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/requests', getMaintenanceRequests);
router.post('/requests', createMaintenanceRequest);
router.put('/requests/:id', updateMaintenanceStatus);

export default router;
