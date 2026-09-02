import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Plus, Edit, Trash2, Settings, Save, X, Search, Layers,
    Calculator, Sparkles, HelpCircle, FileSpreadsheet, Eye,
    Package, CheckCircle2, AlertCircle, ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Alu2DCadPreview from '../components/aluminium/Alu2DCadPreview';

const APPLICATION_TYPE_PRESETS = [
    'Sliding Door',
    'Sliding Window',
    'Casement Door',
    'Casement Window',
    'Fixed Glass Partition',
    'Tilt and Turn Window',
    'Folding / Bi-fold Door',
    'Curtain Wall System',
    'Shop Front Facade',
    'Louver Window',
];

export default function AluDatabasePage() {
    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [glass, setGlass] = useState([]);
    const [accessories, setAccessories] = useState([]);
    const [rawMaterials, setRawMaterials] = useState({ products: [], stockItems: [] });

    // Filters
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    // Modals
    const [isOpen, setIsOpen] = useState(false);
    const [currentEdit, setCurrentEdit] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [previewApp, setPreviewApp] = useState(null);

    // Autocomplete active indexes
    const [activeProfileIdx, setActiveProfileIdx] = useState(null);
    const [activeAccessoryIdx, setActiveAccessoryIdx] = useState(null);
    const [showAppTypeSuggestions, setShowAppTypeSuggestions] = useState(false);

    // Form State for Application BOM
    const [appForm, setAppForm] = useState({
        type: 'Sliding Door',
        configuration: '',
        description: '',
        profileBOM: [{ profileCode: '', actualCode: '', description: '', quantityFormula: '', lengthFormula: '' }],
        glassBOM: [{ glassCode: '', quantityFormula: '', widthFormula: '', heightFormula: '', glassSheetLength: '8', base21ftPrice: 0 }],
        accessoryBOM: [{ accessoryCode: '', actualCode: '', quantityFormula: '' }],
        labourMethod: 'linear_feet',
        labourRate: 0
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [appRes, profRes, glassRes, accRes, rawRes] = await Promise.all([
                api.get('/alu/applications'),
                api.get('/alu/profiles'),
                api.get('/alu/glass'),
                api.get('/alu/accessories'),
                api.get('/alu/raw-materials').catch(() => ({ data: { data: { products: [], stockItems: [] } } }))
            ]);
            setApplications(appRes.data.data || []);
            setProfiles(profRes.data.data || []);
            setGlass(glassRes.data.data || []);
            setAccessories(accRes.data.data || []);
            setRawMaterials(rawRes.data?.data || { products: [], stockItems: [] });
        } catch (error) {
            toast.error('Failed to load Application BOM templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Calculate available stock map from stockItems
    const stockQtyMap = React.useMemo(() => {
        const map = {};
        const stockItems = rawMaterials.stockItems || [];
        for (const s of stockItems) {
            const pId = s.productId?._id?.toString() || s.productId?.toString();
            const pCode = s.productId?.productCode || s.productCode;
            const avail = s.quantities?.available ?? s.quantities?.onHand ?? 0;
            if (pId) {
                map[pId] = (map[pId] || 0) + avail;
            }
            if (pCode) {
                const uc = pCode.toUpperCase();
                map[uc] = (map[uc] || 0) + avail;
            }
        }
        return map;
    }, [rawMaterials]);

    // Filter glass items from raw materials (GL type)
    const glassItemsFromRawMaterials = React.useMemo(() => {
        const products = rawMaterials.products || [];
        const glassItems = products.filter(p => 
            p.aluCategory === 'glass'
        );
        return glassItems;
    }, [rawMaterials]);

    // Unified Profiles list with stock
    const unifiedProfiles = React.useMemo(() => {
        const list = [];
        const seenCodes = new Set();

        // 1. From rawMaterials products (profiles) - priority as they have actual product codes
        const rawProds = rawMaterials.products || [];
        for (const p of rawProds) {
            if (p.aluCategory === 'profiles' || p.category === 'Aluminium Stock') {
                const code = (p.productCode || '').toUpperCase();
                if (code) seenCodes.add(code);
                const stockQty = stockQtyMap[p._id?.toString()] ?? stockQtyMap[code] ?? 0;
                list.push({
                    code: code || p.name,
                    actualCode: code,
                    description: p.name || 'Aluminium Profile',
                    series: p.aluSpecs?.series || '',
                    finish: p.aluSpecs?.finish || '',
                    stockQty,
                    unit: p.unitOfMeasure || 'Lengths'
                });
            }
        }

        // 2. From AluProfile master list - fallback
        for (const p of profiles) {
            const code = (p.profileCode || '').toUpperCase();
            if (code && !seenCodes.has(code)) {
                seenCodes.add(code);
                const stockQty = stockQtyMap[code] ?? 0;
                list.push({
                    code,
                    actualCode: code,
                    description: p.description || p.name || `Profile ${code}`,
                    series: p.supplier || '',
                    finish: '',
                    stockQty,
                    unit: 'Lengths'
                });
            }
        }

        return list;
    }, [rawMaterials, profiles, stockQtyMap]);

    // Unified Glass list with stock
    const unifiedGlass = React.useMemo(() => {
        const list = [];
        const seen = new Set();

        // From rawMaterials glass (priority - these have actual product codes)
        const rawProds = rawMaterials.products || [];
        for (const p of rawProds) {
            if (p.aluCategory === 'glass') {
                const name = p.name;
                const code = (p.productCode || '').toUpperCase();
                if (name && !seen.has(name.toLowerCase())) {
                    seen.add(name.toLowerCase());
                    const stockQty = stockQtyMap[p._id?.toString()] ?? stockQtyMap[code] ?? stockQtyMap[name.toUpperCase()] ?? 0;
                    list.push({
                        typeName: name,
                        glassCode: code,
                        thickness: p.aluSpecs?.thickness || '',
                        ratePerSqFt: p.basePrice || 0,
                        stockQty
                    });
                }
            }
        }

        // From AluGlass (fallback - these have typeName but no product code)
        for (const g of glass) {
            const name = g.typeName;
            const code = (name || '').replace(/\s+/g, '-').toUpperCase();
            if (name && !seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                const stockQty = stockQtyMap[name.toUpperCase()] ?? 0;
                list.push({
                    typeName: name,
                    glassCode: code,
                    thickness: g.thickness || '',
                    ratePerSqFt: g.ratePerSqFt || 0,
                    stockQty
                });
            }
        }

        return list;
    }, [rawMaterials, glass, stockQtyMap]);

    // Unified Accessories list with stock
    const unifiedAccessories = React.useMemo(() => {
        const list = [];
        const seen = new Set();

        // From rawMaterials accessories / hardware (priority - these have actual product codes)
        const rawProds = rawMaterials.products || [];
        for (const p of rawProds) {
            if (['accessories', 'hardware', 'gaskets'].includes(p.aluCategory)) {
                const code = (p.productCode || '').toUpperCase();
                if (code && !seen.has(code)) {
                    seen.add(code);
                    const stockQty = stockQtyMap[p._id?.toString()] ?? stockQtyMap[code] ?? 0;
                    list.push({
                        code,
                        actualCode: code,
                        name: p.name || `Accessory ${code}`,
                        brand: p.aluSpecs?.brand || '',
                        unit: p.unitOfMeasure || 'pcs',
                        stockQty
                    });
                }
            }
        }

        // From AluAccessory (fallback - these have code but may not be in raw materials)
        for (const a of accessories) {
            const code = (a.code || '').toUpperCase();
            if (code && !seen.has(code)) {
                seen.add(code);
                const stockQty = stockQtyMap[code] ?? 0;
                list.push({
                    code,
                    actualCode: code,
                    name: a.name || `Accessory ${code}`,
                    brand: a.brand || '',
                    unit: a.unit || 'pcs',
                    stockQty
                });
            }
        }

        return list;
    }, [rawMaterials, accessories, stockQtyMap]);

    const openAddEditModal = (item = null) => {
        setCurrentEdit(item);
        if (item) {
            setAppForm({
                type: item.type || 'Sliding Door',
                configuration: item.configuration || '',
                description: item.description || '',
                profileBOM: item.profileBOM?.length ? item.profileBOM : [{ profileCode: '', actualCode: '', description: '', quantityFormula: '', lengthFormula: '' }],
                glassBOM: item.glassBOM?.length ? item.glassBOM : [{ glassCode: '', quantityFormula: '', widthFormula: '', heightFormula: '', glassSheetLength: '8', base21ftPrice: 0 }],
                accessoryBOM: item.accessoryBOM?.length ? item.accessoryBOM : [{ accessoryCode: '', actualCode: '', quantityFormula: '' }],
                labourMethod: item.labourMethod || 'linear_feet',
                labourRate: item.labourRate || 0
            });
        } else {
            setAppForm({
                type: 'Sliding Door',
                configuration: '',
                description: '',
                profileBOM: [{ profileCode: '', actualCode: '', description: '', quantityFormula: '2', lengthFormula: 'W' }],
                glassBOM: [{ glassCode: '', quantityFormula: 'P', widthFormula: '[W - (70 x 4)] / 2', heightFormula: 'H - 100', glassSheetLength: '8', base21ftPrice: 0 }],
                accessoryBOM: [{ accessoryCode: 'ROLLER-01', actualCode: '', quantityFormula: '4 * P' }],
                labourMethod: 'linear_feet',
                labourRate: 150
            });
        }
        setIsOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!appForm.type || !appForm.configuration) {
            toast.error('Please enter Application Type and Configuration');
            return;
        }

        try {
            if (currentEdit) {
                await api.put(`/alu/applications/${currentEdit._id}`, appForm);
                toast.success('BOM Template updated successfully');
            } else {
                await api.post('/alu/applications', appForm);
                toast.success('BOM Template created successfully');
            }
            setIsOpen(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save BOM Template');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/alu/applications/${deletingId}`);
            toast.success('BOM Template deleted successfully');
            setDeletingId(null);
            fetchData();
        } catch (error) {
            toast.error('Failed to delete BOM Template');
        }
    };

    const filteredApplications = applications.filter(app => {
        const matchesSearch = 
            (app.type || '').toLowerCase().includes(search.toLowerCase()) ||
            (app.configuration || '').toLowerCase().includes(search.toLowerCase()) ||
            (app.description || '').toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'all' || app.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const uniqueTypes = Array.from(new Set(applications.map(a => a.type))).filter(Boolean);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Application BOM Templates</h1>
                    <p className="text-slate-500 mt-1">Configure formulas for profile cutting, glass sizing (e.g. <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-xs">[W - (70 x 4)] / 2</code>), accessories, and feet-based labor rates.</p>
                </div>
                <Button onClick={() => openAddEditModal()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition-all">
                    <Plus size={18} /> Add BOM Template
                </Button>
            </div>

            {/* Filter and Search Bar */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full sm:w-80">
                        <Search size={16} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search BOM by type, configuration..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm w-full"
                        />
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                            <option value="all">All Application Types</option>
                            {uniqueTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* List of BOM Templates */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredApplications.length === 0 ? (
                    <div className="py-16 text-center text-slate-500">
                        <Settings className="mx-auto text-slate-300 mb-2" size={48} />
                        <p className="font-semibold text-slate-700">No BOM Templates Found</p>
                        <p className="text-xs text-slate-400 mt-1">Click "Add BOM Template" to create window, door, and facade estimation formulas.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredApplications.map(app => (
                            <div key={app._id} className="p-5 hover:bg-slate-50/60 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2.5">
                                        <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-1 rounded-lg font-bold">
                                            {app.type}
                                        </span>
                                        <span className="font-extrabold text-slate-900 text-base font-sans">
                                            {app.configuration}
                                        </span>
                                    </div>
                                    {app.description && (
                                        <p className="text-xs text-slate-500">{app.description}</p>
                                    )}

                                    {/* BOM Breakdown Tags */}
                                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                                            📦 {app.profileBOM?.length || 0} Profile Cuts
                                        </span>
                                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-medium">
                                            🪟 {app.glassBOM?.length || 0} Glass Formulas
                                        </span>
                                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-medium">
                                            ⚙️ {app.accessoryBOM?.length || 0} Accessories
                                        </span>
                                        <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md font-semibold">
                                            🔨 Labor: {app.labourMethod === 'linear_feet' ? 'Per Running Foot' : app.labourMethod === 'sqft' ? 'Per Sq.Ft' : app.labourMethod} (Rs. {app.labourRate})
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end lg:self-center">
                                    <button
                                        onClick={() => openAddEditModal(app)}
                                        className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 px-3 py-2 rounded-xl transition"
                                    >
                                        <Edit size={14} /> Edit Formulas
                                    </button>
                                    <button
                                        onClick={() => setDeletingId(app._id)}
                                        className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition"
                                        title="Delete Template"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deletingId}
                title="Delete BOM Template"
                message="Are you sure you want to delete this BOM application template? Formulas associated with it will no longer be available for new quotations."
                onConfirm={handleDelete}
                onCancel={() => setDeletingId(null)}
            />

            {/* Add / Edit BOM Modal */}
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`${currentEdit ? 'Edit' : 'Add'} Application BOM Template`} size="lg">
                <form onSubmit={handleFormSubmit} className="space-y-5 max-h-[80vh] overflow-y-auto p-1">
                    {/* Live 2D CAD Elevation Generator */}
                    <div className="mb-2">
                        <Alu2DCadPreview
                            type={appForm.type}
                            configuration={appForm.configuration}
                            profileBOM={appForm.profileBOM}
                        />
                    </div>

                    {/* Basic Template Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Application Type <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={appForm.type}
                                onChange={e => {
                                    setAppForm({ ...appForm, type: e.target.value });
                                    setShowAppTypeSuggestions(true);
                                }}
                                onFocus={() => setShowAppTypeSuggestions(true)}
                                required
                                placeholder="e.g. Sliding Door, Casement Window"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
                            />
                            {showAppTypeSuggestions && (
                                <div 
                                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100"
                                    onMouseDown={e => e.preventDefault()}
                                >
                                    <div className="px-3 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                                        <span>Preset Application Types</span>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowAppTypeSuggestions(false)}
                                            className="text-slate-400 hover:text-slate-600"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                    {APPLICATION_TYPE_PRESETS.filter(t => t.toLowerCase().includes((appForm.type || '').toLowerCase())).map((t, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setAppForm({ ...appForm, type: t });
                                                setShowAppTypeSuggestions(false);
                                            }}
                                            className="px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer transition-colors font-medium text-slate-700"
                                        >
                                            {t}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Configuration <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={appForm.configuration}
                                onChange={e => setAppForm({ ...appForm, configuration: e.target.value })}
                                required
                                placeholder="e.g. 2 Panel, 3 Panel - 2 Track, 4 Panel"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description / Spec Notes</label>
                        <input
                            type="text"
                            value={appForm.description}
                            onChange={e => setAppForm({ ...appForm, description: e.target.value })}
                            placeholder="e.g. Heavy commercial series with interlocking weather bars"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
                        />
                    </div>

                    {/* Formula Tip & Auto-PO Notice Banner */}
                    <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-amber-50/50 border border-indigo-150 p-3.5 rounded-xl text-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                                <Sparkles size={15} className="text-indigo-600" />
                                Supported Formula Variables & Stock Auto-PO Integration
                            </div>
                            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Inventory Linked
                            </span>
                        </div>
                        <p className="text-indigo-800 leading-relaxed">
                            Variables: <code className="font-bold bg-white/80 px-1 py-0.5 rounded text-indigo-900">W</code> (Opening Width), <code className="font-bold bg-white/80 px-1 py-0.5 rounded text-indigo-900">H</code> (Opening Height), <code className="font-bold bg-white/80 px-1 py-0.5 rounded text-indigo-900">P</code> (Panels count), <code className="font-bold bg-white/80 px-1 py-0.5 rounded text-indigo-900">Q</code> (Quantity).
                        </p>
                        <p className="text-slate-700 bg-white/60 p-2 rounded-lg border border-indigo-100/70 flex items-start gap-2">
                            <ShoppingCart size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <span>
                                <strong>Raw Material Stock Suggestions & PO:</strong> Select from your warehouse stock or enter any new custom code. If an item is out of stock or custom, an <strong>Aluminium Purchase Order (PO)</strong> is automatically generated for procurement upon project order conversion.
                            </span>
                        </p>
                    </div>

                    {/* Profile BOM Cuts */}
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">1. Aluminium Profile BOM Formulas</label>
                                <span className="text-[11px] text-slate-500">Select raw material extrusions or type custom profile codes</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAppForm({ ...appForm, profileBOM: [...appForm.profileBOM, { profileCode: '', actualCode: '', description: '', quantityFormula: '2', lengthFormula: 'W' }] })}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                            >
                                + Add Profile Cut
                            </button>
                        </div>
                        {appForm.profileBOM.map((pb, idx) => {
                            const matchedProfile = unifiedProfiles.find(p => p.code.toUpperCase() === (pb.profileCode || '').trim().toUpperCase());
                            const filteredProfiles = unifiedProfiles.filter(p => {
                                const qCode = (pb.profileCode || '').trim().toLowerCase();
                                const qDesc = (pb.description || '').trim().toLowerCase();
                                if (!qCode && !qDesc) return true;
                                return (p.code || '').toLowerCase().includes(qCode) ||
                                       (p.description || '').toLowerCase().includes(qDesc) ||
                                       (p.series || '').toLowerCase().includes(qCode);
                            }).slice(0, 8);

                            return (
                                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 transition-all hover:border-indigo-200">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 relative">
                                        {/* Profile Code Input with Dropdown */}
                                        <div className="sm:col-span-3 relative">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Profile Code</label>
                                            <input
                                                type="text"
                                                maxLength={15}
                                                placeholder="Code (Max 15)"
                                                value={pb.profileCode}
                                                onFocus={() => {
                                                    setActiveProfileIdx(idx);
                                                    setActiveGlassIdx(null);
                                                    setActiveAccessoryIdx(null);
                                                }}
                                                onChange={e => {
                                                    const next = [...appForm.profileBOM];
                                                    next[idx].profileCode = e.target.value.toUpperCase();
                                                    // Auto-populate actual code when profile code changes
                                                    next[idx].actualCode = e.target.value.toUpperCase();
                                                    setActiveProfileIdx(idx);
                                                }}
                                                required
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase focus:outline-none focus:border-indigo-600 bg-white"
                                            />

                                            {/* Autocomplete Dropdown */}
                                            {activeProfileIdx === idx && filteredProfiles.length > 0 && (
                                                <div 
                                                    className="absolute z-50 left-0 right-0 sm:w-80 top-full mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100"
                                                    onMouseDown={e => e.preventDefault()}
                                                >
                                                    <div className="px-2.5 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                                                        <span>Raw Material Stock Profiles</span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setActiveProfileIdx(null)}
                                                            className="text-slate-400 hover:text-slate-600"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                    {filteredProfiles.map((p, pIdx) => (
                                                        <div
                                                            key={pIdx}
                                                            onClick={() => {
                                                                const next = [...appForm.profileBOM];
                                                                next[idx].profileCode = p.code;
                                                                // Use actual code from unified list
                                                                next[idx].actualCode = p.actualCode || p.code;
                                                                if (p.description) next[idx].description = p.description;
                                                                setAppForm({ ...appForm, profileBOM: next });
                                                                setActiveProfileIdx(null);
                                                            }}
                                                            className="p-2 text-xs hover:bg-indigo-50/80 cursor-pointer flex flex-col gap-0.5 transition-colors"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-mono font-bold text-indigo-700">{p.code}</span>
                                                                {p.actualCode && p.actualCode !== p.code && <span className="text-[10px] text-indigo-600 ml-1.5 font-mono">({p.actualCode})</span>}
                                                                {p.stockQty > 0 ? (
                                                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-1.5 py-0.2 rounded-full">
                                                                        ● {p.stockQty} {p.unit} in stock
                                                                    </span>
                                                                ) : (
                                                                    <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-1.5 py-0.2 rounded-full">
                                                                        0 in stock (Auto PO)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] text-slate-600 truncate">{p.description}</span>
                                                            {p.series && <span className="text-[10px] text-slate-400">Series / Supplier: {p.series}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actual Code */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Actual Code</label>
                                            <input
                                                type="text"
                                                placeholder="Actual Code (Auto)"
                                                value={pb.actualCode || ''}
                                                onChange={e => {
                                                    const next = [...appForm.profileBOM];
                                                    next[idx].actualCode = e.target.value.toUpperCase();
                                                    setAppForm({ ...appForm, profileBOM: next });
                                                }}
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase focus:outline-none focus:border-indigo-600 bg-white"
                                            />
                                        </div>

                                        {/* Description Input */}
                                        <div className="sm:col-span-4 relative">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Description</label>
                                            <input
                                                type="text"
                                                placeholder="Description (e.g. Outer Top)"
                                                value={pb.description}
                                                onFocus={() => {
                                                    setActiveProfileIdx(idx);
                                                    setActiveGlassIdx(null);
                                                    setActiveAccessoryIdx(null);
                                                }}
                                                onChange={e => {
                                                    const next = [...appForm.profileBOM];
                                                    next[idx].description = e.target.value;
                                                    setAppForm({ ...appForm, profileBOM: next });
                                                }}
                                                required
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-600 bg-white"
                                            />
                                        </div>

                                        {/* Quantity Formula */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Qty (2, 2*P)</label>
                                            <input
                                                type="text"
                                                placeholder="Qty (e.g. 2, 2*P)"
                                                value={pb.quantityFormula}
                                                onChange={e => {
                                                    const next = [...appForm.profileBOM];
                                                    next[idx].quantityFormula = e.target.value;
                                                    setAppForm({ ...appForm, profileBOM: next });
                                                }}
                                                required
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-600 bg-white"
                                            />
                                        </div>

                                        {/* Length Formula */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Length (W, H-50)</label>
                                            <input
                                                type="text"
                                                placeholder="Length (e.g. W, H-50)"
                                                value={pb.lengthFormula}
                                                onChange={e => {
                                                    const next = [...appForm.profileBOM];
                                                    next[idx].lengthFormula = e.target.value;
                                                    setAppForm({ ...appForm, profileBOM: next });
                                                }}
                                                required
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-600 bg-white"
                                            />
                                        </div>

                                        {/* Remove Button */}
                                        <div className="sm:col-span-1 flex items-end justify-center pb-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAppForm({ ...appForm, profileBOM: appForm.profileBOM.filter((_, i) => i !== idx) });
                                                    setActiveProfileIdx(null);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition"
                                                title="Remove profile cut"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Real-Time Stock Status Pill */}
                                    {pb.profileCode && (
                                        <div className="flex items-center gap-1.5 pt-0.5">
                                            {matchedProfile ? (
                                                matchedProfile.stockQty > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                                                        <CheckCircle2 size={12} className="text-emerald-600" />
                                                        Stock Available: <strong>{matchedProfile.stockQty} {matchedProfile.unit}</strong> in inventory
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                                                        <AlertCircle size={12} className="text-amber-600" />
                                                        0 in Stock — Shortage PO will be created automatically on project conversion
                                                    </span>
                                                )
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-medium">
                                                    <Sparkles size={12} className="text-indigo-600" />
                                                    Custom / Non-stock Code "{pb.profileCode}" — Will automatically generate PO when ordered
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Glass BOM */}
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">2. Glass Sizing Formulas</label>
                                <span className="text-[11px] text-slate-500">Configure glass thickness, clear/tinted types, and formulas</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAppForm({ ...appForm, glassBOM: [...appForm.glassBOM, { glassCode: '', quantityFormula: 'P', widthFormula: '[W - (70 x 4)] / 2', heightFormula: 'H - 100', glassSheetLength: '8', base21ftPrice: 0 }] })}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                            >
                                + Add Glass Sizing
                            </button>
                        </div>
                        {appForm.glassBOM.map((gb, idx) => {
                            return (
                                <div key={idx} className="p-3 bg-blue-50/40 border border-blue-150 rounded-xl space-y-2 transition-all hover:border-blue-300">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 relative">
                                        {/* Glass Code */}
                                        <div className="sm:col-span-4">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Glass Code</label>
                                            <select
                                                value={gb.glassCode || ''}
                                                onChange={e => {
                                                    const next = [...appForm.glassBOM];
                                                    next[idx].glassCode = e.target.value;
                                                    setAppForm({ ...appForm, glassBOM: next });
                                                }}
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase focus:outline-none focus:border-indigo-600 bg-white"
                                            >
                                                <option value="">Select Glass Code</option>
                                                {glassItemsFromRawMaterials.map(g => (
                                                    <option key={g._id} value={g.productCode}>
                                                        {g.productCode} - {g.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Qty Formula */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Qty (e.g. P)</label>
                                            <input
                                                type="text"
                                                placeholder="Qty (e.g. P)"
                                                value={gb.quantityFormula}
                                                onChange={e => {
                                                    const next = [...appForm.glassBOM];
                                                    next[idx].quantityFormula = e.target.value;
                                                    setAppForm({ ...appForm, glassBOM: next });
                                                }}
                                                required
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-600 bg-white"
                                            />
                                        </div>

                                        {/* Width Formula */}
                                        <div className="sm:col-span-3">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Width: [W-(70x4)]/2</label>
                                            <input
                                                type="text"
                                                placeholder="Width formula"
                                                value={gb.widthFormula}
                                                onChange={e => {
                                                    const next = [...appForm.glassBOM];
                                                    next[idx].widthFormula = e.target.value;
                                                    setAppForm({ ...appForm, glassBOM: next });
                                                }}
                                                required
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-600 bg-white"
                                            />
                                        </div>

                                        {/* Height Formula */}
                                        <div className="sm:col-span-3">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Height: H-100</label>
                                            <input
                                                type="text"
                                                placeholder="Height formula"
                                                value={gb.heightFormula}
                                                onChange={e => {
                                                    const next = [...appForm.glassBOM];
                                                    next[idx].heightFormula = e.target.value;
                                                    setAppForm({ ...appForm, glassBOM: next });
                                                }}
                                                required
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-600 bg-white"
                                            />
                                        </div>

                                        {/* Glass Sheet Length */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Sheet Length (ft)</label>
                                            <select
                                                value={gb.glassSheetLength || '8'}
                                                onChange={e => {
                                                    const next = [...appForm.glassBOM];
                                                    next[idx].glassSheetLength = e.target.value;
                                                    setAppForm({ ...appForm, glassBOM: next });
                                                }}
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-600 bg-white"
                                            >
                                                <option value="4">4 ft</option>
                                                <option value="7">7 ft</option>
                                                <option value="8">8 ft</option>
                                                <option value="14">14 ft</option>
                                                <option value="16">16 ft</option>
                                                <option value="21">21 ft</option>
                                            </select>
                                        </div>

                                        {/* Base 21ft Price */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Base 21ft Price</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="Base 21ft price"
                                                value={gb.base21ftPrice || 0}
                                                onChange={e => {
                                                    const next = [...appForm.glassBOM];
                                                    next[idx].base21ftPrice = e.target.value;
                                                    setAppForm({ ...appForm, glassBOM: next });
                                                }}
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-600 bg-white"
                                            />
                                        </div>

                                        {/* Remove Button */}
                                        <div className="sm:col-span-1 flex items-end justify-center pb-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAppForm({ ...appForm, glassBOM: appForm.glassBOM.filter((_, i) => i !== idx) });
                                                    setActiveGlassIdx(null);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition"
                                                title="Remove glass sizing"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Accessories BOM */}
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">3. Accessories & Hardware Formulas</label>
                                <span className="text-[11px] text-slate-500">Rollers, touch locks, weather strips, gaskets & fasteners</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAppForm({ ...appForm, accessoryBOM: [...appForm.accessoryBOM, { accessoryCode: '', actualCode: '', quantityFormula: '4 * P' }] })}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                            >
                                + Add Accessory
                            </button>
                        </div>
                        {appForm.accessoryBOM.map((ab, idx) => {
                            const matchedAccessory = unifiedAccessories.find(a => a.code.toUpperCase() === (ab.accessoryCode || '').trim().toUpperCase());
                            const filteredAccessories = unifiedAccessories.filter(a => {
                                const q = (ab.accessoryCode || '').trim().toLowerCase();
                                if (!q) return true;
                                return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
                            }).slice(0, 8);

                            return (
                                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 transition-all hover:border-indigo-200">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 relative">
                                        {/* Accessory Code with Autocomplete */}
                                        <div className="sm:col-span-6 relative">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Accessory Code (Max 15)</label>
                                            <input
                                                type="text"
                                                maxLength={15}
                                                placeholder="Accessory Code (e.g. ROLLER-01)"
                                                value={ab.accessoryCode}
                                                onFocus={() => {
                                                    setActiveAccessoryIdx(idx);
                                                    setActiveProfileIdx(null);
                                                    setActiveGlassIdx(null);
                                                }}
                                                onChange={e => {
                                                    const next = [...appForm.accessoryBOM];
                                                    next[idx].accessoryCode = e.target.value.toUpperCase();
                                                    // Auto-populate actual code when accessory code changes
                                                    next[idx].actualCode = e.target.value.toUpperCase();
                                                    setAppForm({ ...appForm, accessoryBOM: next });
                                                    setActiveAccessoryIdx(idx);
                                                }}
                                                required
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase focus:outline-none focus:border-indigo-600 bg-white"
                                            />

                                            {/* Autocomplete Dropdown */}
                                            {activeAccessoryIdx === idx && filteredAccessories.length > 0 && (
                                                <div 
                                                    className="absolute z-50 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100"
                                                    onMouseDown={e => e.preventDefault()}
                                                >
                                                    <div className="px-2.5 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                                                        <span>Raw Material Hardware & Accessories</span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setActiveAccessoryIdx(null)}
                                                            className="text-slate-400 hover:text-slate-600"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                    {filteredAccessories.map((a, aIdx) => (
                                                        <div
                                                            key={aIdx}
                                                            onClick={() => {
                                                                const next = [...appForm.accessoryBOM];
                                                                next[idx].accessoryCode = a.code;
                                                                // Use actual code from unified list
                                                                next[idx].actualCode = a.actualCode || a.code;
                                                                setAppForm({ ...appForm, accessoryBOM: next });
                                                                setActiveAccessoryIdx(null);
                                                            }}
                                                            className="p-2 text-xs hover:bg-indigo-50/80 cursor-pointer flex items-center justify-between transition-colors"
                                                        >
                                                            <div>
                                                                <span className="font-mono font-bold text-indigo-700">{a.code}</span>
                                                                {a.actualCode && a.actualCode !== a.code && <span className="text-[10px] text-indigo-600 ml-1.5 font-mono">({a.actualCode})</span>}
                                                                <span className="text-slate-600 ml-2">{a.name}</span>
                                                            </div>
                                                            {a.stockQty > 0 ? (
                                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-1.5 py-0.2 rounded-full">
                                                                    ● {a.stockQty} {a.unit} in stock
                                                                </span>
                                                            ) : (
                                                                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-1.5 py-0.2 rounded-full">
                                                                    0 in stock (Auto PO)
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actual Code */}
                                        <div className="sm:col-span-3">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Actual Code</label>
                                            <input
                                                type="text"
                                                placeholder="Actual Code (Auto)"
                                                value={ab.actualCode || ''}
                                                onChange={e => {
                                                    const next = [...appForm.accessoryBOM];
                                                    next[idx].actualCode = e.target.value.toUpperCase();
                                                    setAppForm({ ...appForm, accessoryBOM: next });
                                                }}
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase focus:outline-none focus:border-indigo-600 bg-white"
                                            />
                                        </div>

                                        {/* Quantity Formula */}
                                        <div className="sm:col-span-5">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Qty Formula (4 * P, 2 * Q)</label>
                                            <input
                                                type="text"
                                                placeholder="Qty Formula (e.g. 4 * P, 2 * Q)"
                                                value={ab.quantityFormula}
                                                onChange={e => {
                                                    const next = [...appForm.accessoryBOM];
                                                    next[idx].quantityFormula = e.target.value;
                                                    setAppForm({ ...appForm, accessoryBOM: next });
                                                }}
                                                required
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-600 bg-white"
                                            />
                                        </div>

                                        {/* Remove Button */}
                                        <div className="sm:col-span-1 flex items-end justify-center pb-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAppForm({ ...appForm, accessoryBOM: appForm.accessoryBOM.filter((_, i) => i !== idx) });
                                                    setActiveAccessoryIdx(null);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition"
                                                title="Remove accessory"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stock Indicator */}
                                    {ab.accessoryCode && (
                                        <div className="flex items-center gap-1.5 pt-0.5">
                                            {matchedAccessory ? (
                                                matchedAccessory.stockQty > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                                                        <CheckCircle2 size={12} className="text-emerald-600" />
                                                        Stock Available: <strong>{matchedAccessory.stockQty} {matchedAccessory.unit}</strong> in inventory
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                                                        <AlertCircle size={12} className="text-amber-600" />
                                                        0 in Stock — Shortage PO will be created automatically on project conversion
                                                    </span>
                                                )
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-medium">
                                                    <Sparkles size={12} className="text-indigo-600" />
                                                    Custom / Non-stock Code "{ab.accessoryCode}" — Auto PO on order
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Labour Configuration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Labour Charge Method</label>
                            <select
                                value={appForm.labourMethod}
                                onChange={e => setAppForm({ ...appForm, labourMethod: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600 bg-white"
                            >
                                <option value="linear_feet">Per Linear Foot (Running Feet / Perimeter)</option>
                                <option value="sqft">Per Square Foot (Sq.Ft Area)</option>
                                <option value="opening">Per Opening / Unit</option>
                                <option value="sqm">Per Square Meter (Sq.M Area)</option>
                                <option value="fixed">Fixed Project Labor Cost</option>
                                <option value="percentage">% of Total Material Cost</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Labour Rate (LKR or %)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={appForm.labourRate}
                                onChange={e => setAppForm({ ...appForm, labourRate: Number(e.target.value) })}
                                required
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            <Save size={16} className="mr-1.5" /> Save BOM Template
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
