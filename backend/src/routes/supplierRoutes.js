import express from 'express';
import {
    createSupplier, getSuppliers, getSupplierById,
    updateSupplier, deleteSupplier, getSupplierAgeingReport,
} from '../controllers/supplierController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createSupplierSchema, updateSupplierSchema } from '../validators/supplierValidator.js';

const router = express.Router();
router.use(protect);

router.get('/reports/ageing', requirePermission('suppliers.view'), getSupplierAgeingReport);

router
    .route('/')
    .get(requirePermission('suppliers.view'), getSuppliers)
    .post(requirePermission('suppliers.manage'), validate(createSupplierSchema), createSupplier);

router
    .route('/:id')
    .get(requirePermission('suppliers.view'), getSupplierById)
    .put(requirePermission('suppliers.manage'), validate(updateSupplierSchema), updateSupplier)
    .delete(requirePermission('suppliers.manage'), deleteSupplier);

export default router;