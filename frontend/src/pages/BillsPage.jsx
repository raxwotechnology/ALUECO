import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Receipt as ReceiptIcon } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { useBills, usePayablesAging } from '../features/bills/useBills';

const statusVariant = {
    unpaid: 'warning', partially_paid: 'info', paid: 'success',
    overdue: 'danger', cancelled: 'default', disputed: 'danger',
};

export default function BillsPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        search: '', paymentStatus: '', agingBucket: '', page: 1, limit: 15,
    });

    const { data, isLoading } = useBills(filters);
    const { data: agingData } = usePayablesAging();
    const bills = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;
    const aging = agingData?.data || { buckets: {}, counts: {}, totalPayable: 0 };

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    const columns = [
        { key: 'billNumber', label: 'Bill #', width: '120px', render: (r) => <span className="font-mono text-xs">{r.billNumber}</span> },
        { key: 'supplierInvoice', label: 'Supplier Inv #', render: (r) => r.supplierInvoiceNumber || '—' },
        { key: 'billDate', label: 'Date', render: (r) => fmtDate(r.billDate) },
        {
            key: 'supplier', label: 'Supplier',
            render: (r) => (
                <div>
                    <p className="font-medium">{r.supplierSnapshot?.name}</p>
                    <p className="text-xs text-gray-500">{r.supplierSnapshot?.code}</p>
                </div>
            ),
        },
        { key: 'dueDate', label: 'Due', render: (r) => fmtDate(r.dueDate) },
        { key: 'grandTotal', label: 'Total', render: (r) => fmt(r.grandTotal) },
        {
            key: 'balance', label: 'We Owe',
            render: (r) => r.balanceDue > 0
                ? <span className="font-medium text-red-600">{fmt(r.balanceDue)}</span>
                : <span className="text-green-600">Paid</span>,
        },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.paymentStatus]}>{r.paymentStatus.replace('_', ' ')}</Badge> },
        {
            key: 'actions', label: '', width: '50px',
            render: (r) => (
                <button onClick={() => navigate(`/bills/${r._id}`)}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded">
                    <Eye size={16} />
                </button>
            ),
        },
    ];

    return (
        <div>
            <PageHeader title="Supplier Bills" description="Track what you owe suppliers" />

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
                        <p className="text-xs opacity-75">{aging.counts?.[b.key] || 0}</p>
                    </button>
                ))}
            </div>

            <Card>
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-48">
                        <Select placeholder="All Statuses"
                            options={[
                                { value: 'unpaid', label: 'Unpaid' }, { value: 'partially_paid', label: 'Partially Paid' },
                                { value: 'paid', label: 'Paid' }, { value: 'overdue', label: 'Overdue' },
                                { value: 'disputed', label: 'Disputed' }, { value: 'cancelled', label: 'Cancelled' },
                            ]}
                            value={filters.paymentStatus}
                            onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value, page: 1 }))} />
                    </div>
                    {filters.agingBucket && (
                        <Button variant="outline" size="sm" onClick={() => setFilters((f) => ({ ...f, agingBucket: '' }))}>
                            Clear filter
                        </Button>
                    )}
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : bills.length === 0 ? (
                    <EmptyState icon={ReceiptIcon} title="No bills yet" description="Bills are generated from GRNs when goods arrive" />
                ) : (
                    <>
                        <Table columns={columns} data={bills} onRowClick={(r) => navigate(`/bills/${r._id}`)} />
                        <Pagination page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                    </>
                )}
            </Card>
        </div>
    );
}