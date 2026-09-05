import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, History } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';

import { useStockMovements } from '../features/stock/useStock';
import { useWarehouses } from '../features/warehouses/useWarehouses';

const movementTypeLabels = {
    opening_stock: 'Opening Stock',
    purchase_receipt: 'Purchase',
    sale_dispatch: 'Sale',
    sale_return: 'Return',
    transfer_out: 'Transfer Out',
    transfer_in: 'Transfer In',
    adjustment_in: 'Adjustment (+)',
    adjustment_out: 'Adjustment (−)',
    damage: 'Damage',
};

const directionVariant = {
    in: 'success',
    out: 'warning',
};

export default function StockMovementsPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        movementType: '', warehouseId: '',
        page: 1, limit: 25,
    });

    const { data, isLoading } = useStockMovements(filters);
    const { data: warehousesData } = useWarehouses();

    const movements = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const warehouseOptions = (warehousesData?.data || []).map((w) => ({
        value: w._id, label: `${w.name} (${w.warehouseCode})`,
    }));

    const fmt = (n) => new Intl.NumberFormat('en-LK').format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleString('en-LK', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const columns = [
        {
            key: 'movementNumber', label: 'Ref #', width: '120px',
            render: (r) => <span className="font-mono text-xs">{r.movementNumber}</span>,
        },
        {
            key: 'timestamp', label: 'Date',
            render: (r) => <span className="text-xs">{fmtDate(r.timestamp)}</span>,
        },
        {
            key: 'product', label: 'Product',
            render: (r) => (
                <div>
                    <p className="text-sm font-medium">{r.productName}</p>
                    <p className="text-xs text-gray-500 font-mono">{r.productCode}</p>
                </div>
            ),
        },
        {
            key: 'type', label: 'Type',
            render: (r) => (
                <div className="flex items-center gap-1.5">
                    <Badge variant={directionVariant[r.direction]}>{r.direction.toUpperCase()}</Badge>
                    <span className="text-xs">{movementTypeLabels[r.movementType] || r.movementType}</span>
                </div>
            ),
        },
        {
            key: 'qty', label: 'Qty',
            render: (r) => (
                <span className={`font-medium ${r.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                    {r.direction === 'in' ? '+' : '−'}{fmt(r.quantity)} {r.unitOfMeasure}
                </span>
            ),
        },
        {
            key: 'warehouse', label: 'Warehouse',
            render: (r) => {
                if (r.movementType === 'transfer_out') return `${r.warehouseId?.name} → …`;
                if (r.movementType === 'transfer_in') return `… → ${r.warehouseId?.name}`;
                return r.warehouseId?.name || '—';
            },
        },
        {
            key: 'balance', label: 'Balance',
            render: (r) => <span className="text-sm">{fmt(r.balanceAfter)}</span>,
        },
        {
            key: 'ref', label: 'Ref',
            render: (r) => r.sourceDocument?.number ? (
                <span className="text-xs font-mono text-gray-600">{r.sourceDocument.number}</span>
            ) : <span className="text-gray-400">—</span>,
        },
        {
            key: 'by', label: 'By',
            render: (r) => r.performedBy ? `${r.performedBy.firstName} ${r.performedBy.lastName}` : '—',
        },
    ];

    return (
        <div>
            <PageHeader
                title="Stock Movements"
                description="Complete audit trail of every stock change"
                actions={<Button variant="outline" onClick={() => navigate('/stock')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back to Stock
                </Button>}
            />

            <Card>
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
                    <div className="w-56">
                        <Select
                            placeholder="All Types"
                            options={Object.entries(movementTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
                            value={filters.movementType}
                            onChange={(e) => setFilters((f) => ({ ...f, movementType: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-56">
                        <Select
                            placeholder="All Warehouses"
                            options={warehouseOptions}
                            value={filters.warehouseId}
                            onChange={(e) => setFilters((f) => ({ ...f, warehouseId: e.target.value, page: 1 }))}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : movements.length === 0 ? (
                    <EmptyState icon={History} title="No movements yet" description="Stock movements appear here as they happen" />
                ) : (
                    <>
                        <Table columns={columns} data={movements} />
                        <Pagination
                            page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />
                    </>
                )}
            </Card>
        </div>
    );
}