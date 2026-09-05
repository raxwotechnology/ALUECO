import { z } from 'zod';

const addressSchema = z.object({
    line1: z.string().optional().or(z.literal('')),
    line2: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    state: z.string().optional().or(z.literal('')),
    country: z.string().optional().or(z.literal('')),
    postalCode: z.string().optional().or(z.literal('')),
});

export const supplierFormSchema = z.object({
    type: z.enum(['company', 'individual']),
    companyName: z.string().max(200).optional().or(z.literal('')),
    displayName: z.string().min(1, 'Display name required').max(100),
    firstName: z.string().optional().or(z.literal('')),
    lastName: z.string().optional().or(z.literal('')),
    category: z.enum(['raw_material', 'packaging', 'services', 'equipment', 'finished_goods', 'multiple']),
    taxRegistrationNumber: z.string().optional().or(z.literal('')),
    businessRegistrationNumber: z.string().optional().or(z.literal('')),

    primaryContact: z.object({
        name: z.string().optional().or(z.literal('')),
        email: z.string().email('Invalid email').or(z.literal('')).optional(),
        phone: z.string().optional().or(z.literal('')),
        mobile: z.string().optional().or(z.literal('')),
    }).optional(),

    billingAddress: addressSchema.optional(),
    shippingAddress: addressSchema.optional(),

    paymentTermsType: z.enum(['advance', 'cod', 'credit', 'consignment']),
    creditDays: z.coerce.number().min(0).optional(),
    creditLimit: z.coerce.number().min(0).optional(),

    bankName: z.string().optional().or(z.literal('')),
    branchName: z.string().optional().or(z.literal('')),
    accountNumber: z.string().optional().or(z.literal('')),
    accountName: z.string().optional().or(z.literal('')),
    swiftCode: z.string().optional().or(z.literal('')),

    averageLeadTimeDays: z.coerce.number().min(0).optional(),

    status: z.enum(['active', 'inactive', 'blacklisted', 'on_hold']),
    notes: z.string().max(2000).optional().or(z.literal('')),
    supplierSource: z.enum(['own_farm', 'external_farmer', 'import']).default('external_farmer'),
    supplierShortCode: z.string().max(12).optional().or(z.literal('')),
});