import express from 'express';
import {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    predictYield,
    getNextProductCode,
    getProductForecasting,
} from '../controllers/productController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createProductSchema, updateProductSchema } from '../validators/productValidator.js';

const router = express.Router();

router.use(protect);

router.get('/predict-yield', requirePermission('products.view'), predictYield);
router.get('/next-code', requirePermission('products.create'), getNextProductCode);

router
    .route('/')
    .get(requirePermission('products.view'), getProducts)
    .post(requirePermission('products.create'), validate(createProductSchema), createProduct);

router.get('/:id/forecasting', requirePermission('products.view'), getProductForecasting);

router
    .route('/:id')
    .get(requirePermission('products.view'), getProductById)
    .put(requirePermission('products.edit'), validate(updateProductSchema), updateProduct)
    .delete(requirePermission('products.delete'), deleteProduct);

export default router;