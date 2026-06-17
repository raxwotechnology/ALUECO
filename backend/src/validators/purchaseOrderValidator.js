import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const poLineSchema = z.object({
    productId: objectId,
    orderedQuantity: z.coerce.number().min(0.01),
    unitPrice: z.coerce.number().min(0),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    taxRate: z.coerce.number().min(0).optional(),
    taxable: z.boolean().optional(),
    notes: z.string().optional(),
});

export const createPurchaseOrderSchema = z.object({
    supplierId: objectId,
    deliverTo: z.object({ warehouseId: objectId }),
    poDate: z.string().optional(),
    expectedDeliveryDate: z.string().optional(),
    items: z.array(poLineSchema).min(1, 'At least one item required'),
    shippingCost: z.coerce.number().min(0).optional(),
    otherCharges: z.coerce.number().min(0).optional(),
    shippingTerms: z.string().optional(),
    notes: z.string().optional(),
    internalNotes: z.string().optional(),
    termsAndConditions: z.string().optional(),
    status: z.enum(['draft', 'approved']).optional(),
});

export const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial();

const grnLineSchema = z.object({
    poLineItemId: objectId.optional(),
    productId: objectId,
    receivedQuantity: z.coerce.number().min(0),
    acceptedQuantity: z.coerce.number().min(0).optional(),
    rejectedQuantity: z.coerce.number().min(0).optional(),
    damagedQuantity: z.coerce.number().min(0).optional(),
    unitPrice: z.coerce.number().min(0),
    batchNumber: z.string().optional(),
    manufactureDate: z.string().optional(),
    expiryDate: z.string().optional(),
    rejectionReason: z.string().optional(),
    notes: z.string().optional(),
});

export const createGrnSchema = z.object({
    purchaseOrderId: objectId.optional(),
    warehouseId: objectId,
    sourceType: z.enum(['supplier', 'own_farm']).optional(),
    supplierId: objectId.optional(),
    farmId: objectId.optional(),
    supplierName: z.string().optional(),
    farmName: z.string().optional(),
    receiptDate: z.string().optional(),
    supplierDeliveryNoteNumber: z.string().optional(),
    supplierInvoiceNumber: z.string().optional(),
    vehicleNumber: z.string().optional(),
    driverName: z.string().optional(),
    transportCompany: z.string().optional(),
    items: z.array(grnLineSchema).min(1),
    notes: z.string().optional(),
});