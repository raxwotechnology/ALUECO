import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const createProductionOrderSchema = z.object({
    bomId: objectId,
    plannedQuantity: z.coerce.number().min(0.01),
    sourceWarehouseId: objectId,
    outputWarehouseId: objectId,
    plannedStartDate: z.string().optional(),
    plannedEndDate: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    sourceType: z.enum(['manual', 'sales_order', 'min_stock']).optional(),
    sourceSalesOrderId: objectId.optional(),
    notes: z.string().optional(),
    internalNotes: z.string().optional(),
    referenceLink: z.string().optional().or(z.literal('')),
});

export const completeProductionSchema = z.object({
    actualConsumption: z.array(z.object({
        consumptionItemId: objectId,
        actualQuantity: z.coerce.number().min(0),
        notes: z.string().optional(),
    })).optional(),
    actualLabor: z.array(z.object({
        laborLogId: objectId.optional(),
        laborType: z.string().optional(),
        description: z.string().optional(),
        actualHours: z.coerce.number().min(0),
        hourlyRate: z.coerce.number().min(0).optional(),
        workerId: objectId.optional(),
    })).optional(),
    output: z.array(z.object({
        productId: objectId.optional(),
        actualQuantity: z.coerce.number().min(0),
        damagedQuantity: z.coerce.number().min(0).optional(),
        rejectedQuantity: z.coerce.number().min(0).optional(),
        batchNumber: z.string().optional(),
        manufactureDate: z.string().optional(),
        expiryDate: z.string().optional(),
        qcStatus: z.enum(['pending', 'passed', 'failed', 'partial']).optional(),
        notes: z.string().optional(),
    })).min(1),
    overheadCost: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
});