import { z } from 'zod';

const zoneSchema = z.object({
    code: z.string().max(20).optional().or(z.literal('')),
    name: z.string().min(1, 'Zone name required').max(100),
    type: z.enum(['receiving', 'storage', 'picking', 'packing', 'dispatch', 'returns', 'quarantine']),
    isActive: z.boolean().optional(),
});

export const warehouseFormSchema = z.object({
    warehouseCode: z.string().min(1, 'Code required').max(20),
    name: z.string().min(1, 'Name required').max(100),
    type: z.enum(['main', 'branch', 'transit', 'virtual', 'quarantine', 'scrap']),
    address: z.object({
        line1: z.string().optional().or(z.literal('')),
        line2: z.string().optional().or(z.literal('')),
        city: z.string().optional().or(z.literal('')),
        state: z.string().optional().or(z.literal('')),
        country: z.string().optional().or(z.literal('')),
        postalCode: z.string().optional().or(z.literal('')),
    }).optional(),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email('Invalid email').or(z.literal('')).optional(),
    warehouseManager: z.string().optional().or(z.literal('')),
    capabilities: z.object({
        canShipDirectly: z.boolean().optional(),
        canReceiveGoods: z.boolean().optional(),
        temperatureControlled: z.boolean().optional(),
        hasRefrigeration: z.boolean().optional(),
    }).optional(),
    zones: z.array(zoneSchema).optional(),
    pickingStrategy: z.enum(['FIFO', 'LIFO', 'FEFO']),
    allowNegativeStock: z.boolean().optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
});