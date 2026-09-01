import { z } from 'zod';

const zoneSchema = z.object({
    code: z.string().max(20).optional(),
    name: z.string().min(1).max(100),
    type: z.enum(['receiving', 'storage', 'picking', 'packing', 'dispatch', 'returns', 'quarantine']).optional(),
    isActive: z.boolean().optional(),
});

export const createWarehouseSchema = z.object({
    warehouseCode: z.string().min(1).max(20),
    name: z.string().min(1).max(100),
    type: z.enum(['main', 'branch', 'transit', 'virtual', 'quarantine', 'scrap']).optional(),
    address: z.object({
        line1: z.string().optional(),
        line2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        postalCode: z.string().optional(),
    }).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    warehouseManager: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().or(z.literal('')),
    capabilities: z.object({
        canShipDirectly: z.boolean().optional(),
        canReceiveGoods: z.boolean().optional(),
        temperatureControlled: z.boolean().optional(),
        hasRefrigeration: z.boolean().optional(),
    }).optional(),
    zones: z.array(zoneSchema).optional(),
    settings: z.object({
        pickingStrategy: z.enum(['FIFO', 'LIFO', 'FEFO']).optional(),
        allowNegativeStock: z.boolean().optional(),
    }).optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();