import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const billLineSchema = z.object({
    productId: objectId.optional(),
    productCode: z.string().optional(),
    productName: z.string().min(1),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.01),
    unitOfMeasure: z.string().optional(),
    unitPrice: z.coerce.number().min(0),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    taxRate: z.coerce.number().min(0).optional(),
    taxable: z.boolean().optional(),
    grnLineItemId: objectId.optional(),
});

export const createBillSchema = z.object({
    supplierId: objectId,
    supplierInvoiceNumber: z.string().optional(),
    purchaseOrderIds: z.array(objectId).optional(),
    grnIds: z.array(objectId).optional(),
    billDate: z.string().optional(),
    dueDate: z.string().optional(),
    receivedDate: z.string().optional(),
    items: z.array(billLineSchema).min(1),
    shippingCost: z.coerce.number().min(0).optional(),
    otherCharges: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
    internalNotes: z.string().optional(),
});

export const createFromGrnSchema = z.object({
    grnIds: z.array(objectId).min(1),
    supplierInvoiceNumber: z.string().optional(),
    billDate: z.string().optional(),
    notes: z.string().optional(),
});