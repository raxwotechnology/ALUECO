import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import { useSalesByProduct } from '../../features/reports/useReports';

export default function SalesByProductReportPage() {
    const navigate = useNavigate();
    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data, isLoading } = useSalesByProduct({ startDate, endDate, limit: 100 });
    const products = data?.data || [];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtNum = (n) => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 }).format(n);

    const exportCsv = () => {
        const rows = [
            ['Rank', 'Product Code', 'Product Name', 'Qty Sold', 'Avg Price', 'Gross Revenue', 'Discount', 'Net Revenue', 'Orders'],
            ...products.map((p, idx) => [
                idx + 1, p.productCode, p.productName, p.quantitySold,
                p.avgPrice.toFixed(2), p.grossRevenue.toFixed(2),
                p.totalDiscount.toFixed(2), p.netRevenue.toFixed(2), p.orderCount,
            ]),
        ];
        const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-by-product-${startDate}-to-${endDate}.csv`;
        a.click();
    };

    const columns = [
        { key: 'rank', label: '#', width: '40px', render: (_r, idx) => idx + 1 },
        { key: 'productCode', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.productCode}</span> },
        { key: 'productName', label: 'Product', render: (r) => <span className="font-medium">{r.productName}</span> },
        { key: 'quantitySold', label: 'Qty Sold', render: (r) => fmtNum(r.quantitySold) },
        { key: 'avgPrice', label: 'Avg Price', render: (r) => fmt(r.avgPrice) },
        { key: 'grossRevenue', label: 'Gross Rev.', render: (r) => fmt(r.grossRevenue) },
        { key: 'totalDiscount', label: 'Discount', render: (r) => <span className="text-red-600">-{fmt(r.totalDiscount)}</span> },
        { key: 'netRevenue', label: 'Net Rev.', render: (r) => <span className="font-semibold">{fmt(r.netRevenue)}</span> },
        { key: 'orderCount', label: 'Orders' },
    ];

    const totalRevenue = products.reduce((s, p) => s + p.netRevenue, 0);
    const totalQty = products.reduce((s, p) => s + p.quantitySold, 0);

    return (
        <div>
            <PageHeader title="Sales by Product" description="Product-level sales performance"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/reports')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        <Button variant="outline" onClick={exportCsv} disabled={products.length === 0}>
                            <Download size={16} className="mr-1.5" /> Export CSV
                        </Button>
                    </div>
                } />

            <Card className="p-4 mb-4">
                <div className="flex gap-3">
                    <div className="w-40">
                        <Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="w-40">
                        <Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card className="p-4"><p className="text-sm text-gray-600">Products Sold</p><p className="text-2xl font-semibold">{products.length}</p></Card>
                <Card className="p-4"><p className="text-sm text-gray-600">Total Units</p><p className="text-2xl font-semibold">{fmtNum(totalQty)}</p></Card>
                <Card className="p-4"><p className="text-sm text-gray-600">Total Net Revenue</p><p className="text-2xl font-semibold">{fmt(totalRevenue)}</p></Card>
            </div>

            <Card>
                {isLoading
                    ? <div className="py-16 text-center text-gray-500">Loading...</div>
                    : products.length === 0
                        ? <div className="py-16 text-center text-gray-500">No sales data for this period</div>
                        : <Table columns={columns} data={products} />}
            </Card>
        </div>
    );
}