import express from 'express';
import { 
    getVehicles, createVehicle, updateVehicle, deleteVehicle,
    getTripLogs, createTripLog, completeTripLog 
} from '../controllers/fleetController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Vehicles
router.get('/vehicles', getVehicles);
router.post('/vehicles', authorize('admin', 'manager'), createVehicle);
router.put('/vehicles/:id', authorize('admin', 'manager'), updateVehicle);
router.delete('/vehicles/:id', authorize('admin', 'manager'), deleteVehicle);

// Trips
router.get('/trips', getTripLogs);
router.post('/trips', createTripLog);
router.put('/trips/:id/complete', completeTripLog);

export default router;
