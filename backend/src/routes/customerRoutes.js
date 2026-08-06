import express from 'express';
import {
    createCustomer, getCustomers, getCustomerById,
    updateCustomer, deleteCustomer, toggleCreditHold,
    getCustomerStatement, getCustomerFinancials
} from '../controllers/customerController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
    createCustomerSchema, updateCustomerSchema,
} from '../validators/customerValidator.js';

const router = express.Router();
router.use(protect);

router.get('/financial-summary', requirePermission('customers.view', 'finance.view'), getCustomerFinancials);
router.get('/:id/statement', requirePermission('customers.view', 'finance.view'), getCustomerStatement);

router
    .route('/')
    .get(requirePermission('customers.view'), getCustomers)
    .post(
        requirePermission('customers.manage'),
        validate(createCustomerSchema),
        createCustomer
    );

router
    .route('/:id')
    .get(requirePermission('customers.view'), getCustomerById)
    .put(
        requirePermission('customers.manage'),
        validate(updateCustomerSchema),
        updateCustomer
    )
    .delete(requirePermission('customers.manage'), deleteCustomer);

router.patch(
    '/:id/credit-hold',
    requirePermission('finance.credit_holds', 'customers.manage'),
    toggleCreditHold
);

export default router;