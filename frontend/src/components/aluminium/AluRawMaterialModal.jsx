import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import {
    Layers, Tag, Wrench, Shield, Plus, Save, Trash2,
    Building2, Check, Hash, Info, DollarSign, Package,
    Boxes, Sparkles, X, ChevronDown, Wand2
} from 'lucide-react';

const CATEGORIES = [
    { id: 'profiles', label: 'Profiles', prefix: 'PRF-', defaultUnit: 'Lengths' },
    { id: 'glass', label: 'Glass', prefix: 'GLS-', defaultUnit: 'Sq.Ft' },
    { id: 'accessories', label: 'Accessories', prefix: 'ACC-', defaultUnit: 'Nos' },
    { id: 'hardware', label: 'Hardware', prefix: 'HRD-', defaultUnit: 'Nos' },
    { id: 'gaskets', label: 'Gaskets', prefix: 'GSK-', defaultUnit: 'Rolls' },
];

const UNIT_OPTIONS = [
    { value: 'Lengths', label: 'Lengths (6m / 20ft Bar)' },
    { value: 'Sq.Ft', label: 'Sq.Ft (Square Feet)' },
    { value: 'Sq.M', label: 'Sq.M (Square Meter)' },
    { value: 'Nos', label: 'Nos / Pcs (Units)' },
    { value: 'Kg', label: 'Kg (Kilograms)' },
    { value: 'Meters', label: 'Meters (Running Length)' },
    { value: 'Rolls', label: 'Rolls (Coils)' },
];

// Comprehensive Standard Suggestions for 1-click Auto-fill
const SERIES_SUGGESTIONS = [
    'Swisstek 100mm Commercial Sliding',
    'Swisstek 70mm Residential Sliding',
    'Swisstek 45mm Casement System',
    'Swisstek 100mm Double Glazed Sliding',
    'Alumex 100mm Sliding Window',
    'Alumex 45mm Casement System',
    'Alumex 70mm Sliding System',
    'Alumex Curtain Wall System',
    'Kinlong 100mm Heavy Duty Sliding',
    'Lanka Aluminium 80mm Sliding'
];

const FINISH_SUGGESTIONS = [
    'Powder Coated White (RAL 9016)',
    'Powder Coated Matt Black (RAL 9005)',
    'Powder Coated Charcoal Grey (RAL 7016)',
    'Powder Coated Dark Bronze',
    'Anodized Natural Silver (NA)',
    'Anodized Champagne Bronze',
    'Wood Finish Golden Teak',
    'Wood Finish Dark Mahogany',
    'Mill Finish (Raw)'
];

const SUPPLIER_SUGGESTIONS = [
    'Swisstek Aluminium',
    'Alumex PLC',
    'Kinlong Hardware',
    'Asoka Glass & Mirror',
    'St. Anthony\'s Hardware',
    'Lanka Aluminium PLC'
];

const STANDARD_PRODUCT_PRESETS = [
    // Profiles
    { category: 'profiles', name: '100mm 2-Track Outer Bottom Frame', code: 'PRF-SW100-BOT', unit: 'Lengths', cost: 1600, thickness: '1.2mm' },
    { category: 'profiles', name: '100mm 2-Track Outer Top Frame', code: 'PRF-SW100-TOP', unit: 'Lengths', cost: 1550, thickness: '1.2mm' },
    { category: 'profiles', name: '100mm 2-Track Outer Side Jamb', code: 'PRF-SW100-SID', unit: 'Lengths', cost: 1500, thickness: '1.2mm' },
    { category: 'profiles', name: '100mm Sliding Window Sash Profile', code: 'PRF-SW100-SSH', unit: 'Lengths', cost: 1700, thickness: '1.2mm' },
    { category: 'profiles', name: '100mm Sliding Interlock Profile', code: 'PRF-SW100-INT', unit: 'Lengths', cost: 1450, thickness: '1.2mm' },
    { category: 'profiles', name: '45mm Casement Outer Frame', code: 'PRF-CS45-OUT', unit: 'Lengths', cost: 1850, thickness: '1.2mm' },
    { category: 'profiles', name: '45mm Casement Sash Frame', code: 'PRF-CS45-SSH', unit: 'Lengths', cost: 1950, thickness: '1.2mm' },
    { category: 'profiles', name: 'Single Glazed Snap-in Bead 5mm', code: 'PRF-BEAD-05', unit: 'Lengths', cost: 650, thickness: '1.0mm' },
    { category: 'profiles', name: 'Double Glazed Snap-in Bead 12mm', code: 'PRF-BEAD-12', unit: 'Lengths', cost: 750, thickness: '1.0mm' },
    // Glass
    { category: 'glass', name: '5mm Clear Float Glass Sheet', code: 'GLS-CLR-05', unit: 'Sq.Ft', cost: 220, thickness: '5mm' },
    { category: 'glass', name: '6mm Clear Tempered Glass Sheet', code: 'GLS-TMP-06', unit: 'Sq.Ft', cost: 380, thickness: '6mm' },
    { category: 'glass', name: '8mm Clear Tempered Glass Sheet', code: 'GLS-TMP-08', unit: 'Sq.Ft', cost: 480, thickness: '8mm' },
    { category: 'glass', name: '5mm Tinted Grey Float Glass Sheet', code: 'GLS-GRY-05', unit: 'Sq.Ft', cost: 260, thickness: '5mm' },
    { category: 'glass', name: '6mm Tinted Bronze Float Glass Sheet', code: 'GLS-BRZ-06', unit: 'Sq.Ft', cost: 390, thickness: '6mm' },
    // Accessories
    { category: 'accessories', name: 'Sliding Window Heavy Duty Roller (Bearing)', code: 'ACC-ROL-HD', unit: 'Nos', cost: 450, thickness: '-' },
    { category: 'accessories', name: 'Sliding Window Double Roller (Brass Wheel)', code: 'ACC-ROL-DBL', unit: 'Nos', cost: 650, thickness: '-' },
    { category: 'accessories', name: 'Anti-Lift Buffer Block Set', code: 'ACC-BUF-01', unit: 'Nos', cost: 75, thickness: '-' },
    { category: 'accessories', name: 'Water Drainage Cap (Plastic)', code: 'ACC-WDR-CAP', unit: 'Nos', cost: 45, thickness: '-' },
    // Hardware
    { category: 'hardware', name: 'Crescent Sliding Window Lock (White/Black)', code: 'HRD-LCK-CRS', unit: 'Nos', cost: 550, thickness: '-' },
    { category: 'hardware', name: 'Touch Latch Auto Flush Lock', code: 'HRD-LCK-TCH', unit: 'Nos', cost: 850, thickness: '-' },
    { category: 'hardware', name: 'Multi-Point Lock Handle (Keyed)', code: 'HRD-HND-MLT', unit: 'Nos', cost: 2400, thickness: '-' },
    { category: 'hardware', name: 'Friction Stay Hinge 12 Inch (SS 304)', code: 'HRD-HNG-12SS', unit: 'Nos', cost: 1200, thickness: '-' },
    { category: 'hardware', name: 'Casement Cockspur Handle', code: 'HRD-HND-CSM', unit: 'Nos', cost: 750, thickness: '-' },
    // Gaskets
    { category: 'gaskets', name: 'EPDM Wedge Glazing Gasket 5mm (Coil)', code: 'GSK-EPDM-05', unit: 'Rolls', cost: 3200, thickness: '5mm' },
    { category: 'gaskets', name: 'Wool Pile Weatherstrip 7x6mm (Fin Type)', code: 'GSK-WPL-0706', unit: 'Rolls', cost: 2800, thickness: '7x6mm' },
    { category: 'gaskets', name: 'Neutral Cure Silicone Sealant (Black/Clear)', code: 'GSK-SIL-300ML', unit: 'Nos', cost: 750, thickness: '-' },
];

export default function AluRawMaterialModal({ isOpen, onClose, onSuccess, warehouses: propWarehouses = [] }) {
    const [loading, setLoading] = useState(false);
    const [warehouses, setWarehouses] = useState(propWarehouses);

    // Common header settings for the batch
    const [commonSettings, setCommonSettings] = useState({
        warehouseId: '',
        series: 'Swisstek 100mm Commercial Sliding',
        finish: 'Powder Coated White (RAL 9016)',
        supplierName: 'Swisstek Aluminium'
    });

    // Multi-product rows
    const [items, setItems] = useState([
        {
            aluCategory: 'profiles',
            productCode: 'PRF-SW100-BOT',
            name: '100mm 2-Track Outer Bottom Frame',
            unitOfMeasure: 'Lengths',
            quantity: 10,
            purchaseCost: 1600,
            thickness: '1.2mm',
        },
        {
            aluCategory: 'profiles',
            productCode: 'PRF-SW100-SSH',
            name: '100mm Sliding Window Sash Profile',
            unitOfMeasure: 'Lengths',
            quantity: 10,
            purchaseCost: 1700,
            thickness: '1.2mm',
        }
    ]);

    useEffect(() => {
        if (propWarehouses && propWarehouses.length > 0) {
            setWarehouses(propWarehouses);
            if (!commonSettings.warehouseId) {
                setCommonSettings(prev => ({ ...prev, warehouseId: propWarehouses[0]._id }));
            }
        }
    }, [propWarehouses]);

    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const { data } = await api.get('/warehouses');
                const whList = data.data || [];
                if (whList.length > 0) {
                    setWarehouses(whList);
                    if (!commonSettings.warehouseId) {
                        setCommonSettings(prev => ({ ...prev, warehouseId: whList[0]._id }));
                    }
                }
            } catch (err) {
                console.error('Failed to load warehouses:', err);
            }
        };

        if (isOpen && warehouses.length === 0) {
            fetchWarehouses();
        }
    }, [isOpen, warehouses.length]);

    const handleCategoryChange = (idx, catId) => {
        const cat = CATEGORIES.find(c => c.id === catId);
        const next = [...items];
        next[idx] = {
            ...next[idx],
            aluCategory: catId,
            productCode: `${cat?.prefix || 'ALU-'}${Date.now().toString().slice(-4)}`,
            unitOfMeasure: cat?.defaultUnit || 'Lengths'
        };
        setItems(next);
    };

    const updateItem = (idx, field, value) => {
        const next = [...items];
        next[idx] = { ...next[idx], [field]: value };
        setItems(next);
    };

    // Auto-fill entire row when user selects or types matching standard preset name
    const handleProductNameChange = (idx, nameValue) => {
        const matched = STANDARD_PRODUCT_PRESETS.find(
            p => p.name.toLowerCase() === nameValue.toLowerCase()
        );

        const next = [...items];
        if (matched) {
            next[idx] = {
                ...next[idx],
                name: matched.name,
                productCode: matched.code,
                aluCategory: matched.category,
                unitOfMeasure: matched.unit,
                purchaseCost: matched.cost,
                thickness: matched.thickness || next[idx].thickness,
            };
            toast.success(`Auto-filled: ${matched.name} (${matched.code})`, { id: `preset-${idx}` });
        } else {
            next[idx] = { ...next[idx], name: nameValue };
        }
        setItems(next);
    };

    const addRow = () => {
        setItems(prev => [
            ...prev,
            {
                aluCategory: 'profiles',
                productCode: `PRF-${Date.now().toString().slice(-4)}`,
                name: '',
                unitOfMeasure: 'Lengths',
                quantity: 10,
                purchaseCost: 1500,
                thickness: '1.2mm',
            }
        ]);
    };

    const removeRow = (idx) => {
        if (items.length <= 1) return;
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const totalBatchValuation = items.reduce((sum, it) => {
        return sum + ((Number(it.quantity) || 0) * (Number(it.purchaseCost) || 0));
    }, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate all rows
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const code = (it.productCode || '').trim().toUpperCase();
            if (!code) {
                toast.error(`Row #${i + 1}: Item Code is required`);
                return;
            }
            if (code.length > 15) {
                toast.error(`Row #${i + 1}: Item Code "${code}" cannot exceed 15 characters`);
                return;
            }
            if (!it.name || !it.name.trim()) {
                toast.error(`Row #${i + 1}: Material name is required`);
                return;
            }
        }

        setLoading(true);
        try {
            const targetWarehouseId = commonSettings.warehouseId || (warehouses[0]?._id);
            const payload = {
                warehouseId: targetWarehouseId,
                items: items.map(it => ({
                    aluCategory: it.aluCategory,
                    productCode: it.productCode.trim().toUpperCase(),
                    name: it.name.trim(),
                    unitOfMeasure: it.unitOfMeasure,
                    openingStockQuantity: Number(it.quantity) || 0,
                    purchaseCost: Number(it.purchaseCost) || 0,
                    warehouseId: targetWarehouseId,
                    supplierName: commonSettings.supplierName,
                    specs: {
                        series: commonSettings.series,
                        finish: commonSettings.finish,
                        thickness: it.thickness || '1.2mm',
                        brand: commonSettings.supplierName,
                    }
                }))
            };

            const { data } = await api.post('/alu/raw-materials', payload);
            toast.success(data.message || `Successfully created ${items.length} materials with stock!`);
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create materials');
        } finally {
            setLoading(false);
        }
    };

    const warehouseOptions = warehouses.length > 0
        ? warehouses
        : [{ _id: 'wh-main', name: 'Fabrication Main Warehouse', warehouseCode: 'WH-MAIN' }];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add AluEco Raw Materials & Initial Stock" size="2xl">
            {/* HTML5 Datalists for Universal Instant Autocomplete */}
            <datalist id="series-suggestions">
                {SERIES_SUGGESTIONS.map((s, i) => <option key={i} value={s} />)}
            </datalist>

            <datalist id="finish-suggestions">
                {FINISH_SUGGESTIONS.map((f, i) => <option key={i} value={f} />)}
            </datalist>

            <datalist id="supplier-suggestions">
                {SUPPLIER_SUGGESTIONS.map((sp, i) => <option key={i} value={sp} />)}
            </datalist>

            <datalist id="product-name-suggestions">
                {STANDARD_PRODUCT_PRESETS.map((p, i) => (
                    <option key={i} value={p.name}>
                        {p.code} - {p.category.toUpperCase()} (Rs. {p.cost})
                    </option>
                ))}
            </datalist>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                
                {/* 1. Common Batch Settings Header with Auto-Suggestions */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold">1</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Destination Warehouse & Aluminium System Settings
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                            <Wand2 size={12} /> Auto-Suggest Enabled
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Destination Warehouse <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={commonSettings.warehouseId || warehouseOptions[0]?._id || ''}
                                onChange={e => setCommonSettings({ ...commonSettings, warehouseId: e.target.value })}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm cursor-pointer"
                            >
                                {warehouseOptions.map(w => (
                                    <option key={w._id} value={w._id}>
                                        {w.name} ({w.warehouseCode || 'WH'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Series / Aluminium System
                            </label>
                            <input
                                type="text"
                                list="series-suggestions"
                                value={commonSettings.series}
                                onChange={e => setCommonSettings({ ...commonSettings, series: e.target.value })}
                                placeholder="Type or select Series..."
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                            />
                            {/* Quick Select Pill */}
                            <div className="flex gap-1 mt-1 overflow-x-auto py-0.5">
                                {['Swisstek 100mm', 'Alumex 100mm', 'Swisstek 45mm'].map((pill, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setCommonSettings({ ...commonSettings, series: pill })}
                                        className="text-[10px] font-medium bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer whitespace-nowrap"
                                    >
                                        + {pill}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Color / Surface Finish
                            </label>
                            <input
                                type="text"
                                list="finish-suggestions"
                                value={commonSettings.finish}
                                onChange={e => setCommonSettings({ ...commonSettings, finish: e.target.value })}
                                placeholder="Type or select Color..."
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                            />
                            {/* Quick Select Pill */}
                            <div className="flex gap-1 mt-1 overflow-x-auto py-0.5">
                                {['White', 'Matt Black', 'Natural Silver'].map((pill, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setCommonSettings({ ...commonSettings, finish: pill })}
                                        className="text-[10px] font-medium bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer whitespace-nowrap"
                                    >
                                        + {pill}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Extruder / Supplier Brand
                            </label>
                            <input
                                type="text"
                                list="supplier-suggestions"
                                value={commonSettings.supplierName}
                                onChange={e => setCommonSettings({ ...commonSettings, supplierName: e.target.value })}
                                placeholder="Type or select Supplier..."
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                            />
                            {/* Quick Select Pill */}
                            <div className="flex gap-1 mt-1 overflow-x-auto py-0.5">
                                {['Swisstek', 'Alumex', 'Kinlong'].map((pill, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setCommonSettings({ ...commonSettings, supplierName: pill })}
                                        className="text-[10px] font-medium bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer whitespace-nowrap"
                                    >
                                        + {pill}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Multiple Products Entry Table / Cards */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold">2</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Aluminium Products & Stock Quantities ({items.length} Items)
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={addRow}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-200 transition shadow-sm hover:scale-[1.02] cursor-pointer"
                        >
                            <Plus size={15} /> + Add Another Product
                        </button>
                    </div>

                    <div className="space-y-3">
                        {items.map((it, idx) => {
                            const lineTotal = (Number(it.quantity) || 0) * (Number(it.purchaseCost) || 0);

                            return (
                                <div key={idx} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 transition space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 font-mono text-slate-700 text-xs font-bold">
                                                #{idx + 1}
                                            </span>
                                            {/* Category Pill Selectors */}
                                            <div className="flex items-center gap-1">
                                                {CATEGORIES.map(c => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => handleCategoryChange(idx, c.id)}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                                            it.aluCategory === c.id
                                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                        }`}
                                                    >
                                                        {c.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-semibold text-slate-500">
                                                Line Valuation: <strong className="text-emerald-700">Rs. {lineTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong>
                                            </span>
                                            {items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(idx)}
                                                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
                                                    title="Remove Row"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inputs Row */}
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                                        {/* Name with Auto-Suggest Datalist */}
                                        <div className="sm:col-span-5">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-0.5">
                                                <span>PRODUCT NAME / SPEC *</span>
                                                <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                                                    <Sparkles size={10} /> Auto-Fills Code & Unit
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                list="product-name-suggestions"
                                                value={it.name}
                                                onChange={e => handleProductNameChange(idx, e.target.value)}
                                                required
                                                placeholder="Type or select Material preset..."
                                                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            />
                                        </div>

                                        {/* Code */}
                                        <div className="sm:col-span-2">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-0.5">
                                                <span>CODE *</span>
                                                <span className={it.productCode.length > 15 ? 'text-rose-600' : 'text-slate-400'}>
                                                    {it.productCode.length}/15
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                maxLength={15}
                                                value={it.productCode}
                                                onChange={e => updateItem(idx, 'productCode', e.target.value.toUpperCase())}
                                                required
                                                placeholder="PRF-..."
                                                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            />
                                        </div>

                                        {/* Stock Qty */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-emerald-800 mb-0.5">STOCK QTY *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={it.quantity}
                                                onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                                required
                                                placeholder="10"
                                                className="w-full bg-emerald-50/60 focus:bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            />
                                        </div>

                                        {/* Unit */}
                                        <div className="sm:col-span-1">
                                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">UNIT</label>
                                            <select
                                                value={it.unitOfMeasure}
                                                onChange={e => updateItem(idx, 'unitOfMeasure', e.target.value)}
                                                className="w-full bg-white border border-slate-300 rounded-xl px-1.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                                            >
                                                {UNIT_OPTIONS.map(u => (
                                                    <option key={u.value} value={u.value}>{u.value}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Unit Cost */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">UNIT COST (LKR)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={it.purchaseCost}
                                                onChange={e => updateItem(idx, 'purchaseCost', Number(e.target.value))}
                                                placeholder="0.00"
                                                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Batch Summary Bar */}
                <div className="p-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-6">
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Products</span>
                            <strong className="text-base font-extrabold text-slate-900">{items.length} Items</strong>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Quantity</span>
                            <strong className="text-base font-extrabold text-indigo-700">{totalQuantity} Units</strong>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Initial Valuation</span>
                        <strong className="text-lg font-black text-emerald-700">
                            Rs. {totalBatchValuation.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </strong>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition shadow-sm cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 cursor-pointer"
                    >
                        <Save size={16} />
                        {loading ? 'Saving All Products...' : `Save All ${items.length} Products & Create Stock`}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
