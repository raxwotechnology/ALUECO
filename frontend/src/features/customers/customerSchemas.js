import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID').or(z.literal(''));

const addressSchema = z.object({
    label: z.string().optional().or(z.literal('')),
    line1: z.string().optional().or(z.literal('')),
    line2: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    state: z.string().optional().or(z.literal('')),
    country: z.string().optional().or(z.literal('')),
    postalCode: z.string().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    deliveryInstructions: z.string().optional().or(z.literal('')),
    isDefault: z.boolean().optional(),
});

const contactSchema = z.object({
    name: z.string().optional().or(z.literal('')),
    designation: z.string().optional().or(z.literal('')),
    email: z.string().email('Invalid email').or(z.literal('')).optional(),
    phone: z.string().optional().or(z.literal('')),
    role: z.enum(['owner', 'purchasing', 'accounts', 'logistics', 'other']).optional(),
    isPrimary: z.boolean().optional(),
});

export const customerFormSchema = z.object({
    customerType: z.enum(['company', 'individual']),
    businessType: z.enum(['wholesaler', 'retailer', 'distributor', 'reseller', 'end_user', 'other']),
    companyName: z.string().max(200).optional().or(z.literal('')),
    displayName: z.string().min(1, 'Display name is required').max(100),
    firstName: z.string().optional().or(z.literal('')),
    lastName: z.string().optional().or(z.literal('')),
    customerGroupId: z.string().optional().or(z.literal('')),
    taxRegistrationNumber: z.string().optional().or(z.literal('')),
    businessRegistrationNumber: z.string().optional().or(z.literal('')),
    industry: z.string().optional().or(z.literal('')),

    primaryContact: z.object({
        name: z.string().optional().or(z.literal('')),
        email: z.string().email('Invalid email').or(z.literal('')).optional(),
        phone: z.string().optional().or(z.literal('')),
        mobile: z.string().optional().or(z.literal('')),
    }).optional(),

    billingAddress: addressSchema.optional(),
    shippingAddresses: z.array(addressSchema).optional(),
    contacts: z.array(contactSchema).optional(),

    assignedSalesRep: z.string().optional().or(z.literal('')),

    paymentTermsType: z.enum(['advance', 'cod', 'credit']),
    creditDays: z.coerce.number().min(0).optional(),
    creditLimit: z.coerce.number().min(0).optional(),
    defaultDiscountPercent: z.coerce.number().min(0).max(100).optional(),

    status: z.enum(['active', 'inactive', 'blacklisted', 'on_hold', 'prospect']),
    notes: z.string().max(2000).optional().or(z.literal('')),
});

export const customerGroupFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    code: z.string().min(1, 'Code is required').max(20),
    description: z.string().max(500).optional().or(z.literal('')),
    paymentType: z.enum(['advance', 'cod', 'credit']),
    creditDays: z.coerce.number().min(0).optional(),
    defaultCreditLimit: z.coerce.number().min(0).optional(),
    defaultDiscountPercent: z.coerce.number().min(0).max(100).optional(),
    priority: z.coerce.number().optional(),
    color: z.string().optional(),
    isActive: z.boolean().optional(),
});