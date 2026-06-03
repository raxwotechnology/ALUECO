import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, Package, Factory, RotateCcw, DollarSign, Users, ArrowRight,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';

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
        ],
    },
    // Replace "Coming in Phase 11B" group with these new groups:
    {
        category: 'Production',
        color: 'text-purple-600', bg: 'bg-purple-50',
        reports: [
            { title: 'Production Summary', description: 'Output, yield, cost variance, wastage', path: '/reports/production', icon: Factory },
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
            { title: 'Daily P&L Master', description: 'Direct CRUD for Daily Profit & Loss records', path: '/reports/daily-pnl', icon: TrendingUp },
            { title: 'Variance & Sales Comparator', description: 'Monthly targets vs actual and growth comparator', path: '/reports/variance-comparator', icon: TrendingUp },
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

export default function ReportsPage() {
    const navigate = useNavigate();
    return (
        <div>
            <PageHeader title="Reports & Analytics" description="Business intelligence for your operations" />

            <div className="space-y-8">
                {reportGroups.map((group) => (
                    <div key={group.category}>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">{group.category}</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {group.reports.map((r) => (
                                <Card key={r.title}
                                    className={`p-5 transition-all ${group.disabled ? 'opacity-50' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'}`}
                                    onClick={() => !group.disabled && navigate(r.path)}>
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
        </div>
    );
}