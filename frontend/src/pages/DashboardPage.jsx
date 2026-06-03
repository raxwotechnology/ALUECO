import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign, ShoppingCart, TrendingUp, AlertTriangle,
    Package, Factory, FileText, Users, CreditCard, ArrowRight,
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, CartesianGrid, Legend,
} from 'recharts';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import KpiCard from '../components/ui/KpiCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
    useDashboardKpis, useRevenueChart, useTopProducts, useTopCustomers,
} from '../features/reports/useReports';
import { useSocket } from '../hooks/useSocket';

export default function DashboardPage() {
    const navigate = useNavigate();
    const { data: kpisData, isLoading } = useDashboardKpis();
    const { data: revenueData } = useRevenueChart(6);
    const { data: topProductsData } = useTopProducts({ period: 'month', limit: 5 });
    const { data: topCustomersData } = useTopCustomers({ period: 'month', limit: 5 });
    const { socket } = useSocket();
    const [realtimeAlerts, setRealtimeAlerts] = useState([]);

    useEffect(() => {
        if (socket) {
            socket.on('low_stock_alert', (alert) => {
                setRealtimeAlerts((prev) => {
                    if (prev.some(a => a.productCode === alert.productCode)) return prev;
                    return [alert, ...prev];
                });
            });
        }
        return () => {
            if (socket) {
                socket.off('low_stock_alert');
            }
        };
    }, [socket]);

    const k = kpisData?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(n || 0);
    const fmtShort = (n) => {
        if (n >= 1000000) return `LKR ${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `LKR ${(n / 1000).toFixed(0)}k`;
        return fmt(n);
    };

    if (isLoading || !k) return <div className="py-16 text-center text-gray-500">Loading dashboard...</div>;

    return (
        <div>
            <PageHeader title="Dashboard" description="Real-time overview of your business" />

            {realtimeAlerts.length > 0 && (
                <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 shadow-sm animate-pulse">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-2 text-red-800">
                            <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
                            <div>
                                <p className="font-bold text-sm">CRITICAL STOCK WARNING (LIVE UPDATE)</p>
                                <ul className="list-disc pl-4 mt-1 text-xs space-y-1">
                                    {realtimeAlerts.map((alert, idx) => (
                                        <li key={idx}>
                                            <strong>{alert.productName}</strong> ({alert.productCode}) is strictly below 10 units! Current quantity: <strong>{alert.quantity}</strong>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-white text-red-700 border-red-200 hover:bg-red-50 text-xs font-semibold px-2.5 py-1"
                            onClick={() => setRealtimeAlerts([])}
                        >
                            Clear Alerts
                        </Button>
                    </div>
                </div>
            )}

            {/* Primary KPIs */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <KpiCard
                    label="Revenue This Month" value={fmtShort(k.revenue.thisMonth)}
                    icon={DollarSign} iconColor="text-green-600" iconBg="bg-green-50"
                    trend={k.revenue.growth}
                    subtext={`${k.revenue.invoiceCount} invoices`} />
                <KpiCard
                    label="Orders Today" value={k.orders.today}
                    icon={ShoppingCart} iconColor="text-blue-600" iconBg="bg-blue-50"
                    subtext={`${k.orders.thisMonth} this month`}
                    onClick={() => navigate('/sales-orders')} />
                <KpiCard
                    label="Outstanding Receivables" value={fmtShort(k.receivables.total)}
                    icon={CreditCard} iconColor="text-amber-600" iconBg="bg-amber-50"
                    subtext={k.receivables.overdueCount > 0
                        ? `${fmtShort(k.receivables.overdue)} overdue (${k.receivables.overdueCount})`
                        : 'No overdue'}
                    onClick={() => navigate('/invoices')} />
                <KpiCard
                    label="Low Stock Alerts" value={k.stock.lowStockCount}
                    icon={AlertTriangle} iconColor="text-red-600" iconBg="bg-red-50"
                    subtext="Products at or below reorder level"
                    onClick={() => navigate('/reports/inventory/low-stock')} />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <KpiCard label="Open Inquiries" value={k.crm?.openInquiries || 0}
                    icon={FileText} iconColor="text-indigo-600" iconBg="bg-indigo-50"
                    subtext="Leads awaiting follow-up"
                    onClick={() => navigate('/crm/inquiries')} />
                <KpiCard label="Active Shipments" value={k.logistics?.activeShipments || 0}
                    icon={ShoppingCart} iconColor="text-purple-600" iconBg="bg-purple-50"
                    subtext="Containers in transit"
                    onClick={() => navigate('/logistics/shipments')} />
                <KpiCard label="Active Production" value={k.production.active}
                    icon={Factory} iconColor="text-pink-600" iconBg="bg-pink-50"
                    subtext={`${k.production.completedThisMonth} completed this month`}
                    onClick={() => navigate('/manufacturing/batches')} />
                <KpiCard label="Active Customers" value={k.customers.total}
                    icon={Users} iconColor="text-cyan-600" iconBg="bg-cyan-50"
                    subtext={`${k.customers.newThisMonth} new this month`}
                    onClick={() => navigate('/customers')} />
            </div>

            {/* Revenue Chart */}
            <div className="grid grid-cols-3 gap-6 mb-6">
                <Card className="col-span-2 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Trend (Last 6 Months)</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={revenueData?.data || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v) => fmt(v)} />
                            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2}
                                dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                        <Button fullWidth variant="outline" onClick={() => navigate('/sales-orders/new')}>
                            New Sales Order <ArrowRight size={14} className="ml-auto" />
                        </Button>
                        <Button fullWidth variant="outline" onClick={() => navigate('/payments/new')}>
                            Record Payment <ArrowRight size={14} className="ml-auto" />
                        </Button>
                        <Button fullWidth variant="outline" onClick={() => navigate('/purchase-orders/new')}>
                            New Purchase Order <ArrowRight size={14} className="ml-auto" />
                        </Button>
                        <Button fullWidth variant="outline" onClick={() => navigate('/reports')}>
                            View All Reports <ArrowRight size={14} className="ml-auto" />
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Top Products & Top Customers */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-gray-700">Top Products This Month</h3>
                        <Button variant="outline" size="sm" onClick={() => navigate('/reports/sales')}>View All</Button>
                    </div>
                    {topProductsData?.data?.length === 0 ? (
                        <p className="text-center text-gray-500 py-8 text-sm">No sales this month yet</p>
                    ) : (
                        <div className="space-y-2">
                            {(topProductsData?.data || []).map((p, idx) => (
                                <div key={p._id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 bg-primary-50 text-primary-700 rounded-full flex items-center justify-center text-xs font-semibold">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium">{p.productName}</p>
                                            <p className="text-xs text-gray-500 font-mono">{p.productCode}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">{fmt(p.revenue)}</p>
                                        <p className="text-xs text-gray-500">{p.quantitySold} units</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-gray-700">Top Customers This Month</h3>
                        <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>View All</Button>
                    </div>
                    {topCustomersData?.data?.length === 0 ? (
                        <p className="text-center text-gray-500 py-8 text-sm">No invoices this month yet</p>
                    ) : (
                        <div className="space-y-2">
                            {(topCustomersData?.data || []).map((c, idx) => (
                                <div key={c._id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-xs font-semibold">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium">{c.customerName}</p>
                                            <p className="text-xs text-gray-500 font-mono">{c.customerCode}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">{fmt(c.totalInvoiced)}</p>
                                        <p className="text-xs text-gray-500">{c.invoiceCount} invoice{c.invoiceCount !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Low Stock Alerts */}
            {k.stock.lowStockItems.length > 0 && (
                <Card className="p-6 border-l-4 border-l-red-500">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                            <AlertTriangle size={18} /> Low Stock Alerts
                        </h3>
                        <Button variant="outline" size="sm" onClick={() => navigate('/stock')}>View Stock</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {k.stock.lowStockItems.slice(0, 10).map((item) => (
                            <div key={item.productId} className="flex items-center justify-between py-2 px-3 bg-red-50 rounded">
                                <div>
                                    <p className="text-sm font-medium">{item.productName}</p>
                                    <p className="text-xs text-gray-600 font-mono">{item.productCode}</p>
                                </div>
                                <div className="text-right">
                                    <Badge variant="danger">{item.available} left</Badge>
                                    <p className="text-xs text-gray-600 mt-1">Reorder at: {item.reorderLevel}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}