import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Plus, DollarSign, Calendar, FileText, CheckCircle2,
    Clock, XCircle, Trash2, ArrowRightCircle, PlusCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermission } from '../hooks/usePermission';
import Card from '../components/ui/Card';

const CATEGORIES = ['Machinery', 'Vehicle', 'Land & Buildings', 'Equipment', 'Office Furniture', 'Others'];

const fmtRs = (n) => `Rs. ${(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

export default function FixedAssetsPage() {
    const { hasPermission, isAdmin } = usePermission();
    const canManage = isAdmin || hasPermission('payments.manage');

    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Asset modal
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [newAsset, setNewAsset] = useState({
        name: '', category: 'Machinery', purchaseCost: '', purchaseDate: new Date().toISOString().split('T')[0]
    });

    // Payment modal
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [newPayment, setNewPayment] = useState({
        amount: '', date: new Date().toISOString().split('T')[0], reference: '', notes: ''
    });

    const [saving, setSaving] = useState(false);

    const fetchAssets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/fixed-assets');
            setAssets(res.data.data || []);
        } catch {
            toast.error('Failed to fetch fixed assets data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const handleCreateAsset = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/finance/fixed-assets', newAsset);
            toast.success('Asset registered successfully');
            setIsAssetModalOpen(false);
            setNewAsset({ name: '', category: 'Machinery', purchaseCost: '', purchaseDate: new Date().toISOString().split('T')[0] });
            fetchAssets();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to register asset');
        } finally {
            setSaving(false);
        }
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!selectedAsset) return;
        setSaving(true);
        try {
            await api.post(`/finance/fixed-assets/${selectedAsset._id}/payments`, newPayment);
            toast.success('Payment recorded successfully');
            setIsPaymentModalOpen(false);
            setNewPayment({ amount: '', date: new Date().toISOString().split('T')[0], reference: '', notes: '' });
            setSelectedAsset(null);
            fetchAssets();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record payment');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAsset = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete asset "${name}"?`)) return;
        try {
            await api.delete(`/finance/fixed-assets/${id}`);
            toast.success('Asset deleted successfully');
            fetchAssets();
        } catch {
            toast.error('Failed to delete asset');
        }
    };

    // Calculations
    const totalCapex = assets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
    const totalOutstanding = assets.reduce((sum, a) => sum + (a.balanceDue || 0), 0);
    const totalPaid = totalCapex - totalOutstanding;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center text-gray-900">
                <div>
                    <h2 className="text-2xl font-bold">Fixed Assets & Capital Expenditure</h2>
                    <p className="text-sm text-gray-500">Track capital asset purchases, installments, and outstanding balances</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchAssets} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                    {canManage && (
                        <button onClick={() => setIsAssetModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition">
                            <Plus size={16} /> Register Asset
                        </button>
                    )}
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-5 border-l-4 border-l-primary-500">
                    <p className="text-xs font-bold text-gray-400 uppercase">Total Capital Expenditure</p>
                    <p className="text-2xl font-black mt-1 text-gray-800">{fmtRs(totalCapex)}</p>
                </Card>
                <Card className="p-5 border-l-4 border-l-emerald-500">
                    <p className="text-xs font-bold text-gray-400 uppercase">Total Settled / Paid</p>
                    <p className="text-2xl font-black mt-1 text-emerald-600">{fmtRs(totalPaid)}</p>
                </Card>
                <Card className="p-5 border-l-4 border-l-red-500">
                    <p className="text-xs font-bold text-gray-400 uppercase">Balance Outstanding</p>
                    <p className="text-2xl font-black mt-1 text-red-600">{fmtRs(totalOutstanding)}</p>
                </Card>
                <Card className="p-5 border-l-4 border-l-indigo-500">
                    <p className="text-xs font-bold text-gray-400 uppercase">Total Assets Count</p>
                    <p className="text-2xl font-black mt-1 text-gray-800">{assets.length}</p>
                </Card>
            </div>

            {/* Asset Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h4 className="font-bold text-gray-800 text-sm">Asset Register & Balances</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <th className="p-4">Purchase Date</th>
                                <th className="p-4">Asset Name</th>
                                <th className="p-4">Category</th>
                                <th className="p-4 text-right">Purchase Cost</th>
                                <th className="p-4 text-right">Balance Due</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse h-16 bg-gray-50/50">
                                        <td colSpan={7} />
                                    </tr>
                                ))
                            ) : assets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500 italic">No assets registered yet</td>
                                </tr>
                            ) : (
                                assets.map((asset) => (
                                    <tr key={asset._id} className="hover:bg-gray-50/50 transition">
                                        <td className="p-4">{format(new Date(asset.purchaseDate), 'yyyy-MM-dd')}</td>
                                        <td className="p-4 font-bold text-gray-900">{asset.name}</td>
                                        <td className="p-4">{asset.category}</td>
                                        <td className="p-4 text-right font-semibold">{fmtRs(asset.purchaseCost)}</td>
                                        <td className="p-4 text-right font-semibold text-red-600">{fmtRs(asset.balanceDue)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                                                asset.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                asset.paymentStatus === 'partially_paid' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                                                'bg-red-50 text-red-700 border border-red-100'
                                            }`}>
                                                {asset.paymentStatus.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedAsset(asset);
                                                        setIsPaymentModalOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-2 py-1.5 rounded-lg border border-primary-100"
                                                    title="View Payments & Installments"
                                                >
                                                    <DollarSign size={13} /> Payments ({asset.payments?.length || 0})
                                                </button>
                                                {canManage && (
                                                    <button
                                                        onClick={() => handleDeleteAsset(asset._id, asset.name)}
                                                        className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
                                                        title="Delete Asset"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Asset Modal */}
            {isAssetModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-lg font-bold text-gray-900">📋 Register Fixed Asset</h3>
                            <button onClick={() => setIsAssetModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <XCircle size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateAsset} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-600 block mb-1">Asset Name *</label>
                                <input value={newAsset.name} onChange={e => setNewAsset(p => ({ ...p, name: e.target.value }))}
                                    required placeholder="e.g. Caterpillar Generator 50kW"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Category *</label>
                                    <select value={newAsset.category} onChange={e => setNewAsset(p => ({ ...p, category: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Purchase Date *</label>
                                    <input type="date" value={newAsset.purchaseDate} onChange={e => setNewAsset(p => ({ ...p, purchaseDate: e.target.value }))}
                                        required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div className="col-span-1 sm:col-span-2">
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Purchase Cost (LKR) *</label>
                                    <input type="number" value={newAsset.purchaseCost} onChange={e => setNewAsset(p => ({ ...p, purchaseCost: e.target.value }))}
                                        required min="0" placeholder="e.g. 1500000"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsAssetModalOpen(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={saving}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50">
                                    {saving ? 'Registering...' : 'Register Asset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal / Detail Modal */}
            {isPaymentModalOpen && selectedAsset && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{selectedAsset.name}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Asset Cost: {fmtRs(selectedAsset.purchaseCost)} · Category: {selectedAsset.category}</p>
                            </div>
                            <button onClick={() => { setIsPaymentModalOpen(false); setSelectedAsset(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                                <XCircle size={20} className="text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Summary balances */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Settled Amount</p>
                                    <p className="text-xl font-bold mt-1 text-emerald-700">{fmtRs(selectedAsset.purchaseCost - selectedAsset.balanceDue)}</p>
                                </div>
                                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                                    <p className="text-[10px] font-bold text-red-600 uppercase">Outstanding Balance</p>
                                    <p className="text-xl font-bold mt-1 text-red-700">{fmtRs(selectedAsset.balanceDue)}</p>
                                </div>
                            </div>

                            {/* Payment Form */}
                            {canManage && selectedAsset.balanceDue > 0 && (
                                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 flex items-center gap-1">
                                        <PlusCircle size={14} className="text-primary-600" /> Record Installment Payment
                                    </h4>
                                    <form onSubmit={handleAddPayment} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Payment Amount (LKR) *</label>
                                            <input type="number" value={newPayment.amount} onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))}
                                                required min="1" max={selectedAsset.balanceDue} placeholder="e.g. 50000"
                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Payment Date *</label>
                                            <input type="date" value={newPayment.date} onChange={e => setNewPayment(p => ({ ...p, date: e.target.value }))}
                                                required className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Reference No.</label>
                                            <input value={newPayment.reference} onChange={e => setNewPayment(p => ({ ...p, reference: e.target.value }))}
                                                placeholder="e.g. CHQ 11252"
                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Notes / Description</label>
                                            <input value={newPayment.notes} onChange={e => setNewPayment(p => ({ ...p, notes: e.target.value }))}
                                                placeholder="e.g. First installment check"
                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none" />
                                        </div>
                                        <div className="col-span-1 sm:col-span-2 flex justify-end pt-2">
                                            <button type="submit" disabled={saving}
                                                className="px-5 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-bold hover:bg-primary-700 transition disabled:opacity-50">
                                                {saving ? 'Recording...' : 'Submit Payment'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Payment Ledger */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Installment History</h4>
                                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                                    {selectedAsset.payments?.length === 0 ? (
                                        <p className="p-6 text-center text-sm text-gray-400 italic bg-gray-50/25">No payments recorded yet</p>
                                    ) : (
                                        selectedAsset.payments.map((p, i) => (
                                            <div key={p._id || i} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                                        <CheckCircle2 size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{p.reference || `Installment #${i + 1}`}</p>
                                                        <p className="text-xs text-gray-400">
                                                            {format(new Date(p.date), 'MMM dd, yyyy')} {p.notes && ` · ${p.notes}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-emerald-600">+{fmtRs(p.amount)}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t bg-gray-50 flex justify-end flex-shrink-0">
                            <button onClick={() => { setIsPaymentModalOpen(false); setSelectedAsset(null); }}
                                className="px-5 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-100">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
