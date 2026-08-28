import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Wrench, Plus, Search, AlertTriangle,
    ClipboardCheck, History,
    Activity, MessageSquare, ChevronRight, X,
    Clock, CheckCircle, XCircle, PlayCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const MaintenancePage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [expandedRequestId, setExpandedRequestId] = useState(null);
    const [form, setForm] = useState({
        title: '', description: '', priority: 'medium', assetId: '', category: 'machine'
    });

    const fetchRequests = async () => {
        try {
            const { data } = await api.get('/maintenance/requests');
            setRequests(data.data || []);
        } catch (error) {
            toast.error('Failed to load maintenance data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const openModal = () => {
        setForm({ title: '', description: '', priority: 'medium', assetId: '', category: 'machine' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/maintenance/requests', form);
            toast.success('Maintenance request submitted');
            setIsModalOpen(false);
            fetchRequests();
        } catch (error) {
            toast.error('Failed to submit request');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (requestId, newStatus) => {
        try {
            await api.put(`/maintenance/requests/${requestId}`, { status: newStatus });
            toast.success(`Status changed to ${newStatus.replace('_', ' ')}`);
            fetchRequests();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock size={16} className="text-yellow-600" />;
            case 'in_progress': return <PlayCircle size={16} className="text-blue-600" />;
            case 'completed': return <CheckCircle size={16} className="text-green-600" />;
            case 'cancelled': return <XCircle size={16} className="text-red-600" />;
            default: return <Clock size={16} className="text-gray-600" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
            case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-100';
            case 'completed': return 'text-green-600 bg-green-50 border-green-100';
            case 'cancelled': return 'text-red-600 bg-red-50 border-red-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    };

    const getPriorityColor = (priority) => {
        if (priority === 'critical') return 'text-red-600 bg-red-50 border-red-100';
        if (priority === 'high') return 'text-orange-600 bg-orange-50 border-orange-100';
        if (priority === 'medium') return 'text-blue-600 bg-blue-50 border-blue-100';
        return 'text-gray-600 bg-gray-50 border-gray-100';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-gray-900">
                <div>
                    <h2 className="text-2xl font-bold">Maintenance & Upkeep</h2>
                    <p className="text-sm text-gray-500">Schedule machine repairs and routine vehicle service</p>
                </div>
                <Button variant="primary" onClick={openModal}>
                    <Plus size={18} className="mr-1.5" />
                    New Request
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Requests */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <Wrench size={18} className="text-primary-600" />
                            Pending Jobs
                        </h4>
                    </div>
                    <div className="divide-y divide-gray-100 font-sans">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="p-6 animate-pulse h-24 bg-gray-50"></div>
                            ))
                        ) : requests.filter(r => r.status === 'pending' || r.status === 'open').length === 0 ? (
                            <div className="p-10 text-center text-gray-500 italic text-gray-900">No pending requests</div>
                        ) : (
                            requests.filter(r => r.status === 'pending' || r.status === 'open').map((r) => (
                                <div key={r._id} className="hover:bg-gray-50 transition-colors group">
                                    <div className="p-5 cursor-pointer" onClick={() => setExpandedRequestId(expandedRequestId === r._id ? null : r._id)}>
                                        <div className="flex justify-between items-start mb-3">
                                            <h5 className="font-bold text-gray-900">{r.title}</h5>
                                            <div className="flex gap-2">
                                                <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 ${getStatusColor(r.status)}`}>
                                                    {getStatusIcon(r.status)}
                                                    {r.status.replace('_', ' ')}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tighter ${getPriorityColor(r.priority)}`}>
                                                    {r.priority}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-4">{r.description}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Asset: <span className="text-gray-600">{r.assetId || r.title || 'N/A'}</span>
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Category: <span className="text-gray-600 capitalize">{r.category || 'General'}</span>
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Created: <span className="text-gray-600">{r.createdAt ? format(new Date(r.createdAt), 'MMM dd') : '--'}</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedRequestId(expandedRequestId === r._id ? null : r._id);
                                                }}
                                                className={`p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-transform duration-250 ${expandedRequestId === r._id ? 'rotate-90 text-primary-600 bg-primary-50' : ''}`}
                                                title="Toggle Details"
                                            >
                                                <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-all" />
                                            </button>
                                        </div>
                                    </div>
                                    {expandedRequestId === r._id && (
                                        <div className="px-5 pb-5 pt-0 border-t border-gray-100 mt-2">
                                            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 bg-gray-50/50 p-4 rounded-xl">
                                                <div>
                                                    <h5 className="font-bold text-gray-900 mb-2">Request Details</h5>
                                                    <p className="mb-1"><span className="text-gray-500">Description:</span> <span className="font-semibold">{r.description || 'N/A'}</span></p>
                                                    <p className="mb-1"><span className="text-gray-500">Asset ID:</span> <span className="font-semibold">{r.assetId || 'N/A'}</span></p>
                                                    <p className="mb-1"><span className="text-gray-500">Category:</span> <span className="font-semibold capitalize">{r.category || 'General'}</span></p>
                                                    <p className="mb-1"><span className="text-gray-500">Priority:</span> <span className="font-semibold capitalize">{r.priority}</span></p>
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-gray-900 mb-2">Status Information</h5>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-gray-500">Status:</span>
                                                        <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 ${getStatusColor(r.status)}`}>
                                                            {getStatusIcon(r.status)}
                                                            {r.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <p className="mb-1"><span className="text-gray-500">Created:</span> <span className="font-semibold">{r.createdAt ? format(new Date(r.createdAt), 'MMM dd, yyyy HH:mm') : '--'}</span></p>
                                                    <p className="mb-1"><span className="text-gray-500">Last Updated:</span> <span className="font-semibold">{r.updatedAt ? format(new Date(r.updatedAt), 'MMM dd, yyyy HH:mm') : '--'}</span></p>
                                                </div>
                                            </div>
                                            
                                            {/* Status Change Actions */}
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <h5 className="font-bold text-gray-900 mb-3 text-sm">Change Status</h5>
                                                <div className="flex flex-wrap gap-2">
                                                    {r.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusChange(r._id, 'in_progress')}
                                                                className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
                                                            >
                                                                <PlayCircle size={14} />
                                                                Start Work
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusChange(r._id, 'cancelled')}
                                                                className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition flex items-center gap-1"
                                                            >
                                                                <XCircle size={14} />
                                                                Cancel
                                                            </button>
                                                        </>
                                                    )}
                                                    {r.status === 'in_progress' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusChange(r._id, 'completed')}
                                                                className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition flex items-center gap-1"
                                                            >
                                                                <CheckCircle size={14} />
                                                                Complete
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusChange(r._id, 'pending')}
                                                                className="px-3 py-1.5 text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition flex items-center gap-1"
                                                            >
                                                                <Clock size={14} />
                                                                Back to Pending
                                                            </button>
                                                        </>
                                                    )}
                                                    {r.status === 'completed' && (
                                                        <button
                                                            onClick={() => handleStatusChange(r._id, 'pending')}
                                                            className="px-3 py-1.5 text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition flex items-center gap-1"
                                                        >
                                                            <Clock size={14} />
                                                            Reopen
                                                        </button>
                                                    )}
                                                    {r.status === 'cancelled' && (
                                                        <button
                                                            onClick={() => handleStatusChange(r._id, 'pending')}
                                                            className="px-3 py-1.5 text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition flex items-center gap-1"
                                                        >
                                                            <Clock size={14} />
                                                            Reopen
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* History/Log */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-gray-900">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Operational Alert</h4>
                                <p className="text-xs text-gray-500">Dehydration Unit B is due for routine service in 3 days.</p>
                            </div>
                        </div>
                        <button className="w-full py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-xs font-bold hover:bg-amber-100 transition uppercase tracking-widest font-sans">
                            Schedule Service
                        </button>
                    </div>

                    <div className="bg-gray-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10 text-gray-200">
                            <h4 className="font-bold text-lg mb-2">Maintenance KPIs</h4>
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Uptime</p>
                                    <p className="text-2xl font-black text-white">98.4%</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">MTTR</p>
                                    <p className="text-2xl font-black text-white">4.2h</p>
                                </div>
                            </div>
                        </div>
                        <Activity className="absolute right-[-20px] bottom-[-20px] w-40 h-40 text-white/5" />
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Maintenance Request" size="md">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Issue Title *</label>
                        <input required placeholder="e.g. Grinder Motor Overheating" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-sans" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Asset ID / Machine *</label>
                            <input required placeholder="MCH-102" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-sans" value={form.assetId} onChange={e => setForm({ ...form, assetId: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label>
                            <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-sans" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                <option value="machine">Factory Machine</option>
                                <option value="vehicle">Delivery Vehicle</option>
                                <option value="building">Facility/Building</option>
                                <option value="it">IT/Network</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Priority</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['medium', 'high', 'critical'].map(p => (
                                <button key={p} type="button" onClick={() => setForm({ ...form, priority: p })} className={`py-2 text-[10px] font-black uppercase rounded-lg border transition ${form.priority === p ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Problem Description *</label>
                        <textarea required rows={4} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-sans" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={saving}>Submit Request</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MaintenancePage;
