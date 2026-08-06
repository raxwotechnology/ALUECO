import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, ShoppingCart } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { useSalesOrders } from '../features/salesOrders/useSalesOrders';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    draft: 'default',
    pending_approval: 'warning',
    approved: 'info',
    partially_dispatched: 'info',
    dispatched: 'info',
    partially_delivered: 'info',
    delivered: 'success',
    invoiced: 'success',
    completed: 'success',
    on_hold: 'warning',
    cancelled: 'danger',
};

export default function SalesOrdersPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canCreate = ['admin', 'manager', 'sales_manager', 'sales_rep'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '', status: '',
        page: 1, limit: 10,
    });

    const { data, isLoading } = useSalesOrders(filters);
    const orders = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const fmt = (n) => new Intl.NumberFormat('en-LK', {
        style: 'currency', currency: 'LKR', minimumFractionDigits: 2,
    }).format(n || 0);

    const columns = [
        {
            key: 'orderNumber', label: 'Order #', width: '120px',
            render: (r) => <span className="font-mono text-xs">{r.orderNumber}</span>,
        },
        {
            key: 'orderDate', label: 'Date',
            render: (r) => new Date(r.orderDate).toLocaleDateString('en-LK'),
        },
        {
            key: 'customer', label: 'Customer',
            render: (r) => (
                <div>
                    <p className="font-medium text-gray-900">{r.customerSnapshot?.name}</p>
                    <p className="text-xs text-gray-500">{r.customerSnapshot?.code}</p>
                </div>
            ),
        },
        {
            key: 'itemsCount', label: 'Items',
            render: (r) => <span className="text-sm">{r.items?.length || 0}</span>,
        },
        {
            key: 'grandTotal', label: 'Order Total',
            render: (r) => <span className="font-semibold">{fmt(r.grandTotal)}</span>,
        },
        {
            key: 'advancePaidAmount', label: 'Advance Paid',
            render: (r) => <span className="font-mono text-emerald-600 font-medium">{fmt(r.advancePaidAmount || r.advanceAmount || 0)}</span>,
        },
        {
            key: 'pendingBalance', label: 'Pending Balance',
            render: (r) => {
                const adv = r.advancePaidAmount || r.advanceAmount || 0;
                const pend = Math.max(0, (r.grandTotal || 0) - adv);
                return <span className="font-mono text-rose-600 font-bold">{fmt(pend)}</span>;
            },
        },
        {
            key: 'status', label: 'Status',
            render: (r) => <Badge variant={statusVariant[r.status]}>{r.status.replace(/_/g, ' ')}</Badge>,
        },
        {
            key: 'actions', label: '', width: '60px',
            render: (r) => (
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/sales-orders/${r._id}`); }}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                    title="View"
                >
                    <Eye size={16} />
                </button>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Sales Orders"
                description="Manage customer orders"
                actions={canCreate && (
                    <div className="flex gap-2">
                        {/* <Button variant="primary" onClick={() => navigate('/sales-orders/new')}>
                            <Plus size={16} className="mr-1.5" /> New Order
                        </Button> */}
                        <Button variant="outline" onClick={() => navigate('/pos')}>
                            <ShoppingCart size={16} className="mr-1.5" /> POS Mode
                        </Button>
                        <Button variant="primary" onClick={() => navigate('/sales-orders/new')}>
                            <Plus size={16} className="mr-1.5" /> Detailed Order
                        </Button>
                    </div>
                )}
            />

            <Card>
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by order number or customer..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-48">
                        <Select
                            placeholder="All Statuses"
                            options={[
                                { value: 'draft', label: 'Draft' },
                                { value: 'pending_approval', label: 'Pending Approval' },
                                { value: 'approved', label: 'Approved' },
                                { value: 'dispatched', label: 'Dispatched' },
                                { value: 'delivered', label: 'Delivered' },
                                { value: 'completed', label: 'Completed' },
                                { value: 'on_hold', label: 'On Hold' },
                                { value: 'cancelled', label: 'Cancelled' },
                            ]}
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading orders...</div>
                ) : orders.length === 0 ? (
                    <EmptyState
                        icon={ShoppingCart}
                        title="No orders yet"
                        description="Create your first sales order"
                        action={canCreate && (
                            <Button variant="primary" onClick={() => navigate('/sales-orders/new')}>
                                <Plus size={16} className="mr-1.5" /> New Order
                            </Button>
                        )}
                    />
                ) : (
                    <>
                        <Table columns={columns} data={orders} onRowClick={(r) => navigate(`/sales-orders/${r._id}`)} />
                        <Pagination
                            page={filters.page}
                            totalPages={totalPages}
                            total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />
                    </>
                )}
            </Card>
        </div>
    );
}