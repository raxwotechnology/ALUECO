import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Calendar, Filter } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { useDailyStockStatus } from '../../features/reports/useReports';
import { useWarehouses } from '../../features/warehouses/useWarehouses';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

export default function DailyStockStatusReportPage() {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState(() => {
        return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [warehouseId, setWarehouseId] = useState('');

    const { data, isLoading } = useDailyStockStatus({
        startDate,
        endDate,
        warehouseId: warehouseId || undefined
    });
    
    const { data: warehousesData } = useWarehouses({ isActive: true });

    const reportItems = data?.data || [];
    const warehouses = warehousesData?.data || [];
    const warehouseOptions = [
        { value: '', label: 'All Warehouses' },
        ...warehouses.map((w) => ({ value: w._id, label: w.name }))
    ];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtNum = (n) => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 }).format(n);

    // Summaries
    const totalOpening = reportItems.reduce((acc, item) => acc + (item.openingStock || 0), 0);
    const totalReceived = reportItems.reduce((acc, item) => acc + (item.received || 0), 0);
    const totalIssued = reportItems.reduce((acc, item) => acc + (item.issued || 0), 0);
    const totalClosing = reportItems.reduce((acc, item) => acc + (item.closingStock || 0), 0);
    const totalClosingValue = reportItems.reduce((acc, item) => acc + (item.closingValue || 0), 0);

    const handleExportExcel = () => {
        if (!reportItems.length) return;
        const formatted = reportItems.map(item => ({
            'Product Code': item.productCode,
            'Product Name': item.productName,
            'Product Type': item.productType?.replace(/_/g, ' '),
            'UOM': item.unitOfMeasure,
            'Opening Stock': item.openingStock,
            'Received': item.received,
            'Issued': item.issued,
            'Closing Stock': item.closingStock,
            'Cost per Unit': item.costPerUnit,
            'Closing Value (LKR)': item.closingValue
        }));
        exportToExcel(formatted, `Daily_Stock_Status_${startDate}_to_${endDate}`, 'Daily Stock Status');
    };

    const handleExportPDF = () => {
        if (!reportItems.length) return;
        const exportColumns = [
            { header: 'Code', dataKey: 'productCode' },
            { header: 'Product', dataKey: 'productName' },
            { header: 'Opening', dataKey: 'openingStock' },
            { header: 'Received', dataKey: 'received' },
            { header: 'Issued', dataKey: 'issued' },
            { header: 'Closing', dataKey: 'closingStock' },
            { header: 'Cost/Unit', dataKey: 'costPerUnit' },
            { header: 'Closing Value', dataKey: 'closingValue' },
        ];
        
        const formatted = reportItems.map(item => ({
            ...item,
            closingValue: fmt(item.closingValue),
            costPerUnit: fmt(item.costPerUnit)
        }));

        exportToPDF(`Daily Stock Status Report (${startDate} to ${endDate})`, exportColumns, formatted, `Daily_Stock_Status_${startDate}_to_${endDate}`);
    };

    const columns = [
        { key: 'productCode', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.productCode}</span> },
        { key: 'productName', label: 'Product' },
        { key: 'productType', label: 'Type', render: (r) => <Badge>{r.productType?.replace(/_/g, ' ')}</Badge> },
        { key: 'unitOfMeasure', label: 'UOM', render: (r) => r.unitOfMeasure || 'kg' },
        { key: 'openingStock', label: 'Opening Stock', render: (r) => fmtNum(r.openingStock) },
        { key: 'received', label: 'Received', render: (r) => <span className="text-emerald-600 font-semibold">+{fmtNum(r.received)}</span> },
        { key: 'issued', label: 'Issued', render: (r) => <span className="text-red-600 font-semibold">-{fmtNum(r.issued)}</span> },
        { key: 'closingStock', label: 'Closing Stock', render: (r) => fmtNum(r.closingStock) },
        { key: 'costPerUnit', label: 'Cost/Unit', render: (r) => fmt(r.costPerUnit) },
        { key: 'closingValue', label: 'Closing Value', render: (r) => <span className="font-semibold text-primary-700">{fmt(r.closingValue)}</span> },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Daily Stock Status Report"
                description="Opening, Received, Issued, and Closing inventory ledger"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!reportItems.length}>
                            <Download size={16} className="mr-1.5" /> Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!reportItems.length}>
                            <FileText size={16} className="mr-1.5" /> PDF
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/reports')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                    </div>
                }
            />

            {/* Filters */}
            <Card className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                            <Calendar size={12} /> Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                            <Calendar size={12} /> End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div>
                        <Select
                            label="Warehouse"
                            options={warehouseOptions}
                            value={warehouseId}
                            onChange={(e) => setWarehouseId(e.target.value)}
                        />
                    </div>
                    <div>
                        <Button variant="primary" className="w-full justify-center text-sm font-semibold flex items-center gap-1">
                            <Filter size={14} /> Applied Filters
                        </Button>
                    </div>
                </div>
            </Card>

            {isLoading ? (
                <div className="py-20 text-center text-gray-400 font-medium animate-pulse">Loading daily status records...</div>
            ) : (
                <>
                    {/* Summary Widgets */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-500 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Opening Stock</p>
                            <p className="text-xl font-bold mt-1 text-gray-800">{fmtNum(totalOpening)}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Received (+)</p>
                            <p className="text-xl font-bold mt-1 text-emerald-600">+{fmtNum(totalReceived)}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-red-500 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Issued (-)</p>
                            <p className="text-xl font-bold mt-1 text-red-600">-{fmtNum(totalIssued)}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-indigo-500 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Closing Stock</p>
                            <p className="text-xl font-bold mt-1 text-gray-800">{fmtNum(totalClosing)}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-primary-500 shadow-sm bg-gradient-to-br from-white to-primary-50/25">
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Closing Value</p>
                            <p className="text-xl font-black mt-1 text-primary-700">{fmt(totalClosingValue)}</p>
                        </Card>
                    </div>

                    {/* Ledger Table */}
                    <Card className="overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-800 text-sm">Product stock ledger summary</h3>
                        </div>
                        <Table columns={columns} data={reportItems} />
                    </Card>
                </>
            )}
        </div>
    );
}
