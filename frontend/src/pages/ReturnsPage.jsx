import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, RotateCcw } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { useReturns } from '../features/returns/useReturns';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    draft: 'default', approved: 'info', awaiting_return: 'info',
    received: 'warning', inspecting: 'warning', processed: 'warning',
    completed: 'success', rejected: 'danger', cancelled: 'default',
};

export default function ReturnsPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canCreate = ['admin', 'manager', 'sales_manager', 'sales_rep', 'accountant'].includes(user?.role);

    const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 15 });
    const { data, isLoading } = useReturns(filters);
    const returns = data?.data || [];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    const columns = [
        { key: 'rmaNumber', label: 'RMA #', width: '110px', render: (r) => <span className="font-mono text-xs">{r.rmaNumber}</span> },
        { key: 'requestDate', label: 'Date', render: (r) => fmtDate(r.requestDate) },
        {
            key: 'customer', label: 'Customer',
            render: (r) => (
                <div>
                    <p className="font-medium">{r.customerSnapshot?.name}</p>
                    <p className="text-xs text-gray-500">{r.customerSnapshot?.code}</p>
                </div>
            ),
        },
        { key: 'items', label: 'Items', render: (r) => r.items?.length || 0 },
        { key: 'totalReturnValue', label: 'Return Value', render: (r) => fmt(r.totalReturnValue) },
        { key: 'netRefundAmount', label: 'Refund', render: (r) => fmt(r.netRefundAmount) },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status.replace(/_/g, ' ')}</Badge> },
        {
            key: 'actions', label: '', width: '50px', render: (r) => (
                <button onClick={() => navigate(`/returns/${r._id}`)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded">
                    <Eye size={16} />
                </button>
            )
        },
    ];

    return (
        <div>
            <PageHeader title="Customer Returns (RMA)" description="Manage return requests and restocking"
                actions={canCreate && (
                    <Button variant="primary" onClick={() => navigate('/returns/new')}>
                        <Plus size={16} className="mr-1.5" /> New Return
                    </Button>
                )} />

            <Card>
                <div className="p-3 sm:p-4 border-b flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <div className="relative flex-1 min-w-0">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                            value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-56">
                        <Select placeholder="All Statuses"
                            options={[
                                { value: 'draft', label: 'Draft' }, { value: 'approved', label: 'Approved' },
                                { value: 'received', label: 'Received' }, { value: 'processed', label: 'Processed' },
                                { value: 'completed', label: 'Completed' }, { value: 'rejected', label: 'Rejected' },
                            ]}
                            value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
                    </div>
                </div>
                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : returns.length === 0 ? (
                    <EmptyState icon={RotateCcw} title="No returns yet" description="Create an RMA when a customer wants to return goods" />
                ) : (
                    <>
                        <Table columns={columns} data={returns} onRowClick={(r) => navigate(`/returns/${r._id}`)} />
                        <Pagination page={filters.page} totalPages={data.totalPages} total={data.total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                    </>
                )}
            </Card>
        </div>
    );
}