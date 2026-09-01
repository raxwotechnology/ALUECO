import express from 'express';
import {
    getFixedAssets,
    getFixedAssetById,
    createFixedAsset,
    updateFixedAsset,
    deleteFixedAsset,
    addAssetPayment
} from '../controllers/fixedAssetController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getFixedAssets)
    .post(createFixedAsset);

router.route('/:id')
    .get(getFixedAssetById)
    .put(updateFixedAsset)
    .delete(authorize('admin', 'manager'), deleteFixedAsset);

router.post('/:id/payments', authorize('admin', 'manager'), addAssetPayment);

export default router;
