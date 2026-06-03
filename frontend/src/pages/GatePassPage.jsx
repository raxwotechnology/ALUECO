import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Plus, Truck, CheckCircle2, XCircle, LogOut,
    Package, ChevronDown, ChevronUp, RefreshCw, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const STATUS_STYLES = {
    pending:  'bg-amber-50 text-amber-700 border border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border border-red-200',
    exited:   'bg-gray-50 text-gray-500 border border-gray-200',
};

const emptyItem = () => ({ description: '', quantity: '', uom: 'Kg', batchNo: '' });
const emptyForm = () => ({
    vehicleNumber: '', driverName: '', transportCompany: '',
    direction: 'outgoing', sealNumber: '', containerNo: '',
    grossWeightKg: '', notes: '',
    items: [emptyItem()],
});

export default function GatePassPage() {
    const [passes, setPasses]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm]       = useState(emptyForm());
    const [isOpen, setIsOpen]   = useState(false);
    const [saving, setSaving]   = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchPasses = useCallback(async () => {
        try {
            const { data } = await api.get('/gate-passes?limit=50');
            setPasses(data.data || []);
        } catch { toast.error('Failed to load gate passes'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchPasses();
        // Socket.IO real-time updates
        const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000', {
            withCredentials: true,
        });
        socket.on('gate_pass_approved', () => { fetchPasses(); toast.success('✅ Gate pass approved!'); });
        socket.on('gate_pass_rejected', () => { fetchPasses(); toast.error('❌ Gate pass rejected'); });
        socket.on('gate_pass_exited',   () => { fetchPasses(); });
        return () => socket.disconnect();
    }, [fetchPasses]);

    const handleFieldChange = (field, value) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const handleItemChange = (idx, field, value) => {
        const items = [...form.items];
        items[idx][field] = value;
        setForm(prev => ({ ...prev, items }));
    };

    const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, emptyItem()] }));
    const removeItem = (idx) => setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/gate-passes', form);
            toast.success('Gate pass created');
            setIsOpen(false);
            setForm(emptyForm());
            fetchPasses();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const doAction = async (id, action, payload = {}) => {
        setActionLoading(id + action);
        try {
            await api.put(`/gate-passes/${id}/${action}`, payload);
            toast.success(`Gate pass ${action}d`);
            fetchPasses();
        } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
        finally { setActionLoading(null); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield size={24} className="text-primary-600" /> Gate Pass Management
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">Authorise vehicle movements in & out of the facility</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchPasses} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition" title="Refresh">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                    <button onClick={() => setIsOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition shadow-sm">
                        <Plus size={16} /> New Gate Pass
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-4">
                {['pending','approved','rejected','exited'].map(s => (
                    <div key={s} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs font-bold uppercase text-gray-400 mb-1">{s}</p>
                        <p className="text-2xl font-black text-gray-900">
                            {passes.filter(p => p.status === s).length}
                        </p>
                    </div>
                ))}
            </div>

            {/* Gate Passes List */}
            <div className="space-y-3">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-20" />
                    ))
                ) : passes.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                        <Truck size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No gate passes yet</p>
                    </div>
                ) : passes.map(gp => (
                    <div key={gp._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:border-primary-200 transition">
                        <div className="flex items-center gap-4 p-5">
                            {/* Direction icon */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                gp.direction === 'outgoing' ? 'bg-blue-50' : 'bg-purple-50'
                            }`}>
                                <Truck size={18} className={gp.direction === 'outgoing' ? 'text-blue-600' : 'text-purple-600'} />
                            </div>

                            {/* Main info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-gray-900">{gp.gatePassNumber}</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[gp.status]}`}>
                                        {gp.status?.toUpperCase()}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                        gp.direction === 'outgoing' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                    }`}>
                                        {gp.direction?.toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-0.5">
                                    <span className="font-medium">{gp.vehicleNumber}</span> · {gp.driverName}
                                    {gp.transportCompany && <span className="text-gray-400"> · {gp.transportCompany}</span>}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {gp.createdAt ? format(new Date(gp.createdAt), 'MMM dd, yyyy HH:mm') : ''}
                                    {gp.grossWeightKg && <span> · {gp.grossWeightKg} Kg</span>}
                                    {gp.containerNo && <span> · Container: {gp.containerNo}</span>}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {gp.status === 'pending' && (
                                    <>
                                        <button onClick={() => doAction(gp._id, 'approve')}
                                            disabled={actionLoading === gp._id + 'approve'}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50">
                                            <CheckCircle2 size={14} /> Approve
                                        </button>
                                        <button onClick={() => doAction(gp._id, 'reject', { rejectionReason: 'Rejected by manager' })}
                                            disabled={actionLoading === gp._id + 'reject'}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition disabled:opacity-50">
                                            <XCircle size={14} /> Reject
                                        </button>
                                    </>
                                )}
                                {gp.status === 'approved' && (
                                    <button onClick={() => doAction(gp._id, 'exit')}
                                        disabled={actionLoading === gp._id + 'exit'}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-900 transition disabled:opacity-50">
                                        <LogOut size={14} /> Record Exit
                                    </button>
                                )}
                                <button onClick={() => setExpanded(expanded === gp._id ? null : gp._id)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
                                    {expanded === gp._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Expandable items */}
                        {expanded === gp._id && gp.items?.length > 0 && (
                            <div className="border-t border-gray-100 px-5 py-3 bg-gray-50">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Items</p>
                                <div className="space-y-1">
                                    {gp.items.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm">
                                            <Package size={12} className="text-gray-400" />
                                            <span className="font-medium text-gray-700">{item.description}</span>
                                            <span className="text-gray-500">{item.quantity} {item.uom}</span>
                                            {item.batchNo && <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-gray-200 text-primary-600">{item.batchNo}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">New Gate Pass</h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                                <XCircle size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Vehicle Number *</label>
                                    <input value={form.vehicleNumber} onChange={e => handleFieldChange('vehicleNumber', e.target.value)}
                                        required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="WP-CAB-1234" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Driver Name *</label>
                                    <input value={form.driverName} onChange={e => handleFieldChange('driverName', e.target.value)}
                                        required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Transport Company</label>
                                    <input value={form.transportCompany} onChange={e => handleFieldChange('transportCompany', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Direction</label>
                                    <select value={form.direction} onChange={e => handleFieldChange('direction', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                                        <option value="outgoing">Outgoing</option>
                                        <option value="incoming">Incoming</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Seal Number</label>
                                    <input value={form.sealNumber} onChange={e => handleFieldChange('sealNumber', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Container No.</label>
                                    <input value={form.containerNo} onChange={e => handleFieldChange('containerNo', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Gross Weight (Kg)</label>
                                    <input type="number" value={form.grossWeightKg} onChange={e => handleFieldChange('grossWeightKg', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Notes</label>
                                    <input value={form.notes} onChange={e => handleFieldChange('notes', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-gray-600 uppercase">Items</p>
                                    <button type="button" onClick={addItem}
                                        className="text-xs text-primary-600 font-bold hover:underline">+ Add Item</button>
                                </div>
                                <div className="space-y-2">
                                    {form.items.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                            <input placeholder="Description" value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)}
                                                className="col-span-4 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 outline-none" />
                                            <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                                                className="col-span-2 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 outline-none" />
                                            <input placeholder="UoM" value={item.uom} onChange={e => handleItemChange(idx, 'uom', e.target.value)}
                                                className="col-span-2 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 outline-none" />
                                            <input placeholder="Batch No" value={item.batchNo} onChange={e => handleItemChange(idx, 'batchNo', e.target.value)}
                                                className="col-span-3 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary-500 outline-none" />
                                            {form.items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(idx)} className="col-span-1 text-red-400 hover:text-red-600 transition">
                                                    <XCircle size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">Cancel</button>
                                <button type="submit" disabled={saving}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition disabled:opacity-50">
                                    {saving ? 'Creating...' : 'Create Gate Pass'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
