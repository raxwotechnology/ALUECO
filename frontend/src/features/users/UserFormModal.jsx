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
                permissions: Array.isArray(user.permissions) ? user.permissions.join(', ') : '',
            });
            setSelectedRole(user.role || 'staff');
        } else if (isOpen) {
            reset({
                firstName: '', lastName: '', email: '', password: '',
                phone: '', role: 'staff', isActive: true, permissions: '',
            });
            setSelectedRole('staff');
        }
    }, [isOpen, user, reset]);

    useEffect(() => {
        setSelectedRole(roleValue);
    }, [roleValue]);

    const onSubmit = async (data) => {
        const permissionsArray = typeof data.permissions === 'string'
            ? data.permissions.split(',').map(p => p.trim()).filter(p => p !== '')
            : [];

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
                        permissions: permissionsArray,
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
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Additional Permissions (Comma-separated codes)
                                </label>
                                <textarea
                                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                                    rows="3"
                                    placeholder="e.g. inventory.transfer, sales.view"
                                    {...register('permissions')}
                                />
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Overrides the default role permissions. Leave empty to use role defaults.
                                </p>
                            </div>
                            <label className="flex items-center gap-2 text-sm mt-4">
                                <input type="checkbox" {...register('isActive')} />
                                Active (uncheck to deactivate this user from logging in)
                            </label>
                        </>
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