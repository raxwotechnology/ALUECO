import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
    exportPettyCash, 
    exportProduction, 
    exportPnL,
    exportMonthlyPerformance,
    exportModuleData
} from '../controllers/exportController.js';

const router = express.Router();

router.get('/petty-cash', protect, exportPettyCash);
router.get('/production', protect, exportProduction);
router.get('/pnl', protect, exportPnL);
router.get('/monthly-performance', protect, exportMonthlyPerformance);
router.get('/:module/:format', protect, exportModuleData);

export default router;
