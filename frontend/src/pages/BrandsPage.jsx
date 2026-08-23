import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Award } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { productsApi } from '../features/products/productsApi';
import { brandFormSchema } from '../features/products/productSchemas';
import { useAuthStore } from '../store/authStore';

export default function BrandsPage() {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager'].includes(user?.role);
    const qc = useQueryClient();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['brands'],
        queryFn: () => productsApi.listBrands(),
    });

    const createMutation = useMutation({
        mutationFn: productsApi.createBrand,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); toast.success('Brand created'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => productsApi.updateBrand(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); toast.success('Brand updated'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
    });

    const deleteMutation = useMutation({
        mutationFn: productsApi.deleteBrand,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); toast.success('Brand deleted'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
    });

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(brandFormSchema),
        defaultValues: { isOwnBrand: true, isActive: true },
    });

    const openForm = (brand = null) => {
        setEditing(brand);
        if (brand) {
            reset({
                name: brand.name,
                code: brand.code || '',
                description: brand.description || '',
                isOwnBrand: brand.isOwnBrand,
                isActive: brand.isActive,
            });
        } else {
            reset({ name: '', code: '', description: '', isOwnBrand: true, isActive: true });
        }
        setIsFormOpen(true);
    };

    const onSubmit = async (formData) => {
        try {
            if (editing) {
                await updateMutation.mutateAsync({ id: editing._id, data: formData });
            } else {
                await createMutation.mutateAsync(formData);
            }
            setIsFormOpen(false);
            setEditing(null);
        } catch { }
    };

    const brands = data?.data || [];

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'code', label: 'Code', hideOnMobile: true, render: (r) => r.code || '—' },
        {
            key: 'isOwnBrand',
            label: 'Type',
            hideOnMobile: true,
            render: (r) => <Badge variant={r.isOwnBrand ? 'primary' : 'default'}>{r.isOwnBrand ? 'Own Brand' : 'Third-Party'}</Badge>,
        },
        {
            key: 'isActive',
            label: 'Active',
            render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Yes' : 'No'}</Badge>,
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '120px',
            render: (r) =>
                canManage && (
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
                title="Brands"
                description="Manage product brands"
                actions={canManage && <Button variant="primary" onClick={() => openForm()}><Plus size={16} className="mr-1.5" />Add Brand</Button>}
            />

            <Card>
                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : brands.length === 0 ? (
                    <EmptyState
                        icon={Award}
                        title="No brands yet"
                        description="Add brands to classify your products"
                        action={canManage && <Button variant="primary" onClick={() => openForm()}><Plus size={16} className="mr-1.5" />Add Brand</Button>}
                    />
                ) : (
                    <Table columns={columns} data={brands} />
                )}
            </Card>

            <Modal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditing(null); }}
                title={editing ? 'Edit Brand' : 'New Brand'}
                size="md"
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="p-4 sm:p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="Name" required error={errors.name?.message} {...register('name')} />
                            <Input label="Code" error={errors.code?.message} {...register('code')} />
                        </div>
                        <Textarea label="Description" rows={2} error={errors.description?.message} {...register('description')} />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isOwnBrand" {...register('isOwnBrand')} />
                                <label htmlFor="isOwnBrand" className="text-sm text-gray-700">Own brand (we manufacture)</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isActiveB" {...register('isActive')} />
                                <label htmlFor="isActiveB" className="text-sm text-gray-700">Active</label>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-4 sm:px-6 py-4 border-t bg-gray-50">
                        <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)} fullWidth className="sm:w-auto">Cancel</Button>
                        <Button type="submit" variant="primary" loading={createMutation.isPending || updateMutation.isPending} fullWidth className="sm:w-auto">
                            {editing ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={async () => { await deleteMutation.mutateAsync(deleting._id); setDeleting(null); }}
                title="Delete Brand"
                message={`Delete brand "${deleting?.name}"?`}
                loading={deleteMutation.isPending}
            />
        </div>
    );
}