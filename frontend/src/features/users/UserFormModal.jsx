import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useCreateUser, useUpdateUser } from './useUsers';
import { ROLES, getRoleConfig } from './roleConfig';
import { useDesignations } from '../hr/useHr';

const ALL_PERMISSIONS = [
    {
        module: 'Sales & CRM',
        items: [
            { code: 'pos.access', label: 'POS Access' },
            { code: 'sales.view', label: 'View Sales' },
            { code: 'sales.create', label: 'Create Sales' },
            { code: 'sales.edit', label: 'Edit Sales' },
            { code: 'sales.approve', label: 'Approve Sales Orders' },
            { code: 'sales.delete', label: 'Delete Sales' },
            { code: 'customers.view', label: 'View Customers' },
            { code: 'customers.manage', label: 'Manage Customers' }
        ]
    },
    {
        module: 'Inventory & Stock',
        items: [
            { code: 'products.view', label: 'View Products' },
            { code: 'products.create', label: 'Add Products' },
            { code: 'products.edit', label: 'Edit Products' },
            { code: 'inventory.view', label: 'View Inventory' },
            { code: 'inventory.adjust', label: 'Adjust Stock' },
            { code: 'inventory.transfer', label: 'Transfer Stock' },
            { code: 'inventory.opening', label: 'Opening Stock' },
            { code: 'warehouses.manage', label: 'Manage Warehouses' }
        ]
    },
    {
        module: 'Purchasing & Production',
        items: [
            { code: 'purchasing.view', label: 'View Purchasing' },
            { code: 'grn.manage', label: 'Manage GRN & QA Gate' },
            { code: 'suppliers.view', label: 'View Suppliers' },
            { code: 'production.view', label: 'View Production Batches' },
            { code: 'bom.view', label: 'View BOM Formulas' }
        ]
    },
    {
        module: 'HR & Payroll',
        items: [
            { code: 'hr.employees.view', label: 'View Employees' },
            { code: 'hr.employees.manage', label: 'Manage Employees' },
            { code: 'hr.attendance.manage', label: 'Manage Attendance' },
            { code: 'hr.leaves.manage', label: 'Manage Leaves' },
            { code: 'hr.payroll.manage', label: 'Manage Payroll' }
        ]
    },
    {
        module: 'Accounting & Reports',
        items: [
            { code: 'invoices.view', label: 'View Invoices' },
            { code: 'bills.manage', label: 'Manage Bills' },
            { code: 'payments.manage', label: 'Manage Payments' },
            { code: 'reports.sales', label: 'Sales Reports' },
            { code: 'reports.inventory', label: 'Inventory Reports' },
            { code: 'reports.hr', label: 'HR Reports' },
            { code: 'reports.financial', label: 'Financial / P&L Reports' }
        ]
    }
];

const createSchema = z.object({
    firstName: z.string().min(1, 'First name required').max(50),
    lastName: z.string().min(1, 'Last name required').max(50),
    email: z.string().email('Invalid email'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    phone: z.string().optional().or(z.literal('')),
    role: z.string().min(1, 'Select a role'),
    isActive: z.boolean().optional(),
    designationId: z.string().optional(),
});

const updateSchema = z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    phone: z.string().optional().or(z.literal('')),
    role: z.string().min(1),
    isActive: z.boolean().optional(),
    permissions: z.union([z.string(), z.array(z.string())]).optional(),
});

export default function UserFormModal({ isOpen, onClose, user = null }) {
    const isEdit = !!user;
    const [selectedRole, setSelectedRole] = useState('staff');
    const [selectedPerms, setSelectedPerms] = useState([]);

    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
        resolver: zodResolver(isEdit ? updateSchema : createSchema),
        defaultValues: {
            firstName: '', lastName: '', email: '', password: '',
            phone: '', role: 'staff', isActive: true, permissions: '',
            designationId: '',
        },
    });

    const roleValue = watch('role');

    useEffect(() => {
        if (isOpen && user) {
            reset({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
                role: user.role || 'staff',
                isActive: user.isActive !== false,
            });
            setSelectedRole(user.role || 'staff');
            setSelectedPerms(Array.isArray(user.permissions) ? user.permissions : []);
        } else if (isOpen) {
            reset({
                firstName: '', lastName: '', email: '', password: '',
                phone: '', role: 'staff', isActive: true,
            });
            setSelectedRole('staff');
            setSelectedPerms([]);
        }
    }, [isOpen, user, reset]);

    useEffect(() => {
        setSelectedRole(roleValue);
    }, [roleValue]);

    const onSubmit = async (data) => {
        try {
            if (isEdit) {
                await updateMutation.mutateAsync({
                    id: user._id,
                    data: {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        phone: data.phone || undefined,
                        role: data.role,
                        isActive: data.isActive,
                        permissions: selectedPerms,
                    },
                });
            } else {
                await createMutation.mutateAsync({
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    password: data.password,
                    phone: data.phone || undefined,
                    role: data.role,
                    designationId: data.designationId || undefined,
                    permissions: selectedPerms,
                });
            }
            onClose();
        } catch { }
    };

    const { data: designationsData } = useDesignations({ isActive: true });
    const roleConfig = getRoleConfig(selectedRole);
    const roleOptions = ROLES.map((r) => ({ value: r.value, label: r.label }));
    const designationOptions = [
        { value: '', label: 'None (Do not create employee profile)' },
        ...(designationsData?.data || []).map((d) => ({
            value: d._id,
            label: d.departmentId ? `${d.name} (${d.departmentId.name})` : d.name
        }))
    ];
    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Modal
            isOpen={isOpen} onClose={onClose}
            title={isEdit ? `Edit User — ${user?.firstName} ${user?.lastName}` : 'Add New User'}
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="First Name" required error={errors.firstName?.message} {...register('firstName')} />
                        <Input label="Last Name" required error={errors.lastName?.message} {...register('lastName')} />
                    </div>

                    {!isEdit && (
                        <>
                            <Input label="Email" type="email" required error={errors.email?.message} {...register('email')} />
                            <Input label="Password" type="password" required
                                error={errors.password?.message}
                                placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
                                {...register('password')} />
                            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                                Share this password with the user. It must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number.
                            </p>
                        </>
                    )}

                    {isEdit && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email (read-only)</label>
                            <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">{user?.email}</p>
                        </div>
                    )}

                    <Input label="Phone" type="tel" {...register('phone')} />

                    {!isEdit && (
                        <Select label="Designation / Position"
                            options={designationOptions}
                            error={errors.designationId?.message}
                            {...register('designationId')} />
                    )}

                    <div>
                        <Select label="Role" required
                            options={roleOptions}
                            error={errors.role?.message}
                            {...register('role')} />
                        <div className="mt-2 p-3 rounded-lg border text-sm"
                            style={{ borderColor: roleConfig.color, backgroundColor: `${roleConfig.color}10` }}>
                            <p className="font-medium" style={{ color: roleConfig.color }}>{roleConfig.label}</p>
                            <p className="text-gray-700 mt-1">{roleConfig.description}</p>
                        </div>
                    </div>

                    {isEdit && (
                        <div className="border-t pt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-800">
                                    Additional Permissions (Overrides role defaults)
                                </label>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Check items to grant permissions specifically to this user on top of their role defaults.
                                </p>
                            </div>

                            <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-2">
                                {ALL_PERMISSIONS.map((group) => (
                                    <div key={group.module} className="bg-gray-50 p-3.5 border rounded-xl space-y-2.5">
                                        <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{group.module}</h5>
                                        <div className="grid grid-cols-2 gap-2">
                                            {group.items.map((item) => {
                                                const checked = selectedPerms.includes(item.code);
                                                return (
                                                    <label key={item.code} className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer select-none font-medium">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => {
                                                                if (checked) {
                                                                    setSelectedPerms(prev => prev.filter(p => p !== item.code));
                                                                } else {
                                                                    setSelectedPerms(prev => [...prev, item.code]);
                                                                }
                                                            }}
                                                            className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                        />
                                                        <span>{item.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <label className="flex items-center gap-2 text-sm mt-4 select-none cursor-pointer">
                                <input type="checkbox" {...register('isActive')} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                <span className="text-gray-700 font-medium">Active (de-select to deactivate this user account)</span>
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" variant="primary" loading={isLoading}>
                        {isEdit ? 'Update User' : 'Create User'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}