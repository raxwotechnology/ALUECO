import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import { useSalesByCustomer } from '../../features/reports/useReports';

export default function SalesByCustomerReportPage() {
    const navigate = useNavigate();
    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data, isLoading } = useSalesByCustomer({ startDate, endDate, limit: 100 });
    const customers = data?.data || [];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const exportCsv = () => {
        const rows = [
            ['Rank', 'Customer Code', 'Customer Name', 'Orders', 'Total Ordered', 'Avg Order', 'Invoiced', 'Paid', 'Outstanding'],
            ...customers.map((c, idx) => [
                idx + 1, c.customerCode, c.customerName, c.orderCount,
                c.totalOrdered, c.avgOrderValue, c.invoiced, c.paid, c.outstanding,
            ]),
        ];
        const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-by-customer-${startDate}-to-${endDate}.csv`;
        a.click();
    };

    const columns = [
        { key: 'rank', label: '#', width: '40px', render: (_r, idx) => idx + 1 },
        { key: 'customerCode', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.customerCode}</span> },
        { key: 'customerName', label: 'Customer', render: (r) => <span className="font-medium">{r.customerName}</span> },
        { key: 'orderCount', label: 'Orders' },
        { key: 'totalOrdered', label: 'Total Ordered', render: (r) => fmt(r.totalOrdered) },
        { key: 'avgOrderValue', label: 'Avg Order', render: (r) => fmt(r.avgOrderValue) },
        { key: 'invoiced', label: 'Invoiced', render: (r) => fmt(r.invoiced) },
        { key: 'paid', label: 'Paid', render: (r) => <span className="text-green-700">{fmt(r.paid)}</span> },
        {
            key: 'outstanding', label: 'Outstanding', render: (r) =>
                r.outstanding > 0 ? <span className="text-amber-700 font-medium">{fmt(r.outstanding)}</span> : '—'
        },
    ];

    const totals = customers.reduce(
        (s, c) => ({
            orders: s.orders + c.orderCount,
            ordered: s.ordered + c.totalOrdered,
            invoiced: s.invoiced + c.invoiced,
            paid: s.paid + c.paid,
            outstanding: s.outstanding + c.outstanding,
        }),
        { orders: 0, ordered: 0, invoiced: 0, paid: 0, outstanding: 0 }
    );

    return (
        <div>
            <PageHeader title="Sales by Customer" description="Customer-level performance and balances"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/reports')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        <Button variant="outline" onClick={exportCsv} disabled={customers.length === 0}>
                            <Download size={16} className="mr-1.5" /> Export CSV
                        </Button>
                    </div>
                } />

            <Card className="p-4 mb-4">
                <div className="flex gap-3">
                    <div className="w-40"><Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                    <div className="w-40"><Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="p-4"><p className="text-sm text-gray-600">Customers</p><p className="text-2xl font-semibold">{customers.length}</p></Card>
                <Card className="p-4"><p className="text-sm text-gray-600">Total Ordered</p><p className="text-2xl font-semibold">{fmt(totals.ordered)}</p></Card>
                <Card className="p-4"><p className="text-sm text-gray-600">Paid</p><p className="text-2xl font-semibold text-green-700">{fmt(totals.paid)}</p></Card>
                <Card className="p-4"><p className="text-sm text-gray-600">Outstanding</p><p className="text-2xl font-semibold text-amber-700">{fmt(totals.outstanding)}</p></Card>
            </div>

            <Card>
                {isLoading
                    ? <div className="py-16 text-center text-gray-500">Loading...</div>
                    : customers.length === 0
                        ? <div className="py-16 text-center text-gray-500">No sales for this period</div>
                        : <Table columns={columns} data={customers} />}
            </Card>
        </div>
    );
}