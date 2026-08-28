import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, ShoppingCart, CheckCircle, Truck, PackageCheck, Ban, FileText, MoreVertical } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { useSalesOrders, useChangeOrderStatus } from '../features/salesOrders/useSalesOrders';
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
    const changeStatus = useChangeOrderStatus();
    const canCreate = ['admin', 'manager', 'sales_manager', 'sales_rep'].includes(user?.role);
    const canApprove = ['admin', 'manager', 'sales_manager', 'accountant'].includes(user?.role);
    const canDispatch = ['admin', 'manager', 'warehouse_staff'].includes(user?.role);
    const canCancel = ['admin', 'manager', 'sales_manager'].includes(user?.role);

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

    const handleStatusChange = async (orderId, newStatus, reason = '') => {
        try {
            await changeStatus.mutateAsync({ id: orderId, status: newStatus, reason });
        } catch (error) {
            // Error handled by mutation
        }
    };

    const getAvailableActions = (order) => {
        const actions = [];
        
        if (['draft', 'pending_approval', 'pending'].includes(order.status) && canApprove) {
            actions.push({
                label: 'Approve',
                icon: CheckCircle,
                variant: 'primary',
                onClick: () => handleStatusChange(order._id, 'approved'),
            });
        }
        if (order.status === 'approved' && canDispatch) {
            actions.push({
                label: 'Dispatch',
                icon: Truck,
                variant: 'primary',
                onClick: () => handleStatusChange(order._id, 'dispatched'),
            });
        }
        if (order.status === 'dispatched' && canDispatch) {
            actions.push({
                label: 'Mark Delivered',
                icon: PackageCheck,
                variant: 'primary',
                onClick: () => handleStatusChange(order._id, 'delivered'),
            });
        }
        if (order.status === 'delivered' && canApprove) {
            actions.push({
                label: 'Complete',
                icon: CheckCircle,
                variant: 'success',
                onClick: () => handleStatusChange(order._id, 'completed'),
            });
        }
        if (order.status === 'delivered' && !order.invoiceId && canApprove) {
            actions.push({
                label: 'Create Invoice',
                icon: FileText,
                variant: 'outline',
                onClick: () => navigate(`/invoices/from-sales-order?orderIds=${order._id}`),
            });
        }
        if (order.invoiceId) {
            actions.push({
                label: 'View Invoice',
                icon: FileText,
                variant: 'outline',
                onClick: () => navigate(`/invoices/${order.invoiceId._id || order.invoiceId}`),
            });
        }
        if (!['completed', 'cancelled'].includes(order.status) && canCancel) {
            actions.push({
                label: 'Cancel',
                icon: Ban,
                variant: 'danger',
                onClick: () => {
                    const reason = prompt('Enter cancellation reason:');
                    if (reason) handleStatusChange(order._id, 'cancelled', reason);
                },
            });
        }
        
        return actions;
    };

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
            key: 'actions', label: 'Actions', width: '200px',
            render: (r) => {
                const actions = getAvailableActions(r);
                if (actions.length === 0) return <span className="text-gray-400 text-sm">—</span>;
                
                return (
                    <div className="flex items-center gap-1">
                        {actions.slice(0, 2).map((action, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); action.onClick(); }}
                                className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 ${
                                    action.variant === 'primary' 
                                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                        : action.variant === 'success'
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : action.variant === 'danger'
                                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                title={action.label}
                            >
                                <action.icon size={14} />
                                <span className="hidden sm:inline">{action.label}</span>
                            </button>
                        ))}
                        {actions.length > 2 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/sales-orders/${r._id}`); }}
                                className="p-1.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                                title="View all actions"
                            >
                                <MoreVertical size={14} />
                            </button>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'view', label: '', width: '50px',
            render: (r) => (
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/sales-orders/${r._id}`); }}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                    title="View details"
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
                <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
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