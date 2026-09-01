import { z } from 'zod';

export const createRecipeSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    sourceProductId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid source product ID'),
    destinationProductId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid destination product ID'),
    inputQuantity: z.number().positive('Input quantity must be positive'),
    outputQuantity: z.number().positive('Output quantity must be positive'),
    notes: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

export const updateRecipeSchema = createRecipeSchema.partial();
