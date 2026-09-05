import express from 'express';
import {
    createCustomerGroup, getCustomerGroups, getCustomerGroupById,
    updateCustomerGroup, deleteCustomerGroup,
} from '../controllers/customerGroupController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
    createCustomerGroupSchema, updateCustomerGroupSchema,
} from '../validators/customerValidator.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(requirePermission('customers.view'), getCustomerGroups)
    .post(requirePermission('customer_groups.manage'), validate(createCustomerGroupSchema), createCustomerGroup);

router
    .route('/:id')
    .get(requirePermission('customers.view'), getCustomerGroupById)
    .put(requirePermission('customer_groups.manage'), validate(updateCustomerGroupSchema), updateCustomerGroup)
    .delete(requirePermission('customer_groups.manage'), deleteCustomerGroup);

export default router;