import express from 'express';
import {
  getPettyCash, createPettyCash, updatePettyCash, deletePettyCash,
  getProduction, createProduction, updateProduction, deleteProduction,
  getPnL, createPnL, updatePnL, deletePnL,
  exportWithTemplate,
} from '../controllers/syncController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

// Petty Cash
router.get('/petty-cash', getPettyCash);
router.post('/petty-cash', createPettyCash);
router.put('/petty-cash/:id', updatePettyCash);
router.delete('/petty-cash/:id', deletePettyCash);

// Production
router.get('/production', getProduction);
router.post('/production', createProduction);
router.put('/production/:id', updateProduction);
router.delete('/production/:id', deleteProduction);

// P&L
router.get('/pnl', getPnL);
router.post('/pnl', createPnL);
router.put('/pnl/:id', updatePnL);
router.delete('/pnl/:id', deletePnL);

// Download source Excel file (with latest DB data synced in)
router.get('/export-template/:type', exportWithTemplate);

export default router;
