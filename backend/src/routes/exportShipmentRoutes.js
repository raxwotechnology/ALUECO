import express from 'express';
import {
    getExportShipments,
    createExportShipment,
    updateExportShipment,
    getShipmentById,
    deleteShipment
} from '../controllers/exportShipmentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getExportShipments)
    .post(authorize('admin', 'manager', 'logistics_staff'), createExportShipment);

router.route('/:id')
    .get(getShipmentById)
    .put(authorize('admin', 'manager', 'logistics_staff'), updateExportShipment)
    .delete(authorize('admin', 'manager', 'logistics_staff'), deleteShipment);

export default router;
