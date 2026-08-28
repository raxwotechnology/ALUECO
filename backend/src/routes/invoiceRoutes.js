import express from 'express';
import {
    createInvoice, createFromSalesOrder, getInvoices, getInvoiceById,
    getAgingSummary, changeInvoiceStatus, deleteInvoice, updateInvoicePaymentStatus,
} from '../controllers/invoiceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
    createInvoiceSchema, createFromSalesOrderSchema,
} from '../validators/invoiceValidator.js';

const router = express.Router();
router.use(protect);

router.get('/aging/summary', requirePermission('reports.financial'), getAgingSummary);

router
    .route('/')
    .get(requirePermission('invoices.view'), getInvoices)
    .post(
        requirePermission('invoices.create'),
        validate(createInvoiceSchema),
        createInvoice
    );

router.post(
    '/from-sales-order',
    requirePermission('invoices.create'),
    validate(createFromSalesOrderSchema),
    createFromSalesOrder
);

router
    .route('/:id')
    .get(requirePermission('invoices.view'), getInvoiceById)
    .delete(requirePermission('invoices.view'), deleteInvoice); // Assuming delete requires view at least, or separate code if needed

router.patch(
    '/:id/status',
    requirePermission('invoices.edit'),
    changeInvoiceStatus
);

router.patch(
    '/:id/payment-status',
    requirePermission('invoices.edit'),
    updateInvoicePaymentStatus
);

export default router;