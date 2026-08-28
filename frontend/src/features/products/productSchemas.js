import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID').or(z.literal(''));

export const productFormSchema = z.object({
    productCode: z.string().max(25, 'Item code cannot exceed 25 characters').optional().or(z.literal('')),
    productShortCode: z.string().max(3, 'Max 3 characters').optional().or(z.literal('')),
    name: z.string().min(1, 'Product name is required').max(200),
    shortName: z.string().max(100).optional().or(z.literal('')),
    sku: z.string().max(50).optional().or(z.literal('')),
    barcode: z.string().max(50).optional().or(z.literal('')),
    productType: z.enum(['finished_good', 'raw_material', 'semi_finished', 'packaging', 'service', 'consumable']).optional(),
    canBeSold: z.boolean().optional(),
    canBePurchased: z.boolean().optional(),
    canBeManufactured: z.boolean().optional(),
    description: z.string().max(2000).optional().or(z.literal('')),
    categoryId: z.string().min(1, 'Category is required'),
    brandId: z.string().optional().or(z.literal('')),
    type: z.enum(['manufactured', 'trading', 'service', 'bundle']),
    unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
    basePrice: z.coerce.number().min(0, 'Price must be 0 or greater'),
    mrp: z.coerce.number().min(0).optional(),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    taxable: z.boolean().optional(),
    hsCode: z.string().max(20).optional().or(z.literal('')),
    minimumLevel: z.coerce.number().min(0).optional(),
    reorderLevel: z.coerce.number().min(0).optional(),
    maximumLevel: z.coerce.number().min(0).optional(),
    unitsPerCarton: z.coerce.number().min(0).optional(),
    cartonsPerPallet: z.coerce.number().min(0).optional(),
    minimumOrderQuantity: z.coerce.number().min(0).optional(),
    sellable: z.boolean().optional(),
    allowBackorder: z.boolean().optional(),
    status: z.enum(['active', 'inactive', 'draft', 'discontinued']),
    notes: z.string().max(1000).optional().or(z.literal('')),
});

export const categoryFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    code: z.string().min(1, 'Code is required').max(20),
    description: z.string().max(500).optional().or(z.literal('')),
    parentCategory: z.string().optional().or(z.literal('')),
    type: z.enum(['product', 'raw_material', 'both']),
    isActive: z.boolean().optional(),
});

export const brandFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    code: z.string().max(20).optional().or(z.literal('')),
    description: z.string().max(500).optional().or(z.literal('')),
    isOwnBrand: z.boolean().optional(),
    isActive: z.boolean().optional(),
});