import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { useStockMovement } from '../../features/reports/useReports';

export default function StockMovementReportPage() {
    const navigate = useNavigate();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(weekAgo);
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data, isLoading } = useStockMovement({ startDate, endDate, limit: 500 });
    const movements = data?.data || [];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 }).format(n || 0);

    const columns = [
        { key: 'createdAt', label: 'Date', render: (r) => new Date(r.createdAt).toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' }) },
        { key: 'movementNumber', label: 'Ref', render: (r) => <span className="font-mono text-xs">{r.movementNumber}</span> },
        {
            key: 'product', label: 'Product', render: (r) => (
                <div>
                    <p className="text-sm">{r.productId?.name || r.productName}</p>
                    <p className="text-xs font-mono text-gray-500">{r.productId?.productCode || r.productCode}</p>
                </div>
            )
        },
        { key: 'warehouse', label: 'Warehouse', render: (r) => r.warehouseId?.name || '—' },
        { key: 'type', label: 'Type', render: (r) => <Badge>{r.movementType?.replace(/_/g, ' ')}</Badge> },
        {
            key: 'direction', label: 'Dir', render: (r) => (
                <span className={r.direction === 'in' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {r.direction === 'in' ? '↑ IN' : '↓ OUT'}
                </span>
            )
        },
        { key: 'quantity', label: 'Qty', render: (r) => fmt(r.quantity) },
        { key: 'balanceAfter', label: 'Balance', render: (r) => fmt(r.balanceAfter) },
        { key: 'source', label: 'Source', render: (r) => r.sourceDocument?.number || '—' },
        { key: 'performedBy', label: 'By', render: (r) => r.performedBy ? `${r.performedBy.firstName} ${r.performedBy.lastName}` : '—' },
    ];

    return (
        <div>
            <PageHeader title="Stock Movement Log" description="All inventory changes audit trail"
                actions={<Button variant="outline" onClick={() => navigate('/reports')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>} />

            <Card className="p-4 mb-4">
                <div className="flex gap-3">
                    <div className="w-40"><Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                    <div className="w-40"><Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                </div>
            </Card>

            <Card>
                {isLoading
                    ? <div className="py-16 text-center text-gray-500">Loading...</div>
                    : movements.length === 0
                        ? <div className="py-16 text-center text-gray-500">No movements in this period</div>
                        : <Table columns={columns} data={movements} />}
            </Card>
        </div>
    );
}