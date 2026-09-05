import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Tags } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { customersApi } from '../features/customers/customersApi';
import { useCustomerGroups } from '../features/customers/useCustomers';
import { customerGroupFormSchema } from '../features/customers/customerSchemas';
import { useAuthStore } from '../store/authStore';

export default function CustomerGroupsPage() {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager'].includes(user?.role);
    const qc = useQueryClient();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const { data, isLoading } = useCustomerGroups();

    const createMutation = useMutation({
        mutationFn: customersApi.createGroup,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['customerGroups'] }); toast.success('Group created'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => customersApi.updateGroup(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['customerGroups'] }); toast.success('Group updated'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
    const deleteMutation = useMutation({
        mutationFn: customersApi.deleteGroup,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['customerGroups'] }); toast.success('Group deleted'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: zodResolver(customerGroupFormSchema),
        defaultValues: { paymentType: 'cod', isActive: true, color: '#6366f1' },
    });

    const openForm = (group = null) => {
        setEditing(group);
        if (group) {
            reset({
                name: group.name,
                code: group.code,
                description: group.description || '',
                paymentType: group.defaultPaymentTerms?.type || 'cod',
                creditDays: group.defaultPaymentTerms?.creditDays || 0,
                defaultCreditLimit: group.defaultPaymentTerms?.defaultCreditLimit || 0,
                defaultDiscountPercent: group.defaultDiscountPercent || 0,
                priority: group.priority || 0,
                color: group.color || '#6366f1',
                isActive: group.isActive,
            });
        } else {
            reset({
                name: '', code: '', description: '',
                paymentType: 'cod', creditDays: 0, defaultCreditLimit: 0,
                defaultDiscountPercent: 0, priority: 0, color: '#6366f1', isActive: true,
            });
        }
        setIsFormOpen(true);
    };

    const onSubmit = async (formData) => {
        const payload = {
            name: formData.name,
            code: formData.code,
            description: formData.description || undefined,
            defaultPaymentTerms: {
                type: formData.paymentType,
                creditDays: formData.creditDays || 0,
                defaultCreditLimit: formData.defaultCreditLimit || 0,
            },
            defaultDiscountPercent: formData.defaultDiscountPercent || 0,
            priority: formData.priority || 0,
            color: formData.color,
            isActive: formData.isActive,
        };
        try {
            if (editing) await updateMutation.mutateAsync({ id: editing._id, data: payload });
            else await createMutation.mutateAsync(payload);
            setIsFormOpen(false);
            setEditing(null);
        } catch { }
    };

    const groups = data?.data || [];

    const columns = [
        {
            key: 'name', label: 'Name',
            render: (r) => (
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="font-medium">{r.name}</span>
                </div>
            ),
        },
        { key: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
        {
            key: 'paymentTerms', label: 'Default Terms',
            render: (r) => {
                const t = r.defaultPaymentTerms?.type;
                if (t === 'credit') return <Badge variant="info">{r.defaultPaymentTerms.creditDays}d credit</Badge>;
                if (t === 'advance') return <Badge variant="warning">Advance</Badge>;
                return <Badge>COD</Badge>;
            },
        },
        { key: 'defaultDiscountPercent', label: 'Discount', render: (r) => `${r.defaultDiscountPercent || 0}%` },
        { key: 'priority', label: 'Priority', render: (r) => r.priority },
        {
            key: 'isActive', label: 'Active',
            render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Yes' : 'No'}</Badge>,
        },
        {
            key: 'actions', label: 'Actions', width: '120px',
            render: (r) => canManage && (
                <div className="flex gap-1">
                    <button onClick={() => openForm(r)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded">
                        <Edit size={16} />
                    </button>
                    <button onClick={() => setDeleting(r)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Customer Groups"
                description="Segment customers by tier for pricing and credit terms"
                actions={canManage && (
                    <Button variant="primary" onClick={() => openForm()}>
                        <Plus size={16} className="mr-1.5" /> Add Group
                    </Button>
                )}
            />

            <Card>
                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : groups.length === 0 ? (
                    <EmptyState icon={Tags} title="No customer groups" description="Groups help segment your customers" />
                ) : (
                    <Table columns={columns} data={groups} />
                )}
            </Card>

            <Modal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditing(null); }}
                title={editing ? 'Edit Customer Group' : 'New Customer Group'}
                size="md"
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Name" required error={errors.name?.message} {...register('name')} />
                            <Input label="Code" required error={errors.code?.message} {...register('code')} />
                        </div>
                        <Textarea label="Description" rows={2} {...register('description')} />

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Default Payment Type" required
                                options={[
                                    { value: 'advance', label: 'Advance' },
                                    { value: 'cod', label: 'COD' },
                                    { value: 'credit', label: 'Credit' },
                                ]}
                                {...register('paymentType')}
                            />
                            <Input label="Default Discount %" type="number" step="0.01" {...register('defaultDiscountPercent')} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Default Credit Days" type="number" {...register('creditDays')} />
                            <Input label="Default Credit Limit (LKR)" type="number" step="0.01" {...register('defaultCreditLimit')} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Priority" type="number" {...register('priority')} />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                <input type="color" className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer" {...register('color')} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="groupActive" {...register('isActive')} />
                            <label htmlFor="groupActive" className="text-sm text-gray-700">Active</label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                        <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={createMutation.isPending || updateMutation.isPending}>
                            {editing ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={async () => { await deleteMutation.mutateAsync(deleting._id); setDeleting(null); }}
                title="Delete Customer Group"
                message={`Delete "${deleting?.name}"? Customers in this group will become ungrouped.`}
                loading={deleteMutation.isPending}
            />
        </div>
    );
}