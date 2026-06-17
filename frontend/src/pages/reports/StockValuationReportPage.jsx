import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { useStockValuation } from '../../features/reports/useReports';
import { useWarehouses } from '../../features/warehouses/useWarehouses';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function StockValuationReportPage() {
    const navigate = useNavigate();
    const [warehouseId, setWarehouseId] = useState('');
    const { data, isLoading } = useStockValuation({ warehouseId: warehouseId || undefined });
    const { data: warehousesData } = useWarehouses({ isActive: true });

    const report = data?.data;
    const warehouses = warehousesData?.data || [];
    const warehouseOptions = [{ value: '', label: 'All Warehouses' }, ...warehouses.map((w) => ({ value: w._id, label: w.name }))];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtNum = (n) => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 }).format(n);

    const handleExportExcel = () => {
        if (!report?.items) return;
        exportToExcel(report.items, `Stock_Valuation_${new Date().toISOString().slice(0, 10)}`, 'Stock');
    };

    const handleExportPDF = () => {
        if (!report?.items) return;
        const exportColumns = [
            { header: 'Code', dataKey: 'productCode' },
            { header: 'Product', dataKey: 'productName' },
            { header: 'Type', dataKey: 'productType' },
            { header: 'Warehouse', dataKey: 'warehouseName' },
            { header: 'On Hand', dataKey: 'onHand' },
            { header: 'Cost/Unit', dataKey: 'costPerUnit' },
            { header: 'Total Value', dataKey: 'totalValue' },
        ];
        exportToPDF('Stock Valuation Report', exportColumns, report.items, `Stock_Valuation_${new Date().toISOString().slice(0, 10)}`);
    };

    const columns = [
        { key: 'productCode', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.productCode}</span> },
        { key: 'productName', label: 'Product' },
        { key: 'productType', label: 'Type', render: (r) => <Badge>{r.productType?.replace(/_/g, ' ')}</Badge> },
        { key: 'warehouseName', label: 'Warehouse' },
        { key: 'onHand', label: 'On Hand', render: (r) => fmtNum(r.onHand) },
        { key: 'reserved', label: 'Reserved', render: (r) => fmtNum(r.reserved) },
        { key: 'available', label: 'Available', render: (r) => fmtNum(r.available) },
        { key: 'costPerUnit', label: 'Cost/Unit', render: (r) => fmt(r.costPerUnit) },
        { key: 'totalValue', label: 'Total Value', render: (r) => <span className="font-semibold">{fmt(r.totalValue)}</span> },
    ];

    return (
        <div>
            <PageHeader title="Stock Valuation" description="Total inventory value"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!report}>
                            <Download size={16} className="mr-1.5" /> Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!report}>
                            <FileText size={16} className="mr-1.5" /> PDF
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/reports')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                    </div>
                } />

            <Card className="p-4 mb-4">
                <div className="w-64">
                    <Select label="Warehouse" options={warehouseOptions}
                        value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
                </div>
            </Card>

            {isLoading || !report ? (
                <div className="py-16 text-center text-gray-500">Loading...</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <Card className="p-4"><p className="text-sm text-gray-600">Total Value</p><p className="text-2xl font-semibold">{fmt(report.summary.totalValue)}</p></Card>
                        <Card className="p-4"><p className="text-sm text-gray-600">Total Units</p><p className="text-2xl font-semibold">{fmtNum(report.summary.totalUnits)}</p></Card>
                        <Card className="p-4"><p className="text-sm text-gray-600">Stock Items</p><p className="text-2xl font-semibold">{report.summary.productCount}</p></Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Value by Product Type</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={report.byProductType} dataKey="value" nameKey="type" cx="50%" cy="50%"
                                        outerRadius={80} label={(e) => `${e.type}: ${(e.value / report.summary.totalValue * 100).toFixed(0)}%`}>
                                        {report.byProductType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v) => fmt(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card className="col-span-2 p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Type Breakdown</h3>
                            <div className="space-y-2">
                                {report.byProductType.map((t) => (
                                    <div key={t.type} className="flex justify-between items-center p-2 border-b last:border-0">
                                        <div>
                                            <Badge>{t.type?.replace(/_/g, ' ')}</Badge>
                                            <span className="ml-2 text-sm">{t.items} item{t.items !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold">{fmt(t.value)}</p>
                                            <p className="text-xs text-gray-500">{fmtNum(t.units)} units</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <Card>
                        <Table columns={columns} data={report.items} />
                    </Card>
                </>
            )}
        </div>
    );
}