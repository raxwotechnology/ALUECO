import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Plus, Search, Mail, Globe, UserPlus, Edit, Trash2,
    ChevronRight, TrendingUp, XCircle, ArrowRight, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

const PIPELINE = [
    { status: 'new',               label: 'New',               color: 'bg-blue-500',    light: 'bg-blue-50 text-blue-700 border-blue-100',   next: 'site_visit' },
    { status: 'site_visit',        label: 'Site Visit',        color: 'bg-indigo-500',  light: 'bg-indigo-50 text-indigo-700 border-indigo-100', next: 'quotation_pending' },
    { status: 'quotation_pending', label: 'Quotation Pending', color: 'bg-yellow-500',  light: 'bg-yellow-50 text-yellow-700 border-yellow-100', next: 'quotation_sent' },
    { status: 'quotation_sent',    label: 'Quotation Sent',    color: 'bg-violet-500',  light: 'bg-violet-50 text-violet-700 border-violet-100', next: 'negotiation' },
    { status: 'negotiation',       label: 'Negotiation',       color: 'bg-amber-500',   light: 'bg-amber-50 text-amber-700 border-amber-100', next: 'won' },
    { status: 'won',               label: 'Won ✓',             color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-100', next: null },
    { status: 'lost',              label: 'Lost ✗',            color: 'bg-red-400',     light: 'bg-red-50 text-red-600 border-red-100',      next: null },
];

const getPipeline = (s) => PIPELINE.find(p => p.status === s) || PIPELINE[0];

const emptyForm = () => ({
    companyName: '', contactPerson: '', email: '', phone: '',
    projectLocation: '', expectedTimeline: '', source: 'website', status: 'new', notes: '',
    followUpDate: ''
});

export default function InquiriesPage() {
    const [inquiries, setInquiries]   = useState([]);
    const [convRate, setConvRate]     = useState(null);
    const [loading, setLoading]       = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing]       = useState(null);
    const [deleting, setDeleting]     = useState(null);
    const [saving, setSaving]         = useState(false);
    const [transitioning, setTransitioning] = useState(null);
    const [formData, setFormData]     = useState(emptyForm());

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [inqRes, convRes] = await Promise.all([
                api.get('/crm/inquiries?limit=100'),
                api.get('/crm/inquiries/conversion-rate'),
            ]);
            setInquiries(inqRes.data.data || []);
            setConvRate(convRes.data.data);
        } catch { toast.error('Failed to load inquiries'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openForm = (inquiry = null) => {
        setEditing(inquiry);
        setFormData(inquiry ? {
            companyName: inquiry.companyName || '', contactPerson: inquiry.contactPerson || '',
            email: inquiry.email || '', phone: inquiry.phone || '',
            projectLocation: inquiry.projectLocation || '', expectedTimeline: inquiry.expectedTimeline || '',
            source: inquiry.source || 'website', status: inquiry.status || 'new', notes: inquiry.notes || '',
            followUpDate: inquiry.followUpDate ? new Date(inquiry.followUpDate).toISOString().split('T')[0] : ''
        } : emptyForm());
        setIsFormOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/crm/inquiries/${editing._id}`, formData);
                toast.success('Inquiry updated');
            } else {
                await api.post('/crm/inquiries', formData);
                toast.success('Lead created');
            }
            setIsFormOpen(false);
            fetchAll();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const transition = async (inquiry, nextStatus) => {
        setTransitioning(inquiry._id + nextStatus);
        try {
            await api.put(`/crm/inquiries/${inquiry._id}/transition`, { nextStatus });
            toast.success(`Moved to: ${getPipeline(nextStatus).label}`);
            fetchAll();
        } catch (err) { toast.error(err.response?.data?.message || 'Invalid transition'); }
        finally { setTransitioning(null); }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/crm/inquiries/${deleting._id}`);
            toast.success('Deleted');
            setDeleting(null);
            fetchAll();
        } catch { toast.error('Failed to delete'); }
    };

    const filtered = inquiries.filter(i =>
        (!filterStatus || i.status === filterStatus) &&
        (!(searchTerm) || [
            i.companyName, i.contactPerson, i.email, i.country
        ].some(f => (f || '').toLowerCase().includes(searchTerm.toLowerCase())))
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Sales Pipeline</h2>
                    <p className="text-sm text-gray-500">Export leads & inquiry management</p>
                </div>
                <button onClick={() => openForm()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition">
                    <UserPlus size={16} /> Add New Lead
                </button>
            </div>

            {/* KPI + Pipeline summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="col-span-1 sm:col-span-3 lg:col-span-1 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl p-4 text-white shadow">
                    <p className="text-emerald-100 text-xs font-bold uppercase mb-1">Conversion Rate</p>
                    <p className="text-3xl font-black">{convRate ? `${convRate.conversionRate?.toFixed(1)}%` : '...'}</p>
                    <p className="text-emerald-200 text-xs mt-1">{convRate?.confirmed || 0} / {convRate?.total || 0} converted</p>
                </div>
                {PIPELINE.slice(0, 4).map(stage => (
                    <div key={stage.status} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                            <p className="text-xs font-bold text-gray-500">{stage.label}</p>
                        </div>
                        <p className="text-2xl font-black text-gray-900">
                            {inquiries.filter(i => i.status === stage.status).length}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" placeholder="Search company, contact, email..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-400" />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none">
                        <option value="">All Stages</option>
                        {PIPELINE.map(p => <option key={p.status} value={p.status}>{p.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Company & Contact</th>
                            <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Location</th>
                            <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Pipeline Actions</th>
                            <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase text-right">Edit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-900">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="5" className="px-5 py-5"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-400 italic">No inquiries found</td></tr>
                        ) : filtered.map(inq => {
                            const stage = getPipeline(inq.status);
                            const nextStage = stage.next ? getPipeline(stage.next) : null;
                            return (
                                <tr key={inq._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4">
                                        <p className="font-bold text-sm">{inq.companyName}</p>
                                        <div className="flex flex-col gap-1 mt-0.5 text-xs text-gray-400">
                                            <p className="flex items-center gap-1">
                                                <Mail size={10} /> {inq.email || inq.phone || 'No Contact'}
                                            </p>
                                            {inq.expectedTimeline && (
                                                <p>Timeline: <span className="text-gray-600 font-semibold">{inq.expectedTimeline}</span></p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                            <Globe size={13} className="text-gray-300" /> {inq.projectLocation || '—'}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">Source: <span className="capitalize">{inq.source}</span></p>
                                        {inq.followUpDate && (
                                            <p className="text-[10px] text-indigo-600 mt-0.5 font-semibold">
                                                Follow-up: {format(new Date(inq.followUpDate), 'yyyy-MM-dd')}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${stage.light}`}>
                                            {stage.label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            {nextStage && (
                                                <button onClick={() => transition(inq, nextStage.status)}
                                                    disabled={transitioning === inq._id + nextStage.status}
                                                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition disabled:opacity-50">
                                                    <ArrowRight size={12} /> {nextStage.label}
                                                </button>
                                            )}
                                            {!['lost', 'closed'].includes(inq.status) && (
                                                <button onClick={() => transition(inq, 'lost')}
                                                    disabled={transitioning === inq._id + 'lost'}
                                                    className="text-xs font-bold px-2.5 py-1 bg-red-50 text-red-500 border border-red-100 rounded-lg hover:bg-red-100 transition disabled:opacity-50">
                                                    Mark Lost
                                                </button>
                                            )}
                                            {['lost', 'closed'].includes(inq.status) && (
                                                <span className="text-xs text-gray-400 italic">Final stage</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => openForm(inq)}
                                                className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400">
                                                <Edit size={14} />
                                            </button>
                                            <button onClick={() => setDeleting(inq)}
                                                className="p-1.5 hover:bg-red-50 rounded-lg transition text-gray-400 hover:text-red-500">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Lead' : 'New Lead'}</h3>
                            <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <XCircle size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {[['companyName','Client / Company Name'],['contactPerson','Contact Person'],
                                  ['email','Email'],['phone','Phone'],['projectLocation','Project Location'],['expectedTimeline','Expected Timeline']].map(([f,l]) => (
                                    <div key={f} className={f === 'companyName' || f === 'projectLocation' ? 'col-span-2' : ''}>
                                        <label className="text-xs font-bold text-gray-600 block mb-1">{l}</label>
                                        <input value={formData[f]} onChange={e => setFormData(p => ({...p, [f]: e.target.value}))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                    </div>
                                ))}
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Source</label>
                                    <select value={formData.source} onChange={e => setFormData(p => ({...p, source: e.target.value}))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                                        {['website','whatsapp','facebook','showroom','architect','contractor','referral','other'].map(s => (
                                            <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Follow-up Date</label>
                                    <input type="date" value={formData.followUpDate} onChange={e => setFormData(p => ({...p, followUpDate: e.target.value}))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Notes / Requirements</label>
                                    <textarea value={formData.notes} onChange={e => setFormData(p => ({...p, notes: e.target.value}))}
                                        rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsFormOpen(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={saving}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50">
                                    {saving ? 'Saving...' : editing ? 'Update Lead' : 'Create Lead'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleting && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
                        <p className="font-bold text-gray-900 mb-2">Delete Lead?</p>
                        <p className="text-sm text-gray-500 mb-6">Delete &quot;{deleting.companyName}&quot;? This cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleting(null)}
                                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                            <button onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
