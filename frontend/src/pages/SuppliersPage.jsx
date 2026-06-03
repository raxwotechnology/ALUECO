import { useState } from 'react';
import { Plus, Edit, Trash2, Search, Truck } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SupplierFormModal from '../features/suppliers/SupplierFormModal';
import { useSuppliers, useDeleteSupplier } from '../features/suppliers/useSuppliers';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    active: 'success', inactive: 'default',
    on_hold: 'warning', blacklisted: 'danger',
};

const categoryLabels = {
    raw_material: 'Raw Material',
    packaging: 'Packaging',
    services: 'Services',
    equipment: 'Equipment',
    finished_goods: 'Finished Goods',
    multiple: 'Multiple',
};

export default function SuppliersPage() {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager', 'accountant'].includes(user?.role);
    const canDelete = ['admin', 'manager'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '', category: '', status: '',
        page: 1, limit: 10,
    });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const { data, isLoading } = useSuppliers(filters);
    const deleteMutation = useDeleteSupplier();

    const suppliers = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const columns = [
        {
            key: 'supplierCode', label: 'Code', width: '110px',
            render: (r) => <span className="font-mono text-xs">{r.supplierCode}</span>,
        },
        {
            key: 'displayName', label: 'Supplier',
            render: (r) => (
                <div>
                    <p className="font-medium">{r.displayName}</p>
                    {r.companyName && r.companyName !== r.displayName && (
                        <p className="text-xs text-gray-500">{r.companyName}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'category', label: 'Category',
            render: (r) => <Badge>{categoryLabels[r.category]}</Badge>,
        },
        {
            key: 'supplierSource', label: 'Source',
            render: (r) => {
                const s = r.supplierSource || 'external_farmer';
                if (s === 'own_farm') return <Badge variant="success">Own Farm</Badge>;
                if (s === 'import') return <Badge variant="info">Import</Badge>;
                return <Badge variant="default">External Farmer</Badge>;
            }
        },
        {
            key: 'balanceDueLKR', label: 'Ledger Balance',
            render: (r) => (
                <span className={`font-semibold text-xs ${r.balanceDueLKR > 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                    LKR {(r.balanceDueLKR || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            key: 'contact', label: 'Contact',
            render: (r) => (
                <div className="text-xs">
                    {r.primaryContact?.name && <p>{r.primaryContact.name}</p>}
                    {r.primaryContact?.phone && <p className="text-gray-500">{r.primaryContact.phone}</p>}
                </div>
            ),
        },
        {
            key: 'payment', label: 'Terms',
            render: (r) => {
                const t = r.paymentTerms?.type;
                if (t === 'credit') return <Badge variant="info">{r.paymentTerms.creditDays}d credit</Badge>;
                if (t === 'advance') return <Badge variant="warning">Advance</Badge>;
                if (t === 'consignment') return <Badge variant="info">Consignment</Badge>;
                return <Badge>COD</Badge>;
            },
        },
        {
            key: 'leadTime', label: 'Lead Time',
            render: (r) => r.averageLeadTimeDays ? `${r.averageLeadTimeDays}d` : '—',
        },
        {
            key: 'status', label: 'Status',
            render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge>,
        },
        {
            key: 'actions', label: 'Actions', width: '120px',
            render: (r) => (
                <div className="flex gap-1">
                    {canManage && (
                        <button onClick={() => { setEditing(r); setIsFormOpen(true); }}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded" title="Edit">
                            <Edit size={16} />
                        </button>
                    )}
                    {canDelete && (
                        <button onClick={() => setDeleting(r)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader title="Suppliers" description="Manage your suppliers"
                actions={canManage && (
                    <Button variant="primary" onClick={() => { setEditing(null); setIsFormOpen(true); }}>
                        <Plus size={16} className="mr-1.5" /> Add Supplier
                    </Button>
                )} />

            <Card>
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-48">
                        <Select placeholder="All Categories"
                            options={Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))}
                            value={filters.category}
                            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-40">
                        <Select placeholder="All Statuses"
                            options={[
                                { value: 'active', label: 'Active' }, { value: 'on_hold', label: 'On Hold' },
                                { value: 'inactive', label: 'Inactive' }, { value: 'blacklisted', label: 'Blacklisted' },
                            ]}
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : suppliers.length === 0 ? (
                    <EmptyState icon={Truck} title="No suppliers" description="Add suppliers to start purchasing"
                        action={canManage && <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                            <Plus size={16} className="mr-1.5" /> Add Supplier
                        </Button>} />
                ) : (
                    <>
                        <Table columns={columns} data={suppliers} />
                        <Pagination page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                    </>
                )}
            </Card>

            <SupplierFormModal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditing(null); }} supplier={editing} />

            <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)}
                onConfirm={async () => { await deleteMutation.mutateAsync(deleting._id); setDeleting(null); }}
                title="Delete Supplier" message={`Delete "${deleting?.displayName}"? This is a soft delete.`}
                loading={deleteMutation.isPending} />
        </div>
    );
}