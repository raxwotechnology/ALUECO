import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, Package, Factory, RotateCcw, DollarSign, Users, ArrowRight, XCircle, Download
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import api from '../api/axios';
import toast from 'react-hot-toast';

const reportGroups = [
    {
        category: 'Sales',
        color: 'text-blue-600', bg: 'bg-blue-50',
        reports: [
            { title: 'Sales Summary', description: 'Overall sales metrics for a period', path: '/reports/sales', icon: TrendingUp },
            { title: 'Sales by Product', description: 'Top and bottom performing products', path: '/reports/sales-by-product', icon: Package },
            { title: 'Sales by Customer', description: 'Customer revenue and outstanding balances', path: '/reports/sales-by-customer', icon: Users },
        ],
    },
    {
        category: 'Inventory',
        color: 'text-green-600', bg: 'bg-green-50',
        reports: [
            { title: 'Stock Valuation', description: 'Total inventory value per product and warehouse', path: '/reports/stock-valuation', icon: DollarSign },
            { title: 'Slow & Fast Movers', description: 'ABC analysis + identify dead stock', path: '/reports/slow-fast-movers', icon: TrendingUp },
            { title: 'Low Stock Items', description: 'Products at or below reorder level', path: '/reports/inventory/low-stock', icon: Package },
            { title: 'Stock Movement Log', description: 'Audit trail of all stock movements', path: '/reports/stock-movement', icon: Factory },
            { title: 'Daily Stock Status', description: 'Opening, received, issued, closing stock status ledger', path: '/reports/daily-stock-status', icon: Factory },
        ],
    },
    // Replace "Coming in Phase 11B" group with these new groups:
    {
        category: 'Production',
        color: 'text-purple-600', bg: 'bg-purple-50',
        reports: [
            { title: 'Production Summary', description: 'Output, yield, cost variance, wastage', path: '/reports/production', icon: Factory },
            { title: 'Yield & Resource Forecaster', description: 'Predict output, wastage, firewood & power using history', path: '/reports/yield-forecaster', icon: TrendingUp },
        ],
    },
    {
        category: 'Returns & Damages',
        color: 'text-orange-600', bg: 'bg-orange-50',
        reports: [
            { title: 'Returns & Damages', description: 'Return reasons, damage sources, value lost', path: '/reports/returns-damages', icon: RotateCcw },
        ],
    },
    {
        category: 'Financial',
        color: 'text-emerald-600', bg: 'bg-emerald-50',
        reports: [
            { title: 'Financial Snapshot', description: 'Revenue vs expenses, A/R + A/P aging, cash flow', path: '/reports/financial', icon: DollarSign },
            { title: 'Net Profit (P&L) Report', description: 'Dynamic Profit & Loss report matching invoices, bills, and petty cash', path: '/reports/net-profit', icon: TrendingUp },
            { title: 'Daily P&L Master', description: 'Direct CRUD for Daily Profit & Loss records', path: '/reports/daily-pnl', icon: TrendingUp },
            { title: 'Variance & Sales Comparator', description: 'Monthly targets vs actual and growth comparator', path: '/reports/variance-comparator', icon: TrendingUp },
            { title: 'Monthly Performance Excel Exporter', description: 'Download complete Monthly Performance report (Sales, Production, Petty Cash, P&L)', isExporter: true, icon: DollarSign },
        ],
    },
    {
        category: 'Human Resources',
        color: 'text-pink-600', bg: 'bg-pink-50',
        reports: [
            { title: 'HR Reports', description: 'Headcount, attendance, leave patterns, payroll summary', path: '/reports/hr', icon: Users },
            { title: 'Shift Operations Logs', description: 'Attendance, yield, and logistics split by shifts', path: '/reports/shift-wise', icon: Users },
        ],
    },
];

import BusinessSegmentFilter from '../components/ui/BusinessSegmentFilter';

export default function ReportsPage() {
    const navigate = useNavigate();
    const [businessType, setBusinessType] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await api.get(
                `/export/monthly-performance`,
                {
                    params: { month: selectedMonth },
                    responseType: 'blob'
                }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Monthly-Performance-Report-${selectedMonth}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('✅ Excel report downloaded successfully');
            setIsModalOpen(false);
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('❌ Failed to export performance report');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <PageHeader title="Reports & Analytics" description="Business intelligence for your operations" />
                <div className="self-start sm:self-center">
                    <BusinessSegmentFilter value={businessType} onChange={setBusinessType} />
                </div>
            </div>

            <div className="space-y-8">
                {reportGroups.map((group) => (
                    <div key={group.category}>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">{group.category}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.reports.map((r) => (
                                <Card key={r.title}
                                    className={`p-5 transition-all ${group.disabled ? 'opacity-50' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'}`}
                                    onClick={() => {
                                        if (group.disabled) return;
                                        if (r.isExporter) {
                                            setIsModalOpen(true);
                                        } else {
                                            navigate(`${r.path}?businessType=${businessType}`);
                                        }
                                    }}>
                                    <div className="flex items-start gap-3 mb-2">
                                        <div className={`${group.bg} ${group.color} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
                                            <r.icon size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium text-sm">{r.title}</h4>
                                                {!group.disabled && <ArrowRight size={12} className="text-gray-400" />}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Exporter Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-lg font-bold text-gray-900">📊 Export Performance Report</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <XCircle size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-600 block mb-1">Select Month *</label>
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                                <button onClick={handleExport} disabled={exporting}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1.5">
                                    <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}