import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
    Boxes, PackageCheck, AlertTriangle, Clock, Search, Filter,
    ChevronDown, ChevronUp, ExternalLink, FileText, ShoppingBag,
    CheckCircle2, RefreshCw, Layers, ShieldCheck, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AluProjectMaterialsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [expandedProjectIds, setExpandedProjectIds] = useState({});
    const [activeTabMap, setActiveTabMap] = useState({});

    const fetchProjectMaterials = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/alu/projects/materials-summary');
            const projectList = data.data || [];
            setProjects(projectList);

            // Default expand first project or projects with shortages
            const initialExpanded = {};
            const initialTabs = {};
            projectList.forEach((p, idx) => {
                if (idx === 0 || p.materialStatus === 'pending_po') {
                    initialExpanded[p._id] = true;
                }
                initialTabs[p._id] = p.shortageItems?.length > 0 ? 'shortages' : 'profiles';
            });
            setExpandedProjectIds(initialExpanded);
            setActiveTabMap(initialTabs);
        } catch (err) {
            console.error('Error fetching project materials:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjectMaterials();
    }, []);

    const toggleExpand = (id) => {
        setExpandedProjectIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const setProjectTab = (id, tab) => {
        setActiveTabMap(prev => ({ ...prev, [id]: tab }));
    };

    // Filter projects based on search and status
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesSearch =
                (p.projectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.quoteNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.linkedPOs?.some(po => po.poNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                p.shortageItems?.some(s => s.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) || s.productName.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus =
                selectedStatus === 'all' ||
                (selectedStatus === 'shortages' && p.materialStatus === 'pending_po') ||
                (selectedStatus === 'allocated' && p.materialStatus === 'fully_allocated') ||
                (selectedStatus === 'production' && p.materialStatus === 'in_production') ||
                (selectedStatus === 'draft' && p.materialStatus === 'quotation_stage');

            return matchesSearch && matchesStatus;
        });
    }, [projects, searchTerm, selectedStatus]);

    // KPI Summary Metrics
    const stats = useMemo(() => {
        const total = projects.length;
        const shortages = projects.filter(p => p.materialStatus === 'pending_po').length;
        const allocated = projects.filter(p => p.materialStatus === 'fully_allocated').length;
        const inProd = projects.filter(p => p.materialStatus === 'in_production').length;
        const totalShortageValue = projects.reduce((sum, p) => sum + (p.totalPendingPOValue || 0), 0);

        return { total, shortages, allocated, inProd, totalShortageValue };
    }, [projects]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                        <PackageCheck className="text-indigo-600" size={28} />
                        Project Material Allocation &amp; Pending Shortages
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Track allocated warehouse stock, reserved aluminium profiles, glass, hardware, and pending shortage Purchase Orders project-wise.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={fetchProjectMaterials}
                        className="flex items-center gap-1.5 text-xs font-bold bg-white text-slate-700 px-3 py-2 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/alu/po')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition"
                    >
                        <ShoppingBag size={14} /> View Shortage POs
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Layers size={22} />
                    </div>
                    <div>
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Active Projects</span>
                        <span className="text-xl font-black text-slate-900">{stats.total}</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex items-center gap-3 bg-amber-50/30">
                    <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Material Shortages / Pending POs</span>
                        <span className="text-xl font-black text-amber-800">{stats.shortages} Projects</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs flex items-center gap-3 bg-emerald-50/30">
                    <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Fully Allocated Projects</span>
                        <span className="text-xl font-black text-emerald-800">{stats.allocated} Projects</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                    <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                        <Clock size={22} />
                    </div>
                    <div>
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Pending PO Value</span>
                        <span className="text-lg font-black font-mono text-emerald-700">
                            LKR {stats.totalShortageValue.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Search and Filters Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by Project Name, Client, Quote No (QOT-...), PO No, Profile or Material code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto text-xs">
                    {[
                        { id: 'all', label: 'All Projects' },
                        { id: 'shortages', label: '⚠️ Shortage / Pending PO' },
                        { id: 'allocated', label: '✅ Fully Allocated' },
                        { id: 'production', label: '🏭 In Production' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedStatus(tab.id)}
                            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${selectedStatus === tab.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading Indicator */}
            {loading ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-xs text-center space-y-3">
                    <RefreshCw className="animate-spin text-indigo-600 mx-auto" size={28} />
                    <p className="text-xs font-bold text-slate-600">Loading project-wise material allocations &amp; shortages...</p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-xs text-center space-y-3">
                    <Boxes className="text-slate-300 mx-auto" size={40} />
                    <h3 className="text-sm font-bold text-slate-700">No project materials found</h3>
                    <p className="text-xs text-slate-500">Try adjusting your search query or filter options.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredProjects.map((p) => {
                        const isExpanded = !!expandedProjectIds[p._id];
                        const activeTab = activeTabMap[p._id] || 'profiles';
                        const hasShortages = p.shortageItems && p.shortageItems.length > 0;

                        return (
                            <div key={p._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300">
                                {/* Project Card Header */}
                                <div
                                    onClick={() => toggleExpand(p._id)}
                                    className="p-4 bg-slate-50/70 hover:bg-slate-100/60 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 select-none"
                                >
                                    <div className="space-y-1 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-black text-slate-900">{p.projectName}</span>
                                            <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 font-mono">
                                                {p.quoteNumber} (Rev {p.version})
                                            </span>
                                            
                                            {/* Material Status Badge */}
                                            <span className={`text-[10.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${p.statusBadgeColor === 'amber' ? 'bg-amber-100 text-amber-900 border border-amber-300' : p.statusBadgeColor === 'emerald' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : p.statusBadgeColor === 'blue' ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-slate-200 text-slate-800'}`}>
                                                {p.statusBadgeColor === 'amber' && <AlertTriangle size={12} />}
                                                {p.statusBadgeColor === 'emerald' && <CheckCircle2 size={12} />}
                                                {p.materialStatusLabel}
                                            </span>
                                        </div>

                                        <div className="text-xs font-medium text-slate-500 flex flex-wrap items-center gap-4">
                                            <span>Client: <strong className="text-slate-700">{p.customerName}</strong></span>
                                            <span>Selling Value: <strong className="text-emerald-700 font-mono">LKR {(p.finalSellingPrice || 0).toLocaleString()}</strong></span>
                                            {p.linkedPOs?.length > 0 && (
                                                <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                    Linked POs: {p.linkedPOs.map(po => po.poNumber).join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 self-end md:self-auto">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/alu/quotations/${p._id}`);
                                            }}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200 shadow-2xs flex items-center gap-1 transition"
                                        >
                                            <FileText size={13} /> View Quote
                                        </button>
                                        <div className="p-1 text-slate-400 hover:text-slate-700">
                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content Details */}
                                {isExpanded && (
                                    <div className="p-4 space-y-4 bg-white">
                                        {/* Material Category Tabs */}
                                        <div className="flex border-b border-slate-200 gap-2 text-xs font-bold select-none overflow-x-auto">
                                            {hasShortages && (
                                                <button
                                                    onClick={() => setProjectTab(p._id, 'shortages')}
                                                    className={`py-2 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'shortages' ? 'border-amber-500 text-amber-700 bg-amber-50/70 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                                >
                                                    <AlertTriangle size={14} className="text-amber-600" /> Shortage &amp; Pending POs ({p.shortageItems.length})
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setProjectTab(p._id, 'profiles')}
                                                className={`py-2 px-3.5 rounded-t-xl transition-all border-b-2 ${activeTab === 'profiles' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                            >
                                                Aluminium Profiles ({p.profiles?.length || 0})
                                            </button>
                                            <button
                                                onClick={() => setProjectTab(p._id, 'glass')}
                                                className={`py-2 px-3.5 rounded-t-xl transition-all border-b-2 ${activeTab === 'glass' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                            >
                                                Glass Panes ({p.glass?.length || 0})
                                            </button>
                                            <button
                                                onClick={() => setProjectTab(p._id, 'accessories')}
                                                className={`py-2 px-3.5 rounded-t-xl transition-all border-b-2 ${activeTab === 'accessories' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                            >
                                                Accessories &amp; Hardware ({p.accessories?.length || 0})
                                            </button>
                                        </div>

                                        {/* TAB 1: SHORTAGE ITEMS */}
                                        {activeTab === 'shortages' && (
                                            <div className="space-y-3">
                                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium flex justify-between items-center">
                                                    <span>⚠️ Out-of-stock raw materials that generated shortage Purchase Orders for this project.</span>
                                                    <span className="font-bold font-mono">Total Pending PO Value: LKR {(p.totalPendingPOValue || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="overflow-x-auto border border-amber-200 rounded-xl">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-amber-100/60 text-amber-950 font-extrabold uppercase text-[10px]">
                                                            <tr>
                                                                <th className="p-2.5">PO Number</th>
                                                                <th className="p-2.5">Item Code</th>
                                                                <th className="p-2.5">Material Description</th>
                                                                <th className="p-2.5 text-center">Required Qty</th>
                                                                <th className="p-2.5 text-center">Received Qty</th>
                                                                <th className="p-2.5 text-center">Pending Shortage</th>
                                                                <th className="p-2.5 text-right">Est. Total Cost</th>
                                                                <th className="p-2.5 text-center">PO Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-amber-100 bg-white">
                                                            {p.shortageItems.map((st, sIdx) => (
                                                                <tr key={sIdx} className="hover:bg-amber-50/40">
                                                                    <td className="p-2.5 font-extrabold text-indigo-600 font-mono">{st.poNumber}</td>
                                                                    <td className="p-2.5 font-bold text-slate-800 font-mono">{st.itemCode}</td>
                                                                    <td className="p-2.5 font-semibold text-slate-700">{st.productName}</td>
                                                                    <td className="p-2.5 text-center font-bold text-slate-700">{st.requiredQuantity} {st.unitOfMeasure}</td>
                                                                    <td className="p-2.5 text-center font-bold text-emerald-600">{st.receivedQuantity}</td>
                                                                    <td className="p-2.5 text-center font-black text-rose-600">{st.pendingQuantity} {st.unitOfMeasure}</td>
                                                                    <td className="p-2.5 text-right font-mono font-extrabold text-slate-900">LKR {(st.estimatedTotalCost || 0).toLocaleString()}</td>
                                                                    <td className="p-2.5 text-center">
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${st.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-800' : st.status === 'partially_received' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}`}>
                                                                            {st.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB 2: ALUMINIUM PROFILES */}
                                        {activeTab === 'profiles' && (
                                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                                {p.profiles && p.profiles.length > 0 ? (
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                                                            <tr>
                                                                <th className="p-2.5">Profile Code</th>
                                                                <th className="p-2.5">Description</th>
                                                                <th className="p-2.5 text-right">Required Length (mm)</th>
                                                                <th className="p-2.5 text-right">Optimized Purchase Bars</th>
                                                                <th className="p-2.5 text-center">Waste %</th>
                                                                <th className="p-2.5 text-right">Total Cost</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {p.profiles.map((prof, prIdx) => (
                                                                <tr key={prIdx} className="hover:bg-slate-50">
                                                                    <td className="p-2.5 font-bold text-indigo-600 font-mono">{prof.code}</td>
                                                                    <td className="p-2.5 font-semibold text-slate-800">{prof.description}</td>
                                                                    <td className="p-2.5 text-right font-mono text-slate-700">{prof.totalRequiredMm?.toLocaleString()} mm ({parseFloat((prof.totalRequiredMm / 1000).toFixed(2))} m)</td>
                                                                    <td className="p-2.5 text-right font-extrabold text-slate-900">{prof.totalRequiredBars} Bars (20ft / 6.1m)</td>
                                                                    <td className="p-2.5 text-center font-bold text-rose-600">{prof.wastePercent}%</td>
                                                                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">LKR {(prof.cost || 0).toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div className="p-6 text-center text-xs text-slate-400">No profile optimization results recorded for this project.</div>
                                                )}
                                            </div>
                                        )}

                                        {/* TAB 3: GLASS PANES */}
                                        {activeTab === 'glass' && (
                                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                                {p.glass && p.glass.length > 0 ? (
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                                                            <tr>
                                                                <th className="p-2.5">Glass Type &amp; Thickness</th>
                                                                <th className="p-2.5 text-center">Total Quantity</th>
                                                                <th className="p-2.5 text-right">Total Area (Sq.Ft)</th>
                                                                <th className="p-2.5 text-right">Total Estimated Cost</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {p.glass.map((gl, gIdx) => (
                                                                <tr key={gIdx} className="hover:bg-slate-50">
                                                                    <td className="p-2.5 font-extrabold text-slate-800">{gl.type}</td>
                                                                    <td className="p-2.5 text-center font-bold text-slate-700">{gl.quantity} Panes</td>
                                                                    <td className="p-2.5 text-right font-mono font-bold text-indigo-700">{parseFloat((gl.totalAreaSqFt || 0).toFixed(2))} Sq.Ft</td>
                                                                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">LKR {(gl.totalCost || 0).toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div className="p-6 text-center text-xs text-slate-400">No glass requirements recorded for this project.</div>
                                                )}
                                            </div>
                                        )}

                                        {/* TAB 4: ACCESSORIES & HARDWARE */}
                                        {activeTab === 'accessories' && (
                                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                                {p.accessories && p.accessories.length > 0 ? (
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                                                            <tr>
                                                                <th className="p-2.5">Accessory Code</th>
                                                                <th className="p-2.5">Hardware / Seal Name</th>
                                                                <th className="p-2.5 text-center">Required Quantity</th>
                                                                <th className="p-2.5 text-right">Total Cost</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {p.accessories.map((acc, aIdx) => (
                                                                <tr key={aIdx} className="hover:bg-slate-50">
                                                                    <td className="p-2.5 font-bold text-indigo-600 font-mono">{acc.code}</td>
                                                                    <td className="p-2.5 font-semibold text-slate-800">{acc.name}</td>
                                                                    <td className="p-2.5 text-center font-extrabold text-slate-900">{acc.requiredQty} {acc.unit}</td>
                                                                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">LKR {(acc.totalCost || 0).toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div className="p-6 text-center text-xs text-slate-400">No hardware/accessory items recorded for this project.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
