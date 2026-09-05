import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

const addressSchema = z.object({
    label: z.string().optional(),
    attentionTo: z.string().optional(),
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    phone: z.string().optional(),
    deliveryInstructions: z.string().optional(),
    isDefault: z.boolean().optional(),
});

const contactSchema = z.object({
    name: z.string().optional(),
    designation: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    role: z.enum(['owner', 'purchasing', 'accounts', 'logistics', 'other']).optional(),
    isPrimary: z.boolean().optional(),
    notes: z.string().optional(),
});

export const createCustomerGroupSchema = z.object({
    name: z.string().min(1).max(100),
    code: z.string().min(1).max(20),
    description: z.string().max(500).optional(),
    defaultPaymentTerms: z.object({
        type: z.enum(['advance', 'cod', 'credit']).optional(),
        creditDays: z.number().min(0).optional(),
        defaultCreditLimit: z.number().min(0).optional(),
    }).optional(),
    defaultDiscountPercent: z.number().min(0).max(100).optional(),
    priority: z.number().optional(),
    color: z.string().optional(),
    isActive: z.boolean().optional(),
});

export const updateCustomerGroupSchema = createCustomerGroupSchema.partial();

export const createCustomerSchema = z.object({
    customerType: z.enum(['company', 'individual']).optional(),
    businessType: z.enum(['wholesaler', 'retailer', 'distributor', 'reseller', 'end_user', 'other']).optional(),

    companyName: z.string().max(200).optional(),
    displayName: z.string().min(1, 'Display name required').max(100),
    firstName: z.string().optional(),
    lastName: z.string().optional(),

    customerGroupId: objectId.optional().or(z.literal('')),
    tags: z.array(z.string()).optional(),

    businessRegistrationNumber: z.string().optional(),
    taxRegistrationNumber: z.string().optional(),
    industry: z.string().optional(),

    primaryContact: z.object({
        name: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().optional(),
        mobile: z.string().optional(),
    }).optional(),

    contacts: z.array(contactSchema).optional(),
    billingAddress: addressSchema.optional(),
    shippingAddresses: z.array(addressSchema).optional(),

    assignedSalesRep: objectId.optional().or(z.literal('')),

    paymentTerms: z.object({
        type: z.enum(['advance', 'cod', 'credit']).optional(),
        creditDays: z.number().min(0).optional(),
        creditLimit: z.number().min(0).optional(),
    }).optional(),

    defaultDiscountPercent: z.number().min(0).max(100).optional(),

    status: z.enum(['active', 'inactive', 'blacklisted', 'on_hold', 'prospect']).optional(),
    blacklistReason: z.string().optional(),
    notes: z.string().max(2000).optional(),
    internalNotes: z.string().max(2000).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();