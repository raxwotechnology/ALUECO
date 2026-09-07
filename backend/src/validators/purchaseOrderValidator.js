import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);
const optionalObjectId = z.union([
    z.string().regex(/^[0-9a-fA-F]{24}$/),
    z.literal('')
]).transform(val => val === '' ? undefined : val).optional();

const poLineSchema = z.object({
    productId: optionalObjectId,
    productName: z.string().optional(),
    productCode: z.string().optional(),
    unitOfMeasure: z.string().optional(),
    description: z.string().optional(),
    orderedQuantity: z.coerce.number().min(0.01),
    unitPrice: z.coerce.number().min(0),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    taxRate: z.coerce.number().min(0).optional(),
    taxable: z.boolean().optional(),
    notes: z.string().optional(),
}).refine(
    (item) => item.productId || (item.productName && item.productName.trim().length > 0),
    { message: 'Each item must have either a product from catalog or a custom product name' }
);

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
    poLineItemId: optionalObjectId,
    productId: optionalObjectId,
    productName: z.string().optional(),
    productCode: z.string().optional(),
    unitOfMeasure: z.string().optional(),
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
}).refine(
    (item) => item.productId || (item.productName && item.productName.trim().length > 0),
    { message: 'Each GRN item must have a catalog product or a product name' }
);

export const createGrnSchema = z.object({
    purchaseOrderId: optionalObjectId,
    warehouseId: objectId,
    sourceType: z.enum(['supplier', 'own_farm']).optional(),
    supplierId: optionalObjectId,
    farmId: optionalObjectId,
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