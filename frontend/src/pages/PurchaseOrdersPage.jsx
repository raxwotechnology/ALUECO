import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, ShoppingBag, Copy, Printer, Trash2, Ban } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { usePurchaseOrders } from '../features/purchaseOrders/usePurchaseOrders';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    draft: 'default',
    pending_approval: 'warning',
    approved: 'info',
    sent: 'info',
    partially_received: 'warning',
    fully_received: 'success',
    closed: 'success',
    cancelled: 'danger',
};

export default function PurchaseOrdersPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canCreate = ['admin', 'manager', 'accountant'].includes(user?.role);

    const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 10 });
    const { data, isLoading } = usePurchaseOrders(filters);

    const orders = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    const columns = [
        { key: 'poNumber', label: 'PO #', width: '120px', render: (r) => <span className="font-mono text-xs">{r.poNumber}</span> },
        { key: 'poDate', label: 'Date', render: (r) => fmtDate(r.poDate) },
        {
            key: 'supplier', label: 'Supplier',
            render: (r) => (
                <div>
                    <p className="font-medium">{r.supplierSnapshot?.name}</p>
                    <p className="text-xs text-gray-500">{r.supplierSnapshot?.code}</p>
                </div>
            ),
        },
        { key: 'warehouse', label: 'Deliver To', render: (r) => r.deliverTo?.warehouseName || '—' },
        { key: 'items', label: 'Items', render: (r) => r.items?.length || 0 },
        { key: 'grandTotal', label: 'Total', render: (r) => <span className="font-medium">{fmt(r.grandTotal)}</span> },
        {
            key: 'receipt', label: 'Received',
            render: (r) => (
                <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500" style={{ width: `${r.receiptCompletionPercent || 0}%` }} />
                    </div>
                    <span className="text-xs">{Math.round(r.receiptCompletionPercent || 0)}%</span>
                </div>
            ),
        },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status.replace('_', ' ')}</Badge> },
        {
            key: 'actions', label: 'Actions', width: '130px',
            render: (r) => (
                <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/purchase-orders/${r._id}`); }}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-slate-100 rounded" title="View / Print">
                        <Eye size={15} />
                    </button>
                    <button onClick={async (e) => {
                        e.stopPropagation();
                        try {
                            await api.post(`/purchase-orders/${r._id}/duplicate`);
                            toast.success('PO duplicated successfully');
                            window.location.reload();
                        } catch (err) { toast.error(err.response?.data?.message || 'Failed to duplicate PO'); }
                    }} className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Duplicate PO">
                        <Copy size={15} />
                    </button>
                    <button onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete PO #${r.poNumber}?`)) {
                            try {
                                await api.delete(`/purchase-orders/${r._id}`);
                                toast.success('PO deleted');
                                window.location.reload();
                            } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete PO'); }
                        }
                    }} className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded" title="Delete PO">
                        <Trash2 size={15} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader title="Purchase Orders" description="Buy stock from suppliers"
                actions={canCreate && (
                    <Button variant="primary" onClick={() => navigate('/purchase-orders/new')}>
                        <Plus size={16} className="mr-1.5" /> New PO
                    </Button>
                )} />

            <Card>
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search by PO number or supplier..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-56">
                        <Select placeholder="All Statuses"
                            options={[
                                { value: 'draft', label: 'Draft' },
                                { value: 'approved', label: 'Approved' },
                                { value: 'sent', label: 'Sent to Supplier' },
                                { value: 'partially_received', label: 'Partially Received' },
                                { value: 'fully_received', label: 'Fully Received' },
                                { value: 'closed', label: 'Closed' },
                                { value: 'cancelled', label: 'Cancelled' },
                            ]}
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : orders.length === 0 ? (
                    <EmptyState icon={ShoppingBag} title="No purchase orders" description="Create your first PO"
                        action={canCreate && <Button variant="primary" onClick={() => navigate('/purchase-orders/new')}>
                            <Plus size={16} className="mr-1.5" /> New PO
                        </Button>} />
                ) : (
                    <>
                        <Table columns={columns} data={orders} onRowClick={(r) => navigate(`/purchase-orders/${r._id}`)} />
                        <Pagination page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                    </>
                )}
            </Card>
        </div>
    );
}