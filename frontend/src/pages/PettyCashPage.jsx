import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Plus, Wallet, ArrowUpCircle, ArrowDownCircle,
    Clock, CheckCircle2, XCircle, TrendingDown, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
    { key: 'rawMaterials', label: 'Raw Materials', color: 'bg-green-500' },
    { key: 'chemicals',    label: 'Chemicals',     color: 'bg-blue-500' },
    { key: 'transport',    label: 'Transport',     color: 'bg-indigo-500' },
    { key: 'welfare',      label: 'Welfare',       color: 'bg-pink-500' },
    { key: 'fuel',         label: 'Fuel',          color: 'bg-orange-500' },
    { key: 'maintenance',  label: 'Maintenance',   color: 'bg-yellow-500' },
    { key: 'stationery',   label: 'Stationery',    color: 'bg-gray-400' },
    { key: 'miscWages',    label: 'Misc Wages',    color: 'bg-purple-500' },
    { key: 'wood',         label: 'Wood',          color: 'bg-amber-600' },
    { key: 'packing',      label: 'Packing',       color: 'bg-teal-500' },
];

const fmtRs = (n) => `Rs. ${(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

const emptyExpense = () => ({
    date: new Date().toISOString().split('T')[0],
    refNo: '', item: '', supplier: '', amount: '',
    transactionType: 'expense',
    rawMaterial_cost: '', chemicals: '', transport: '', welfare: '',
    fuel: '', maintenance: '', stationary: '', miscWages: '', wood: '', packingMaterials: '',
});

export default function PettyCashPage() {
    const [entries, setEntries]     = useState([]);
    const [balanceData, setBalance] = useState(null);
    const [loading, setLoading]     = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formType, setFormType]   = useState('expense');
    const [formData, setFormData]   = useState(emptyExpense());
    const [saving, setSaving]       = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [entRes, balRes] = await Promise.all([
                api.get('/finance/petty-cash?limit=50'),
                api.get('/finance/petty-cash/balance'),
            ]);
            setEntries(entRes.data.data || []);
            setBalance(balRes.data.data || null);
        } catch { toast.error('Failed to load petty cash data'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openForm = (type) => {
        setFormType(type);
        setFormData({ ...emptyExpense(), transactionType: type === 'replenish' ? 'receipt' : 'expense' });
        setIsFormOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/finance/petty-cash', formData);
            toast.success(formType === 'replenish' ? '✅ Cash pool replenished' : '✅ Expense recorded');
            setIsFormOpen(false);
            fetchAll();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.put(`/finance/petty-cash/${id}/status`, { status });
            toast.success(`Entry ${status}`);
            fetchAll();
        } catch { toast.error('Failed to update status'); }
    };

    const maxCatVal = balanceData ? Math.max(...CATEGORIES.map(c => balanceData.categories?.[c.key] || 0), 1) : 1;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center text-gray-900">
                <div>
                    <h2 className="text-2xl font-bold">Petty Cash Ledger</h2>
                    <p className="text-sm text-gray-500">Factory petty cash pool — Running balance tracker</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchAll} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                    <button onClick={() => openForm('replenish')}
                        className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                        <ArrowUpCircle size={16} className="text-emerald-600" /> Top Up Pool
                    </button>
                    <button onClick={() => openForm('expense')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition">
                        <Plus size={16} /> New Expense
                    </button>
                </div>
            </div>

            {/* Balance Dashboard */}
            <div className="grid grid-cols-3 gap-4">
                {/* Running Balance */}
                <div className="col-span-1 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <Wallet className="absolute right-[-12px] bottom-[-12px] w-32 h-32 text-white/10" />
                    <p className="text-primary-100 text-xs font-bold uppercase tracking-wider mb-1">Running Balance</p>
                    <h3 className="text-3xl font-black">{loading ? '...' : fmtRs(balanceData?.runningBalance)}</h3>
                    <div className="mt-4 flex gap-4">
                        <div>
                            <p className="text-primary-200 text-[10px] font-bold uppercase">Total In</p>
                            <p className="text-white font-bold text-sm">{fmtRs(balanceData?.totalReceipts)}</p>
                        </div>
                        <div>
                            <p className="text-primary-200 text-[10px] font-bold uppercase">Total Out</p>
                            <p className="text-white font-bold text-sm">{fmtRs(balanceData?.totalExpenses)}</p>
                        </div>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Expense Breakdown by Category</p>
                    <div className="space-y-2">
                        {CATEGORIES.filter(c => (balanceData?.categories?.[c.key] || 0) > 0).slice(0, 6).map(cat => {
                            const val = balanceData?.categories?.[cat.key] || 0;
                            const pct = Math.round((val / maxCatVal) * 100);
                            return (
                                <div key={cat.key} className="flex items-center gap-3">
                                    <p className="text-xs text-gray-600 w-24 flex-shrink-0">{cat.label}</p>
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${cat.color} rounded-full transition-all duration-700`}
                                            style={{ width: `${pct}%` }} />
                                    </div>
                                    <p className="text-xs font-bold text-gray-700 w-24 text-right flex-shrink-0">{fmtRs(val)}</p>
                                </div>
                            );
                        })}
                        {(!balanceData || Object.values(balanceData?.categories || {}).every(v => !v)) && (
                            <p className="text-gray-400 text-sm italic text-center py-4">No expense data yet</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h4 className="font-bold text-gray-800">Recent Transactions</h4>
                    <p className="text-xs text-gray-400">{entries.length} entries</p>
                </div>
                <div className="divide-y divide-gray-100 font-sans">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => <div key={i} className="p-4 animate-pulse h-16 bg-gray-50" />)
                    ) : entries.length === 0 ? (
                        <div className="p-10 text-center text-gray-500 italic">No transactions recorded</div>
                    ) : (
                        entries.map((entry) => (
                            <div key={entry._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4 text-gray-900">
                                    <div className={`p-2 rounded-lg ${
                                        entry.transactionType === 'receipt' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                    }`}>
                                        {entry.transactionType === 'receipt' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">{entry.item || entry.description || '—'}</p>
                                        <p className="text-xs text-gray-500">
                                            {entry.date ? format(new Date(entry.date), 'MMM dd, yyyy') : ''}
                                            {entry.category && <span> · {entry.category}</span>}
                                            {entry.refNo && <span> · Ref: {entry.refNo}</span>}
                                            {entry.transactionType === 'receipt' && <span className="ml-1 text-emerald-600 font-bold">POOL TOP-UP</span>}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${
                                        entry.transactionType === 'receipt' ? 'text-emerald-600' : 'text-red-600'
                                    }`}>
                                        {entry.transactionType === 'receipt' ? '+' : '-'}{fmtRs(entry.amount)}
                                    </p>
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                        {entry.status === 'pending' && (
                                            <div className="flex gap-1 mr-1">
                                                <button onClick={() => handleStatusUpdate(entry._id, 'approved')}
                                                    className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition">
                                                    <CheckCircle2 size={14} />
                                                </button>
                                                <button onClick={() => handleStatusUpdate(entry._id, 'rejected')}
                                                    className="p-1 hover:bg-red-50 text-red-600 rounded transition">
                                                    <XCircle size={14} />
                                                </button>
                                            </div>
                                        )}
                                        {entry.status === 'pending'  && <Clock size={11} className="text-yellow-500" />}
                                        {entry.status === 'approved' && <CheckCircle2 size={11} className="text-emerald-500" />}
                                        {entry.status === 'rejected' && <XCircle size={11} className="text-red-500" />}
                                        <span className="text-[10px] font-bold uppercase text-gray-400">{entry.status}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-lg font-bold text-gray-900">
                                {formType === 'replenish' ? '💰 Top Up Petty Cash Pool' : '📋 Record Expense'}
                            </h3>
                            <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <XCircle size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Date</label>
                                    <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Ref No.</label>
                                    <input value={formData.refNo} onChange={e => setFormData(p => ({ ...p, refNo: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Description *</label>
                                    <input value={formData.item} onChange={e => setFormData(p => ({ ...p, item: e.target.value }))}
                                        required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Supplier</label>
                                    <input value={formData.supplier} onChange={e => setFormData(p => ({ ...p, supplier: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Total Amount (Rs.) *</label>
                                    <input type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                                        required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                            </div>

                            {formType !== 'replenish' && (
                                <>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category Amounts (Rs.)</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {CATEGORIES.map(cat => (
                                            <div key={cat.key}>
                                                <label className="text-xs text-gray-600 block mb-1">{cat.label}</label>
                                                <input type="number" placeholder="0"
                                                    value={formData[cat.key === 'rawMaterials' ? 'rawMaterial_cost' : cat.key === 'stationery' ? 'stationary' : cat.key === 'packing' ? 'packingMaterials' : cat.key] || ''}
                                                    onChange={e => {
                                                        const fieldMap = { rawMaterials: 'rawMaterial_cost', stationery: 'stationary', packing: 'packingMaterials' };
                                                        const field = fieldMap[cat.key] || cat.key;
                                                        setFormData(p => ({ ...p, [field]: e.target.value }));
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsFormOpen(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={saving}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50">
                                    {saving ? 'Saving...' : formType === 'replenish' ? 'Top Up Pool' : 'Record Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
