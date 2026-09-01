import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
    ShoppingCart, Plus, Search, Filter, RefreshCw, CheckCircle2, Clock,
    AlertTriangle, Layers, ArrowUpRight, PackageCheck, Eye, Trash2, Edit2,
    ChevronDown, ChevronUp, FileSpreadsheet, Tag, Building2, User, Save
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import AluGrnModal from '../components/aluminium/AluGrnModal';

const MATERIAL_TYPES = [
    { value: 'profile', label: 'Aluminium Profile (Bar)' },
    { value: 'glass', label: 'Glass Sheet / Cut (SqFt)' },
    { value: 'accessory', label: 'Accessory / Fitting (Pcs/Sets)' },
    { value: 'hardware', label: 'Hardware & Fasteners' },
    { value: 'raw_material', label: 'Raw Material' },
    { value: 'other', label: 'Other Consumables' },
];

const UOM_OPTIONS = [
    { value: 'bar', label: 'Bar (bar)' },
    { value: 'sqft', label: 'Square Feet (sqft)' },
    { value: 'sqm', label: 'Square Meter (sqm)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'set', label: 'Set (set)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'm', label: 'Meters (m)' },
    { value: 'roll', label: 'Roll (roll)' },
    { value: 'pack', label: 'Pack (pack)' },
];

function MaterialAutocompleteInput({ value, placeholder, onChange, onSelectSuggestion, masterMaterials, fieldType = 'code', maxLength = 50 }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState(value || '');
    const containerRef = useRef(null);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const suggestions = useMemo(() => {
        if (!query || query.trim().length < 1) return masterMaterials.slice(0, 8);
        const q = query.toLowerCase().trim();
        return masterMaterials.filter(m =>
            (m.code || '').toLowerCase().includes(q) ||
            (m.name || '').toLowerCase().includes(q) ||
            (m.brand || '').toLowerCase().includes(q)
        ).slice(0, 10);
    }, [query, masterMaterials]);

    return (
        <div ref={containerRef} className="relative w-full">
            <input
                type="text"
                maxLength={maxLength}
                placeholder={placeholder}
                value={query}
                onFocus={() => setIsOpen(true)}
                onChange={(e) => {
                    const val = fieldType === 'code' ? e.target.value.toUpperCase() : e.target.value;
                    setQuery(val);
                    onChange(val);
                    setIsOpen(true);
                }}
                className={`w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs ${fieldType === 'code' ? 'font-mono uppercase' : ''} focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs`}
                required
            />

            {isOpen && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    <div className="px-2.5 py-1 text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50 sticky top-0 border-b border-slate-100">
                        Suggested Master Materials ({suggestions.length})
                    </div>
                    {suggestions.map((s, idx) => (
                        <div
                            key={idx}
                            onClick={() => {
                                onSelectSuggestion(s);
                                setIsOpen(false);
                            }}
                            className="p-2 hover:bg-indigo-50/70 cursor-pointer flex items-center justify-between gap-2 transition text-xs select-none"
                        >
                            <div className="truncate">
                                <span className="font-extrabold text-indigo-700 font-mono block">{s.code}</span>
                                <span className="text-slate-700 font-semibold truncate block text-[11px]">{s.name}</span>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider shrink-0 ${s.type === 'profile' ? 'bg-blue-100 text-blue-800' : s.type === 'glass' ? 'bg-teal-100 text-teal-800' : s.type === 'accessory' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'}`}>
                                {s.type}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AluPurchaseOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalPendingOrders: 0,
        totalPartiallyReceived: 0,
        totalFulfilled: 0,
        totalPendingItemCount: 0,
        totalShortageValue: 0
    });
    const [suppliers, setSuppliers] = useState([]);
    const [masterMaterials, setMasterMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMasterMaterials = async () => {
            try {
                const [profRes, glassRes, accRes, rawRes] = await Promise.all([
                    api.get('/alu/profiles').catch(() => ({ data: { data: [] } })),
                    api.get('/alu/glass').catch(() => ({ data: { data: [] } })),
                    api.get('/alu/accessories').catch(() => ({ data: { data: [] } })),
                    api.get('/alu/raw-materials').catch(() => ({ data: { data: [] } })),
                ]);

                const profiles = (profRes.data?.data || []).map(p => ({
                    code: p.profileCode,
                    name: p.description,
                    type: 'profile',
                    unit: 'bar',
                    cost: p.standardLengths?.[0]?.price || 0,
                    brand: p.supplier || ''
                }));

                const glass = (glassRes.data?.data || []).map(g => ({
                    code: (g.typeName || 'GLASS').replace(/\s+/g, '-').toUpperCase(),
                    name: `${g.typeName} (${g.thickness})`,
                    type: 'glass',
                    unit: 'sqft',
                    cost: g.ratePerSqFt || 0,
                    brand: ''
                }));

                const accessories = (accRes.data?.data || []).map(a => ({
                    code: a.code,
                    name: `${a.name}${a.brand ? ` (${a.brand})` : ''}`,
                    type: 'accessory',
                    unit: a.unit || 'pcs',
                    cost: 0,
                    brand: a.brand || ''
                }));

                const raws = (rawRes.data?.data?.products || rawRes.data?.data || []).map(r => ({
                    code: r.productCode || r.sku || r.name,
                    name: r.name,
                    type: 'raw_material',
                    unit: r.unitOfMeasure || 'pcs',
                    cost: r.costPrice || 0,
                    brand: ''
                }));

                // Prioritize raw materials with actual new-format codes
                setMasterMaterials([...raws, ...profiles, ...glass, ...accessories]);
            } catch (err) {
                console.error('Failed to load master materials for autocomplete:', err);
            }
        };

        fetchMasterMaterials();
    }, []);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sourceTypeFilter, setSourceTypeFilter] = useState('all');
    const [expandedRows, setExpandedRows] = useState({});

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSingleItemModalOpen, setIsSingleItemModalOpen] = useState(false);
    const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
    const [targetPoId, setTargetPoId] = useState(null);
    const [selectedPoForGrn, setSelectedPoForGrn] = useState(null);
    const [selectedItemForGrn, setSelectedItemForGrn] = useState(null);

    // Form for Single Item
    const [itemForm, setItemForm] = useState({
        itemCode: '',
        productName: '',
        materialType: 'profile',
        requiredQuantity: 1,
        unitOfMeasure: 'bar',
        estimatedUnitCost: 0,
        supplierId: '',
        notes: '',
    });

    // Form for Full PO
    const [poForm, setPoForm] = useState({
        projectName: '',
        customerName: '',
        priority: 'normal',
        expectedDate: '',
        notes: '',
        items: [{
            itemCode: '',
            productName: '',
            materialType: 'profile',
            requiredQuantity: 1,
            unitOfMeasure: 'bar',
            estimatedUnitCost: 0,
            supplierId: '',
            notes: ''
        }]
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (sourceTypeFilter !== 'all') params.sourceType = sourceTypeFilter;
            if (search) params.search = search;

            const [ordersRes, statsRes, supRes] = await Promise.all([
                api.get('/alu/purchase-orders', { params }),
                api.get('/alu/purchase-orders/summary-stats'),
                api.get('/suppliers')
            ]);

            setOrders(ordersRes.data.data || []);
            setStats(statsRes.data.data || {});
            setSuppliers(supRes.data.data || []);
        } catch (err) {
            console.error('Failed to load AluEco POs:', err);
            toast.error('Failed to load AluEco purchase orders');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, sourceTypeFilter, search]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleOpenItemGrnModal = (po, item) => {
        setSelectedPoForGrn(po);
        setSelectedItemForGrn(item);
        setIsGrnModalOpen(true);
    };

    // Handle single item submit
    const handleSingleItemSubmit = async (e) => {
        e.preventDefault();
        if (!itemForm.itemCode || !itemForm.productName || !itemForm.requiredQuantity) {
            toast.error('Please enter Item Code, Name and Quantity');
            return;
        }
        if (itemForm.itemCode.trim().length > 50) {
            toast.error('Item Code cannot exceed 50 characters');
            return;
        }

        try {
            await api.post('/alu/purchase-orders/manual-item', {
                ...itemForm,
                itemCode: itemForm.itemCode.trim().toUpperCase(),
                requiredQuantity: Number(itemForm.requiredQuantity),
                estimatedUnitCost: Number(itemForm.estimatedUnitCost || 0),
                poId: targetPoId
            });
            toast.success('Item added to AluEco PO successfully');
            setIsSingleItemModalOpen(false);
            setTargetPoId(null);
            setItemForm({
                itemCode: '',
                productName: '',
                materialType: 'profile',
                requiredQuantity: 1,
                unitOfMeasure: 'bar',
                estimatedUnitCost: 0,
                supplierId: '',
                notes: '',
            });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add item');
        }
    };

    // Handle Full PO create
    const handleFullPoSubmit = async (e) => {
        e.preventDefault();
        if (!poForm.projectName.trim()) {
            toast.error('Please enter a Project Name');
            return;
        }
        if (poForm.items.length === 0) {
            toast.error('At least one item is required');
            return;
        }

        for (const it of poForm.items) {
            if (!it.itemCode || !it.productName || !it.requiredQuantity) {
                toast.error('All items must have Item Code, Name and Quantity');
                return;
            }
            if (it.itemCode.trim().length > 50) {
                toast.error(`Item Code "${it.itemCode}" exceeds 50 characters`);
                return;
            }
        }

        try {
            await api.post('/alu/purchase-orders', {
                ...poForm,
                items: poForm.items.map(it => ({
                    ...it,
                    itemCode: it.itemCode.trim().toUpperCase(),
                    requiredQuantity: Number(it.requiredQuantity),
                    estimatedUnitCost: Number(it.estimatedUnitCost || 0),
                    supplierId: it.supplierId && it.supplierId !== '' ? it.supplierId : null
                }))
            });
            toast.success('AluEco PO created successfully');
            setIsAddModalOpen(false);
            setPoForm({
                projectName: '',
                customerName: '',
                priority: 'normal',
                expectedDate: '',
                notes: '',
                items: [{
                    itemCode: '',
                    productName: '',
                    materialType: 'profile',
                    requiredQuantity: 1,
                    unitOfMeasure: 'bar',
                    estimatedUnitCost: 0,
                    supplierId: '',
                    notes: ''
                }]
            });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create PO');
        }
    };

    const addPoFormItemRow = () => {
        setPoForm(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    itemCode: '',
                    productName: '',
                    materialType: 'profile',
                    requiredQuantity: 1,
                    unitOfMeasure: 'bar',
                    estimatedUnitCost: 0,
                    supplierId: '',
                    notes: ''
                }
            ]
        }));
    };

    const removePoFormItemRow = (idx) => {
        if (poForm.items.length <= 1) return;
        setPoForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx)
        }));
    };

    const updatePoFormItem = (idx, field, value) => {
        setPoForm(prev => {
            const next = [...prev.items];
            next[idx] = { ...next[idx], [field]: value };
            return { ...prev, items: next };
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge variant="warning"><Clock size={12} className="mr-1 inline" /> Pending Stock</Badge>;
            case 'partially_received':
                return <Badge variant="info"><PackageCheck size={12} className="mr-1 inline" /> Partially Received</Badge>;
            case 'fulfilled':
                return <Badge variant="success"><CheckCircle2 size={12} className="mr-1 inline" /> Fulfilled</Badge>;
            case 'cancelled':
                return <Badge variant="danger">Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="AluEco PO & Material Requisitions"
                description="Manage material shortage purchase orders, track needed profiles/glass/accessories, and monitor auto-fulfillment upon GRN"
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => { setTargetPoId(null); setIsSingleItemModalOpen(true); }}>
                            <Plus size={16} className="mr-1.5" />
                            Add Shortage Item
                        </Button>
                    </div>
                }
            />

            {/* Top Stat Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 flex items-center justify-between border-l-4 border-l-amber-500 bg-white">
                    <div>
                        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1">Pending Requisitions</span>
                        <span className="text-2xl font-extrabold text-amber-600">{stats.totalPendingOrders || 0} Orders</span>
                        <span className="text-xs text-gray-500 block mt-0.5">{stats.totalPendingItemCount || 0} items needed</span>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                        <AlertTriangle size={24} />
                    </div>
                </Card>

                <Card className="p-4 flex items-center justify-between border-l-4 border-l-blue-500 bg-white">
                    <div>
                        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1">Partially Received</span>
                        <span className="text-2xl font-extrabold text-blue-600">{stats.totalPartiallyReceived || 0} Orders</span>
                        <span className="text-xs text-gray-500 block mt-0.5">In-transit / partial GRN</span>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <PackageCheck size={24} />
                    </div>
                </Card>

                <Card className="p-4 flex items-center justify-between border-l-4 border-l-emerald-500 bg-white">
                    <div>
                        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1">Fulfilled via GRN</span>
                        <span className="text-2xl font-extrabold text-emerald-600">{stats.totalFulfilled || 0} Orders</span>
                        <span className="text-xs text-gray-500 block mt-0.5">Ready for production</span>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                        <CheckCircle2 size={24} />
                    </div>
                </Card>

                <Card className="p-4 flex items-center justify-between border-l-4 border-l-indigo-500 bg-white">
                    <div>
                        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1">Total Shortage Value</span>
                        <span className="text-2xl font-extrabold text-indigo-700">Rs. {(stats.totalShortageValue || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                        <span className="text-xs text-gray-500 block mt-0.5">Estimated procurement cost</span>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                        <ShoppingCart size={24} />
                    </div>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-4">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 w-full sm:w-80">
                        <Search size={16} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search PO, project, code or item..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm w-full"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending Stock</option>
                            <option value="partially_received">Partially Received</option>
                            <option value="fulfilled">Fulfilled</option>
                        </select>

                        <select
                            value={sourceTypeFilter}
                            onChange={(e) => setSourceTypeFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="all">All Requisition Sources</option>
                            <option value="quotation_shortage">Quotation Shortage (Auto)</option>
                            <option value="manual_entry">Manual Requisitions</option>
                        </select>

                        <button
                            onClick={fetchData}
                            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                            title="Refresh"
                        >
                            <RefreshCw size={16} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-gray-500">Loading AluEco purchase orders...</div>
                ) : orders.length === 0 ? (
                    <EmptyState
                        icon={ShoppingCart}
                        title="No AluEco Purchase Orders Found"
                        description="When quotations are converted with material shortages, they will automatically appear here. You can also manually add requisition items."
                    />
                ) : (
                    <div className="space-y-4">
                        {orders.map((po) => {
                            const isExpanded = !!expandedRows[po._id];
                            const pendingItemsCount = (po.items || []).filter(i => (i.pendingQuantity || 0) > 0).length;

                            return (
                                <div key={po._id} className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm transition hover:shadow-md">
                                    {/* PO Header Bar */}
                                    <div className="p-4 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-150">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => toggleRow(po._id)}
                                                className="p-1 rounded-lg hover:bg-gray-200 text-gray-600 transition"
                                            >
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </button>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-base text-gray-900 font-mono">{po.poNumber}</span>
                                                    {getStatusBadge(po.status)}
                                                    {po.sourceType === 'quotation_shortage' && (
                                                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                                            Project Shortage
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                                                    <span className="font-semibold text-gray-700">Project: {po.projectName || 'General Material PO'}</span>
                                                    {po.customerName && <span>• Client: {po.customerName}</span>}
                                                    {po.salesOrderId && <span>• Order: <span className="font-mono">{po.salesOrderId?.orderNumber}</span></span>}
                                                    <span>• Date: {new Date(po.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 self-end md:self-auto">
                                            <div className="text-right">
                                                <span className="text-xs text-gray-500 block">Est. Shortage Value</span>
                                                <span className="font-bold text-gray-900 text-sm">Rs. {(po.totalEstimatedCost || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                                            </div>

                                            {(po.status === 'pending' || po.status === 'partially_received') && (
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedPoForGrn(po);
                                                        setIsGrnModalOpen(true);
                                                    }}
                                                >
                                                    <PackageCheck size={14} className="mr-1" />
                                                    Add GRN
                                                </Button>
                                            )}

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setTargetPoId(po._id);
                                                    setIsSingleItemModalOpen(true);
                                                }}
                                            >
                                                <Plus size={14} className="mr-1" />
                                                Add Item
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="p-4">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                                    <tr>
                                                        <th className="py-2.5 px-3">Item Code</th>
                                                        <th className="py-2.5 px-3">Material Name & Type</th>
                                                        <th className="py-2.5 px-3 text-center">Required Qty</th>
                                                        <th className="py-2.5 px-3 text-center">Received via GRN</th>
                                                        <th className="py-2.5 px-3 text-center">Pending Qty</th>
                                                        <th className="py-2.5 px-3">Est. Unit Cost</th>
                                                        <th className="py-2.5 px-3">Est. Total</th>
                                                        <th className="py-2.5 px-3">Status</th>
                                                        <th className="py-2.5 px-3 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {po.items.map((item, idx) => {
                                                        const isItemFulfilled = (item.pendingQuantity || 0) === 0;
                                                        return (
                                                            <tr key={idx} className={isItemFulfilled ? 'bg-emerald-50/40' : 'hover:bg-gray-50/70'}>
                                                                <td className="py-2.5 px-3">
                                                                    <span className="font-mono text-xs font-bold bg-gray-100 text-gray-800 px-2 py-1 rounded border border-gray-200">
                                                                        {item.itemCode}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2.5 px-3">
                                                                    <span className="font-medium text-gray-900 block">{item.productName}</span>
                                                                    <span className="text-gray-400 text-xs capitalize">{item.materialType}</span>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center font-bold text-gray-800">
                                                                    {item.requiredQuantity} {item.unitOfMeasure}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                                                                    {item.receivedQuantity || 0} {item.unitOfMeasure}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center font-bold text-amber-600">
                                                                    {item.pendingQuantity || 0} {item.unitOfMeasure}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-gray-700">
                                                                    Rs. {(item.estimatedUnitCost || 0).toFixed(2)}
                                                                </td>
                                                                <td className="py-2.5 px-3 font-semibold text-gray-900">
                                                                    Rs. {(item.estimatedTotalCost || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td className="py-2.5 px-3">
                                                                    {getStatusBadge(item.status)}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center">
                                                                    {(item.pendingQuantity > 0) && (
                                                                        <Button
                                                                            variant="success"
                                                                            size="sm"
                                                                            onClick={() => handleOpenItemGrnModal(po, item)}
                                                                        >
                                                                            <PackageCheck size={12} className="mr-1" />
                                                                            GRN
                                                                        </Button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Modal: AluEco GRN */}
            <AluGrnModal
                isOpen={isGrnModalOpen}
                onClose={() => {
                    setIsGrnModalOpen(false);
                    setSelectedPoForGrn(null);
                    setSelectedItemForGrn(null);
                }}
                onSuccess={fetchData}
                selectedPo={selectedPoForGrn}
                prefillItem={selectedItemForGrn}
            />

            {/* Modal: Add Manual Shortage Item */}
            <Modal
                isOpen={isSingleItemModalOpen}
                onClose={() => setIsSingleItemModalOpen(false)}
                title={targetPoId ? `Add Shortage Item to Requisition` : `New AluEco Material Shortage Requisition`}
            >
                <form onSubmit={handleSingleItemSubmit} className="space-y-4 px-1 py-1">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-4 relative">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Item Code <span className="text-rose-500">*</span>
                                </label>
                                <span className={`text-[10px] font-mono font-bold ${itemForm.itemCode.length > 50 ? 'text-rose-600' : 'text-slate-400'}`}>
                                    {itemForm.itemCode.length}/50
                                </span>
                            </div>
                            <MaterialAutocompleteInput
                                value={itemForm.itemCode}
                                placeholder="Search / Type Code..."
                                fieldType="code"
                                maxLength={50}
                                masterMaterials={masterMaterials}
                                onChange={(val) => setItemForm(prev => ({ ...prev, itemCode: val }))}
                                onSelectSuggestion={(s) => setItemForm(prev => ({
                                    ...prev,
                                    itemCode: s.code,
                                    productName: s.name,
                                    materialType: s.type,
                                    unitOfMeasure: s.unit || prev.unitOfMeasure,
                                    estimatedUnitCost: s.cost || prev.estimatedUnitCost
                                }))}
                            />
                        </div>

                        <div className="sm:col-span-8 relative">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                Material Name / Specification <span className="text-rose-500">*</span>
                            </label>
                            <MaterialAutocompleteInput
                                value={itemForm.productName}
                                placeholder="e.g. Swisstek 100mm 2-Track Outer Bottom Frame"
                                fieldType="name"
                                maxLength={200}
                                masterMaterials={masterMaterials}
                                onChange={(val) => setItemForm(prev => ({ ...prev, productName: val }))}
                                onSelectSuggestion={(s) => setItemForm(prev => ({
                                    ...prev,
                                    itemCode: s.code,
                                    productName: s.name,
                                    materialType: s.type,
                                    unitOfMeasure: s.unit || prev.unitOfMeasure,
                                    estimatedUnitCost: s.cost || prev.estimatedUnitCost
                                }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                Shortage Qty <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={itemForm.requiredQuantity}
                                onChange={(e) => setItemForm({ ...itemForm, requiredQuantity: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                Unit of Measure
                            </label>
                            <select
                                value={itemForm.unitOfMeasure}
                                onChange={(e) => setItemForm({ ...itemForm, unitOfMeasure: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                            >
                                {UOM_OPTIONS.map(u => (
                                    <option key={u.value} value={u.value}>{u.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                Est. Unit Cost (LKR)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rs.</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={itemForm.estimatedUnitCost}
                                    onChange={(e) => setItemForm({ ...itemForm, estimatedUnitCost: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Preferred Supplier (Optional)
                        </label>
                        <select
                            value={itemForm.supplierId}
                            onChange={(e) => setItemForm({ ...itemForm, supplierId: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                        >
                            <option value="">None / Open Market Procurement</option>
                            {suppliers.map(s => (
                                <option key={s._id} value={s._id}>{s.displayName || s.companyName}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Requisition Notes</label>
                        <textarea
                            rows={2}
                            value={itemForm.notes}
                            onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                            placeholder="e.g. Urgent shortage needed before glass delivery date"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => setIsSingleItemModalOpen(false)}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            <Save size={16} /> Save Shortage Item
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Create Full Alu PO */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Create Dedicated AluEco Purchase Order"
                size="lg"
            >
                <form onSubmit={handleFullPoSubmit} className="space-y-4 px-1 py-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                Project / Requisition Title <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={poForm.projectName}
                                onChange={(e) => setPoForm({ ...poForm, projectName: e.target.value })}
                                placeholder="e.g. Swisstek Aluminium Window Extrusion Procurement"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Priority Level</label>
                            <select
                                value={poForm.priority}
                                onChange={(e) => setPoForm({ ...poForm, priority: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                            >
                                <option value="normal">Normal Priority</option>
                                <option value="high">High Priority</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Aluminium Materials List</span>
                            <button
                                type="button"
                                onClick={addPoFormItemRow}
                                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg shadow-sm transition hover:scale-[1.02]"
                            >
                                <Plus size={14} /> Add Row
                            </button>
                        </div>

                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                            {poForm.items.map((it, idx) => (
                                <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-600">Material Line #{idx + 1}</span>
                                        {poForm.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removePoFormItemRow(idx)}
                                                className="text-rose-500 hover:text-rose-700 text-xs font-semibold"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                        <div className="sm:col-span-4 relative">
                                            <MaterialAutocompleteInput
                                                value={it.itemCode}
                                                placeholder="Search Code..."
                                                fieldType="code"
                                                maxLength={50}
                                                masterMaterials={masterMaterials}
                                                onChange={(val) => updatePoFormItem(idx, 'itemCode', val)}
                                                onSelectSuggestion={(s) => {
                                                    updatePoFormItem(idx, 'itemCode', s.code);
                                                    updatePoFormItem(idx, 'productName', s.name);
                                                    updatePoFormItem(idx, 'materialType', s.type);
                                                    updatePoFormItem(idx, 'unitOfMeasure', s.unit || it.unitOfMeasure);
                                                    if (s.cost) updatePoFormItem(idx, 'estimatedUnitCost', s.cost);
                                                }}
                                            />
                                        </div>

                                        <div className="sm:col-span-4 relative">
                                            <MaterialAutocompleteInput
                                                value={it.productName}
                                                placeholder="Search Specification / Name..."
                                                fieldType="name"
                                                maxLength={200}
                                                masterMaterials={masterMaterials}
                                                onChange={(val) => updatePoFormItem(idx, 'productName', val)}
                                                onSelectSuggestion={(s) => {
                                                    updatePoFormItem(idx, 'itemCode', s.code);
                                                    updatePoFormItem(idx, 'productName', s.name);
                                                    updatePoFormItem(idx, 'materialType', s.type);
                                                    updatePoFormItem(idx, 'unitOfMeasure', s.unit || it.unitOfMeasure);
                                                    if (s.cost) updatePoFormItem(idx, 'estimatedUnitCost', s.cost);
                                                }}
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                placeholder="Qty"
                                                value={it.requiredQuantity}
                                                onChange={(e) => updatePoFormItem(idx, 'requiredQuantity', e.target.value)}
                                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-indigo-700 focus:outline-none focus:bg-white"
                                                required
                                            />
                                        </div>

                                        <div className="sm:col-span-3">
                                            <select
                                                value={it.unitOfMeasure}
                                                onChange={(e) => updatePoFormItem(idx, 'unitOfMeasure', e.target.value)}
                                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:bg-white"
                                            >
                                                {UOM_OPTIONS.map(u => (
                                                    <option key={u.value} value={u.value}>{u.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            <Save size={16} /> Create AluEco Purchase Order
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
