import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { format, isPast, isToday, parseISO } from 'date-fns';
import {
    UserPlus, Search, Phone, Mail, MapPin, Calendar, Clock,
    CheckCircle2, XCircle, AlertCircle, Edit, Trash2,
    ArrowRight, MessageSquare, Plus, RefreshCw, Filter,
    Award, Building2, FileText, ChevronRight, Check,
    AlertTriangle, HelpCircle, Layers, DollarSign, History
} from 'lucide-react';
import toast from 'react-hot-toast';

// 1. Recommended Lead Flow / 10 Stages
const PIPELINE_STAGES = [
    { status: 'New Inquiry',        label: 'New Inquiry',        step: 1, color: 'bg-blue-500',   light: 'bg-blue-50 text-blue-700 border-blue-200',   next: 'Contacted' },
    { status: 'Contacted',          label: 'Contacted',          step: 2, color: 'bg-cyan-500',   light: 'bg-cyan-50 text-cyan-700 border-cyan-200',   next: 'Site Visit Pending' },
    { status: 'Site Visit Pending', label: 'Site Visit Pending', step: 3, color: 'bg-indigo-500', light: 'bg-indigo-50 text-indigo-700 border-indigo-200', next: 'Site Visited' },
    { status: 'Site Visited',       label: 'Site Visited',       step: 4, color: 'bg-purple-500', light: 'bg-purple-50 text-purple-700 border-purple-200', next: 'Quotation Pending' },
    { status: 'Quotation Pending',  label: 'Quotation Pending',  step: 5, color: 'bg-amber-500',  light: 'bg-amber-50 text-amber-700 border-amber-200',  next: 'Quotation Sent' },
    { status: 'Quotation Sent',     label: 'Quotation Sent',     step: 6, color: 'bg-violet-500', light: 'bg-violet-50 text-violet-700 border-violet-200', next: 'Follow-Up' },
    { status: 'Follow-Up',          label: 'Follow-Up',          step: 7, color: 'bg-orange-500', light: 'bg-orange-50 text-orange-700 border-orange-200', next: 'Negotiation' },
    { status: 'Negotiation',        label: 'Negotiation',        step: 8, color: 'bg-pink-500',   light: 'bg-pink-50 text-pink-700 border-pink-200',   next: 'Won' },
    { status: 'Won',                label: 'Won ✓',              step: 9, color: 'bg-emerald-500',light: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold', next: null },
    { status: 'Lost',               label: 'Lost ✗',             step: 0, color: 'bg-rose-500',   light: 'bg-rose-50 text-rose-700 border-rose-200',   next: null },
    { status: 'Hold',               label: 'Hold ⏸',             step: 0, color: 'bg-gray-500',   light: 'bg-gray-100 text-gray-700 border-gray-200',   next: null },
];

const SOURCE_OPTIONS = [
    'Facebook', 'WhatsApp', 'Referral', 'Showroom', 'Website', 'Direct', 'Architect', 'Contractor', 'Other'
];

const LOST_REASONS = [
    'Price too high / Competitor cheaper',
    'Chose another contractor',
    'Project postponed / Cancelled by client',
    'Specifications / Profile not available',
    'Delivery timeline mismatch',
    'Client unresponsive / No follow-up possible',
    'Other reason'
];

const getStageMeta = (statusStr) => {
    if (!statusStr) return PIPELINE_STAGES[0];
    const match = PIPELINE_STAGES.find(s => s.status.toLowerCase() === statusStr.toLowerCase());
    if (match) return match;
    // legacy lowercase mappings
    if (statusStr === 'new') return PIPELINE_STAGES[0];
    if (statusStr === 'site_visit') return PIPELINE_STAGES[2];
    if (statusStr === 'quotation_pending') return PIPELINE_STAGES[4];
    if (statusStr === 'quotation_sent') return PIPELINE_STAGES[5];
    if (statusStr === 'negotiation') return PIPELINE_STAGES[7];
    if (statusStr === 'won') return PIPELINE_STAGES[8];
    if (statusStr === 'lost') return PIPELINE_STAGES[9];
    return PIPELINE_STAGES[0];
};

const formatLKR = (val) => {
    if (!val && val !== 0) return '—';
    return `Rs. ${Number(val).toLocaleString('en-LK')}`;
};

const formatDateSafe = (d) => {
    if (!d) return '—';
    try {
        return format(new Date(d), 'dd/MM/yyyy');
    } catch {
        return '—';
    }
};

const initialLeadForm = () => ({
    customerName: '',
    contactNo: '',
    email: '',
    inquirySource: 'Direct',
    projectLocation: '',
    requirement: 'Aluminium Doors & Windows',
    inquiryDate: new Date().toISOString().split('T')[0],
    siteVisitDate: '',
    quotationNo: '',
    quotationValue: '',
    status: 'New Inquiry',
    nextFollowUpDate: '',
    finalValue: '',
    advanceAmount: '',
    advanceDate: '',
    projectStatus: 'Not Created',
    initialNote: ''
});

export default function InquiriesPage() {
    const [inquiries, setInquiries] = useState([]);
    const [stats, setStats] = useState({
        totalLeads: 0,
        pendingFollowUps: 0,
        wonLeads: 0,
        lostLeads: 0,
        totalWonValue: 0,
        statusCounts: {}
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStage, setSelectedStage] = useState('all');
    const [selectedSource, setSelectedSource] = useState('all');

    // Modals
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [formData, setFormData] = useState(initialLeadForm());
    const [saving, setSaving] = useState(false);

    // Follow-up history modal
    const [historyModalLead, setHistoryModalLead] = useState(null);
    const [newFollowUpNote, setNewFollowUpNote] = useState('');
    const [newFollowUpDate, setNewFollowUpDate] = useState('');
    const [newFollowUpStatus, setNewFollowUpStatus] = useState('');
    const [savingFollowUp, setSavingFollowUp] = useState(false);

    // Won action modal
    const [wonModalLead, setWonModalLead] = useState(null);
    const [wonData, setWonData] = useState({ finalValue: '', note: '' });
    const [savingWon, setSavingWon] = useState(false);

    // Lost action modal
    const [lostModalLead, setLostModalLead] = useState(null);
    const [lostReason, setLostReason] = useState(LOST_REASONS[0]);
    const [lostNote, setLostNote] = useState('');
    const [savingLost, setSavingLost] = useState(false);

    // Delete modal
    const [deletingLead, setDeletingLead] = useState(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [leadsRes, statsRes] = await Promise.all([
                api.get('/crm/inquiries?limit=200'),
                api.get('/crm/inquiries/stats').catch(() => ({ data: { data: null } }))
            ]);
            setInquiries(leadsRes.data.data || []);
            if (statsRes.data.data) {
                setStats(statsRes.data.data);
            }
        } catch (err) {
            toast.error('Failed to load lead follow-up system data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Open Form for Create / Edit
    const handleOpenForm = (lead = null) => {
        if (lead) {
            setEditingLead(lead);
            setFormData({
                customerName: lead.customerName || lead.companyName || lead.contactPerson || '',
                contactNo: lead.contactNo || lead.phone || '',
                email: lead.email || '',
                inquirySource: lead.inquirySource || lead.source || 'Direct',
                projectLocation: lead.projectLocation || '',
                requirement: lead.requirement || lead.notes || '',
                inquiryDate: lead.inquiryDate ? new Date(lead.inquiryDate).toISOString().split('T')[0] : (lead.createdAt ? new Date(lead.createdAt).toISOString().split('T')[0] : ''),
                siteVisitDate: lead.siteVisitDate ? new Date(lead.siteVisitDate).toISOString().split('T')[0] : '',
                quotationNo: lead.quotationNo || '',
                quotationValue: lead.quotationValue || '',
                status: lead.status || 'New Inquiry',
                nextFollowUpDate: lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toISOString().split('T')[0] : (lead.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : ''),
                finalValue: lead.finalValue || '',
                advanceAmount: lead.advanceAmount || '',
                advanceDate: lead.advanceDate ? new Date(lead.advanceDate).toISOString().split('T')[0] : '',
                projectStatus: lead.projectStatus || 'Not Created',
                initialNote: ''
            });
        } else {
            setEditingLead(null);
            setFormData(initialLeadForm());
        }
        setIsFormOpen(true);
    };

    // Save Create / Edit Form
    const handleSaveLead = async (e) => {
        e.preventDefault();
        if (!formData.customerName.trim()) {
            toast.error('Customer name is required');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                customerName: formData.customerName.trim(),
                companyName: formData.customerName.trim(),
                contactNo: formData.contactNo.trim(),
                phone: formData.contactNo.trim(),
                quotationValue: formData.quotationValue ? Number(formData.quotationValue) : 0,
                finalValue: formData.finalValue ? Number(formData.finalValue) : 0,
                advanceAmount: formData.advanceAmount ? Number(formData.advanceAmount) : 0,
                inquiryDate: formData.inquiryDate || new Date(),
                siteVisitDate: formData.siteVisitDate || undefined,
                nextFollowUpDate: formData.nextFollowUpDate || undefined,
                advanceDate: formData.advanceDate || undefined,
            };

            if (editingLead) {
                await api.put(`/crm/inquiries/${editingLead._id}`, payload);
                toast.success('Lead updated successfully');
            } else {
                await api.post('/crm/inquiries', payload);
                toast.success('New lead created successfully');
            }
            setIsFormOpen(false);
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save lead');
        } finally {
            setSaving(false);
        }
    };

    // Quick Stage Transition
    const handleQuickTransition = async (lead, nextStageName) => {
        try {
            await api.put(`/crm/inquiries/${lead._id}/transition`, {
                nextStatus: nextStageName,
                note: `Advanced stage to ${nextStageName}`
            });
            toast.success(`Lead moved to: ${nextStageName}`);
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change stage');
        }
    };

    // Open Won Modal
    const handleOpenWonModal = (lead) => {
        setWonModalLead(lead);
        setWonData({
            finalValue: lead.finalValue || lead.quotationValue || '',
            note: 'Lead confirmed as WON.'
        });
    };

    // Submit Won
    const handleSaveWon = async (e) => {
        e.preventDefault();
        if (!wonData.finalValue) {
            toast.error('Please enter the final agreed value');
            return;
        }

        setSavingWon(true);
        try {
            await api.put(`/crm/inquiries/${wonModalLead._id}/transition`, {
                nextStatus: 'Won',
                finalValue: Number(wonData.finalValue),
                note: wonData.note || 'Deal WON!'
            });
            toast.success('🎉 Deal marked as WON! Project status set to Created.');
            setWonModalLead(null);
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to mark as Won');
        } finally {
            setSavingWon(false);
        }
    };

    // Open Lost Modal
    const handleOpenLostModal = (lead) => {
        setLostModalLead(lead);
        setLostReason(LOST_REASONS[0]);
        setLostNote('');
    };

    // Submit Lost
    const handleSaveLost = async (e) => {
        e.preventDefault();
        setSavingLost(true);
        try {
            await api.put(`/crm/inquiries/${lostModalLead._id}/transition`, {
                nextStatus: 'Lost',
                lostReason: lostReason,
                note: lostNote ? `Lost: ${lostReason} — ${lostNote}` : `Lost: ${lostReason}`
            });
            toast.success('Lead marked as Lost');
            setLostModalLead(null);
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to mark as Lost');
        } finally {
            setSavingLost(false);
        }
    };

    // Open Follow-up History Modal
    const handleOpenHistoryModal = (lead) => {
        setHistoryModalLead(lead);
        setNewFollowUpNote('');
        setNewFollowUpDate(lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toISOString().split('T')[0] : '');
        setNewFollowUpStatus(lead.status || 'Follow-Up');
    };

    // Submit new follow-up interaction
    const handleAddFollowUpLog = async (e) => {
        e.preventDefault();
        if (!newFollowUpNote.trim()) {
            toast.error('Please enter a follow-up note');
            return;
        }

        setSavingFollowUp(true);
        try {
            await api.post(`/crm/inquiries/${historyModalLead._id}/follow-up`, {
                note: newFollowUpNote.trim(),
                nextFollowUpDate: newFollowUpDate || undefined,
                status: newFollowUpStatus || historyModalLead.status
            });
            toast.success('Follow-up interaction recorded');
            setNewFollowUpNote('');
            
            // Refresh single lead in modal
            const { data } = await api.get(`/crm/inquiries/${historyModalLead._id}`);
            setHistoryModalLead(data.data);
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to log follow-up');
        } finally {
            setSavingFollowUp(false);
        }
    };

    // Delete Lead
    const handleDeleteLead = async () => {
        try {
            await api.delete(`/crm/inquiries/${deletingLead._id}`);
            toast.success('Lead deleted');
            setDeletingLead(null);
            fetchAll();
        } catch {
            toast.error('Failed to delete lead');
        }
    };

    // Filter leads
    const filteredLeads = inquiries.filter(lead => {
        // Stage filter
        if (selectedStage !== 'all') {
            const stageMeta = getStageMeta(lead.status);
            if (stageMeta.status.toLowerCase() !== selectedStage.toLowerCase()) {
                return false;
            }
        }
        // Source filter
        if (selectedSource !== 'all') {
            const src = lead.inquirySource || lead.source || '';
            if (src.toLowerCase() !== selectedSource.toLowerCase()) {
                return false;
            }
        }
        // Search filter
        if (searchTerm.trim()) {
            const s = searchTerm.toLowerCase();
            const match = [
                lead.leadNo,
                lead.inquiryCode,
                lead.customerName,
                lead.companyName,
                lead.contactPerson,
                lead.contactNo,
                lead.phone,
                lead.email,
                lead.projectLocation,
                lead.requirement,
                lead.quotationNo
            ].some(f => (f || '').toLowerCase().includes(s));
            if (!match) return false;
        }
        return true;
    });

    return (
        <div className="space-y-6 pb-12">
            {/* Header Title Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 text-xs font-black tracking-wider uppercase bg-primary-100 text-primary-800 rounded-md">
                            ALUECO Aluminium Solutions
                        </span>
                        <span className="text-xs text-gray-400 font-medium">CRM Pipeline</span>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
                        Lead Follow-Up System
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Track each customer inquiry from first contact until the job is won, lost, or placed on hold.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                        onClick={() => fetchAll()}
                        title="Refresh"
                        className="p-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => handleOpenForm()}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm shadow-sm transition"
                    >
                        <UserPlus size={16} /> Add New Lead
                    </button>
                </div>
            </div>

            {/* Dashboard KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. Total Leads */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Leads</span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Layers size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-gray-900 mt-2">{stats.totalLeads}</p>
                    <p className="text-xs text-gray-400 mt-1 font-medium">All registered inquiries</p>
                </div>

                {/* 2. Pending Follow-Ups */}
                <div className="bg-white p-5 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Follow-Ups</span>
                        <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                            <Clock size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-amber-900 mt-2">{stats.pendingFollowUps}</p>
                    <p className="text-xs text-amber-600/80 mt-1 font-medium">Active follow-up pipeline</p>
                </div>

                {/* 3. Won Leads */}
                <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Won Leads</span>
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                            <Award size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-emerald-900 mt-2">{stats.wonLeads}</p>
                    <p className="text-xs text-emerald-600/80 mt-1 font-medium">
                        {stats.conversionRate ? `${stats.conversionRate}% Conversion` : 'Confirmed Deals'}
                    </p>
                </div>

                {/* 4. Lost Leads */}
                <div className="bg-white p-5 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Lost Leads</span>
                        <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                            <XCircle size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-rose-900 mt-2">{stats.lostLeads}</p>
                    <p className="text-xs text-rose-600/80 mt-1 font-medium">Unsuccessful leads</p>
                </div>

                {/* 5. Total Won Value */}
                <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-emerald-600 to-teal-800 p-5 rounded-2xl text-white shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Total Won Value</span>
                        <div className="p-2 bg-white/20 text-white rounded-xl backdrop-blur-sm">
                            <DollarSign size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-white mt-2 tracking-tight">
                        {formatLKR(stats.totalWonValue)}
                    </p>
                    <p className="text-xs text-emerald-200 mt-1 font-medium">Total contract revenue</p>
                </div>
            </div>

            {/* Recommended Lead Flow Horizontal Pipeline */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                        <Layers size={14} className="text-primary-600" />
                        Recommended Lead Flow & Stage Filter
                    </h3>
                    <button
                        onClick={() => setSelectedStage('all')}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition ${
                            selectedStage === 'all'
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Show All ({inquiries.length})
                    </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                    {PIPELINE_STAGES.map((st, idx) => {
                        const count = inquiries.filter(i => {
                            const m = getStageMeta(i.status);
                            return m.status === st.status;
                        }).length;
                        const isSelected = selectedStage.toLowerCase() === st.status.toLowerCase();

                        return (
                            <React.Fragment key={st.status}>
                                <button
                                    onClick={() => setSelectedStage(st.status)}
                                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition ${
                                        isSelected
                                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                            : count > 0
                                            ? `${st.light} hover:border-gray-400`
                                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : st.color}`} />
                                    <span>{st.label}</span>
                                    <span
                                        className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                                            isSelected ? 'bg-white/20 text-white' : 'bg-white text-gray-700 border border-gray-200'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                </button>
                                {idx < PIPELINE_STAGES.length - 1 && (
                                    <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Filters and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by Lead No, Customer, Phone, Location, Requirement, Quotation No..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-600">
                        <Filter size={14} className="text-gray-400" />
                        <select
                            value={selectedSource}
                            onChange={e => setSelectedSource(e.target.value)}
                            className="bg-transparent font-medium text-gray-700 outline-none text-xs"
                        >
                            <option value="all">All Sources</option>
                            {SOURCE_OPTIONS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {(searchTerm || selectedStage !== 'all' || selectedSource !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedStage('all');
                                setSelectedSource('all');
                            }}
                            className="text-xs text-rose-600 font-bold px-3 py-2 hover:bg-rose-50 rounded-xl transition"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Main Lead Records Table */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-black uppercase text-gray-500 tracking-wider">
                                <th className="px-5 py-4">Lead No. & Date</th>
                                <th className="px-5 py-4">Customer & Contact</th>
                                <th className="px-5 py-4">Project & Requirement</th>
                                <th className="px-5 py-4">Quotation Details</th>
                                <th className="px-5 py-4">Current Status</th>
                                <th className="px-5 py-4">Next Follow-Up</th>
                                <th className="px-5 py-4">Won / Advance</th>
                                <th className="px-5 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="8" className="px-5 py-5">
                                            <div className="h-4 bg-gray-100 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-5 py-16 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <HelpCircle size={32} className="text-gray-300" />
                                            <p className="font-semibold text-gray-600">No lead records found</p>
                                            <p className="text-xs text-gray-400">
                                                Create a new inquiry or adjust your filters.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map(lead => {
                                    const stage = getStageMeta(lead.status);
                                    const isWon = stage.status === 'Won' || lead.result === 'Won';
                                    const isLost = stage.status === 'Lost' || lead.result === 'Lost';
                                    const nextStage = stage.next ? getStageMeta(stage.next) : null;

                                    // Follow-up status check
                                    let followUpWarning = null;
                                    if (lead.nextFollowUpDate && !isWon && !isLost) {
                                        try {
                                            const fDate = new Date(lead.nextFollowUpDate);
                                            if (isToday(fDate)) {
                                                followUpWarning = 'today';
                                            } else if (isPast(fDate)) {
                                                followUpWarning = 'overdue';
                                            }
                                        } catch {}
                                    }

                                    return (
                                        <tr key={lead._id} className="hover:bg-gray-50/70 transition">
                                            {/* 1. Lead No. & Date */}
                                            <td className="px-5 py-4 align-top">
                                                <div className="font-black text-gray-900 tracking-tight flex items-center gap-1.5">
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-mono text-xs border border-gray-200 font-bold">
                                                        {lead.leadNo || lead.inquiryCode || 'L-NEW'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                    <Calendar size={11} />
                                                    {formatDateSafe(lead.inquiryDate || lead.createdAt)}
                                                </p>
                                            </td>

                                            {/* 2. Customer & Contact */}
                                            <td className="px-5 py-4 align-top">
                                                <p className="font-bold text-gray-900 text-sm">
                                                    {lead.customerName || lead.companyName || lead.contactPerson || 'Unnamed Customer'}
                                                </p>
                                                <div className="space-y-0.5 mt-1 text-xs text-gray-500">
                                                    {(lead.contactNo || lead.phone) && (
                                                        <p className="flex items-center gap-1 text-gray-600">
                                                            <Phone size={11} className="text-gray-400" />
                                                            {lead.contactNo || lead.phone}
                                                        </p>
                                                    )}
                                                    {lead.email && (
                                                        <p className="flex items-center gap-1 text-gray-400 truncate max-w-[180px]">
                                                            <Mail size={11} className="text-gray-400 flex-shrink-0" />
                                                            {lead.email}
                                                        </p>
                                                    )}
                                                    <span className="inline-block px-1.5 py-0.2 text-[10px] font-semibold bg-gray-100 text-gray-600 rounded border border-gray-200 mt-0.5">
                                                        Source: {lead.inquirySource || lead.source || 'Direct'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* 3. Project & Requirement */}
                                            <td className="px-5 py-4 align-top">
                                                <div className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                                    <MapPin size={12} className="text-primary-500 flex-shrink-0" />
                                                    <span>{lead.projectLocation || '—'}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1 font-medium line-clamp-2 max-w-[200px]">
                                                    {lead.requirement || lead.notes || 'Aluminium works'}
                                                </p>
                                                {lead.siteVisitDate && (
                                                    <p className="text-[11px] text-purple-700 font-semibold mt-1 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 inline-flex items-center gap-1">
                                                        <span>Site Visit:</span> {formatDateSafe(lead.siteVisitDate)}
                                                    </p>
                                                )}
                                            </td>

                                            {/* 4. Quotation Details */}
                                            <td className="px-5 py-4 align-top">
                                                {lead.quotationNo ? (
                                                    <div>
                                                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-violet-50 text-violet-700 rounded border border-violet-200">
                                                            {lead.quotationNo}
                                                        </span>
                                                        <p className="text-sm font-black text-gray-900 mt-1">
                                                            {formatLKR(lead.quotationValue)}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No quote prepared</span>
                                                )}
                                            </td>

                                            {/* 5. Current Status */}
                                            <td className="px-5 py-4 align-top">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${stage.light}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${stage.color}`} />
                                                    {stage.label}
                                                </span>
                                                {lead.lostReason && (
                                                    <p className="text-[10px] text-rose-600 mt-1 font-medium line-clamp-1" title={lead.lostReason}>
                                                        Reason: {lead.lostReason}
                                                    </p>
                                                )}
                                            </td>

                                            {/* 6. Next Follow-Up */}
                                            <td className="px-5 py-4 align-top">
                                                {lead.nextFollowUpDate ? (
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                                                            <Calendar size={12} className="text-gray-400" />
                                                            {formatDateSafe(lead.nextFollowUpDate)}
                                                        </p>
                                                        {followUpWarning === 'today' && (
                                                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded uppercase tracking-wider">
                                                                Due Today
                                                            </span>
                                                        )}
                                                        {followUpWarning === 'overdue' && (
                                                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded uppercase tracking-wider">
                                                                Overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>

                                            {/* 7. Won / Advance & Project */}
                                            <td className="px-5 py-4 align-top">
                                                {isWon ? (
                                                    <div className="space-y-0.5 text-xs">
                                                        <p className="font-bold text-emerald-700">
                                                            Final: {formatLKR(lead.finalValue || lead.quotationValue)}
                                                        </p>
                                                        {lead.advanceAmount > 0 && (
                                                            <p className="text-gray-600 font-medium">
                                                                Adv: <span className="font-bold text-gray-900">{formatLKR(lead.advanceAmount)}</span>
                                                            </p>
                                                        )}
                                                        {lead.advanceDate && (
                                                            <p className="text-[10px] text-gray-400">
                                                                Date: {formatDateSafe(lead.advanceDate)}
                                                            </p>
                                                        )}
                                                        <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded mt-1">
                                                            Project: {lead.projectStatus || 'Created'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>

                                            {/* 8. Actions */}
                                            <td className="px-5 py-4 align-top text-right">
                                                <div className="flex flex-col items-end gap-1.5">
                                                    {/* Quick Log Follow-up button */}
                                                    <button
                                                        onClick={() => handleOpenHistoryModal(lead)}
                                                        className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                                                        title="View History & Add Follow-Up Note"
                                                    >
                                                        <History size={13} className="text-primary-600" />
                                                        <span>History ({lead.followUpHistory?.length || 0})</span>
                                                    </button>

                                                    {/* Pipeline Progression Buttons */}
                                                    <div className="flex items-center gap-1">
                                                        {!isWon && !isLost && nextStage && (
                                                            <button
                                                                onClick={() => {
                                                                    if (nextStage.status === 'Won') {
                                                                        handleOpenWonModal(lead);
                                                                    } else {
                                                                        handleQuickTransition(lead, nextStage.status);
                                                                    }
                                                                }}
                                                                className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 rounded-lg transition"
                                                                title={`Move to next stage: ${nextStage.label}`}
                                                            >
                                                                <span>{nextStage.label}</span>
                                                                <ArrowRight size={11} />
                                                            </button>
                                                        )}

                                                        {!isWon && !isLost && (
                                                            <button
                                                                onClick={() => handleOpenWonModal(lead)}
                                                                className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-[11px] font-bold transition"
                                                                title="Mark deal as Won"
                                                            >
                                                                Won
                                                            </button>
                                                        )}

                                                        {!isWon && !isLost && (
                                                            <button
                                                                onClick={() => handleOpenLostModal(lead)}
                                                                className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-[11px] font-bold transition"
                                                                title="Mark deal as Lost"
                                                            >
                                                                Lost
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Edit & Delete */}
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <button
                                                            onClick={() => handleOpenForm(lead)}
                                                            className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-md transition"
                                                            title="Edit Lead"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingLead(lead)}
                                                            className="p-1 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-md transition"
                                                            title="Delete Lead"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL 1: Create / Edit Lead Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                            <div>
                                <h3 className="text-lg font-black text-gray-900">
                                    {editingLead ? `Edit Lead: ${editingLead.leadNo || editingLead.inquiryCode}` : 'Create New Customer Inquiry / Lead'}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Fill in customer inquiry and project specifications
                                </p>
                            </div>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
                            >
                                <XCircle size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveLead} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Customer Name */}
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-bold text-gray-700 block mb-1">
                                        Customer / Company Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Sample Customer / Luxo Client"
                                        value={formData.customerName}
                                        onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none font-medium"
                                    />
                                </div>

                                {/* Contact Number */}
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Contact No.</label>
                                    <input
                                        type="text"
                                        placeholder="07XXXXXXXX"
                                        value={formData.contactNo}
                                        onChange={e => setFormData({ ...formData, contactNo: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="client@example.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>

                                {/* Inquiry Source */}
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Inquiry Source</label>
                                    <select
                                        value={formData.inquirySource}
                                        onChange={e => setFormData({ ...formData, inquirySource: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium"
                                    >
                                        {SOURCE_OPTIONS.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Project Location */}
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Project Location</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Colombo, Kandy, Gampaha"
                                        value={formData.projectLocation}
                                        onChange={e => setFormData({ ...formData, projectLocation: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>

                                {/* Requirement */}
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Requirement / Items</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Aluminium Doors & Windows, Curtain Wall, Sliding Partitions"
                                        value={formData.requirement}
                                        onChange={e => setFormData({ ...formData, requirement: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>

                                {/* Inquiry Date */}
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Inquiry Date</label>
                                    <input
                                        type="date"
                                        value={formData.inquiryDate}
                                        onChange={e => setFormData({ ...formData, inquiryDate: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>

                                {/* Site Visit Date */}
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Site Visit Date</label>
                                    <input
                                        type="date"
                                        value={formData.siteVisitDate}
                                        onChange={e => setFormData({ ...formData, siteVisitDate: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>

                                {/* Quotation No */}
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Quotation No.</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. QOT-001"
                                        value={formData.quotationNo}
                                        onChange={e => setFormData({ ...formData, quotationNo: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>

                                {/* Quotation Value */}
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Quotation Value (Rs.)</label>
                                    <input
                                        type="number"
                                        placeholder="1500000"
                                        value={formData.quotationValue}
                                        onChange={e => setFormData({ ...formData, quotationValue: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none font-bold"
                                    />
                                </div>

                                {/* Current Status */}
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Current Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white font-bold text-primary-700"
                                    >
                                        {PIPELINE_STAGES.map(s => (
                                            <option key={s.status} value={s.status}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Next Follow-Up Date */}
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Next Follow-Up Date</label>
                                    <input
                                        type="date"
                                        value={formData.nextFollowUpDate}
                                        onChange={e => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none font-medium"
                                    />
                                </div>

                                {/* Initial / Follow-up Notes */}
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Initial / Follow-up Notes</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Enter customer requirement details, site notes, or follow-up summary..."
                                        value={formData.initialNote}
                                        onChange={e => setFormData({ ...formData, initialNote: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50"
                                >
                                    {saving ? 'Saving Lead...' : editingLead ? 'Update Lead' : 'Create Lead'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: Follow-Up History & New Note Log Modal */}
            {historyModalLead && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-primary-50 text-primary-700 font-mono font-bold text-xs rounded border border-primary-100">
                                        {historyModalLead.leadNo || historyModalLead.inquiryCode}
                                    </span>
                                    <span className="text-xs text-gray-500 font-semibold">
                                        {historyModalLead.customerName || historyModalLead.companyName}
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-gray-900 mt-1">Follow-Up History & Notes</h3>
                            </div>
                            <button
                                onClick={() => setHistoryModalLead(null)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
                            >
                                <XCircle size={22} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Add New Interaction Form */}
                            <form onSubmit={handleAddFollowUpLog} className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <MessageSquare size={14} className="text-primary-600" />
                                    Log New Follow-Up Interaction
                                </h4>
                                <div>
                                    <textarea
                                        rows={2}
                                        required
                                        placeholder="Enter call notes, customer feedback, revision requests, or meeting outcome..."
                                        value={newFollowUpNote}
                                        onChange={e => setNewFollowUpNote(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-600 block mb-1">
                                            Next Follow-Up Date
                                        </label>
                                        <input
                                            type="date"
                                            value={newFollowUpDate}
                                            onChange={e => setNewFollowUpDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-600 block mb-1">
                                            Update Stage (Optional)
                                        </label>
                                        <select
                                            value={newFollowUpStatus}
                                            onChange={e => setNewFollowUpStatus(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none font-semibold text-gray-700"
                                        >
                                            {PIPELINE_STAGES.map(s => (
                                                <option key={s.status} value={s.status}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                    <button
                                        type="submit"
                                        disabled={savingFollowUp}
                                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        <Plus size={14} />
                                        {savingFollowUp ? 'Logging Note...' : 'Add Follow-Up Note'}
                                    </button>
                                </div>
                            </form>

                            {/* Timeline of past follow-ups */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <History size={14} className="text-gray-400" />
                                    Interaction Timeline
                                </h4>

                                {(!historyModalLead.followUpHistory || historyModalLead.followUpHistory.length === 0) ? (
                                    <div className="p-6 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                        <p className="text-xs">No follow-up interactions logged yet.</p>
                                    </div>
                                ) : (
                                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                        {historyModalLead.followUpHistory.map((item, idx) => (
                                            <div key={idx} className="relative bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs">
                                                <div className="absolute -left-[23px] top-4 w-3 h-3 rounded-full bg-primary-600 ring-4 ring-white" />
                                                <div className="flex items-center justify-between gap-2 text-xs">
                                                    <span className="font-bold text-gray-900">
                                                        {item.salesOfficer || item.user?.name || 'Sales Officer'}
                                                    </span>
                                                    <span className="text-gray-400 font-medium">
                                                        {formatDateSafe(item.date)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-700 mt-1.5 font-medium whitespace-pre-line">
                                                    {item.note}
                                                </p>
                                                {item.nextFollowUpDate && (
                                                    <p className="text-[10px] text-primary-700 font-semibold mt-2 flex items-center gap-1 bg-primary-50 px-2 py-0.5 rounded-md inline-flex">
                                                        <Calendar size={10} />
                                                        Next Follow-Up: {formatDateSafe(item.nextFollowUpDate)}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: Mark Won Modal (Advance entry & Project record) */}
            {wonModalLead && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                        <div className="p-6 bg-gradient-to-br from-emerald-600 to-teal-800 text-white">
                            <div className="flex items-center justify-between">
                                <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-black tracking-wider uppercase">
                                    Won Deal Confirmation
                                </span>
                                <button onClick={() => setWonModalLead(null)} className="p-1 hover:bg-white/20 rounded-full text-white/80">
                                    <XCircle size={20} />
                                </button>
                            </div>
                            <h3 className="text-xl font-black mt-2">
                                Congratulations! 🎉
                            </h3>
                            <p className="text-xs text-emerald-100 mt-0.5">
                                Lead: {wonModalLead.leadNo} — {wonModalLead.customerName || wonModalLead.companyName}
                            </p>
                        </div>

                        <form onSubmit={handleSaveWon} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">
                                    Final Agreed Contract Value (Rs.) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    placeholder="1400000"
                                    value={wonData.finalValue}
                                    onChange={e => setWonData({ ...wonData, finalValue: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-base font-black text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>


                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">
                                    Closing Note
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter closing notes..."
                                    value={wonData.note}
                                    onChange={e => setWonData({ ...wonData, note: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-medium">
                                ✓ This will set Project Status to <strong>Created</strong>.
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setWonModalLead(null)}
                                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingWon}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50"
                                >
                                    {savingWon ? 'Processing...' : 'Confirm Won & Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 4: Mark Lost Modal */}
            {lostModalLead && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                        <div className="p-6 bg-gradient-to-br from-rose-600 to-red-800 text-white">
                            <div className="flex items-center justify-between">
                                <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-black tracking-wider uppercase">
                                    Mark Lead as Lost
                                </span>
                                <button onClick={() => setLostModalLead(null)} className="p-1 hover:bg-white/20 rounded-full text-white/80">
                                    <XCircle size={20} />
                                </button>
                            </div>
                            <h3 className="text-lg font-black mt-2">
                                Record Lost Reason
                            </h3>
                            <p className="text-xs text-rose-100 mt-0.5">
                                Lead: {lostModalLead.leadNo} — {lostModalLead.customerName || lostModalLead.companyName}
                            </p>
                        </div>

                        <form onSubmit={handleSaveLost} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">
                                    Reason for Loss <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={lostReason}
                                    onChange={e => setLostReason(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white font-semibold text-gray-800"
                                >
                                    {LOST_REASONS.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">
                                    Additional Feedback / Notes
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Enter any feedback or competitor notes for analysis..."
                                    value={lostNote}
                                    onChange={e => setLostNote(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setLostModalLead(null)}
                                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingLost}
                                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50"
                                >
                                    {savingLost ? 'Saving...' : 'Record Lost Reason'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 5: Delete Confirmation Modal */}
            {deletingLead && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3 text-rose-600 mb-3">
                            <div className="p-2 bg-rose-50 rounded-xl">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="font-bold text-gray-900 text-base">Delete Lead Record?</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                            Are you sure you want to delete lead <strong>{deletingLead.leadNo || deletingLead.customerName}</strong>? This action will remove it from the pipeline.
                        </p>
                        <div className="flex justify-end gap-2.5">
                            <button
                                onClick={() => setDeletingLead(null)}
                                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteLead}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
