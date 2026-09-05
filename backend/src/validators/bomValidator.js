import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const componentSchema = z.object({
    productId: objectId,
    quantity: z.coerce.number().min(0.0001),
    componentType: z.enum(['raw_material', 'semi_finished', 'packaging', 'consumable']).optional(),
    wastagePercent: z.coerce.number().min(0).max(100).optional(),
    standardCost: z.coerce.number().min(0).optional(),
    productionStep: z.coerce.number().optional(),
    isOptional: z.boolean().optional(),
    notes: z.string().optional(),
});

const laborSchema = z.object({
    laborType: z.enum(['skilled', 'unskilled', 'supervisor', 'machinist', 'general']).optional(),
    description: z.string().optional(),
    hours: z.coerce.number().min(0),
    hourlyRate: z.coerce.number().min(0).optional(),
});

export const createBomSchema = z.object({
    name: z.string().min(1).max(200),
    version: z.string().optional(),
    finishedProductId: objectId,
    outputQuantity: z.coerce.number().min(0.01),
    outputUnitOfMeasure: z.string().optional(),
    components: z.array(componentSchema).min(1, 'At least one component required'),
    labor: z.array(laborSchema).optional(),
    overheadPercent: z.coerce.number().min(0).max(500).optional(),
    estimatedProductionTimeHours: z.coerce.number().min(0).optional(),
    status: z.enum(['draft', 'active', 'inactive', 'archived']).optional(),
    isDefault: z.boolean().optional(),
    effectiveFrom: z.string().optional(),
    effectiveUntil: z.string().optional(),
    notes: z.string().optional(),
    internalNotes: z.string().optional(),
});

export const updateBomSchema = createBomSchema.partial();