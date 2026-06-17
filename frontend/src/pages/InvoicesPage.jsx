import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, FileText, AlertTriangle } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { useInvoices, useAgingSummary } from '../features/invoices/useInvoices';
import { useAuthStore } from '../store/authStore';

const paymentStatusVariant = {
    unpaid: 'warning',
    partially_paid: 'info',
    paid: 'success',
    overdue: 'danger',
    cancelled: 'default',
    written_off: 'default',
};

export default function InvoicesPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canCreate = ['admin', 'manager', 'accountant', 'sales_manager'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '', paymentStatus: '', agingBucket: '',
        page: 1, limit: 15,
    });

    const { data, isLoading } = useInvoices(filters);
    const { data: agingData } = useAgingSummary();

    const invoices = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;
    const aging = agingData?.data || { buckets: {}, counts: {}, totalOutstanding: 0 };

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    const columns = [
        {
            key: 'invoiceNumber', label: 'Invoice #', width: '120px',
            render: (r) => <span className="font-mono text-xs">{r.invoiceNumber}</span>,
        },
        { key: 'invoiceDate', label: 'Date', render: (r) => fmtDate(r.invoiceDate) },
        {
            key: 'customer', label: 'Customer',
            render: (r) => (
                <div>
                    <p className="font-medium">{r.customerSnapshot?.name}</p>
                    <p className="text-xs text-gray-500">{r.customerSnapshot?.code}</p>
                </div>
            ),
        },
        {
            key: 'dueDate', label: 'Due',
            render: (r) => {
                if (!r.dueDate) return <span className="text-gray-400">—</span>;
                const overdue = r.paymentStatus === 'overdue';
                return (
                    <div className={overdue ? 'text-red-600' : ''}>
                        <p className="text-sm">{fmtDate(r.dueDate)}</p>
                        {r.daysPastDue > 0 && (
                            <p className="text-xs font-medium">{r.daysPastDue}d late</p>
                        )}
                    </div>
                );
            },
        },
        { key: 'grandTotal', label: 'Total', render: (r) => <span className="font-medium">{fmt(r.grandTotal)}</span> },
        {
            key: 'balanceDue', label: 'Outstanding',
            render: (r) => r.balanceDue > 0
                ? <span className="font-medium text-red-600">{fmt(r.balanceDue)}</span>
                : <span className="text-green-600 font-medium">Paid</span>,
        },
        {
            key: 'paymentStatus', label: 'Status',
            render: (r) => <Badge variant={paymentStatusVariant[r.paymentStatus]}>{r.paymentStatus.replace('_', ' ')}</Badge>,
        },
        {
            key: 'actions', label: '', width: '50px',
            render: (r) => (
                <button onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${r._id}`); }}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded">
                    <Eye size={16} />
                </button>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Invoices"
                description="Bill customers and track outstanding payments"
                actions={canCreate && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/invoices/from-sales-order')}>
                            From Sales Order
                        </Button>
                        <Button variant="primary" onClick={() => navigate('/invoices/new')}>
                            <Plus size={16} className="mr-1.5" /> Manual Invoice
                        </Button>
                    </div>
                )}
            />

            {/* Aging summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                {[
                    { key: 'current', label: 'Current', color: 'bg-green-50 text-green-700 border-green-200' },
                    { key: '1_30', label: '1-30 days', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                    { key: '31_60', label: '31-60 days', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                    { key: '61_90', label: '61-90 days', color: 'bg-red-50 text-red-700 border-red-200' },
                    { key: '91_plus', label: '90+ days', color: 'bg-red-100 text-red-800 border-red-300' },
                ].map((b) => (
                    <button key={b.key}
                        onClick={() => setFilters((f) => ({ ...f, agingBucket: b.key, page: 1 }))}
                        className={`border rounded-lg p-3 text-left ${b.color} ${filters.agingBucket === b.key ? 'ring-2 ring-offset-1 ring-primary-500' : ''}`}>
                        <p className="text-xs">{b.label}</p>
                        <p className="text-lg font-bold">{fmt(aging.buckets?.[b.key] || 0)}</p>
                        <p className="text-xs opacity-75">{aging.counts?.[b.key] || 0} invoices</p>
                    </button>
                ))}
            </div>

            <Card>
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search by invoice # or customer..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-48">
                        <Select placeholder="All Statuses"
                            options={[
                                { value: 'unpaid', label: 'Unpaid' },
                                { value: 'partially_paid', label: 'Partially Paid' },
                                { value: 'paid', label: 'Paid' },
                                { value: 'overdue', label: 'Overdue' },
                                { value: 'cancelled', label: 'Cancelled' },
                            ]}
                            value={filters.paymentStatus}
                            onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value, page: 1 }))} />
                    </div>
                    {filters.agingBucket && (
                        <Button variant="outline" size="sm" onClick={() => setFilters((f) => ({ ...f, agingBucket: '', page: 1 }))}>
                            Clear aging filter
                        </Button>
                    )}
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : invoices.length === 0 ? (
                    <EmptyState icon={FileText} title="No invoices" description="Generate invoices from sales orders or create manual ones"
                        action={canCreate && <Button variant="primary" onClick={() => navigate('/invoices/from-sales-order')}>
                            Generate from Sales Order
                        </Button>} />
                ) : (
                    <>
                        <Table columns={columns} data={invoices} onRowClick={(r) => navigate(`/invoices/${r._id}`)} />
                        <Pagination page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                    </>
                )}
            </Card>
        </div>
    );
}