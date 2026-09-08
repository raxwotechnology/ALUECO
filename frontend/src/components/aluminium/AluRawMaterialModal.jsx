import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import {
    Layers, Tag, Wrench, Shield, Plus, Save, Trash2,
    Building2, Check, Hash, Info, DollarSign, Package,
    Boxes, Sparkles, X, ChevronDown
} from 'lucide-react';

const UNIT_OPTIONS = [
    { value: 'Lengths', label: 'Lengths (6m / 20ft Bar)' },
    { value: 'Sq.Ft', label: 'Sq.Ft (Square Feet)' },
    { value: 'Sq.M', label: 'Sq.M (Square Meter)' },
    { value: 'Nos', label: 'Nos / Pcs (Units)' },
    { value: 'Kg', label: 'Kg (Kilograms)' },
    { value: 'Meters', label: 'Meters (Running Length)' },
    { value: 'Rolls', label: 'Rolls (Coils)' },
    { value: 'Ft', label: 'Ft (Feet)' },
];

const TYPE_OPTIONS = [
    { value: 'AP', label: 'Aluminium Profile' },
    { value: 'AC', label: 'Accessories' },
    { value: 'GL', label: 'Glass' },
    { value: 'HW', label: 'Hardware' },
    { value: 'GS', label: 'Gaskets' },
];

const STANDARD_LENGTH_OPTIONS = [
    { value: '12', label: '12 ft', isCuttable: false, cutLengths: [] },
    { value: '18', label: '18 ft', isCuttable: false, cutLengths: [] },
    { value: '20', label: '20 ft', isCuttable: true, cutLengths: ['10'] },
    { value: '21', label: '21 ft', isCuttable: true, cutLengths: ['7', '8', '14', '16'] },
];

const CUTTING_CHARGE_PERCENTAGE = 5;





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



const CATEGORY_TO_TYPE = {
    profiles: 'AP',
    glass: 'GL',
    accessories: 'AC',
    hardware: 'HW',
    gaskets: 'GS',
};

const DEFAULT_CREATE_ITEMS = [
    {
        productCode: '',
        name: '100mm 2-Track Outer Bottom Frame',
        unitOfMeasure: 'Lengths',
        quantity: 10,
        purchaseCost: 1600,
        type: '',
        profile: '',
        colour: '',
        length: '',
        width: '',
        height: '',
        side: '',
        description: '',
        standardLength: '',
        cutLength: '',
        fullBarPrice: '',
    },
    {
        productCode: '',
        name: '100mm Sliding Window Sash Profile',
        unitOfMeasure: 'Lengths',
        quantity: 10,
        purchaseCost: 1700,
        type: '',
        profile: '',
        colour: '',
        length: '',
        width: '',
        height: '',
        side: '',
        description: '',
        standardLength: '',
        cutLength: '',
        fullBarPrice: '',
    }
];

export default function AluRawMaterialModal({ isOpen, onClose, onSuccess, warehouses: propWarehouses = [], editProduct = null }) {
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
    const [items, setItems] = useState(DEFAULT_CREATE_ITEMS);

    const isEditMode = Boolean(editProduct?._id);

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

    useEffect(() => {
        if (!isOpen) return;

        if (editProduct?._id) {
            console.log('Loading edit product data:', editProduct);
            const specs = editProduct.aluSpecs || {};
            const isAluminiumProfile = specs.type === 'AP' || editProduct.aluCategory === 'profiles';
            
            // Convert length from mm to feet for Aluminium Profile
            const lengthInFeet = isAluminiumProfile && specs.length ? mmToFeet(specs.length) : (specs.length || '');
            
            setCommonSettings({
                warehouseId: propWarehouses[0]?._id || warehouses[0]?._id || '',
                series: specs.series || 'Swisstek 100mm Commercial Sliding',
                finish: specs.finish || 'Powder Coated White (RAL 9016)',
                supplierName: specs.brand || 'Swisstek Aluminium'
            });
            setItems([{
                productCode: editProduct.productCode || '',
                name: editProduct.name || '',
                unitOfMeasure: editProduct.unitOfMeasure || 'Lengths',
                quantity: 0,
                purchaseCost: editProduct.costs?.lastPurchaseCost || editProduct.basePrice || 0,
                type: specs.type || CATEGORY_TO_TYPE[editProduct.aluCategory] || '',
                profile: specs.profile || '',
                colour: specs.colour || '',
                length: lengthInFeet,
                width: specs.width || '',
                height: specs.height || '',
                side: specs.side || '',
                description: specs.description || '',
                // Load profile pricing fields - preserve actual values including 0
                standardLength: specs.standardLength !== undefined && specs.standardLength !== null ? specs.standardLength.toString() : '',
                cutLength: specs.cutLength !== undefined && specs.cutLength !== null ? specs.cutLength.toString() : '',
                fullBarPrice: specs.fullBarPrice !== undefined && specs.fullBarPrice !== null ? specs.fullBarPrice.toString() : '',
            }]);
        } else {
            setCommonSettings({
                series: 'Swisstek 100mm Commercial Sliding',
                finish: 'Powder Coated White (RAL 9016)',
                supplierName: 'Swisstek Aluminium'
            });
            setItems(DEFAULT_CREATE_ITEMS);
        }
    }, [isOpen, editProduct, propWarehouses, warehouses, isEditMode]);

    // Conversion helpers
    const feetToMm = (feet) => {
        const numFeet = parseFloat(feet);
        if (isNaN(numFeet)) return '';
        // Use more precise conversion: 1 foot = 304.8 mm exactly
        return Math.round(numFeet * 304.8).toString();
    };

    const mmToFeet = (mm) => {
        const numMm = parseFloat(mm);
        if (isNaN(numMm)) return '';
        // Use more precise conversion: 1 mm = 0.00328084 feet
        return (numMm / 304.8).toFixed(2);
    };

    // Price calculation for Aluminium Profiles
    const calculateProfilePrice = (item) => {
        if (item.type !== 'AP' || !item.standardLength) {
            return { price: item.purchaseCost || 0, calculation: '', breakdown: null };
        }

        const standardLength = parseFloat(item.standardLength);
        const fullBarPrice = parseFloat(item.fullBarPrice);

        console.log('calculateProfilePrice - standardLength:', standardLength, 'fullBarPrice:', fullBarPrice);

        // Check if values are valid numbers (not NaN, not null, not undefined, not empty string)
        // Allow fullBarPrice to be 0, but standardLength must be positive
        if (isNaN(standardLength) || standardLength <= 0 || item.fullBarPrice === '' || isNaN(fullBarPrice) || fullBarPrice < 0) {
            console.log('Price calculation failed validation');
            return { price: item.purchaseCost || 0, calculation: '', breakdown: null };
        }

        const standardLengthConfig = STANDARD_LENGTH_OPTIONS.find(sl => sl.value === item.standardLength);
        
        if (!standardLengthConfig.isCuttable) {
            // Non-cuttable profiles (12ft, 18ft) - use standard price directly
            return {
                price: fullBarPrice,
                calculation: 'Standard Price (No Cutting)',
                breakdown: {
                    fullBarPrice,
                    pricePerFt: fullBarPrice / standardLength,
                    cuttingCharge: 0,
                    formula: 'Standard Supplier Length'
                }
            };
        }

        // Cuttable profiles (20ft, 21ft)
        const cutLength = parseFloat(item.cutLength);
        if (isNaN(cutLength) || cutLength <= 0) {
            return { price: item.purchaseCost || 0, calculation: '', breakdown: null };
        }

        const pricePerFt = fullBarPrice / standardLength;
        const basePrice = pricePerFt * cutLength;
        const cuttingCharge = basePrice * (CUTTING_CHARGE_PERCENTAGE / 100);
        const finalPrice = basePrice + cuttingCharge;

        return {
            price: finalPrice,
            calculation: `(${fullBarPrice} ÷ ${standardLength}) × ${cutLength} × 105%`,
            breakdown: {
                fullBarPrice,
                pricePerFt,
                cuttingCharge: CUTTING_CHARGE_PERCENTAGE,
                formula: `(${fullBarPrice} ÷ ${standardLength}) × ${cutLength} × 1.05`
            }
        };
    };

    const generateProductCode = (item) => {
        // Type code (AP, AC, GL, HW, GS)
        const typeCode = (item.type || '').toUpperCase();
        
        // Profile - full word, no spaces, uppercase
        const profileCode = (item.profile || '').replace(/\s+/g, '').toUpperCase();
        
        // Colour - full word, no spaces, uppercase
        const colourCode = (item.colour || '').replace(/\s+/g, '').toUpperCase();
        
        // Side - full word, no spaces, uppercase
        const sideCode = (item.side || '').replace(/\s+/g, '').toUpperCase();
        
        // Extract length - use cut length for AP profiles, regular length for others
        let length = '';
        if (typeCode === 'AP') {
            // For aluminium profiles, use cut length if available, otherwise use standard length
            const lengthValue = item.cutLength || item.standardLength || item.length || '';
            // Use feet value directly for product code (remove decimal point for code)
            length = lengthValue.toString().replace(/[^0-9]/g, '');
        } else {
            // Use as-is for other types (already in mm)
            length = (item.length || '').replace(/[^0-9]/g, '');
        }
        
        // Extract width and height for Glass/Accessories
        const width = (item.width || '').replace(/[^0-9]/g, '');
        const height = (item.height || '').replace(/[^0-9]/g, '');
        
        // Build the code based on type
        // For profiles: Type + Profile + Colour + Side + Length
        // For glass/accessories: Type + Profile + Colour + Side + Width + Height
        if (typeCode === 'GL' || typeCode === 'AC') {
            const parts = [typeCode, profileCode, colourCode, sideCode, width, height];
            return parts.filter(part => part !== '').join('');
        } else {
            const parts = [typeCode, profileCode, colourCode, sideCode, length];
            return parts.filter(part => part !== '').join('');
        }
    };

    const updateItem = (idx, field, value) => {
        const next = [...items];
        const currentItem = next[idx];
        const previousType = currentItem.type;
        
        // Handle type change for length conversion
        if (field === 'type') {
            const newType = value;
            const oldType = previousType;
            
            // Convert length when switching between AP and other types
            if (oldType === 'AP' && newType !== 'AP' && currentItem.length) {
                // Convert from feet to mm
                const convertedLength = feetToMm(currentItem.length);
                if (convertedLength) {
                    currentItem.length = convertedLength;
                }
            } else if (oldType !== 'AP' && newType === 'AP' && currentItem.length) {
                // Convert from mm to feet
                const convertedLength = mmToFeet(currentItem.length);
                if (convertedLength) {
                    currentItem.length = convertedLength;
                }
            }
            
            // Reset profile-specific fields when changing type (only in create mode)
            if (newType !== 'AP' && !isEditMode) {
                currentItem.standardLength = '';
                currentItem.cutLength = '';
                currentItem.fullBarPrice = '';
            }
        }
        
        next[idx] = { ...currentItem, [field]: value };
        
        // Auto-calculate price for Aluminium Profiles when relevant fields change
        if (field === 'standardLength' || field === 'cutLength' || field === 'fullBarPrice') {
            if (next[idx].type === 'AP') {
                console.log('Calculating price for field:', field, 'with value:', value);
                console.log('Current item:', next[idx]);
                const priceCalc = calculateProfilePrice(next[idx]);
                console.log('Price calculation result:', priceCalc);
                next[idx].purchaseCost = priceCalc.price;
                console.log('Updated purchaseCost:', next[idx].purchaseCost);
            }
        }
        
        // Auto-generate product code when relevant fields change (only in create mode)
        if (!isEditMode && ['type', 'profile', 'colour', 'length', 'side', 'width', 'height', 'standardLength', 'cutLength'].includes(field)) {
            next[idx].productCode = generateProductCode(next[idx]);
        }
        
        setItems(next);
    };





    const addRow = () => {
        setItems(prev => [
            ...prev,
            {
                productCode: '',
                name: '',
                unitOfMeasure: 'Lengths',
                quantity: 10,
                purchaseCost: 1500,
                type: '',
                profile: '',
                colour: '',
                length: '',
                width: '',
                height: '',
                side: '',
                description: '',
                standardLength: '',
                cutLength: '',
                fullBarPrice: '',
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

        console.log('=== Form submission started ===');
        console.log('Is edit mode:', isEditMode);
        console.log('Current items:', items);
        console.log('Common settings:', commonSettings);

        // Validate all rows
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            // Only validate type in create mode, not edit mode
            if (!isEditMode && !it.type) {
                toast.error(`Row #${i + 1}: Type is required`);
                return;
            }
            if (!it.name || !it.name.trim()) {
                toast.error(`Row #${i + 1}: Material name is required`);
                return;
            }
            // Validate type-specific fields for AP profiles (only in create mode)
            if (!isEditMode && it.type === 'AP' && !it.standardLength) {
                toast.error(`Row #${i + 1}: Standard Length is required for Aluminium Profiles`);
                return;
            }
            if (!isEditMode && it.type === 'AP' && (it.fullBarPrice === '' || it.fullBarPrice === null || it.fullBarPrice === undefined)) {
                toast.error(`Row #${i + 1}: Full Bar Price is required for Aluminium Profiles`);
                return;
            }
            // Validate cut length for cuttable profiles (only in create mode)
            if (!isEditMode && it.type === 'AP' && it.standardLength) {
                const isCuttable = STANDARD_LENGTH_OPTIONS.find(sl => sl.value === it.standardLength)?.isCuttable;
                if (isCuttable && !it.cutLength) {
                    toast.error(`Row #${i + 1}: Cut Length is required for this Standard Length`);
                    return;
                }
            }
        }

        setLoading(true);
        try {
            const typeToCategory = {
                'AP': 'profiles',
                'GL': 'glass',
                'AC': 'accessories',
                'HW': 'hardware',
                'GS': 'gaskets'
            };

            if (isEditMode) {
                const it = items[0];
                const isAluminiumProfile = it.type === 'AP';
                
                // Convert length from feet to mm for Aluminium Profile
                const lengthInMm = isAluminiumProfile && it.length ? feetToMm(it.length) : (it.length || '');
                
                const payload = {
                    productCode: it.productCode?.trim().toUpperCase() || '',
                    name: it.name.trim(),
                    unitOfMeasure: it.unitOfMeasure,
                    basePrice: Number(it.purchaseCost) || 0,
                    costs: {
                        lastPurchaseCost: Number(it.purchaseCost) || 0,
                        standardCost: Number(it.purchaseCost) || 0,
                        averageCost: Number(it.purchaseCost) || 0,
                    },
                    aluCategory: typeToCategory[it.type] || editProduct.aluCategory || 'profiles',
                    aluSpecs: {
                        series: commonSettings.series,
                        finish: commonSettings.finish,
                        brand: commonSettings.supplierName,
                        type: it.type || editProduct.aluSpecs?.type || '',
                        profile: it.profile || editProduct.aluSpecs?.profile || '',
                        colour: it.colour || editProduct.aluSpecs?.colour || '',
                        length: lengthInMm,
                        width: it.width || editProduct.aluSpecs?.width || '',
                        height: it.height || editProduct.aluSpecs?.height || '',
                        side: it.side || editProduct.aluSpecs?.side || '',
                        description: it.description || editProduct.aluSpecs?.description || '',
                        // Add profile pricing fields
                        standardLength: it.standardLength !== undefined && it.standardLength !== null && it.standardLength !== '' ? it.standardLength : (editProduct.aluSpecs?.standardLength || ''),
                        cutLength: it.cutLength !== undefined && it.cutLength !== null && it.cutLength !== '' ? it.cutLength : (editProduct.aluSpecs?.cutLength || ''),
                        fullBarPrice: it.fullBarPrice !== undefined && it.fullBarPrice !== null && it.fullBarPrice !== '' ? it.fullBarPrice : (editProduct.aluSpecs?.fullBarPrice || ''),
                    }
                };

                console.log('Sending update payload:', payload);
                console.log('Edit product ID:', editProduct._id);
                console.log('Payload costs:', payload.costs);
                console.log('Payload basePrice:', payload.basePrice);
                
                const { data } = await api.put(`/alu/raw-materials/${editProduct._id}`, payload);
                console.log('Update response:', data);
                console.log('Updated product data:', data.data);
                
                if (data.success) {
                    toast.success(data.message || 'Material updated successfully!');
                    console.log('Calling onSuccess callback to refresh data');
                    onSuccess?.();
                    onClose();
                } else {
                    toast.error(data.message || 'Failed to update material');
                }
                return;
            }

            const targetWarehouseId = commonSettings.warehouseId || (warehouses[0]?._id);
            const payload = {
                warehouseId: targetWarehouseId,
                items: items.map(it => {
                    // Generate code if empty
                    const finalCode = it.productCode || generateProductCode(it);
                    
                    // Convert length from feet to mm for Aluminium Profile
                    const isAluminiumProfile = it.type === 'AP';
                    const lengthInMm = isAluminiumProfile && it.length ? feetToMm(it.length) : (it.length || '');
                    
                    return {
                        productCode: finalCode.trim().toUpperCase(),
                        name: it.name.trim(),
                        unitOfMeasure: it.unitOfMeasure,
                        openingStockQuantity: Number(it.quantity) || 0,
                        purchaseCost: Number(it.purchaseCost) || 0,
                        warehouseId: targetWarehouseId,
                        supplierName: commonSettings.supplierName,
                        aluCategory: typeToCategory[it.type] || 'profiles',
                        specs: {
                            series: commonSettings.series,
                            finish: commonSettings.finish,
                            brand: commonSettings.supplierName,
                            type: it.type || '',
                            profile: it.profile || '',
                            colour: it.colour || '',
                            length: lengthInMm,
                            width: it.width || '',
                            height: it.height || '',
                            side: it.side || '',
                            description: it.description || '',
                            // Add profile pricing fields
                            standardLength: it.standardLength || '',
                            cutLength: it.cutLength || '',
                            fullBarPrice: it.fullBarPrice || '',
                        }
                    };
                })
            };

            console.log('Sending payload:', payload);
            const { data } = await api.post('/alu/raw-materials', payload);
            console.log('Response:', data);
            toast.success(data.message || `Successfully created ${items.length} materials with stock!`);
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error saving materials:', error);
            console.error('Error response:', error.response?.data);
            toast.error(error.response?.data?.message || error.message || `Failed to ${isEditMode ? 'update' : 'create'} materials`);
        } finally {
            setLoading(false);
        }
    };

    const warehouseOptions = warehouses.length > 0
        ? warehouses
        : [{ _id: 'wh-main', name: 'Fabrication Main Warehouse', warehouseCode: 'WH-MAIN' }];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit AluEco Raw Material' : 'Add AluEco Raw Materials & Initial Stock'} size="2xl">
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
                            <Sparkles size={12} /> Auto-Suggest Enabled
                        </div>
                    </div>

                    <div className={`grid grid-cols-1 gap-3 ${isEditMode ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
                        {!isEditMode && (
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
                        )}

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
                                {isEditMode ? 'Material Details' : `Aluminium Products & Stock Quantities (${items.length} Items)`}
                            </span>
                        </div>
                        {!isEditMode && (
                        <button
                            type="button"
                            onClick={addRow}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-200 transition shadow-sm hover:scale-[1.02] cursor-pointer"
                        >
                            <Plus size={15} /> + Add Another Product
                        </button>
                        )}
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
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-semibold text-slate-500">
                                                Line Valuation: <strong className="text-emerald-700">Rs. {lineTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong>
                                            </span>
                                            {items.length > 1 && !isEditMode && (
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

                                    {/* Product Details Field */}
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                                        <div className="flex items-center justify-between text-[11px] font-extrabold uppercase text-slate-700 border-b border-slate-200/80 pb-1.5">
                                            <span className="flex items-center gap-1.5 text-indigo-700">
                                                <Sparkles size={13} /> Product Details
                                            </span>
                                            <span className="text-[9px] font-normal text-slate-500">
                        Auto-code: Type + Profile + Colour + Side + {it.type === 'AP' ? 'Cut/Standard Length' : 'Length'} (no spaces)
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {/* Type */}
                                            <div>
                                                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-0.5">Type *</label>
                                                <select
                                                    value={it.type || ''}
                                                    onChange={e => updateItem(idx, 'type', e.target.value)}
                                                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                >
                                                    <option value="">Select Type</option>
                                                    {TYPE_OPTIONS.map(t => (
                                                        <option key={t.value} value={t.value}>{t.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Profile */}
                                            <div>
                                                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-0.5">Profile</label>
                                                <input
                                                    type="text"
                                                    value={it.profile || ''}
                                                    onChange={e => updateItem(idx, 'profile', e.target.value)}
                                                    placeholder="Enter full profile name"
                                                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                />
                                            </div>

                                            {/* Colour */}
                                            <div>
                                                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-0.5">Colour</label>
                                                <input
                                                    type="text"
                                                    value={it.colour || ''}
                                                    onChange={e => updateItem(idx, 'colour', e.target.value)}
                                                    placeholder="Enter full colour name"
                                                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                />
                                            </div>

                                            {/* Side - For all types */}
                                            <div>
                                                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-0.5">Side</label>
                                                <input
                                                    type="text"
                                                    value={it.side || ''}
                                                    onChange={e => updateItem(idx, 'side', e.target.value)}
                                                    placeholder="Enter full side name"
                                                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                />
                                            </div>

                                            {/* Length - Only for non-Glass/Accessories non-AP */}
                                            {it.type !== 'GL' && it.type !== 'AC' && it.type !== 'AP' && (
                                                <div>
                                                    <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-0.5">
                                                        Length (mm)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={it.length || ''}
                                                        onChange={e => updateItem(idx, 'length', e.target.value)}
                                                        placeholder="e.g. 6000"
                                                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                </div>
                                            )}

                                            {/* Aluminium Profile Standard Length and Cut Length */}
                                            {it.type === 'AP' && (
                                                <>
                                                    {/* Standard Length */}
                                                    <div>
                                                        <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-0.5">Standard Length *</label>
                                                        <select
                                                            value={it.standardLength || ''}
                                                            onChange={e => updateItem(idx, 'standardLength', e.target.value)}
                                                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                        >
                                                            <option value="">Select Standard Length</option>
                                                            {STANDARD_LENGTH_OPTIONS.map(sl => (
                                                                <option key={sl.value} value={sl.value}>{sl.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Full Bar Price */}
                                                    {it.standardLength && (
                                                        <div>
                                                            <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-0.5">Full Bar Price (LKR) *</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={it.fullBarPrice || ''}
                                                                onChange={e => {
                                                                    const value = e.target.value === '' ? '' : Number(e.target.value);
                                                                    updateItem(idx, 'fullBarPrice', value);
                                                                }}
                                                                placeholder="e.g. 2000"
                                                                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Cut Length - Only for cuttable profiles */}
                                                    {it.standardLength && STANDARD_LENGTH_OPTIONS.find(sl => sl.value === it.standardLength)?.isCuttable && (
                                                        <div>
                                                            <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-0.5">Available Cut Length *</label>
                                                            <select
                                                                value={it.cutLength || ''}
                                                                onChange={e => updateItem(idx, 'cutLength', e.target.value)}
                                                                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                            >
                                                                <option value="">Select Cut Length</option>
                                                                {STANDARD_LENGTH_OPTIONS.find(sl => sl.value === it.standardLength)?.cutLengths.map(cl => (
                                                                    <option key={cl} value={cl}>{cl} ft</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {/* Non-cuttable info message */}
                                                    {it.standardLength && !STANDARD_LENGTH_OPTIONS.find(sl => sl.value === it.standardLength)?.isCuttable && (
                                                        <div className="col-span-2 sm:col-span-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                                            <div className="flex items-start gap-2">
                                                                <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                                                <div className="text-[10px] text-blue-800">
                                                                    <p className="font-semibold mb-1">Standard Supplier Length</p>
                                                                    <p className="text-blue-700">This profile is supplied as a standard length. No cutting charge is applied.</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Width - Only for Glass/Accessories */}
                                            {(it.type === 'GL' || it.type === 'AC') && (
                                                <div>
                                                    <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-0.5">Width (mm)</label>
                                                    <input
                                                        type="text"
                                                        value={it.width || ''}
                                                        onChange={e => updateItem(idx, 'width', e.target.value)}
                                                        placeholder="e.g. 1000"
                                                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                </div>
                                            )}

                                            {/* Height - Only for Glass/Accessories */}
                                            {(it.type === 'GL' || it.type === 'AC') && (
                                                <div>
                                                    <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-0.5">Height (mm)</label>
                                                    <input
                                                        type="text"
                                                        value={it.height || ''}
                                                        onChange={e => updateItem(idx, 'height', e.target.value)}
                                                        placeholder="e.g. 1200"
                                                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-0.5">Description</label>
                                            <input
                                                type="text"
                                                value={it.description || ''}
                                                onChange={e => updateItem(idx, 'description', e.target.value)}
                                                placeholder="Enter description..."
                                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            />
                                        </div>

                                        {/* Product Name */}
                                        <div>
                                            <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-0.5">Product Name *</label>
                                            <input
                                                type="text"
                                                value={it.name}
                                                onChange={e => updateItem(idx, 'name', e.target.value)}
                                                required
                                                placeholder="Enter product name..."
                                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                                            />
                                        </div>
                                    </div>

                                    {/* Price Calculation Display - Only for Aluminium Profiles */}
                                    {it.type === 'AP' && it.standardLength && it.fullBarPrice !== undefined && it.fullBarPrice !== null && (
                                        <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl space-y-2">
                                            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase text-emerald-800 border-b border-emerald-200/80 pb-1.5">
                                                <span className="flex items-center gap-1.5">
                                                    <DollarSign size={13} /> Price Calculation
                                                </span>
                                            </div>
                                            
                                            {(() => {
                                                const priceCalc = calculateProfilePrice(it);
                                                return (
                                                    <div className="space-y-1.5">
                                                        {priceCalc.breakdown && (
                                                            <>
                                                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                                    <div className="bg-white/60 p-1.5 rounded border border-emerald-100">
                                                                        <span className="text-emerald-600 font-semibold block">Full Bar Price</span>
                                                                        <span className="text-emerald-900 font-bold">Rs. {priceCalc.breakdown.fullBarPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                    <div className="bg-white/60 p-1.5 rounded border border-emerald-100">
                                                                        <span className="text-emerald-600 font-semibold block">Price per ft</span>
                                                                        <span className="text-emerald-900 font-bold">Rs. {priceCalc.breakdown.pricePerFt.toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                                
                                                                {priceCalc.breakdown.cuttingCharge > 0 && (
                                                                    <div className="bg-white/60 p-1.5 rounded border border-emerald-100">
                                                                        <span className="text-emerald-600 font-semibold block text-[10px]">Cutting Charge</span>
                                                                        <span className="text-emerald-900 font-bold text-[10px]">{priceCalc.breakdown.cuttingCharge}%</span>
                                                                    </div>
                                                                )}
                                                                
                                                                {priceCalc.calculation && (
                                                                    <div className="bg-emerald-100/50 p-1.5 rounded border border-emerald-200">
                                                                        <span className="text-emerald-700 font-semibold block text-[9px] mb-0.5">Formula</span>
                                                                        <span className="text-emerald-900 font-mono text-[10px]">{priceCalc.calculation}</span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                        
                                                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-2 rounded-lg border border-emerald-700">
                                                            <span className="text-emerald-100 font-semibold block text-[10px] mb-0.5">Final Calculated Price</span>
                                                            <span className="text-white font-black text-sm">Rs. {priceCalc.price.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* 2. Standard Inventory & Pricing Fields */}
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center bg-white p-2 border border-slate-200 rounded-xl">
                                        {/* Generated Unique Code */}
                                        <div className={isEditMode ? 'sm:col-span-4' : 'sm:col-span-4'}>
                                            <div className="flex justify-between text-[10px] font-extrabold text-slate-600 mb-0.5">
                                                <span>{isEditMode ? 'ITEM CODE (Editable)' : 'AUTO-GENERATED CODE *'}</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={it.productCode}
                                                onChange={e => updateItem(idx, 'productCode', e.target.value)}
                                                placeholder={it.type === 'AP' ? 'APSWISSTEK100MMWHITETOP1969' : 'APSWISSTEK100MMATTLACKTOPFRAME6000'}
                                                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold uppercase ${isEditMode ? 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20' : 'bg-indigo-50/40 border-indigo-200 text-indigo-900 cursor-not-allowed'}`}
                                                readOnly={!isEditMode}
                                                title={isEditMode ? 'Edit item code manually' : `Auto-generated from Type, Profile, Colour, Side, ${it.type === 'AP' ? 'Cut/Standard Length' : 'Length'}`}
                                            />
                                        </div>

                                        {/* Stock Qty - create mode only; use Add Qty on table for stock changes */}
                                        {!isEditMode && (
                                        <div className="sm:col-span-3">
                                            <label className="block text-[10px] font-extrabold text-emerald-800 mb-0.5">STOCK QTY *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={it.quantity}
                                                onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                                required
                                                placeholder="10"
                                                className="w-full bg-emerald-50/60 focus:bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            />
                                        </div>
                                        )}

                                        {/* Unit */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-extrabold text-slate-600 mb-0.5">UOM (UNIT)</label>
                                            <select
                                                value={it.unitOfMeasure}
                                                onChange={e => updateItem(idx, 'unitOfMeasure', e.target.value)}
                                                className="w-full bg-white border border-slate-300 rounded-lg px-1.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                                            >
                                                {UNIT_OPTIONS.map(u => (
                                                    <option key={u.value} value={u.value}>{u.value}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Unit Cost */}
                                        <div className="sm:col-span-3">
                                            <label className="block text-[10px] font-extrabold text-slate-600 mb-0.5">
                                                PRICE / UNIT COST (LKR) {it.type === 'AP' ? <span className="text-emerald-600 ml-1">(Auto)</span> : ''}
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={it.purchaseCost}
                                                onChange={e => updateItem(idx, 'purchaseCost', Number(e.target.value))}
                                                placeholder="0.00"
                                                readOnly={it.type === 'AP'}
                                                className={`w-full ${it.type === 'AP' ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 cursor-not-allowed' : 'bg-slate-50 focus:bg-white border border-slate-300'} rounded-lg px-2.5 py-1.5 text-xs font-extrabold focus:outline-none`}
                                            />
                                            {it.type === 'AP' && (
                                                <p className="text-[9px] text-emerald-600 mt-0.5">Auto-calculated from profile pricing</p>
                                            )}
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
                        {loading ? (isEditMode ? 'Saving Changes...' : 'Saving All Products...') : (isEditMode ? 'Save Changes' : `Save All ${items.length} Products & Create Stock`)}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
