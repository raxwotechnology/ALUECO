import express from 'express';
import {
    createRecipe, getRecipes, getRecipeById, updateRecipe, deleteRecipe
} from '../controllers/inventoryRecipeController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createRecipeSchema, updateRecipeSchema } from '../validators/inventoryRecipeValidator.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(requirePermission('bom.view'), getRecipes)
    .post(requirePermission('bom.manage'), validate(createRecipeSchema), createRecipe);

router
    .route('/:id')
    .get(requirePermission('bom.view'), getRecipeById)
    .put(requirePermission('bom.manage'), validate(updateRecipeSchema), updateRecipe)
    .delete(requirePermission('bom.manage'), deleteRecipe);

export default router;
