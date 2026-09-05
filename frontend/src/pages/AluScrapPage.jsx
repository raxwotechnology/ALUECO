import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plus, Edit, Trash2, History, Layers, Info, Search, Filter, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const AluScrapPage = () => {
    const [scraps, setScraps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('available');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modals
    const [isOpen, setIsOpen] = useState(false);
    const [currentEdit, setCurrentEdit] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    
    // Form State
    const [form, setForm] = useState({
        profileCode: '',
        lengthMm: 1000,
        status: 'available',
        notes: ''
    });

    const fetchScraps = async () => {
        setLoading(true);
        try {
            let url = '/alu/scrap';
            const params = [];
            if (filterStatus) params.push(`status=${filterStatus}`);
            if (searchQuery) params.push(`profileCode=${searchQuery}`);
            
            if (params.length > 0) {
                url += `?${params.join('&')}`;
            }
            
            const res = await api.get(url);
            setScraps(res.data.data || []);
        } catch (error) {
            toast.error('Failed to load scrap inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScraps();
    }, [filterStatus]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchScraps();
    };

    const openAddEditModal = (item = null) => {
        setCurrentEdit(item);
        setForm(item ? {
            profileCode: item.profileCode,
            lengthMm: item.lengthMm,
            status: item.status,
            notes: item.notes || ''
        } : {
            profileCode: '',
            lengthMm: 1000,
            status: 'available',
            notes: ''
        });
        setIsOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!form.profileCode || !form.lengthMm) {
            return toast.error('Profile Code and Length are required');
        }
        
        try {
            if (currentEdit) {
                await api.put(`/alu/scrap/${currentEdit._id}`, form);
                toast.success('Scrap piece updated successfully');
            } else {
                await api.post('/alu/scrap', form);
                toast.success('Scrap piece registered successfully');
            }
            setIsOpen(false);
            fetchScraps();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save scrap record');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/alu/scrap/${deletingId}`);
            toast.success('Scrap piece deleted successfully');
            setDeletingId(null);
            fetchScraps();
        } catch (error) {
            toast.error('Failed to delete scrap record');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <History className="text-indigo-600" /> ALUECO Reusable Scrap Inventory
                    </h1>
                    <p className="text-slate-500 mt-1">Track and manage cut leftover aluminium profiles to consume automatically in new quotations.</p>
                </div>
                <Button onClick={() => openAddEditModal()} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition-all duration-200">
                    <Plus size={18} /> Register Scrap Piece
                </Button>
            </div>

            {/* Info Banner */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3 text-indigo-900 shadow-sm">
                <Info className="flex-shrink-0 mt-0.5 text-indigo-600" size={18} />
                <div className="text-xs space-y-1">
                    <p className="font-bold text-indigo-850">Closed-Loop Scrap Automation</p>
                    <p className="text-indigo-700">
                        When a quotation is converted to a Sales Order, the system automatically creates scrap entries for standard bar waste lengths $\ge$ 500mm.
                        During estimation of new custom windows/doors, the 1D solver searches and consumes these scrap records first, cutting your raw material purchasing cost to Rs. 0 for those segments.
                    </p>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                {/* Search Form */}
                <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by Profile Code (e.g. SD1001)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                    </div>
                    <Button type="submit" variant="outline">Search</Button>
                </form>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                        {[
                            { value: 'available', label: 'Available (In Stock)' },
                            { value: 'used', label: 'Consumed' },
                            { value: 'wasted', label: 'Wasted / Scrapped' }
                        ].map(s => (
                            <button
                                key={s.value}
                                onClick={() => setFilterStatus(s.value)}
                                className={`py-1.5 px-3 rounded-lg font-medium transition-all ${filterStatus === s.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <button onClick={fetchScraps} className="p-2 border rounded-xl hover:bg-slate-50 text-slate-500">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Scraps Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="text-center py-20 text-slate-500 text-sm">Loading scrap pieces...</div>
                ) : scraps.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 text-sm italic">No scrap records found matching the filters.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                                    <th className="p-4">Profile Code</th>
                                    <th className="p-4">Leftover Length (mm)</th>
                                    <th className="p-4">Leftover Length (Feet)</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Date Registered</th>
                                    <th className="p-4">Source Reference</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {scraps.map((s) => (
                                    <tr key={s._id} className="hover:bg-slate-50/50 transition duration-150">
                                        <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                                            <Layers className="text-indigo-500" size={14} />
                                            {s.profileCode}
                                        </td>
                                        <td className="p-4 font-mono font-semibold">{s.lengthMm} mm</td>
                                        <td className="p-4 font-mono text-slate-500">{(s.lengthMm / 304.8).toFixed(2)} ft</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                s.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                                                s.status === 'used' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'
                                            }`}>
                                                {s.status === 'available' ? 'Available' : s.status === 'used' ? 'Consumed' : 'Wasted'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                                        <td className="p-4 font-mono text-[10px] text-slate-500">
                                            {s.sourceQuotationId ? 'Quotation Order' : 'Manual Entry'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <button onClick={() => openAddEditModal(s)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg">
                                                    <Edit size={14} />
                                                </button>
                                                <button onClick={() => setDeletingId(s._id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={currentEdit ? 'Edit Scrap Piece' : 'Register Scrap Piece'}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Profile Code *</label>
                            <input
                                type="text"
                                placeholder="e.g. SD1001"
                                value={form.profileCode}
                                onChange={(e) => setForm(p => ({ ...p, profileCode: e.target.value.toUpperCase() }))}
                                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Leftover Length (mm) *</label>
                            <input
                                type="number"
                                placeholder="e.g. 1500"
                                value={form.lengthMm}
                                onChange={(e) => setForm(p => ({ ...p, lengthMm: parseInt(e.target.value) }))}
                                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                        <select
                            value={form.status}
                            onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                        >
                            <option value="available">Available (In Stock)</option>
                            <option value="used">Consumed</option>
                            <option value="wasted">Wasted / Scrapped</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notes / Placement Location</label>
                        <textarea
                            placeholder="e.g. Rack A - Top shelf leftovers"
                            value={form.notes}
                            onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Save Record</Button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={handleDelete}
                title="Delete Scrap Record"
                message="Are you sure you want to delete this scrap piece? This action is permanent and cannot be undone."
            />
        </div>
    );
};

export default AluScrapPage;
