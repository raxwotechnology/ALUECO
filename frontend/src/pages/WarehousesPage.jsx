import { useState } from 'react';
import { Plus, Edit, Trash2, Warehouse, Star, Search } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import WarehouseFormModal from '../features/warehouses/WarehouseFormModal';
import { useWarehouses, useDeleteWarehouse } from '../features/warehouses/useWarehouses';
import { useAuthStore } from '../store/authStore';

const typeVariant = {
    main: 'primary',
    branch: 'info',
    transit: 'warning',
    virtual: 'default',
    quarantine: 'warning',
    scrap: 'danger',
};

export default function WarehousesPage() {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager'].includes(user?.role);

    const [filters, setFilters] = useState({ search: '', type: '' });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const { data, isLoading } = useWarehouses(filters);
    const deleteMutation = useDeleteWarehouse();

    const warehouses = data?.data || [];

    const columns = [
        {
            key: 'warehouseCode', label: 'Code', width: '110px',
            render: (r) => (
                <div className="flex items-center gap-2">
                    {r.isDefault && <Star size={14} className="text-amber-500 fill-amber-500" title="Default" />}
                    <span className="font-mono text-xs">{r.warehouseCode}</span>
                </div>
            ),
        },
        {
            key: 'name', label: 'Name',
            render: (r) => (
                <div>
                    <p className="font-medium">{r.name}</p>
                    {r.address?.city && <p className="text-xs text-gray-500">{r.address.city}</p>}
                </div>
            ),
        },
        {
            key: 'type', label: 'Type',
            render: (r) => <Badge variant={typeVariant[r.type]}>{r.type}</Badge>,
        },
        {
            key: 'manager', label: 'Manager',
            render: (r) => r.warehouseManager
                ? `${r.warehouseManager.firstName} ${r.warehouseManager.lastName}`
                : <span className="text-gray-400">—</span>,
        },
        {
            key: 'zones', label: 'Zones',
            render: (r) => <span className="text-sm">{r.zones?.length || 0}</span>,
        },
        {
            key: 'isActive', label: 'Status',
            render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>,
        },
        {
            key: 'actions', label: 'Actions', width: '120px',
            render: (r) => canManage && (
                <div className="flex gap-1">
                    <button onClick={() => { setEditing(r); setIsFormOpen(true); }}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="Edit"><Edit size={16} /></button>
                    <button onClick={() => setDeleting(r)}
                        disabled={r.isDefault}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title={r.isDefault ? "Can't delete default" : "Delete"}><Trash2 size={16} /></button>
                </div>
            ),
        },
    ];

    const handleDelete = async () => {
        await deleteMutation.mutateAsync(deleting._id);
        setDeleting(null);
    };

    return (
        <div>
            <PageHeader
                title="Warehouses"
                description="Manage your storage locations"
                actions={canManage && (
                    <Button variant="primary" onClick={() => { setEditing(null); setIsFormOpen(true); }}>
                        <Plus size={16} className="mr-1.5" /> Add Warehouse
                    </Button>
                )}
            />

            <Card>
                <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                        />
                    </div>
                    <div className="w-48">
                        <Select
                            placeholder="All Types"
                            options={[
                                { value: 'main', label: 'Main' },
                                { value: 'branch', label: 'Branch' },
                                { value: 'transit', label: 'Transit' },
                                { value: 'virtual', label: 'Virtual' },
                                { value: 'quarantine', label: 'Quarantine' },
                                { value: 'scrap', label: 'Scrap' },
                            ]}
                            value={filters.type}
                            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : warehouses.length === 0 ? (
                    <EmptyState
                        icon={Warehouse}
                        title="No warehouses"
                        description="Add warehouses to track stock across locations"
                        action={canManage && <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                            <Plus size={16} className="mr-1.5" /> Add Warehouse
                        </Button>}
                    />
                ) : (
                    <Table columns={columns} data={warehouses} />
                )}
            </Card>

            <WarehouseFormModal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditing(null); }}
                warehouse={editing}
            />

            <ConfirmDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
                title="Delete Warehouse"
                message={`Delete "${deleting?.name}"? Make sure there's no stock in this warehouse.`}
                loading={deleteMutation.isPending}
            />
        </div>
    );
}