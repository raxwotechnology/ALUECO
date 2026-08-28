import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, DollarSign, FileText, Calculator, Download, Trash2, Plus, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import AdminPasswordModal from '../components/AdminPasswordModal';
import Modal from '../components/ui/Modal';
import { downloadCSV } from '../utils/exportUtils';

const EXPENSE_CATEGORIES = [
    'Site Expense',
    'Labor',
    'Transport',
    'Materials',
    'Scaffolding',
    'Equipment Rental',
    'Other',
];

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'card', label: 'Card' },
];

const fmt = (n) => `LKR ${(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 0 })}`;

function mapSalesOrderToProject(o) {
    return {
        salesOrderId: o._id || o.salesOrderId,
        orderNumber: o.orderNumber,
        projectName: o.projectName || 'Aluminium Works',
        customerName: o.customerSnapshot?.name || o.customerName || 'N/A',
        projectValue: o.grandTotal || o.projectValue || 0,
        totalReceived: o.totalPaid || o.totalReceived || 0,
        balanceDue: o.balanceDue ?? Math.max(0, (o.grandTotal || o.projectValue || 0) - (o.totalPaid || o.totalReceived || 0)),
    };
}

function isAluecoOrder(o) {
    return (
        o.businessType === 'alueco' ||
        o.quotationId ||
        /^SO-ALU/i.test(o.orderNumber || '') ||
        /Aluminium Quotation/i.test(o.notes || '')
    );
}

export default function AluFinancePage({ defaultTab = 'income' }) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [summary, setSummary] = useState(null);
    const [incomeData, setIncomeData] = useState(null);
    const [expensesData, setExpensesData] = useState(null);
    const [invoicesData, setInvoicesData] = useState([]);
    const [profitMargins, setProfitMargins] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [deleteItem, setDeleteItem] = useState(null);
    const [showAdminModal, setShowAdminModal] = useState(false);

    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [savingExpense, setSavingExpense] = useState(false);
    const [newExpense, setNewExpense] = useState({
        salesOrderId: '',
        amount: '',
        category: 'Site Expense',
        description: '',
        paidTo: '',
        paymentMethod: 'Cash',
    });

    const [showIncomeModal, setShowIncomeModal] = useState(false);
    const [savingIncome, setSavingIncome] = useState(false);
    const [newIncome, setNewIncome] = useState({
        salesOrderId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'cash',
        reference: '',
        notes: '',
    });

    const fetchSummary = useCallback(async () => {
        try {
            const res = await api.get('/alu/finance/summary');
            setSummary(res.data?.data);
        } catch {
            /* summary is optional — tab data still loads */
        }
    }, []);

    const fetchProjects = useCallback(async () => {
        // Primary: dedicated finance projects endpoint
        try {
            const res = await api.get('/alu/finance/projects');
            const list = res.data?.data || [];
            if (list.length) {
                setProjects(list);
                return;
            }
        } catch {
            /* try fallbacks below */
        }

        // Fallback 1: income tracking data (same projects, different route)
        try {
            const incomeRes = await api.get('/alu/finance/income');
            const fromIncome = incomeRes.data?.data?.projects || [];
            if (fromIncome.length) {
                setProjects(fromIncome.map(mapSalesOrderToProject));
                return;
            }
        } catch {
            /* try next fallback */
        }

        // Fallback 2: sales orders list (same source as Projects page)
        try {
            const soRes = await api.get('/sales-orders');
            const list = (soRes.data?.data || []).filter(isAluecoOrder).map(mapSalesOrderToProject);
            setProjects(list);
        } catch {
            setProjects([]);
        }
    }, []);

    const fetchTabData = useCallback(async (tab) => {
        setLoading(true);
        try {
            if (tab === 'income') {
                const res = await api.get('/alu/finance/income');
                setIncomeData(res.data?.data);
            } else if (tab === 'expenses') {
                const res = await api.get('/alu/finance/expenses');
                setExpensesData(res.data?.data);
            } else if (tab === 'invoices') {
                const res = await api.get('/alu/finance/invoices');
                setInvoicesData(res.data?.data || []);
            } else if (tab === 'profit-engine') {
                const res = await api.get('/alu/finance/profit-engine');
                setProfitMargins(res.data?.data);
            }
        } catch {
            toast.error('Failed to load finance data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSummary();
        fetchProjects();
        fetchTabData(activeTab);
    }, [activeTab, fetchSummary, fetchProjects, fetchTabData]);

    const refreshAll = async () => {
        await Promise.all([fetchSummary(), fetchProjects(), fetchTabData(activeTab)]);
    };

    const projectOptions = projects.length > 0
        ? projects
        : (incomeData?.projects || []).map(mapSalesOrderToProject);

    const selectedIncomeProject = projectOptions.find((p) => p.salesOrderId === newIncome.salesOrderId);

    const openIncomeModal = async () => {
        if (projectOptions.length === 0) {
            await fetchProjects();
        }
        setShowIncomeModal(true);
    };

    const openExpenseModal = async () => {
        if (projectOptions.length === 0) {
            await fetchProjects();
        }
        setShowExpenseModal(true);
    };

    const handleDownload = () => {
        if (activeTab === 'income') {
            const data = (incomeData?.projects || []).map((p) => ({
                OrderNumber: p.orderNumber,
                ProjectName: p.projectName,
                CustomerName: p.customerName,
                ProjectValue: p.projectValue,
                TotalReceived: p.totalReceived,
                BalanceDue: p.balanceDue,
                PaymentStatus: p.paymentStatus,
            }));
            downloadCSV(data, `Alueco_Income_Tracking_${Date.now()}.csv`);
        } else if (activeTab === 'expenses') {
            const data = (expensesData?.expenses || []).map((e) => ({
                VoucherNumber: e.voucherNumber,
                Category: e.category,
                Description: e.description,
                PaidTo: e.paidTo,
                Amount: e.amount,
                Date: new Date(e.date).toLocaleDateString(),
            }));
            downloadCSV(data, `Alueco_Expenses_${Date.now()}.csv`);
        } else if (activeTab === 'invoices') {
            const data = invoicesData.map((inv) => ({
                InvoiceNumber: inv.invoiceNumber,
                CustomerName: inv.customerName || 'N/A',
                GrandTotal: inv.grandTotal,
                AmountPaid: inv.amountPaid,
                BalanceDue: inv.balanceDue,
                Status: inv.status,
            }));
            downloadCSV(data, `Alueco_Invoices_${Date.now()}.csv`);
        } else if (activeTab === 'profit-engine') {
            const data = (profitMargins?.projects || []).map((pm) => ({
                OrderNumber: pm.orderNumber,
                ProjectName: pm.projectName,
                Revenue: pm.revenue,
                MaterialCost: pm.costBreakdown.materialCost,
                LaborCost: pm.costBreakdown.laborCost,
                SiteExpenses: pm.costBreakdown.siteExpensesCost,
                NetProfit: pm.netProfit,
                ProfitMarginPercent: pm.profitMarginPercent,
            }));
            downloadCSV(data, `Alueco_Profit_Engine_${Date.now()}.csv`);
        }
    };

    const requestDelete = (item, type) => {
        setDeleteItem({ item, type });
        setShowAdminModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteItem) return;
        try {
            if (deleteItem.type === 'expense') {
                await api.delete(`/finance/petty-cash/${deleteItem.item._id}`);
                toast.success('Expense deleted successfully');
                await refreshAll();
            } else if (deleteItem.type === 'invoice') {
                await api.delete(`/invoices/${deleteItem.item._id}`);
                toast.success('Invoice deleted successfully');
                await refreshAll();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete record');
        } finally {
            setDeleteItem(null);
        }
    };

    const handleCreateExpense = async (e) => {
        e.preventDefault();
        if (!newExpense.amount || Number(newExpense.amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        setSavingExpense(true);
        try {
            await api.post('/alu/finance/expenses', {
                ...newExpense,
                salesOrderId: newExpense.salesOrderId || undefined,
                amount: Number(newExpense.amount),
            });
            toast.success('Expense recorded successfully');
            setShowExpenseModal(false);
            setNewExpense({ salesOrderId: '', amount: '', category: 'Site Expense', description: '', paidTo: '', paymentMethod: 'Cash' });
            await refreshAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record expense');
        } finally {
            setSavingExpense(false);
        }
    };

    const handleCreateIncome = async (e) => {
        e.preventDefault();
        if (!newIncome.salesOrderId) {
            toast.error('Please select a project');
            return;
        }
        if (!newIncome.amount || Number(newIncome.amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        setSavingIncome(true);
        try {
            await api.post('/alu/finance/income', {
                ...newIncome,
                amount: Number(newIncome.amount),
            });
            toast.success('Payment recorded successfully');
            setShowIncomeModal(false);
            setNewIncome({
                salesOrderId: '',
                amount: '',
                paymentDate: new Date().toISOString().split('T')[0],
                method: 'cash',
                reference: '',
                notes: '',
            });
            await refreshAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record payment');
        } finally {
            setSavingIncome(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                        <DollarSign size={26} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Finance & Accounting — Alueco</h1>
                        <p className="text-slate-400 text-sm mt-0.5">Project income, operational expenses, customer invoices & profit margins</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={handleDownload}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all border border-slate-700"
                    >
                        <Download size={15} /> Export CSV
                    </button>
                    {activeTab === 'income' && (
                        <button
                            onClick={openIncomeModal}
                            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all"
                        >
                            <Plus size={16} /> Record Income
                        </button>
                    )}
                    {activeTab === 'expenses' && (
                        <button
                            onClick={openExpenseModal}
                            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all"
                        >
                            <Plus size={16} /> Record Expense
                        </button>
                    )}
                </div>
            </div>

            {/* Balance Summary KPIs */}
            {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-emerald-600 mb-1">
                            <TrendingUp size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Total Income</span>
                        </div>
                        <p className="text-xl font-black text-slate-900">{fmt(summary.totalIncomeCollected)}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{summary.paymentCount} payments received</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-rose-600 mb-1">
                            <TrendingDown size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Total Expenses</span>
                        </div>
                        <p className="text-xl font-black text-slate-900">{fmt(summary.totalExpenses)}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{summary.expenseCount} expense records</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-indigo-600 mb-1">
                            <Scale size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Net Balance</span>
                        </div>
                        <p className={`text-xl font-black ${summary.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {fmt(summary.netBalance)}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Income minus expenses</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-amber-600 mb-1">
                            <Wallet size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Receivables</span>
                        </div>
                        <p className="text-xl font-black text-amber-600">{fmt(summary.totalReceivables)}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{summary.totalActiveProjects} active projects</p>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-3 pt-2 rounded-xl border shadow-sm overflow-x-auto gap-2">
                {[
                    { id: 'income', label: 'Income Tracking', icon: Wallet },
                    { id: 'expenses', label: 'Expense Management', icon: DollarSign },
                    { id: 'invoices', label: 'Customer Invoices', icon: FileText },
                    { id: 'profit-engine', label: 'Profit Margin Engine', icon: Calculator },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 font-bold text-xs border-b-2 transition-all whitespace-nowrap ${
                                isActive
                                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50 rounded-t-lg'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab 1: Income Tracking */}
            {activeTab === 'income' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-700 flex justify-between items-center">
                            <span>Project Income & Settlement Status</span>
                            {incomeData?.summary && (
                                <span className="text-xs font-semibold text-emerald-600">
                                    Collected: {fmt(incomeData.summary.totalRevenueCollected)} · Due: {fmt(incomeData.summary.totalPendingReceivables)}
                                </span>
                            )}
                        </div>
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Loading income data...</div>
                        ) : (incomeData?.projects || []).length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No Alueco projects found. Convert a quotation to a sales order first.</div>
                        ) : (
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100/60 text-slate-500 font-bold uppercase">
                                    <tr>
                                        <th className="p-3.5">Order No</th>
                                        <th className="p-3.5">Project & Client</th>
                                        <th className="p-3.5">Project Value</th>
                                        <th className="p-3.5">Total Received</th>
                                        <th className="p-3.5">Balance Due</th>
                                        <th className="p-3.5">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {(incomeData?.projects || []).map((p) => (
                                        <tr key={p.salesOrderId} className="hover:bg-slate-50/80">
                                            <td className="p-3.5 font-bold text-emerald-600">{p.orderNumber}</td>
                                            <td className="p-3.5">
                                                <div className="font-bold text-slate-800">{p.projectName}</div>
                                                <div className="text-[11px] text-slate-400">{p.customerName}</div>
                                            </td>
                                            <td className="p-3.5 font-bold text-slate-800">{fmt(p.projectValue)}</td>
                                            <td className="p-3.5 text-emerald-600 font-bold">{fmt(p.totalReceived)}</td>
                                            <td className="p-3.5 text-amber-600 font-bold">{fmt(p.balanceDue)}</td>
                                            <td className="p-3.5">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    p.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                                                    p.paymentStatus === 'Partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {p.paymentStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Recent Payments */}
                    {(incomeData?.recentPayments || []).length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-700">
                                Recent Payments Received
                            </div>
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100/60 text-slate-500 font-bold uppercase">
                                    <tr>
                                        <th className="p-3.5">Date</th>
                                        <th className="p-3.5">Receipt No</th>
                                        <th className="p-3.5">Project</th>
                                        <th className="p-3.5">Customer</th>
                                        <th className="p-3.5">Method</th>
                                        <th className="p-3.5">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {incomeData.recentPayments.map((pay) => (
                                        <tr key={pay._id} className="hover:bg-slate-50/80">
                                            <td className="p-3.5">{pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString() : '—'}</td>
                                            <td className="p-3.5 font-bold">{pay.paymentNumber || '—'}</td>
                                            <td className="p-3.5">
                                                <div className="font-bold">{pay.orderNumber}</div>
                                                <div className="text-[11px] text-slate-400">{pay.projectName}</div>
                                            </td>
                                            <td className="p-3.5">{pay.partyName || '—'}</td>
                                            <td className="p-3.5 capitalize">{(pay.method || 'cash').replace('_', ' ')}</td>
                                            <td className="p-3.5 font-bold text-emerald-600">{fmt(pay.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Expense Management */}
            {activeTab === 'expenses' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-700 flex justify-between items-center">
                        <span>Recorded Operational & Site Expenses</span>
                        {expensesData && (
                            <span className="text-xs font-semibold text-rose-600">
                                Total: {fmt(expensesData.totalExpense)} · {expensesData.expenseCount} records
                            </span>
                        )}
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading expenses...</div>
                    ) : (expensesData?.expenses || []).length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No expenses recorded yet. Click &quot;Record Expense&quot; to add one.</div>
                    ) : (
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/60 text-slate-500 font-bold uppercase">
                                <tr>
                                    <th className="p-3.5">Date</th>
                                    <th className="p-3.5">Voucher No</th>
                                    <th className="p-3.5">Category</th>
                                    <th className="p-3.5">Description</th>
                                    <th className="p-3.5">Paid To</th>
                                    <th className="p-3.5">Project</th>
                                    <th className="p-3.5">Amount</th>
                                    <th className="p-3.5">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                {(expensesData?.expenses || []).map((exp) => (
                                    <tr key={exp._id} className="hover:bg-slate-50/80">
                                        <td className="p-3.5">{exp.date ? new Date(exp.date).toLocaleDateString() : '—'}</td>
                                        <td className="p-3.5 font-bold text-slate-800">{exp.voucherNumber}</td>
                                        <td className="p-3.5"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold">{exp.category}</span></td>
                                        <td className="p-3.5">{exp.description}</td>
                                        <td className="p-3.5">{exp.paidTo}</td>
                                        <td className="p-3.5 text-[11px]">{exp.salesOrderId?.orderNumber || 'General'}</td>
                                        <td className="p-3.5 font-bold text-rose-600">{fmt(exp.amount)}</td>
                                        <td className="p-3.5">
                                            <button
                                                onClick={() => requestDelete(exp, 'expense')}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Delete (Requires Admin Password)"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Tab 3: Customer Invoices */}
            {activeTab === 'invoices' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-700">
                        Project Customer Invoices
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading invoices...</div>
                    ) : invoicesData.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No Alueco invoices found.</div>
                    ) : (
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/60 text-slate-500 font-bold uppercase">
                                <tr>
                                    <th className="p-3.5">Invoice No</th>
                                    <th className="p-3.5">Customer</th>
                                    <th className="p-3.5">Grand Total</th>
                                    <th className="p-3.5">Paid</th>
                                    <th className="p-3.5">Balance</th>
                                    <th className="p-3.5">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                {invoicesData.map((inv) => (
                                    <tr key={inv._id} className="hover:bg-slate-50/80">
                                        <td className="p-3.5 font-bold text-emerald-600">{inv.invoiceNumber}</td>
                                        <td className="p-3.5">{inv.customerName || 'N/A'}</td>
                                        <td className="p-3.5 font-bold">{fmt(inv.grandTotal)}</td>
                                        <td className="p-3.5 text-emerald-600 font-bold">{fmt(inv.amountPaid)}</td>
                                        <td className="p-3.5 text-amber-600 font-bold">{fmt(inv.balanceDue)}</td>
                                        <td className="p-3.5">
                                            <button
                                                onClick={() => requestDelete(inv, 'invoice')}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Delete (Requires Admin Password)"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Tab 4: Profit Margin Engine */}
            {activeTab === 'profit-engine' && (
                <div className="space-y-4">
                    {profitMargins?.overallSummary && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl border p-4">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Revenue</p>
                                <p className="text-lg font-black text-slate-900">{fmt(profitMargins.overallSummary.totalRevenue)}</p>
                            </div>
                            <div className="bg-white rounded-xl border p-4">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Cost</p>
                                <p className="text-lg font-black text-rose-600">{fmt(profitMargins.overallSummary.totalCost)}</p>
                            </div>
                            <div className="bg-white rounded-xl border p-4">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Net Profit</p>
                                <p className="text-lg font-black text-emerald-600">{fmt(profitMargins.overallSummary.overallNetProfit)}</p>
                            </div>
                            <div className="bg-white rounded-xl border p-4">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Overall Margin</p>
                                <p className="text-lg font-black text-indigo-600">{profitMargins.overallSummary.overallMarginPercent}%</p>
                            </div>
                        </div>
                    )}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-700">
                            Profit Margin Breakdown per Project
                        </div>
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Loading profit data...</div>
                        ) : (profitMargins?.projects || []).length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No project data available.</div>
                        ) : (
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100/60 text-slate-500 font-bold uppercase">
                                    <tr>
                                        <th className="p-3.5">Order No</th>
                                        <th className="p-3.5">Project Name</th>
                                        <th className="p-3.5">Revenue</th>
                                        <th className="p-3.5">Direct Costs</th>
                                        <th className="p-3.5">Net Profit</th>
                                        <th className="p-3.5">Margin %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {(profitMargins?.projects || []).map((pm) => (
                                        <tr key={pm.salesOrderId} className="hover:bg-slate-50/80">
                                            <td className="p-3.5 font-bold text-emerald-600">{pm.orderNumber}</td>
                                            <td className="p-3.5 font-bold text-slate-800">{pm.projectName}</td>
                                            <td className="p-3.5 font-bold">{fmt(pm.revenue)}</td>
                                            <td className="p-3.5 text-slate-600">{fmt(pm.costBreakdown.totalDirectCost)}</td>
                                            <td className="p-3.5 font-bold text-emerald-600">{fmt(pm.netProfit)}</td>
                                            <td className="p-3.5 font-bold">
                                                <span className={`px-2 py-0.5 rounded-md ${
                                                    pm.profitMarginPercent >= 20 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {pm.profitMarginPercent}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Record Income Modal */}
            <Modal
                isOpen={showIncomeModal}
                onClose={() => setShowIncomeModal(false)}
                title="Record Customer Payment"
                size="md"
            >
                <form onSubmit={handleCreateIncome} className="p-4 sm:p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Project *</label>
                        <select
                            required
                            value={newIncome.salesOrderId}
                            onChange={(e) => setNewIncome((p) => ({ ...p, salesOrderId: e.target.value, amount: '' }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            <option value="">Select project...</option>
                            {projectOptions.map((p) => (
                                <option key={p.salesOrderId} value={p.salesOrderId}>
                                    {p.orderNumber} — {p.projectName} (Due: {fmt(p.balanceDue)})
                                </option>
                            ))}
                        </select>
                    </div>
                    {selectedIncomeProject && (
                        <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
                            <div className="flex justify-between"><span className="text-slate-500">Project Value</span><span className="font-bold">{fmt(selectedIncomeProject.projectValue)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Already Received</span><span className="font-bold text-emerald-600">{fmt(selectedIncomeProject.totalReceived)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Balance Due</span><span className="font-bold text-amber-600">{fmt(selectedIncomeProject.balanceDue)}</span></div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Amount (LKR) *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                max={selectedIncomeProject?.balanceDue || undefined}
                                value={newIncome.amount}
                                onChange={(e) => setNewIncome((p) => ({ ...p, amount: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Payment Date *</label>
                            <input
                                type="date"
                                required
                                value={newIncome.paymentDate}
                                onChange={(e) => setNewIncome((p) => ({ ...p, paymentDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Payment Method</label>
                            <select
                                value={newIncome.method}
                                onChange={(e) => setNewIncome((p) => ({ ...p, method: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                {PAYMENT_METHODS.map((m) => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Reference / Cheque No</label>
                            <input
                                value={newIncome.reference}
                                onChange={(e) => setNewIncome((p) => ({ ...p, reference: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Optional"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-bold text-slate-600 block mb-1">Notes</label>
                            <input
                                value={newIncome.notes}
                                onChange={(e) => setNewIncome((p) => ({ ...p, notes: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="e.g. Advance payment milestone 1"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowIncomeModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={savingIncome} className="px-6 py-2 bg-emerald-500 text-slate-950 rounded-xl text-sm font-bold hover:bg-emerald-600 disabled:opacity-50">
                            {savingIncome ? 'Saving...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Record Expense Modal */}
            <Modal
                isOpen={showExpenseModal}
                onClose={() => setShowExpenseModal(false)}
                title="Record Expense"
                size="md"
            >
                <form onSubmit={handleCreateExpense} className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="text-xs font-bold text-slate-600 block mb-1">Link to Project (optional)</label>
                            <select
                                value={newExpense.salesOrderId}
                                onChange={(e) => setNewExpense((p) => ({ ...p, salesOrderId: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="">General / Overhead Expense</option>
                                {projectOptions.map((p) => (
                                    <option key={p.salesOrderId} value={p.salesOrderId}>
                                        {p.orderNumber} — {p.projectName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Amount (LKR) *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={newExpense.amount}
                                onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Category *</label>
                            <select
                                required
                                value={newExpense.category}
                                onChange={(e) => setNewExpense((p) => ({ ...p, category: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                {EXPENSE_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-bold text-slate-600 block mb-1">Description *</label>
                            <input
                                required
                                value={newExpense.description}
                                onChange={(e) => setNewExpense((p) => ({ ...p, description: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="e.g. Scaffolding rental for site survey"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Paid To *</label>
                            <input
                                required
                                value={newExpense.paidTo}
                                onChange={(e) => setNewExpense((p) => ({ ...p, paidTo: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Vendor or worker name"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Payment Method</label>
                            <select
                                value={newExpense.paymentMethod}
                                onChange={(e) => setNewExpense((p) => ({ ...p, paymentMethod: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="Cash">Cash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cheque">Cheque</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={savingExpense} className="px-6 py-2 bg-emerald-500 text-slate-950 rounded-xl text-sm font-bold hover:bg-emerald-600 disabled:opacity-50">
                            {savingExpense ? 'Saving...' : 'Record Expense'}
                        </button>
                    </div>
                </form>
            </Modal>

            <AdminPasswordModal
                isOpen={showAdminModal}
                onClose={() => setShowAdminModal(false)}
                onConfirm={confirmDelete}
                title="Delete Finance Record"
            />
        </div>
    );
}
