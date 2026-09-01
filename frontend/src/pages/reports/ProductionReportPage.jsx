import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import KpiCard from '../../components/ui/KpiCard';
import Badge from '../../components/ui/Badge';
import {
    useProductionSummary, useProductionByProduct, useProductionWastage,
} from '../../features/reports/useReports';

export default function ProductionReportPage() {
    const navigate = useNavigate();
    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data: summaryData } = useProductionSummary({ startDate, endDate });
    const { data: byProductData } = useProductionByProduct({ startDate, endDate });
    const { data: wastageData } = useProductionWastage({ startDate, endDate });

    const s = summaryData?.data?.summary;
    const byProduct = byProductData?.data || [];
    const wastage = wastageData?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const productColumns = [
        { key: 'productCode', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.productCode}</span> },
        { key: 'productName', label: 'Product' },
        { key: 'orderCount', label: 'Orders' },
        { key: 'totalPlanned', label: 'Planned Qty' },
        { key: 'totalProduced', label: 'Produced' },
        {
            key: 'yieldPercent', label: 'Yield %', render: (r) => (
                <Badge variant={r.yieldPercent >= 95 ? 'success' : r.yieldPercent >= 85 ? 'warning' : 'danger'}>
                    {r.yieldPercent}%
                </Badge>
            )
        },
        { key: 'avgCostPerUnit', label: 'Avg Cost/Unit', render: (r) => fmt(r.avgCostPerUnit) },
        { key: 'totalActualCost', label: 'Total Cost', render: (r) => fmt(r.totalActualCost) },
    ];

    return (
        <div>
            <PageHeader title="Production Reports" description="Manufacturing performance analysis"
                actions={<Button variant="outline" onClick={() => navigate('/reports')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>} />

            <Card className="p-4 mb-4">
                <div className="flex gap-3">
                    <div className="w-40"><Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                    <div className="w-40"><Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                </div>
            </Card>

            {s && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <KpiCard label="Production Orders" value={s.totalOrders} />
                    <KpiCard label="Units Produced" value={s.totalProducedQty}
                        subtext={`Yield: ${s.yieldPercent}%`} />
                    <KpiCard label="Total Cost" value={fmt(s.totalActualCost)}
                        subtext={`Planned: ${fmt(s.totalPlannedCost)}`} />
                    <KpiCard label="Cost Variance" value={fmt(s.totalVariance)}
                        subtext={`${s.variancePercent}% vs plan`}
                        trend={-s.variancePercent} />
                </div>
            )}

            <Card className="mb-6">
                <div className="px-6 py-4 border-b">
                    <h3 className="text-sm font-semibold">By Product</h3>
                </div>
                {byProduct.length === 0
                    ? <div className="py-16 text-center text-gray-500">No production in this period</div>
                    : <Table columns={productColumns} data={byProduct} />}
            </Card>

            {wastage && wastage.byProduct.length > 0 && (
                <Card>
                    <div className="px-6 py-4 border-b flex justify-between">
                        <h3 className="text-sm font-semibold">Production Wastage</h3>
                        <span className="text-sm text-red-600 font-semibold">{fmt(wastage.totalWastageValue)}</span>
                    </div>
                    <Table columns={[
                        { key: 'productName', label: 'Product', render: (r) => <div><p className="text-sm">{r.productName}</p><p className="text-xs font-mono text-gray-500">{r.productCode}</p></div> },
                        { key: 'count', label: 'Incidents' },
                        { key: 'totalQuantity', label: 'Quantity Lost' },
                        { key: 'totalValue', label: 'Value Lost', render: (r) => <span className="text-red-600">{fmt(r.totalValue)}</span> },
                    ]} data={wastage.byProduct} />
                </Card>
            )}
        </div>
    );
}