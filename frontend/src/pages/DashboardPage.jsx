import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import {
    DollarSign, ShoppingCart, TrendingUp, AlertTriangle,
    Package, Factory, FileText, Users, CreditCard, ArrowRight,
    Camera, RefreshCw, Layers, ShieldCheck, Wallet, Landmark,
    Calendar, CheckCircle, Clock, Home, Workflow
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, CartesianGrid, Legend, Cell,
    PieChart, Pie
} from 'recharts';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import KpiCard from '../components/ui/KpiCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import api from '../api/axios';
import { useDashboardKpis, useRevenueChart } from '../features/reports/useReports';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { data: kpisData, isLoading: kpisLoading } = useDashboardKpis();
    const { data: revenueData } = useRevenueChart(6);
    const { socket } = useSocket();

    const [activeTab, setActiveTab] = useState('general'); // general, operations, finance, sales, hr
    const [deptData, setDeptData] = useState(null);
    const [deptLoading, setDeptLoading] = useState(true);
    const [realtimeAlerts, setRealtimeAlerts] = useState([]);

    const fetchDeptMetrics = async () => {
        setDeptLoading(true);
        try {
            const res = await api.get('/reports/dashboard/department-metrics');
            setDeptData(res.data.data);
        } catch (err) {
            console.error('Failed to load department metrics', err);
        } finally {
            setDeptLoading(false);
        }
    };

    useEffect(() => {
        fetchDeptMetrics();
    }, []);

    useEffect(() => {
        if (socket) {
            socket.on('low_stock_alert', (alert) => {
                setRealtimeAlerts((prev) => {
                    if (prev.some(a => a.productCode === alert.productCode)) return prev;
                    return [alert, ...prev];
                });
            });

            const handleUpdate = () => {
                fetchDeptMetrics();
                qc.invalidateQueries({ queryKey: ['dashboardKpis'] });
                qc.invalidateQueries({ queryKey: ['revenueChart'] });
            };

            socket.on('stock_update', handleUpdate);
            socket.on('supplier_balance_update', handleUpdate);
            socket.on('petty_cash_balance', handleUpdate);
            socket.on('gate_pass_approved', handleUpdate);
            socket.on('gate_pass_rejected', handleUpdate);
            socket.on('gate_pass_exited', handleUpdate);

            return () => {
                socket.off('low_stock_alert');
                socket.off('stock_update', handleUpdate);
                socket.off('supplier_balance_update', handleUpdate);
                socket.off('petty_cash_balance', handleUpdate);
                socket.off('gate_pass_approved', handleUpdate);
                socket.off('gate_pass_rejected', handleUpdate);
                socket.off('gate_pass_exited', handleUpdate);
            };
        }
    }, [socket, qc]);

    const k = kpisData?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(n || 0);
    const fmtShort = (n) => {
        if (n >= 1000000) return `LKR ${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `LKR ${(n / 1000).toFixed(0)}k`;
        return fmt(n);
    };

    const triggerCamera = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file) {
                toast.success(`📸 Captured successfully: ${file.name}`);
            }
        };
        input.click();
    };

    if (kpisLoading || !k) return <div className="py-16 text-center text-gray-500 font-sans">Loading dashboard...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <PageHeader title="Factory Operations & MD Command" description="Real-time Command Hub" />
                <button onClick={() => { fetchDeptMetrics(); }} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition bg-white shadow-sm">
                    <RefreshCw size={16} className="text-gray-500" />
                </button>
            </div>

            {/* Quick Access Panel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-gray-150 p-3.5 rounded-2xl shadow-sm">
                <button onClick={() => navigate('/finance/petty-cash')} className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition text-left">
                    <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet size={16} /></span>
                    <div>
                        <span className="text-[9px] text-gray-400 block font-semibold uppercase">Finance</span>
                        <span className="text-xs font-bold text-gray-850">Petty Cash Ledger</span>
                    </div>
                </button>
                <button onClick={() => navigate('/stock')} className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition text-left">
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={16} /></span>
                    <div>
                        <span className="text-[9px] text-gray-400 block font-semibold uppercase">Inventory</span>
                        <span className="text-xs font-bold text-gray-850">Stock Overview</span>
                    </div>
                </button>
                <button onClick={() => navigate('/farms')} className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition text-left">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Home size={16} /></span>
                    <div>
                        <span className="text-[9px] text-gray-400 block font-semibold uppercase">Agricultural</span>
                        <span className="text-xs font-bold text-gray-850">Farms Registry</span>
                    </div>
                </button>
                <button onClick={() => navigate('/inventory/converter')} className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition text-left">
                    <span className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Workflow size={16} /></span>
                    <div>
                        <span className="text-[9px] text-gray-400 block font-semibold uppercase">Production</span>
                        <span className="text-xs font-bold text-gray-850">Direct Converter</span>
                    </div>
                </button>
            </div>

            {realtimeAlerts.length > 0 && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 shadow-sm animate-pulse">
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
                        <Button variant="outline" size="sm" className="bg-white text-red-700 border-red-200 hover:bg-red-50 text-xs font-semibold px-2.5 py-1"
                            onClick={() => setRealtimeAlerts([])}>
                            Clear Alerts
                        </Button>
                    </div>
                </div>
            )}

            {/* ── MOBILE VIEW SHORTCUTS (Visible on mobile/tablet) ── */}
            <div className="block lg:hidden space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Mobile Shortcuts</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button onClick={() => navigate('/purchase-orders')}
                        className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-2xl shadow-md active:scale-95 transition-all text-center">
                        <Package size={32} className="mb-2" />
                        <span className="font-bold text-sm">New GRN Inbound</span>
                        <span className="text-[10px] text-primary-100 mt-1">Receive Supplier Materials</span>
                    </button>
                    <button onClick={() => navigate('/manufacturing/batches')}
                        className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-2xl shadow-md active:scale-95 transition-all text-center">
                        <Factory size={32} className="mb-2" />
                        <span className="font-bold text-sm">Log Production</span>
                        <span className="text-[10px] text-violet-100 mt-1">Record Shift Output</span>
                    </button>
                    <button onClick={triggerCamera}
                        className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl shadow-md active:scale-95 transition-all text-center">
                        <Camera size={32} className="mb-2" />
                        <span className="font-bold text-sm">Take Photo / Upload</span>
                        <span className="text-[10px] text-emerald-100 mt-1">Snap Receipt or Batch Sheet</span>
                    </button>
                </div>
            </div>

            {/* ── DEPARTMENT COMMAND DASHBOARD (Responsive Tabs) ── */}
            <div className="space-y-6">
                {/* Tabs Bar */}
                <div className="flex overflow-x-auto flex-nowrap border-b border-gray-200 bg-white p-1.5 rounded-xl shadow-sm gap-1 scrollbar-none">
                    {[
                        { id: 'general',    label: 'General Management (MD)', icon: ShieldCheck },
                        { id: 'operations', label: 'Operations & Plant',     icon: Factory },
                        { id: 'finance',    label: 'Finance & Accounts',     icon: Wallet },
                        { id: 'sales',      label: 'CRM & Export Sales',     icon: TrendingUp },
                        { id: 'hr',         label: 'Human Resources',        icon: Users }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 ${
                                    active
                                        ? 'bg-primary-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab content rendering */}
                {deptLoading ? (
                    <div className="py-20 text-center text-gray-500">Loading department command data...</div>
                ) : (
                    <>
                        {/* 1. GENERAL COMMAND TAB */}
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                {/* Primary KPIs grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <KpiCard label="Revenue This Month" value={fmtShort(k.revenue.thisMonth)} icon={DollarSign} iconColor="text-green-600" iconBg="bg-green-50" trend={k.revenue.growth} subtext={`${k.revenue.invoiceCount} invoices`} />
                                    <KpiCard label="Orders Today" value={k.orders.today} icon={ShoppingCart} iconColor="text-blue-600" iconBg="bg-blue-50" subtext={`${k.orders.thisMonth} this month`} onClick={() => navigate('/sales-orders')} />
                                    <KpiCard label="Outstanding Receivables" value={fmtShort(k.receivables.total)} icon={CreditCard} iconColor="text-amber-600" iconBg="bg-amber-50" subtext={k.receivables.overdueCount > 0 ? `${fmtShort(k.receivables.overdue)} overdue` : 'No overdue'} onClick={() => navigate('/invoices')} />
                                    <KpiCard label="Low Stock Alerts" value={k.stock.lowStockCount} icon={AlertTriangle} iconColor="text-red-600" iconBg="bg-red-50" subtext="Products below reorder level" onClick={() => navigate('/reports/inventory/low-stock')} />
                                </div>

                                {/* Revenue Trend */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <Card className="lg:col-span-2 p-6">
                                        <h3 className="text-sm font-bold text-gray-700 mb-4">Revenue Trend (Last 6 Months)</h3>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <LineChart data={revenueData?.data || []}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                                                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                                <Tooltip formatter={(v) => fmt(v)} />
                                                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </Card>
                                    
                                    <Card className="p-6">
                                        <h3 className="text-sm font-bold text-gray-700 mb-4">Live Control Actions</h3>
                                        <div className="space-y-2">
                                            <Button fullWidth variant="outline" onClick={() => navigate('/sales-orders/new')}>New Sales Order <ArrowRight size={14} className="ml-auto" /></Button>
                                            <Button fullWidth variant="outline" onClick={() => navigate('/payments/new')}>Record Payment <ArrowRight size={14} className="ml-auto" /></Button>
                                            <Button fullWidth variant="outline" onClick={() => navigate('/purchase-orders/new')}>New Purchase Order <ArrowRight size={14} className="ml-auto" /></Button>
                                            <Button fullWidth variant="primary" onClick={() => navigate('/finance/petty-cash')}>Petty Cash Ledger <ArrowRight size={14} className="ml-auto" /></Button>
                                            <Button fullWidth variant="primary" onClick={() => navigate('/stock')}>Stock Overview <ArrowRight size={14} className="ml-auto" /></Button>
                                            <Button fullWidth variant="outline" onClick={() => navigate('/reports')}>View All Reports <ArrowRight size={14} className="ml-auto" /></Button>
                                        </div>
                                    </Card>
                                </div>

                                {/* Live Feed Tables */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="p-5">
                                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5"><ShoppingCart size={16} className="text-blue-600" /> Recent Sales Orders</h3>
                                        <div className="divide-y divide-gray-100 text-xs">
                                            {deptData?.general?.recentOrders?.map(order => (
                                                <div key={order._id} className="py-2.5 flex justify-between">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{order.customerId?.displayName || 'Walk-in'}</p>
                                                        <p className="text-[10px] text-gray-400 font-mono">{order.orderNumber} · {format(new Date(order.orderDate), 'yyyy-MM-dd')}</p>
                                                    </div>
                                                    <span className="font-bold text-gray-700 text-right">{fmt(order.totalAmount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>

                                    <Card className="p-5">
                                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5"><Package size={16} className="text-emerald-600" /> Recent Goods Receipts (GRN)</h3>
                                        <div className="divide-y divide-gray-100 text-xs">
                                            {deptData?.general?.recentGrns?.map(grn => (
                                                <div key={grn._id} className="py-2.5 flex justify-between">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{grn.supplierName}</p>
                                                        <p className="text-[10px] text-gray-400 font-mono">{grn.grnNumber} · {format(new Date(grn.receiptDate), 'yyyy-MM-dd')}</p>
                                                    </div>
                                                    <span className="font-bold text-emerald-700 text-right">+{fmt(grn.totalAcceptedValue)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {/* 2. OPERATIONS TAB */}
                        {activeTab === 'operations' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2 p-6 space-y-6">
                                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Factory className="text-indigo-600" /> Plant Production & Yield status</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-indigo-900">
                                            <p className="text-[10px] font-bold uppercase text-indigo-600">Active Shift Runs</p>
                                            <p className="text-2xl font-black mt-1">{deptData?.operations?.activeProduction}</p>
                                        </div>
                                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-900">
                                            <p className="text-[10px] font-bold uppercase text-emerald-600">Batches Completed (Month)</p>
                                            <p className="text-2xl font-black mt-1">{deptData?.operations?.completedProductionVerification || deptData?.operations?.completedProductionThisMonth}</p>
                                        </div>
                                    </div>

                                    {/* Monthly Production Progress vs Target */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 shadow-sm space-y-3">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Monthly Production Target Progress</h4>
                                                <p className="text-2xl font-black text-indigo-950 mt-1">{deptData?.operations?.actualProduction?.toLocaleString() || 0} Kg <span className="text-xs font-medium text-gray-500">actual / {deptData?.operations?.targetProduction?.toLocaleString() || 0} Kg target</span></p>
                                            </div>
                                            <Badge variant={deptData?.operations?.productionPercentage >= 105 ? 'success' : 'warning'}>
                                                {deptData?.operations?.productionPercentage || 0}% Achieved
                                            </Badge>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                            <div 
                                                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                                                style={{ width: `${Math.min(deptData?.operations?.productionPercentage || 0, 100)}%` }}
                                            />
                                        </div>
                                        {deptData?.operations?.productionPercentage >= 100 ? (
                                            <p className="text-[10px] text-emerald-600 font-bold">🎉 Target Achieved! Monthly production goal successfully met.</p>
                                        ) : (
                                            <p className="text-[10px] text-gray-500">Currently tracing towards the monthly target. Progress: {deptData?.operations?.productionPercentage || 0}%</p>
                                        )}
                                    </div>

                                    {/* Recent batches */}
                                    <div className="space-y-3 pt-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase">Recent Batches</h4>
                                        <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
                                            {deptData?.general?.recentBatches?.map(b => (
                                                <div key={b._id} className="flex justify-between items-center p-3 border-b bg-gray-50/25 last:border-0 hover:bg-gray-50 transition">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{b.batchNo}</p>
                                                        <p className="text-[10px] text-gray-500 mt-0.5">{b.product} · {format(new Date(b.date), 'MMM dd, yyyy')}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold">{b.outputWeight_total || 0} kg Yield</p>
                                                        <p className="text-[10px] text-gray-400">{(b.efficiencyPercentage || 0).toFixed(1)}% efficiency</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6 space-y-4">
                                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><AlertTriangle className="text-amber-500" /> Lowest Inventory Levels</h3>
                                    <div className="space-y-3">
                                        {deptData?.operations?.lowestStock?.map(item => (
                                            <div key={item._id} className="p-3 border border-gray-100 rounded-lg bg-gray-50/25 flex justify-between items-center text-xs">
                                                <div>
                                                    <p className="font-bold text-gray-900">{item.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.productCode}</p>
                                                </div>
                                                <Badge variant={item.available <= 50 ? 'danger' : 'warning'}>
                                                    {item.available.toLocaleString()} {item.unit || 'kg'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* 3. FINANCE TAB */}
                        {activeTab === 'finance' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2 p-6 space-y-6">
                                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Landmark className="text-indigo-600" /> Cash Pool & Bank Balances</h3>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-primary-600 text-white rounded-xl p-5 shadow relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                                            <Wallet className="absolute right-[-10px] top-[-10px] w-20 h-20 text-white/10" />
                                            <div>
                                                <p className="text-primary-100 text-[10px] font-bold uppercase tracking-wide">Factory Petty Cash Pool</p>
                                                <p className="text-2xl font-black mt-1">{fmt(deptData?.finance?.pettyCashBalance)}</p>
                                            </div>
                                            {deptData?.finance?.pettyCategories && deptData.finance.pettyCategories.length > 0 && (
                                                <div className="mt-3 pt-2 border-t border-white/20 text-[9px] space-y-0.5 max-h-[60px] overflow-y-auto scrollbar-none">
                                                    {deptData.finance.pettyCategories.slice(0, 3).map((item, idx) => (
                                                        <div key={idx} className="flex justify-between text-white/95">
                                                            <span className="truncate pr-2">{item.category}</span>
                                                            <span className="font-bold">{fmt(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-emerald-600 text-white rounded-xl p-5 shadow relative overflow-hidden">
                                            <Landmark className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-white/10" />
                                            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wide">Total Bank Liquid Assets</p>
                                            <p className="text-2xl font-black mt-1">{fmt(deptData?.finance?.totalBankBalance)}</p>
                                        </div>
                                    </div>

                                    {/* Monthly Expenditure Target vs Actual Comparison (Cards) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wide">Monthly Expenditure Budget</p>
                                            <div className="flex justify-between items-baseline mt-2">
                                                <p className="text-xl font-black text-gray-800">{fmt(deptData?.finance?.actualExpenditure)}</p>
                                                <p className="text-xs text-gray-400 font-medium">Limit: {fmt(deptData?.finance?.targetExpenditure)}</p>
                                            </div>
                                            <div className="w-full bg-gray-250/50 rounded-full h-2 mt-3 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all ${deptData?.finance?.isLimitExceeded ? 'bg-red-500' : 'bg-primary-600'}`} 
                                                    style={{ width: `${Math.min(((deptData?.finance?.actualExpenditure || 0) / (deptData?.finance?.targetExpenditure || 1)) * 105, 100)}%` }}
                                                />
                                            </div>
                                            <p className="text-[9px] text-gray-500 mt-2 font-medium">
                                                Budget Utilized: {(((deptData?.finance?.actualExpenditure || 0) / (deptData?.finance?.targetExpenditure || 1)) * 100).toFixed(1)}%
                                            </p>
                                        </div>

                                        <div className={`rounded-2xl p-5 border shadow-sm flex flex-col justify-between ${deptData?.finance?.isLimitExceeded ? 'bg-red-50 border-red-200 text-red-950 animate-pulse' : 'bg-emerald-50 border-emerald-200 text-emerald-950'}`}>
                                            <div>
                                                <p className={`text-[10px] font-bold uppercase tracking-wide ${deptData?.finance?.isLimitExceeded ? 'text-red-700' : 'text-emerald-700'}`}>Budget Limit Alert</p>
                                                {deptData?.finance?.isLimitExceeded ? (
                                                    <div className="mt-2">
                                                        <span className="font-extrabold text-sm block">⚠️ BUDGET LIMIT EXCEEDED</span>
                                                        <p className="text-[10px] text-red-700 mt-1">Expenses exceeded the set monthly limit of {fmt(deptData?.finance?.targetExpenditure)} by {fmt(deptData?.finance?.actualExpenditure - deptData?.finance?.targetExpenditure)}!</p>
                                                    </div>
                                                ) : (
                                                    <div className="mt-2">
                                                        <span className="font-extrabold text-sm block">✅ BUDGET WITHIN LIMIT</span>
                                                        <p className="text-[10px] text-emerald-700 mt-1">Expenses are safe. Remaining budget headroom: {fmt(Math.max(0, (deptData?.finance?.targetExpenditure || 0) - (deptData?.finance?.actualExpenditure || 0)))}.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bank accounts break down */}
                                    <div className="space-y-3 pt-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase">Registered Bank Accounts</h4>
                                        <div className="divide-y border border-gray-100 rounded-xl overflow-hidden bg-white text-xs">
                                            {deptData?.finance?.bankSummary?.map((bank, i) => (
                                                <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 transition">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{bank.bankName}</p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">{bank.accountNumber}</p>
                                                    </div>
                                                    <span className="font-bold text-gray-800">{fmt(bank.balance)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6 space-y-4">
                                    <h3 className="text-sm font-bold text-gray-700">Accounts Liabilities Position</h3>
                                    <div className="space-y-4 pt-2">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Expected Receivables (Customers)</p>
                                            <p className="text-xl font-bold mt-1 text-emerald-600">{fmt(deptData?.finance?.receivables)}</p>
                                        </div>
                                        <hr />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Outstanding Payables (Bills)</p>
                                            <p className="text-xl font-bold mt-1 text-red-500">{fmt(deptData?.finance?.payables)}</p>
                                        </div>
                                        <hr />
                                        <div className="bg-gray-50 p-3 rounded-lg border">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Net Liquidity Working Capital</p>
                                            <p className="text-lg font-black mt-1 text-gray-900">
                                                {fmt((deptData?.finance?.totalBankBalance || 0) + (deptData?.finance?.receivables || 0) - (deptData?.finance?.payables || 0))}
                                            </p>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6 space-y-4">
                                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Wallet className="text-emerald-600" /> Petty Cash Expenses by Category (Month)</h3>
                                    <div className="space-y-2.5 pt-2">
                                        {(!deptData?.finance?.pettyCategories || deptData.finance.pettyCategories.length === 0) ? (
                                            <p className="text-gray-400 text-xs italic text-center py-4">No petty cash expenses recorded this month.</p>
                                        ) : (
                                            deptData.finance.pettyCategories.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-2.5 border border-gray-100 rounded-xl bg-gray-50/25 text-xs hover:bg-gray-50 transition">
                                                    <span className="font-semibold text-gray-800">{item.category}</span>
                                                    <span className="font-bold text-gray-900">{fmt(item.amount)}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* 4. SALES TAB */}
                        {activeTab === 'sales' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2 p-6 space-y-4">
                                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><TrendingUp className="text-primary-600" /> CRM Leads & Inquiry Funnel</h3>
                                    <div className="grid grid-cols-4 gap-3">
                                        {deptData?.sales?.pipelineFunnel?.slice(0, 4).map((stage, idx) => (
                                            <div key={idx} className="bg-gray-50 border rounded-xl p-4 text-center">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">{stage.stage || 'new'}</p>
                                                <p className="text-2xl font-black mt-1 text-gray-900">{stage.count}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {(!deptData?.sales?.pipelineFunnel || deptData.sales.pipelineFunnel.length === 0) && (
                                        <p className="text-center py-6 text-xs text-gray-400 italic">No lead funnel data</p>
                                    )}
                                </Card>

                                <Card className="p-6 space-y-4">
                                    <h3 className="text-sm font-bold text-gray-700">Top Monthly Products</h3>
                                    <div className="space-y-3">
                                        {deptData?.sales?.topProducts?.map(prod => (
                                            <div key={prod._id} className="flex justify-between items-center py-2 border-b last:border-0 text-xs">
                                                <div>
                                                    <p className="font-bold text-gray-900">{prod.productName}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{prod.quantitySold} units sold</p>
                                                </div>
                                                <span className="font-bold text-gray-700">{fmt(prod.revenue)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* 5. HR TAB */}
                        {activeTab === 'hr' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2 p-6 space-y-6">
                                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Users className="text-primary-600" /> Human Resources Command</h3>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl p-5 shadow-sm flex items-center gap-4">
                                            <div className="p-3 bg-blue-500 rounded-lg text-white"><CheckCircle size={24} /></div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-blue-500">Staff Attendance Today</p>
                                                <p className="text-2xl font-black mt-0.5">{deptData?.hr?.attendanceToday || 0} checked-in</p>
                                            </div>
                                        </div>
                                        <div className="bg-violet-50 border border-violet-100 text-violet-900 rounded-xl p-5 shadow-sm flex items-center gap-4">
                                            <div className="p-3 bg-violet-500 rounded-lg text-white"><Clock size={24} /></div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-violet-500">Active Payrolls</p>
                                                <p className="text-2xl font-black mt-0.5">{deptData?.hr?.payrollStats?.totalPayrolls || 0} employees</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* EPF/ETF breakdown */}
                                    <div className="space-y-3 pt-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase">Monthly EPF & ETF Breakdown</h4>
                                        <div className="grid grid-cols-3 gap-4 border border-gray-100 rounded-xl p-4 bg-gray-50/50 text-xs">
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">EPF Employer (12%)</p>
                                                <p className="text-sm font-bold mt-1 text-gray-800">{fmt(deptData?.hr?.payrollStats?.epfEmployer)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">EPF Employee (8%)</p>
                                                <p className="text-sm font-bold mt-1 text-gray-800">{fmt(deptData?.hr?.payrollStats?.epfEmployee)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">ETF (3%)</p>
                                                <p className="text-sm font-bold mt-1 text-gray-800">{fmt(deptData?.hr?.payrollStats?.etf)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6 bg-gradient-to-br from-indigo-900 to-indigo-950 text-white relative overflow-hidden flex flex-col justify-between">
                                    <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 text-white/5 bg-white rounded-full flex-shrink-0" />
                                    <div>
                                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Employee Spotlight</p>
                                        <h3 className="text-xl font-bold mt-3">Employee of the Month</h3>
                                        <p className="text-xs text-indigo-300 mt-1">Outstanding plant floor yield contribution</p>
                                    </div>
                                    <div className="pt-6">
                                        <p className="text-lg font-black text-indigo-100">Chaminda Bandara</p>
                                        <p className="text-xs text-indigo-300">Operations · Shift A Team Lead</p>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}