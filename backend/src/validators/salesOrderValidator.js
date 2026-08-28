import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

const lineItemSchema = z.object({
    productId: objectId,
    orderedQuantity: z.coerce.number().min(0.01, 'Quantity must be > 0'),
    unitPrice: z.coerce.number().min(0),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    taxRate: z.coerce.number().min(0).optional(),
    taxable: z.boolean().optional(),
    notes: z.string().optional(),
});

export const createSalesOrderSchema = z.object({
    customerId: objectId,
    sourceWarehouseId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    source: z.enum(['direct', 'quotation', 'field_rep', 'phone', 'whatsapp', 'recurring', 'pos']).optional(),
    orderDate: z.string().optional(),
    requestedDeliveryDate: z.string().optional(),
    shippingAddressLabel: z.string().optional(),
    items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
    orderDiscount: z.object({
        type: z.enum(['percentage', 'fixed']).optional(),
        value: z.coerce.number().min(0).optional(),
        reason: z.string().optional(),
    }).optional(),
    shippingCost: z.coerce.number().min(0).optional(),
    otherCharges: z.coerce.number().min(0).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    customerNotes: z.string().optional(),
    internalNotes: z.string().optional(),
    specialInstructions: z.string().optional(),
    status: z.enum(['draft', 'pending_approval', 'approved', 'Confirmed', 'In Production', 'Installation', 'Completed', 'invoiced', 'pending', 'dispatched', 'delivered', 'cancelled', 'on_hold', 'cutting', 'assembly', 'glazing', 'qa', 'ready']).optional(),
    creditOverride: z.boolean().optional(),
    creditOverrideReason: z.string().optional(),
    paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'cheque']).optional(),
    bankAccountId: objectId.optional(),
    paymentReference: z.string().optional(),
    chequeNumber: z.string().optional(),
    chequeDate: z.string().optional(),
    bankName: z.string().optional(),
    chequeStatus: z.enum(['cleared', 'pending', 'cancelled']).optional(),
});

export const updateSalesOrderSchema = createSalesOrderSchema.partial();