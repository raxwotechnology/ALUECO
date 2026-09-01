import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Search, Scale, FileText } from 'lucide-react';

import api from '../api/axios';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    active: 'success',
    inactive: 'warning',
};

export default function InventoryRecipesPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager', 'production_staff'].includes(user?.role);

    const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 15 });
    const [deleting, setDeleting] = useState(null);

    const { data: recipesData, isLoading } = useQuery({
        queryKey: ['inventoryRecipes', filters],
        queryFn: async () => {
            const res = await api.get('/inventory-recipes', { params: filters });
            return res.data;
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/inventory-recipes/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventoryRecipes'] });
            toast.success('Inventory Formula deleted successfully');
            setDeleting(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to delete formula');
        }
    });

    const recipes = recipesData?.data || [];
    const total = recipesData?.count || recipes.length;
    const totalPages = Math.ceil(total / filters.limit) || 1;

    const columns = [
        { 
            key: 'recipeCode', 
            label: 'Formula #', 
            width: '120px', 
            render: (r) => <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">{r.recipeCode}</span> 
        },
        {
            key: 'name', 
            label: 'Formula Name',
            render: (r) => <span className="font-semibold text-gray-800">{r.name}</span>
        },
        {
            key: 'sourceProduct', 
            label: 'Source Crop / Raw Material',
            render: (r) => (
                <div>
                    <p className="font-medium text-sm text-gray-800">{r.sourceProductId?.name || '—'}</p>
                    <p className="text-xs text-gray-500 font-mono">{r.sourceProductId?.productCode || '—'}</p>
                </div>
            )
        },
        {
            key: 'destinationProduct', 
            label: 'Destination Output Product',
            render: (r) => (
                <div>
                    <p className="font-medium text-sm text-gray-800">{r.destinationProductId?.name || '—'}</p>
                    <p className="text-xs text-gray-500 font-mono">{r.destinationProductId?.productCode || '—'}</p>
                </div>
            )
        },
        {
            key: 'ratio', 
            label: 'Conversion Yield Ratio',
            render: (r) => (
                <div className="flex items-center gap-1.5 text-sm font-semibold text-primary-650 bg-primary-50 px-2.5 py-1 rounded-lg w-fit">
                    <span>{r.inputQuantity} {r.sourceProductId?.unitOfMeasure || 'Kg'}</span>
                    <span className="text-gray-400">➔</span>
                    <span>{r.outputQuantity} {r.destinationProductId?.unitOfMeasure || 'Kg'}</span>
                </div>
            )
        },
        { 
            key: 'status', 
            label: 'Status', 
            render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge> 
        },
        {
            key: 'actions', 
            label: 'Actions', 
            width: '100px',
            render: (r) => (
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {canManage && (
                        <>
                            <button onClick={() => navigate(`/inventory-recipes/${r._id}/edit`)}
                                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit">
                                <Edit size={16} />
                            </button>
                            <button onClick={() => setDeleting(r)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Archive">
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Inventory Formulas"
                description="Manage crop-to-product conversion yield ratios for the Inventory Converter."
                actions={canManage && (
                    <Button variant="primary" onClick={() => navigate('/inventory-recipes/new')}>
                        <Plus size={16} className="mr-1.5" /> New Formula
                    </Button>
                )}
            />

            <Card>
                <div className="p-4 border-b flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search formula crop or product..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-48">
                        <Select placeholder="All Statuses"
                            options={[
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                            ]}
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading formulas...</div>
                ) : recipes.length === 0 ? (
                    <EmptyState icon={Scale} title="No Formulas Found"
                        description="Define your first crop yield formula to speed up stock conversions."
                        action={canManage && <Button variant="primary" onClick={() => navigate('/inventory-recipes/new')}>
                            <Plus size={16} className="mr-1.5" /> New Formula
                        </Button>} />
                ) : (
                    <>
                        <Table columns={columns} data={recipes} onRowClick={(r) => navigate(`/inventory-recipes/${r._id}/edit`)} />
                        <Pagination page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                    </>
                )}
            </Card>

            <ConfirmDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={() => deleteMutation.mutate(deleting._id)}
                title="Archive Formula"
                message={`Are you sure you want to delete/archive formula: ${deleting?.name}?`}
                confirmText="Archive"
                variant="danger"
            />
        </div>
    );
}
