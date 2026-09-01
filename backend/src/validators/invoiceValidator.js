import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const invoiceLineSchema = z.object({
    productId: objectId.optional(),
    productCode: z.string().optional(),
    productName: z.string().min(1),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.01),
    unitOfMeasure: z.string().optional(),
    unitPrice: z.coerce.number().min(0),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    taxRate: z.coerce.number().min(0).optional(),
    taxable: z.boolean().optional(),
    salesOrderLineId: objectId.optional(),
    notes: z.string().optional(),
});

export const createInvoiceSchema = z.object({
    customerId: objectId,
    invoiceType: z.enum(['standard', 'proforma', 'service']).optional(),
    salesOrderIds: z.array(objectId).optional(),
    invoiceDate: z.string().optional(),
    dueDate: z.string().optional(),
    items: z.array(invoiceLineSchema).min(1),
    shippingCost: z.coerce.number().min(0).optional(),
    otherCharges: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
    internalNotes: z.string().optional(),
    paymentInstructions: z.string().optional(),
    termsAndConditions: z.string().optional(),
    status: z.enum(['draft', 'approved']).optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export const createFromSalesOrderSchema = z.object({
    salesOrderIds: z.array(objectId).min(1),
    invoiceDate: z.string().optional(),
    invoiceType: z.enum(['standard', 'proforma']).optional(),
    notes: z.string().optional(),
});