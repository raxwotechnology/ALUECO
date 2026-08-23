import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Factory } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { useProductionOrders } from '../features/production/useProduction';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    draft: 'default', planned: 'info', materials_reserved: 'info',
    in_progress: 'warning', on_hold: 'warning',
    completed: 'success', partially_completed: 'warning',
    cancelled: 'danger', closed: 'default',
};

const priorityVariant = {
    low: 'default', normal: 'info', high: 'warning', urgent: 'danger',
};

export default function ProductionOrdersPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canCreate = ['admin', 'manager', 'production_staff'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '', status: '', priority: '',
        page: 1, limit: 15,
    });

    const { data, isLoading } = useProductionOrders(filters);
    const orders = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    const columns = [
        { key: 'productionNumber', label: 'Prod #', width: '130px', render: (r) => <span className="font-mono text-xs">{r.productionNumber}</span> },
        {
            key: 'finishedProduct', label: 'Making',
            render: (r) => (
                <div>
                    <p className="font-medium">{r.finishedProductName}</p>
                    <p className="text-xs text-gray-500">{r.bomName} · {r.bomCode}</p>
                </div>
            ),
        },
        {
            key: 'qty', label: 'Qty',
            render: (r) => (
                <div className="text-sm">
                    <p className="font-medium">{r.plannedQuantity}</p>
                    {r.totalProduced > 0 && r.totalProduced < r.plannedQuantity && (
                        <p className="text-xs text-green-600">{r.totalProduced} done</p>
                    )}
                </div>
            ),
        },
        {
            key: 'progress', label: 'Progress',
            render: (r) => (
                <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500" style={{ width: `${r.completionPercent || 0}%` }} />
                    </div>
                    <span className="text-xs">{Math.round(r.completionPercent || 0)}%</span>
                </div>
            ),
        },
        { key: 'plannedStart', label: 'Start', render: (r) => fmtDate(r.plannedStartDate) },
        { key: 'priority', label: 'Priority', render: (r) => <Badge variant={priorityVariant[r.priority]}>{r.priority}</Badge> },
        { key: 'cost', label: 'Est. Cost', render: (r) => fmt(r.totalPlannedCost) },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status.replace('_', ' ')}</Badge> },
        {
            key: 'actions', label: '', width: '50px',
            render: (r) => (
                <button onClick={(e) => { e.stopPropagation(); navigate(`/production-orders/${r._id}`); }}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded">
                    <Eye size={16} />
                </button>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Production Orders"
                description="Manufacture finished goods from raw materials"
                actions={canCreate && (
                    <Button variant="primary" onClick={() => navigate('/production-orders/new')}>
                        <Plus size={16} className="mr-1.5" /> New Production Order
                    </Button>
                )}
            />

            <Card>
                <div className="p-3 sm:p-4 border-b flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search by production #, product or BOM..."
                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-48">
                        <Select placeholder="All Statuses"
                            options={[
                                { value: 'draft', label: 'Draft' },
                                { value: 'planned', label: 'Planned' },
                                { value: 'in_progress', label: 'In Progress' },
                                { value: 'on_hold', label: 'On Hold' },
                                { value: 'completed', label: 'Completed' },
                                { value: 'partially_completed', label: 'Partially Completed' },
                                { value: 'cancelled', label: 'Cancelled' },
                            ]}
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-40">
                        <Select placeholder="All Priorities"
                            options={[
                                { value: 'low', label: 'Low' },
                                { value: 'normal', label: 'Normal' },
                                { value: 'high', label: 'High' },
                                { value: 'urgent', label: 'Urgent' },
                            ]}
                            value={filters.priority}
                            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value, page: 1 }))} />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : orders.length === 0 ? (
                    <EmptyState icon={Factory} title="No production orders"
                        description="Create one from a BOM to start manufacturing"
                        action={canCreate && <Button variant="primary" onClick={() => navigate('/production-orders/new')}>
                            <Plus size={16} className="mr-1.5" /> New Production Order
                        </Button>} />
                ) : (
                    <>
                        <Table columns={columns} data={orders} onRowClick={(r) => navigate(`/production-orders/${r._id}`)} />
                        <Pagination page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                    </>
                )}
            </Card>
        </div>
    );
}