import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, Workflow, Eye } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';

import { useBoms, useDeleteBom } from '../features/boms/useBoms';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    draft: 'default', active: 'success', inactive: 'warning', archived: 'default',
};

export default function BomsPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager', 'production_staff'].includes(user?.role);

    const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 15 });
    const [deleting, setDeleting] = useState(null);

    const { data, isLoading } = useBoms(filters);
    const deleteMutation = useDeleteBom();

    const boms = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const columns = [
        { key: 'bomCode', label: 'BOM #', width: '110px', render: (r) => <span className="font-mono text-xs">{r.bomCode}</span> },
        {
            key: 'name', label: 'Formula Name',
            render: (r) => (
                <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-gray-500">v{r.version}</p>
                </div>
            ),
        },
        {
            key: 'finishedProduct', label: 'Produces',
            render: (r) => (
                <div>
                    <p className="text-sm font-medium">{r.finishedProductName}</p>
                    <p className="text-xs text-gray-500">
                        {r.outputQuantity} {r.outputUnitOfMeasure}
                    </p>
                </div>
            ),
        },
        {
            key: 'components', label: 'Components',
            render: (r) => <span className="text-sm">{r.components?.length || 0}</span>,
        },
        { key: 'costPerUnit', label: 'Cost/Unit', render: (r) => fmt(r.costPerUnit) },
        {
            key: 'isDefault', label: 'Default',
            render: (r) => r.isDefault
                ? <Badge variant="info">Default</Badge>
                : <span className="text-gray-400">—</span>,
        },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge> },
        {
            key: 'actions', label: 'Actions', width: '120px',
            render: (r) => (
                <div className="flex gap-1">
                    <button onClick={() => navigate(`/boms/${r._id}`)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded" title="View">
                        <Eye size={16} />
                    </button>
                    {canManage && (
                        <>
                            <button onClick={() => navigate(`/boms/${r._id}/edit`)}
                                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded" title="Edit">
                                <Edit size={16} />
                            </button>
                            <button onClick={() => setDeleting(r)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Archive">
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Production Formulas (BOM)"
                description="Formulas that define how finished products are made from raw materials"
                actions={canManage && (
                    <Button variant="primary" onClick={() => navigate('/boms/new')}>
                        <Plus size={16} className="mr-1.5" /> New BOM
                    </Button>
                )}
            />

            <Card>
                <div className="p-3 sm:p-4 border-b flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search BOM or product..."
                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-48">
                        <Select placeholder="All Statuses"
                            options={[
                                { value: 'active', label: 'Active' },
                                { value: 'draft', label: 'Draft' },
                                { value: 'inactive', label: 'Inactive' },
                                { value: 'archived', label: 'Archived' },
                            ]}
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : boms.length === 0 ? (
                    <EmptyState
                        icon={Workflow}
                        title="No Formulas Created"
                        description="Create your first formula to manufacture products"
                        action={canManage && <Button variant="primary" onClick={() => navigate('/boms/new')}>
                            <Plus size={16} className="mr-1.5" /> New BOM
                        </Button>} />
                ) : (
                    <>
                        <Table columns={columns} data={boms} onRowClick={(r) => navigate(`/boms/${r._id}`)} />
                        <Pagination page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                    </>
                )}
            </Card>

            <ConfirmDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={async () => { await deleteMutation.mutateAsync(deleting._id); setDeleting(null); }}
                title="Archive BOM"
                message={`Archive "${deleting?.name}"? Production orders using this BOM will still work.`}
                loading={deleteMutation.isPending}
            />
        </div>
    );
}