import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, FolderTree } from 'lucide-react';

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
import { productsApi } from '../features/products/productsApi';
import { categoryFormSchema } from '../features/products/productSchemas';
import { useAuthStore } from '../store/authStore';

export default function CategoriesPage() {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager'].includes(user?.role);
    const qc = useQueryClient();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['categories', 'all'],
        queryFn: () => productsApi.listCategories(),
    });

    const createMutation = useMutation({
        mutationFn: productsApi.createCategory,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category created');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => productsApi.updateCategory(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category updated');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
    });

    const deleteMutation = useMutation({
        mutationFn: productsApi.deleteCategory,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category deleted');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
    });

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(categoryFormSchema),
        defaultValues: { type: 'product', isActive: true },
    });

    const openForm = (category = null) => {
        setEditing(category);
        if (category) {
            reset({
                name: category.name,
                code: category.code,
                description: category.description || '',
                parentCategory: category.parentCategory?._id || '',
                type: category.type,
                isActive: category.isActive,
            });
        } else {
            reset({ name: '', code: '', description: '', parentCategory: '', type: 'product', isActive: true });
        }
        setIsFormOpen(true);
    };

    const onSubmit = async (formData) => {
        const payload = {
            ...formData,
            parentCategory: formData.parentCategory || null,
            description: formData.description || undefined,
        };
        try {
            if (editing) {
                await updateMutation.mutateAsync({ id: editing._id, data: payload });
            } else {
                await createMutation.mutateAsync(payload);
            }
            setIsFormOpen(false);
            setEditing(null);
        } catch { }
    };

    const handleDelete = async () => {
        await deleteMutation.mutateAsync(deleting._id);
        setDeleting(null);
    };

    const categories = data?.data || [];
    const parentOptions = categories
        .filter((c) => c._id !== editing?._id) // prevent self-parent
        .map((c) => ({ value: c._id, label: `${c.name} (${c.code})` }));

    const columns = [
        { key: 'code', label: 'Code', width: '100px', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
        { key: 'name', label: 'Name' },
        { key: 'parentCategory', label: 'Parent', hideOnMobile: true, render: (r) => r.parentCategory?.name || '—' },
        {
            key: 'type',
            label: 'Type',
            hideOnMobile: true,
            render: (r) => <Badge>{r.type}</Badge>,
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
                        <button
                            onClick={() => openForm(r)}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => setDeleting(r)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Categories"
                description="Organize products into categories"
                actions={
                    canManage && (
                        <Button variant="primary" onClick={() => openForm()}>
                            <Plus size={16} className="mr-1.5" />
                            Add Category
                        </Button>
                    )
                }
            />

            <Card>
                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : categories.length === 0 ? (
                    <EmptyState
                        icon={FolderTree}
                        title="No categories yet"
                        description="Categories help organize your products"
                        action={canManage && <Button variant="primary" onClick={() => openForm()}><Plus size={16} className="mr-1.5" />Add Category</Button>}
                    />
                ) : (
                    <Table columns={columns} data={categories} />
                )}
            </Card>

            <Modal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditing(null); }}
                title={editing ? 'Edit Category' : 'New Category'}
                size="md"
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="p-4 sm:p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="Name" required error={errors.name?.message} {...register('name')} />
                            <Input label="Code" required error={errors.code?.message} {...register('code')} />
                        </div>
                        <Select
                            label="Type"
                            required
                            error={errors.type?.message}
                            options={[
                                { value: 'product', label: 'Product' },
                                { value: 'raw_material', label: 'Raw Material' },
                                { value: 'both', label: 'Both' },
                            ]}
                            {...register('type')}
                        />
                        <Select
                            label="Parent Category (optional)"
                            options={parentOptions}
                            {...register('parentCategory')}
                        />
                        <Textarea label="Description" rows={2} error={errors.description?.message} {...register('description')} />
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="isActive" {...register('isActive')} />
                            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
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
                onConfirm={handleDelete}
                title="Delete Category"
                message={`Delete "${deleting?.name}"? Products in this category will need to be reassigned.`}
                loading={deleteMutation.isPending}
            />
        </div>
    );
}