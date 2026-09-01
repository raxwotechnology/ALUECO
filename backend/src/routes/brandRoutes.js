import express from 'express';
import {
    createBrand,
    getBrands,
    getBrandById,
    updateBrand,
    deleteBrand,
} from '../controllers/brandController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createBrandSchema, updateBrandSchema } from '../validators/productValidator.js';

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(requirePermission('products.view'), getBrands)
    .post(requirePermission('brands.manage'), validate(createBrandSchema), createBrand);

router
    .route('/:id')
    .get(requirePermission('products.view'), getBrandById)
    .put(requirePermission('brands.manage'), validate(updateBrandSchema), updateBrand)
    .delete(requirePermission('brands.manage'), deleteBrand);

export default router;