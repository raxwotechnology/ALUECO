import express from 'express';
import {
    getStockItems, getStockByProduct, getStockMovements,
    createOpeningStock, transferStock, adjustStock,
    getReservations, convertStock, convertStockBom, convertStockRecipe,
    releaseStock, updateStockItem, deleteStockItem,
} from '../controllers/stockController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/', requirePermission('inventory.view'), getStockItems);
router.get('/movements', requirePermission('inventory.view'), getStockMovements);
router.get('/reservations', requirePermission('inventory.view'), getReservations);
router.get('/by-product/:productId', requirePermission('inventory.view'), getStockByProduct);

router.post('/opening', requirePermission('inventory.opening'), createOpeningStock);
router.post('/transfer', requirePermission('inventory.transfer'), transferStock);
router.post('/adjustment', requirePermission('inventory.adjust'), adjustStock);
router.post('/convert', requirePermission('inventory.adjust'), convertStock);
router.post('/convert-bom', requirePermission('inventory.adjust'), convertStockBom);
router.post('/convert-recipe', requirePermission('inventory.adjust'), convertStockRecipe);
router.post('/release', requirePermission('inventory.adjust'), releaseStock);

router.put('/:id', requirePermission('inventory.adjust'), updateStockItem);
router.delete('/:id', requirePermission('inventory.adjust'), deleteStockItem);

export default router;