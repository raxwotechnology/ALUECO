import express from 'express';
import {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} from '../controllers/categoryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
    createCategorySchema,
    updateCategorySchema,
} from '../validators/productValidator.js';

const router = express.Router();

router.use(protect); // all routes require auth

router
    .route('/')
    .get(requirePermission('products.view'), getCategories)
    .post(requirePermission('categories.manage'), validate(createCategorySchema), createCategory);

router
    .route('/:id')
    .get(requirePermission('products.view'), getCategoryById)
    .put(requirePermission('categories.manage'), validate(updateCategorySchema), updateCategory)
    .delete(requirePermission('categories.manage'), deleteCategory);

export default router;