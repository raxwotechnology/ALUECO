import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Invalid email'),
    password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: z.string().email('Invalid email'),
    phone: z.string().optional(),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain uppercase letter')
        .regex(/[a-z]/, 'Must contain lowercase letter')
        .regex(/[0-9]/, 'Must contain a number'),
    role: z.enum([
        'admin', 'manager', 'accountant', 'sales_manager',
        'sales_rep', 'warehouse_staff', 'production_staff', 'staff'
    ]).optional(),
});