import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Receipt } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { usePayments } from '../features/payments/usePayments';

export default function PaymentsPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({ direction: '', method: '', page: 1, limit: 15 });
    const { data, isLoading } = usePayments(filters);

    const payments = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    const columns = [
        { key: 'paymentNumber', label: 'Ref #', width: '120px', render: (r) => <span className="font-mono text-xs">{r.paymentNumber}</span> },
        {
            key: 'direction', label: 'Type',
            render: (r) => <Badge variant={r.direction === 'received' ? 'success' : 'info'}>
                {r.direction === 'received' ? 'IN' : 'OUT'}
            </Badge>,
        },
        { key: 'paymentDate', label: 'Date', render: (r) => fmtDate(r.paymentDate) },
        {
            key: 'party', label: 'Party',
            render: (r) => (
                <div>
                    <p className="font-medium">{r.partyName}</p>
                    <p className="text-xs text-gray-500">
                        {r.customerId?.customerCode || r.supplierId?.supplierCode}
                    </p>
                </div>
            ),
        },
        { key: 'method', label: 'Method', render: (r) => <span className="capitalize">{(r.method || '').replace('_', ' ')}</span> },
        {
            key: 'amount', label: 'Amount',
            render: (r) => <span className={`font-medium ${r.direction === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                {r.direction === 'received' ? '+' : '-'}{fmt(r.amount)}
            </span>,
        },
        { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
        {
            key: 'actions', label: '', width: '50px',
            render: (r) => (
                <button onClick={() => navigate(`/payments/${r._id}`)}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded">
                    <Eye size={16} />
                </button>
            ),
        },
    ];

    return (
        <div>
            <PageHeader title="Payments" description="Customer payments received and supplier payments made"
                actions={<Button variant="primary" onClick={() => navigate('/payments/new')}>
                    <Plus size={16} className="mr-1.5" /> Record Payment
                </Button>} />

            <Card>
                <div className="p-3 sm:p-4 border-b flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <div className="w-full sm:w-48">
                        <Select placeholder="All Types"
                            options={[{ value: 'received', label: 'Received' }, { value: 'paid', label: 'Paid Out' }]}
                            value={filters.direction}
                            onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-48">
                        <Select placeholder="All Methods"
                            options={[
                                { value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' },
                                { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'card', label: 'Card' },
                                { value: 'mobile_wallet', label: 'Mobile Wallet' },
                            ]}
                            value={filters.method}
                            onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value, page: 1 }))} />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : payments.length === 0 ? (
                    <EmptyState icon={Receipt} title="No payments" description="Record customer or supplier payments"
                        action={<Button variant="primary" onClick={() => navigate('/payments/new')}>
                            <Plus size={16} className="mr-1.5" /> Record Payment
                        </Button>} />
                ) : (
                    <>
                        <Table columns={columns} data={payments} onRowClick={(r) => navigate(`/payments/${r._id}`)} />
                        <Pagination page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                    </>
                )}
            </Card>
        </div>
    );
}