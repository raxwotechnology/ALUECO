import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { 
    RefreshCw, ArrowRight, Save, Info, AlertTriangle, 
    Layers, Scale, CheckCircle2, AlertCircle, Warehouse, 
    Boxes, FileText, ChevronRight, Check, Play, DollarSign, Trash2, Plus
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import ProductAutocompleteSelect from '../components/ui/ProductAutocompleteSelect';
import { useConvertStock, useConvertStockRecipe } from '../features/stock/useStock';

export default function InventoryConverterPage() {
    const { user } = useAuthStore();
    const canConvert = ['admin', 'manager', 'production_staff', 'warehouse_staff'].includes(user?.role);

    const convertMutation = useConvertStock();
    const convertRecipeMutation = useConvertStockRecipe();

    const [activeTab, setActiveTab] = useState('recipe'); // 'recipe' or 'direct'
    const [warehouses, setWarehouses] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [products, setProducts] = useState([]);
    const [warehouseId, setWarehouseId] = useState('');
    const [sourceProductId, setSourceProductId] = useState('');
    const [destinationProductId, setDestinationProductId] = useState('');
    const [inputQuantity, setInputQuantity] = useState('');
    const [outputQuantity, setOutputQuantity] = useState('');
    const [openQuantity, setOpenQuantity] = useState('');
    const [laborCost, setLaborCost] = useState('');
    const [overheadCost, setOverheadCost] = useState('');
    const [notes, setNotes] = useState('');

    const [machines, setMachines] = useState([]);
    const [assignedMachines, setAssignedMachines] = useState([{ machineId: '', hours: '' }]);

    // --- Tab 1: Recipe Converter State ---
    const [recipes, setRecipes] = useState([]);
    const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [rawMaterialStock, setRawMaterialStock] = useState(0);
    const [rawMaterialBatches, setRawMaterialBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('all');
    const [checkingStock, setCheckingStock] = useState(false);
    const suggestionsRef = useRef(null);

    // --- Tab 2: Direct Converter State ---
    const [predicting, setPredicting] = useState(false);
    const [yieldPrediction, setYieldPrediction] = useState(null);

    const fetchDropdownsAndRecipes = useCallback(async () => {
        setLoading(true);
        try {
            const [whRes, prodRes, recipeRes, machineRes] = await Promise.all([
                api.get('/warehouses'),
                api.get('/products?status=all'),
                api.get('/inventory-recipes', { params: { status: 'active' } }),
                api.get('/production/machines')
            ]);
            setWarehouses(whRes.data.data || []);
            setWarehouseId(whRes.data.data?.[0]?._id || '');

            const allProds = prodRes.data.data || [];
            setProducts(allProds);

            // Filter for raw materials
            const raws = allProds.filter(p => p.productType === 'raw_material');
            setRawMaterials(raws);
            setSourceProductId(raws[0]?._id || '');

            // Recipes
            setRecipes(recipeRes.data.data || []);

            // Machines
            setMachines(machineRes.data.data || []);
        } catch (err) {
            toast.error('Failed to load initial configuration data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDropdownsAndRecipes();
    }, [fetchDropdownsAndRecipes]);

    // Handle clicks outside of Recipe suggestions dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- Real-time Stock fetching for Selected Raw Material ---
    const fetchRawMaterialStock = useCallback(async (prodId, whId) => {
        if (!prodId || !whId) {
            setRawMaterialStock(0);
            setRawMaterialBatches([]);
            return;
        }
        setCheckingStock(true);
        try {
            const res = await api.get('/stock', {
                params: { productId: prodId, warehouseId: whId }
            });
            const stockItems = res.data.data || [];
            setRawMaterialBatches(stockItems);
            const totalAvailable = stockItems.reduce((sum, item) => sum + ((item.quantities?.onHand || 0) - (item.quantities?.reserved || 0)), 0);
            setRawMaterialStock(totalAvailable);
        } catch (err) {
            setRawMaterialStock(0);
            setRawMaterialBatches([]);
        } finally {
            setCheckingStock(false);
        }
    }, []);

    const displayedStock = useMemo(() => {
        if (selectedBatch === 'all') {
            return rawMaterialStock;
        }
        const match = rawMaterialBatches.find(b => (b.batchNumber || 'Standard') === selectedBatch);
        if (match) {
            return (match.quantities?.onHand || 0) - (match.quantities?.reserved || 0);
        }
        return 0;
    }, [selectedBatch, rawMaterialStock, rawMaterialBatches]);

    // Trigger stock refresh when raw material or warehouse changes
    useEffect(() => {
        if (sourceProductId && warehouseId) {
            fetchRawMaterialStock(sourceProductId, warehouseId);
            setSelectedBatch('all');
            setSelectedRecipe(null);
            setRecipeSearchQuery('');
            setDestinationProductId('');
            setOutputQuantity('');
            setLaborCost('');
            setOverheadCost('');
        }
    }, [sourceProductId, warehouseId, fetchRawMaterialStock]);

    // --- Tab 1: Recipe calculation logic ---
    useEffect(() => {
        if (activeTab === 'recipe' && selectedRecipe && inputQuantity) {
            const multiplier = Number(inputQuantity) / selectedRecipe.inputQuantity;
            const yieldVal = multiplier * selectedRecipe.outputQuantity;
            setOutputQuantity(isNaN(yieldVal) || !isFinite(yieldVal) ? '' : yieldVal.toFixed(2));
        } else if (activeTab === 'recipe' && (!selectedRecipe || !inputQuantity)) {
            setOutputQuantity('');
        }
    }, [activeTab, selectedRecipe, inputQuantity]);

    // --- Tab 2: Yield prediction logic ---
    useEffect(() => {
        if (activeTab !== 'direct') return;

        const getPrediction = async () => {
            if (!sourceProductId || !inputQuantity || Number(inputQuantity) <= 0) {
                setYieldPrediction(null);
                setOutputQuantity('');
                return;
            }

            setPredicting(true);
            try {
                const res = await api.get(`/products/predict-yield?productId=${sourceProductId}&inputWeight=${inputQuantity}`);
                if (res.data.success && res.data.data) {
                    setYieldPrediction(res.data.data);
                    setOutputQuantity(res.data.data.predictedWeight);
                } else {
                    setYieldPrediction(null);
                    setOutputQuantity('');
                }
            } catch (err) {
                setYieldPrediction(null);
                setOutputQuantity('');
            } finally {
                setPredicting(false);
            }
        };

        const timer = setTimeout(() => {
            getPrediction();
        }, 500);

        return () => clearTimeout(timer);
    }, [sourceProductId, inputQuantity, activeTab]);

    // --- Suggest Recipes in-memory based on search text and selected raw material ---
    const getFilteredRecipes = () => {
        return recipes.filter(recipe => {
            const matchesSearch = recipe.name.toLowerCase().includes(recipeSearchQuery.toLowerCase()) ||
                                  recipe.recipeCode.toLowerCase().includes(recipeSearchQuery.toLowerCase());
            
            // Check if selected raw material matches the source crop of recipe
            const recipeSrcId = typeof recipe.sourceProductId === 'object' ? recipe.sourceProductId._id : recipe.sourceProductId;
            const containsRawMaterial = sourceProductId 
                ? recipeSrcId === sourceProductId
                : true;

            return matchesSearch && containsRawMaterial;
        });
    };

    const handleSelectRecipe = (recipe) => {
        setSelectedRecipe(recipe);
        setRecipeSearchQuery(`${recipe.name} (${recipe.recipeCode})`);
        setShowSuggestions(false);
    };

    // --- Julian batch code generator preview ---
    const getJulianBatchPreview = (productShortCode) => {
        const d = new Date();
        const start = new Date(d.getFullYear(), 0, 0);
        const diff = d - start + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000;
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        const julianString = String(dayOfYear).padStart(3, '0');
        const yearShort = String(d.getFullYear()).slice(-2);
        const prefix = (productShortCode || 'CONV').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        return `${prefix}-ALE${yearShort}${julianString}-XXXX`;
    };

    // --- Form Submissions ---
    const handleRecipeConversionSubmit = async (e) => {
        e.preventDefault();
        if (!warehouseId) return toast.error('Please select a warehouse');
        if (!sourceProductId) return toast.error('Please select a raw material');
        if (!inputQuantity || Number(inputQuantity) <= 0) return toast.error('Please enter a valid raw material weight');
        if (!selectedRecipe) return toast.error('Please search and select an Inventory Recipe');

        // Check if there is enough stock of raw material
        if (displayedStock < Number(inputQuantity)) {
            return toast.error(`Insufficient raw material stock. Available: ${displayedStock.toFixed(2)} ${activeSourceProd?.unitOfMeasure || 'Kg'}`);
        }

        if (openQuantity && Number(openQuantity) > Number(outputQuantity)) {
            return toast.error('Open stock quantity cannot be greater than the calculated output yield');
        }

        setSaving(true);
        try {
            await convertRecipeMutation.mutateAsync({
                recipeId: selectedRecipe._id,
                warehouseId,
                inputQuantity: Number(inputQuantity),
                laborCost: Number(laborCost || 0),
                overheadCost: Number(overheadCost || 0),
                notes,
                batchNumber: selectedBatch === 'all' ? null : selectedBatch,
                openQuantity: openQuantity ? Number(openQuantity) : undefined,
                machineAssignments: assignedMachines
                    .filter(am => am.machineId && am.hours > 0)
                    .map(am => ({ machineId: am.machineId, hours: Number(am.hours) || 0 }))
            });

            setInputQuantity('');
            setOutputQuantity('');
            setOpenQuantity('');
            setSelectedRecipe(null);
            setRecipeSearchQuery('');
            setNotes('');
            setLaborCost('');
            setOverheadCost('');
            setAssignedMachines([{ machineId: '', hours: '' }]);
            fetchRawMaterialStock(sourceProductId, warehouseId);
        } catch (err) {
            // Error toast is handled by the mutation hook
        } finally {
            setSaving(false);
        }
    };

    const handleDirectConversionSubmit = async (e) => {
        e.preventDefault();
        if (!warehouseId) return toast.error('Please select a warehouse');
        if (!sourceProductId) return toast.error('Please select a raw material');
        if (!inputQuantity || Number(inputQuantity) <= 0) return toast.error('Please enter input weight');
        if (!outputQuantity || Number(outputQuantity) <= 0) return toast.error('Please enter yield weight');

        const destId = yieldPrediction?.outputProduct?._id || destinationProductId;
        if (!destId) return toast.error('Please select a finished product to convert to');

        if (displayedStock < Number(inputQuantity)) {
            return toast.error(`Insufficient stock of raw material. Available: ${displayedStock.toFixed(2)} ${activeSourceProd?.unitOfMeasure || 'Kg'}`);
        }

        if (openQuantity && Number(openQuantity) > Number(outputQuantity)) {
            return toast.error('Open stock quantity cannot be greater than the output yield');
        }

        setSaving(true);
        try {
            await convertMutation.mutateAsync({
                sourceProductId,
                destinationProductId: destId,
                warehouseId,
                inputQuantity: Number(inputQuantity),
                outputQuantity: Number(outputQuantity),
                laborCost: Number(laborCost || 0),
                overheadCost: Number(overheadCost || 0),
                notes,
                batchNumber: selectedBatch === 'all' ? null : selectedBatch,
                openQuantity: openQuantity ? Number(openQuantity) : undefined,
                machineAssignments: assignedMachines
                    .filter(am => am.machineId && am.hours > 0)
                    .map(am => ({ machineId: am.machineId, hours: Number(am.hours) || 0 }))
            });

            setInputQuantity('');
            setOutputQuantity('');
            setOpenQuantity('');
            setNotes('');
            setLaborCost('');
            setOverheadCost('');
            setAssignedMachines([{ machineId: '', hours: '' }]);
            setYieldPrediction(null);
            setDestinationProductId('');
            fetchRawMaterialStock(sourceProductId, warehouseId);
        } catch (err) {
            // Error toast is handled by the mutation hook
        } finally {
            setSaving(false);
        }
    };

    const activeSourceProd = rawMaterials.find(p => p._id === sourceProductId);

    const finishedProducts = useMemo(() => {
        return products.filter((p) =>
            p.productType === 'finished_good' || p.productType === 'semi_finished' || p.canBeManufactured
        );
    }, [products]);

    const activeDestProd = useMemo(() => {
        return products.find(p => p._id === destinationProductId);
    }, [products, destinationProductId]);

    // Financial calculations for summary panel
    const sourceUnitCost = useMemo(() => {
        if (!activeSourceProd) return 0;

        // If a specific batch is selected
        if (selectedBatch !== 'all') {
            const match = rawMaterialBatches.find(b => (b.batchNumber || 'Standard') === selectedBatch);
            if (match && match.costPerUnit > 0) {
                return match.costPerUnit;
            }
        } else {
            // Weighted average of all active positive batches
            const positiveBatches = rawMaterialBatches.filter(b => (b.quantities?.onHand || 0) > 0);
            if (positiveBatches.length > 0) {
                const totalVal = positiveBatches.reduce((sum, b) => sum + ((b.quantities?.onHand || 0) * (b.costPerUnit || 0)), 0);
                const totalQty = positiveBatches.reduce((sum, b) => sum + (b.quantities?.onHand || 0), 0);
                if (totalQty > 0) {
                    return +(totalVal / totalQty).toFixed(2);
                }
            }
        }

        // Fallback to product costs if no batch stock info is available
        return activeSourceProd.costs?.averageCost || activeSourceProd.costs?.lastPurchaseCost || activeSourceProd.basePrice || 0;
    }, [activeSourceProd, selectedBatch, rawMaterialBatches]);

    const materialCostTotal = useMemo(() => {
        if (!inputQuantity) return 0;
        return sourceUnitCost * Number(inputQuantity);
    }, [inputQuantity, sourceUnitCost]);

    const totalProductionCost = useMemo(() => {
        const mCost = assignedMachines.reduce((sum, am) => {
            const m = machines.find(mach => mach._id === am.machineId);
            return sum + (m ? (m.hourlyCost || 0) * (Number(am.hours) || 0) : 0);
        }, 0);
        return materialCostTotal + Number(laborCost || 0) + Number(overheadCost || 0) + mCost;
    }, [materialCostTotal, laborCost, overheadCost, machines, assignedMachines]);

    const yieldOutputQty = useMemo(() => {
        return Number(outputQuantity || 0);
    }, [outputQuantity]);

    const calculatedUnitCost = useMemo(() => {
        if (!yieldOutputQty || yieldOutputQty <= 0) return 0;
        return totalProductionCost / yieldOutputQty;
    }, [totalProductionCost, yieldOutputQty]);

    const wastageKg = useMemo(() => {
        if (!inputQuantity || !yieldOutputQty) return 0;
        const diff = Number(inputQuantity) - yieldOutputQty;
        return diff > 0 ? diff : 0;
    }, [inputQuantity, yieldOutputQty]);

    const efficiencyPct = useMemo(() => {
        if (!inputQuantity || Number(inputQuantity) <= 0) return 0;
        return (yieldOutputQty / Number(inputQuantity)) * 100;
    }, [inputQuantity, yieldOutputQty]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(n || 0);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <RefreshCw size={36} className="animate-spin text-primary-550" />
                <p className="text-gray-500 font-medium">Initializing conversion catalogs...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <PageHeader
                title="Inventory & Formula Converter"
                description="Convert raw materials to finished products using formulas or direct conversion factors."
            />

            {/* TAB SYSTEM */}
            <div className="flex bg-gray-100 p-1.5 rounded-2xl max-w-md">
                <button
                    onClick={() => {
                        setActiveTab('recipe');
                        setInputQuantity('');
                        setOutputQuantity('');
                        setNotes('');
                        setLaborCost('');
                        setOverheadCost('');
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
                        activeTab === 'recipe'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <Scale size={16} /> Formula-based (Simple)
                </button>
                <button
                    onClick={() => {
                        setActiveTab('direct');
                        setInputQuantity('');
                        setOutputQuantity('');
                        setNotes('');
                        setLaborCost('');
                        setOverheadCost('');
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
                        activeTab === 'direct'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <RefreshCw size={15} /> Direct (No Formula)
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* FORM PANEL */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6">
                        <h2 className="text-base font-bold text-gray-850 mb-4 flex items-center gap-2 border-b pb-3">
                            {activeTab === 'recipe' ? (
                                <>
                                    <Scale size={18} className="text-primary-550" />
                                    <span>Formula Conversion Parameters</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={18} className="text-primary-550" />
                                    <span>Direct Conversion Parameters</span>
                                </>
                            )}
                        </h2>

                        <form onSubmit={activeTab === 'recipe' ? handleRecipeConversionSubmit : handleDirectConversionSubmit} className="space-y-5">
                            {/* Warehouse, Raw Material & Batch selection */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Operations Warehouse *</label>
                                    <div className="relative">
                                        <Warehouse className="absolute left-3 top-3 text-gray-400" size={16} />
                                        <select
                                            value={warehouseId}
                                            onChange={(e) => setWarehouseId(e.target.value)}
                                            required
                                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium"
                                        >
                                            {warehouses.map(w => (
                                                <option key={w._id} value={w._id}>{w.name} ({w.warehouseCode})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
 
                                <div>
                                    <ProductAutocompleteSelect
                                        label="Select Raw Material *"
                                        placeholder="Type to search or add raw material..."
                                        products={rawMaterials}
                                        value={sourceProductId}
                                        productType="raw_material"
                                        onChange={(val, newProd) => {
                                            if (newProd) {
                                                setRawMaterials(prev => {
                                                    if (prev.some(p => p._id === newProd._id)) return prev;
                                                    return [...prev, newProd];
                                                });
                                            }
                                            setSourceProductId(val);
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Select Batch / Lot *</label>
                                    <select
                                        value={selectedBatch}
                                        onChange={(e) => setSelectedBatch(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium"
                                    >
                                        <option value="all">All Batches (Auto-FIFO)</option>
                                        {rawMaterialBatches.map(b => {
                                            const avail = (b.quantities?.onHand || 0) - (b.quantities?.reserved || 0);
                                            return (
                                                <option key={b._id} value={b.batchNumber || 'Standard'}>
                                                    {b.batchNumber || 'Standard Stock'} ({avail.toFixed(2)} {b.unitOfMeasure || 'Kg'})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* Stock Display & Input Quantity */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col justify-center">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                                        {selectedBatch === 'all' ? 'Total Warehouse Stock' : 'Selected Batch Stock'}
                                    </span>
                                    {checkingStock ? (
                                        <div className="text-sm text-gray-455 flex items-center gap-1.5 mt-1 font-medium">
                                            <RefreshCw size={13} className="animate-spin text-primary-550" /> Checking levels...
                                        </div>
                                    ) : (
                                        <span className={`text-base font-extrabold mt-0.5 ${displayedStock > 0 ? 'text-gray-805' : 'text-rose-600'}`}>
                                            {displayedStock.toFixed(2)} {activeSourceProd?.unitOfMeasure || 'Kg'}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">
                                        Input Quantity ({activeSourceProd?.unitOfMeasure || 'Kg'}) *
                                    </label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="any"
                                        placeholder="e.g. 150"
                                        value={inputQuantity}
                                        onChange={(e) => setInputQuantity(e.target.value)}
                                        required
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none font-bold"
                                    />
                                </div>
                            </div>

                            {/* RECIPE TAB FIELDS */}
                            {activeTab === 'recipe' && (
                                <div className="space-y-4 pt-1">
                                    {/* Recipe Autocomplete Search */}
                                    <div className="relative" ref={suggestionsRef}>
                                        <label className="text-xs font-bold text-gray-600 block mb-1">Select Inventory Formula *</label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-3 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder={sourceProductId ? "Start typing formula name or code..." : "Select a raw material first..."}
                                                disabled={!sourceProductId}
                                                value={recipeSearchQuery}
                                                onChange={(e) => {
                                                    setRecipeSearchQuery(e.target.value);
                                                    setShowSuggestions(true);
                                                }}
                                                onFocus={() => setShowSuggestions(true)}
                                                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none font-medium bg-white"
                                            />
                                        </div>

                                        {/* Suggestions Dropdown */}
                                        {showSuggestions && getFilteredRecipes().length > 0 && (
                                            <ul className="absolute z-30 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto divide-y divide-gray-100">
                                                {getFilteredRecipes().map(recipe => (
                                                    <li
                                                        key={recipe._id}
                                                        onClick={() => handleSelectRecipe(recipe)}
                                                        className="px-4 py-3 hover:bg-primary-50 cursor-pointer flex justify-between items-center transition-colors"
                                                    >
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-gray-800 text-sm">{recipe.name}</span>
                                                                <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{recipe.recipeCode}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-550 mt-1">
                                                                Yields: <span className="font-semibold text-emerald-600">{recipe.outputQuantity} Kg</span> of {recipe.destinationProductId?.name} per {recipe.inputQuantity} Kg
                                                            </p>
                                                        </div>
                                                        <ChevronRight size={16} className="text-gray-405" />
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {showSuggestions && recipeSearchQuery && getFilteredRecipes().length === 0 && (
                                            <div className="absolute z-35 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 p-4 text-center text-xs text-gray-500">
                                                No matching active formula found for {activeSourceProd?.name || 'selected raw material'}.
                                            </div>
                                        )}
                                    </div>

                                    {selectedRecipe && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-primary-100 bg-primary-50/15 rounded-xl p-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-600 block mb-1">Calculated Yield Output (Kg) *</label>
                                                <input
                                                    type="text"
                                                    disabled
                                                    value={outputQuantity}
                                                    className="w-full px-3 py-2 border border-gray-200 bg-gray-100/80 rounded-xl text-sm font-bold text-gray-700 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-600 block mb-1">Initial Open Stock (Kg)</label>
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="any"
                                                    placeholder="Default: All"
                                                    value={openQuantity}
                                                    onChange={(e) => setOpenQuantity(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 bg-white focus:border-primary-500 rounded-xl text-sm font-bold text-gray-700 outline-none"
                                                />
                                                <span className="text-[9px] text-gray-400 mt-1 block">Release to POS. Rest goes to balance.</span>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-655 block mb-1">Produces Product</label>
                                                <div className="px-3 py-2 border border-gray-200 bg-gray-100/80 rounded-xl text-sm font-semibold text-gray-700 truncate">
                                                    {selectedRecipe.destinationProductId?.name}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* DIRECT TAB FIELDS */}
                            {activeTab === 'direct' && (
                                <div className="space-y-4">
                                    {predicting && (
                                        <div className="py-2 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5 bg-gray-55 rounded-xl">
                                            <RefreshCw size={13} className="animate-spin text-primary-550" /> Computing formula expectations...
                                        </div>
                                    )}

                                    {yieldPrediction && (
                                        <div className="border border-emerald-100 bg-emerald-50/50 rounded-xl p-4 space-y-3">
                                            <div className="flex items-start gap-2 text-emerald-850">
                                                <Info size={16} className="shrink-0 mt-0.5" />
                                                <div className="text-xs">
                                                    <span className="font-bold text-sm block mb-0.5">Active Conversion Formula Found</span>
                                                    1 Kg of <span className="font-bold">{activeSourceProd?.name}</span> yields <span className="font-bold">{(yieldPrediction.ratio).toFixed(3)} Kg</span> of finished <span className="font-bold">{yieldPrediction.outputProduct?.name}</span>.
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 py-2 border-y border-emerald-100/60">
                                                <div className="flex-1 text-center bg-white p-2.5 rounded-lg border border-emerald-100/50">
                                                    <span className="text-[10px] text-gray-455 block uppercase font-bold">Source Input</span>
                                                    <span className="text-base font-extrabold text-gray-850">{inputQuantity} {activeSourceProd?.unitOfMeasure}</span>
                                                </div>
                                                <ArrowRight className="text-emerald-400" size={16} />
                                                <div className="flex-1 text-center bg-white p-2.5 rounded-lg border border-emerald-100/50">
                                                    <span className="text-[10px] text-gray-455 block uppercase font-bold">Expected Output</span>
                                                    <span className="text-base font-extrabold text-emerald-600">{yieldPrediction.predictedWeight} {yieldPrediction.outputProduct?.unitOfMeasure}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                                                <div>
                                                    <label className="text-xs font-bold text-emerald-850 block mb-1">
                                                        Actual Output Yield ({yieldPrediction.outputProduct?.unitOfMeasure || 'Kg'}) *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="any"
                                                        value={outputQuantity}
                                                        onChange={(e) => setOutputQuantity(e.target.value)}
                                                        required
                                                        className="w-full px-3 py-2 border border-emerald-200 focus:border-emerald-500 rounded-xl text-sm outline-none font-bold text-emerald-700 bg-white"
                                                    />
                                                    <span className="text-[10px] text-gray-450 mt-1 block">Adjust if actual yield differs.</span>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-emerald-850 block mb-1">
                                                        Initial Open Stock ({yieldPrediction.outputProduct?.unitOfMeasure || 'Kg'})
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="any"
                                                        placeholder="Default: All"
                                                        value={openQuantity}
                                                        onChange={(e) => setOpenQuantity(e.target.value)}
                                                        className="w-full px-3 py-2 border border-emerald-200 focus:border-emerald-500 rounded-xl text-sm outline-none font-bold text-emerald-700 bg-white"
                                                    />
                                                    <span className="text-[10px] text-gray-450 mt-1 block">Available for POS sales.</span>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-655 block mb-1">Output Product</label>
                                                    <div className="px-3 py-2 border border-gray-200 bg-gray-100/80 rounded-xl text-sm font-semibold text-gray-700 truncate">
                                                        {yieldPrediction.outputProduct?.name} ({yieldPrediction.outputProduct?.productCode})
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {inputQuantity && !yieldPrediction && !predicting && (
                                        <div className="border border-gray-200 bg-white rounded-xl p-4 space-y-4">
                                            <div className="flex gap-2 text-amber-600 text-xs">
                                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="font-bold block text-sm mb-0.5">No Yield Formula Setup</span>
                                                    There is no active conversion rule mapping <span className="font-bold">{activeSourceProd?.name}</span> to a finished product. You can manually select an output product to perform direct conversion.
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <ProductAutocompleteSelect
                                                    label="Select Output Finished Product *"
                                                    placeholder="Type to search..."
                                                    products={finishedProducts}
                                                    value={destinationProductId}
                                                    productType="finished_good"
                                                    onChange={(val, newProd) => {
                                                        if (newProd) {
                                                            setProducts(prev => {
                                                                 if (prev.some(p => p._id === newProd._id)) return prev;
                                                                 return [...prev, newProd];
                                                            });
                                                        }
                                                        setDestinationProductId(val);
                                                    }}
                                                />
                                                <div>
                                                    <label className="text-xs font-bold text-gray-600 block mb-1">
                                                        Actual Output Yield (Kg) *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="any"
                                                        placeholder="e.g. 10"
                                                        value={outputQuantity}
                                                        onChange={(e) => setOutputQuantity(e.target.value)}
                                                        required
                                                        className="w-full px-3 py-2 border border-gray-200 focus:border-primary-500 rounded-xl text-sm outline-none font-bold bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-600 block mb-1">
                                                        Initial Open Stock (Kg)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="any"
                                                        placeholder="Default: All"
                                                        value={openQuantity}
                                                        onChange={(e) => setOpenQuantity(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 focus:border-primary-500 rounded-xl text-sm outline-none font-bold bg-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* COST ALLOCATION FIELDS */}
                            <div className="border-t pt-4 space-y-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Actual Manufacturing Cost Allocation</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-655 block mb-1">Labor Cost Allocation (LKR)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-3 text-gray-400" size={14} />
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="e.g. 2500"
                                                value={laborCost}
                                                onChange={(e) => setLaborCost(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-655 block mb-1">Overhead Cost Allocation (LKR)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-3 text-gray-400" size={14} />
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="e.g. 1200"
                                                value={overheadCost}
                                                onChange={(e) => setOverheadCost(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Machine Cost Inputs */}
                                <div className="border-t pt-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-gray-550 uppercase tracking-wider">Machine Assignments</h4>
                                        <button
                                            type="button"
                                            onClick={() => setAssignedMachines(prev => [...prev, { machineId: '', hours: '' }])}
                                            className="text-xs text-primary-600 hover:text-primary-800 font-bold flex items-center gap-1"
                                        >
                                            <Plus size={14} className="mr-0.5" /> Add Machine
                                        </button>
                                    </div>

                                    <div className="space-y-2.5">
                                        {assignedMachines.map((am, idx) => {
                                            const machineCost = (() => {
                                                const m = machines.find(mach => mach._id === am.machineId);
                                                return m ? (m.hourlyCost || 0) * (Number(am.hours) || 0) : 0;
                                            })();

                                            return (
                                                <div key={idx} className="flex gap-3 items-end bg-gray-50 p-2.5 border border-gray-150 rounded-xl relative group">
                                                    <div className="flex-1">
                                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Machine</label>
                                                        <select
                                                            value={am.machineId}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setAssignedMachines(prev => prev.map((item, i) => i === idx ? { ...item, machineId: val } : item));
                                                            }}
                                                            className="w-full h-9 px-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"
                                                        >
                                                            <option value="">Select Machine</option>
                                                            {machines.map(m => (
                                                                <option key={m._id} value={m._id}>{m.name} ({m.code}) - LKR {m.hourlyCost}/hr</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="w-28">
                                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Running Hours</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.1"
                                                            value={am.hours}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setAssignedMachines(prev => prev.map((item, i) => i === idx ? { ...item, hours: val } : item));
                                                            }}
                                                            placeholder="Hours"
                                                            className="w-full h-9 px-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"
                                                        />
                                                    </div>

                                                    <div className="w-32 text-right pb-2">
                                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Cost</label>
                                                        <span className="text-sm font-semibold text-gray-800">LKR {machineCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setAssignedMachines(prev => prev.filter((_, i) => i !== idx))}
                                                        className="p-2 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors mb-0.5"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {assignedMachines.length > 0 && (() => {
                                        const totalMachineCost = assignedMachines.reduce((sum, am) => {
                                            const m = machines.find(mach => mach._id === am.machineId);
                                            return sum + (m ? (m.hourlyCost || 0) * (Number(am.hours) || 0) : 0);
                                        }, 0);
                                        if (totalMachineCost > 0) {
                                            return (
                                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex justify-between font-bold mt-2">
                                                    <span>Total Machine Operation Cost:</span>
                                                    <span>LKR {totalMachineCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-600 block mb-1">Operations Notes / Remarks</label>
                                <textarea
                                    placeholder="e.g. Standard batch conversion using primary dryer. Heat set to 60C."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>

                            <div className="flex justify-end pt-2 border-t">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={
                                        saving || 
                                        !canConvert || 
                                        (activeTab === 'recipe' && !selectedRecipe) || 
                                        (activeTab === 'direct' && !yieldPrediction && !destinationProductId)
                                    }
                                    className="w-full md:w-auto"
                                >
                                    <Save size={16} className="mr-1.5" /> 
                                    {saving ? 'Processing...' : activeTab === 'recipe' ? 'Convert via Formula' : 'Convert Stock Directly'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                {/* INFO PANEL (SIDEBAR OF PAGE) */}
                <div className="space-y-6">
                    {/* Cost Summary Cards */}
                    {(selectedRecipe || yieldPrediction || destinationProductId) && inputQuantity && yieldOutputQty > 0 && (
                        <Card className="p-5 border-primary-100 bg-primary-50/5 space-y-4">
                            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-1.5">
                                <Info size={15} className="text-primary-500" />
                                <span>Cost & Efficiency Summary</span>
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <span className="text-gray-400 block uppercase font-bold tracking-wider text-[10px]">Produces Item</span>
                                    <span className="font-extrabold text-sm text-gray-805">
                                        {activeTab === 'recipe' 
                                            ? selectedRecipe.destinationProductId?.name 
                                            : (yieldPrediction ? yieldPrediction.outputProduct?.name : activeDestProd?.name)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 border-t pt-2.5 text-xs">
                                    <div>
                                        <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[9px]">Material Cost</span>
                                        <span className="font-bold text-gray-700">{fmt(materialCostTotal)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-405 block font-semibold uppercase tracking-wider text-[9px]">Labor Cost</span>
                                        <span className="font-bold text-gray-700">{fmt(Number(laborCost || 0))}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-405 block font-semibold uppercase tracking-wider text-[9px]">Overhead Cost</span>
                                        <span className="font-bold text-gray-700">{fmt(Number(overheadCost || 0))}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-405 block font-semibold uppercase tracking-wider text-[9px]">Total Cost</span>
                                        <span className="font-bold text-gray-800">{fmt(totalProductionCost)}</span>
                                    </div>
                                </div>

                                <div className="border-t pt-2.5 grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-gray-405 block font-semibold uppercase tracking-wider text-[9px]">Wastage</span>
                                        <span className="font-extrabold text-amber-600">{wastageKg.toFixed(2)} Kg</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-405 block font-semibold uppercase tracking-wider text-[9px]">Efficiency</span>
                                        <span className={`font-extrabold ${efficiencyPct >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>{efficiencyPct.toFixed(1)}%</span>
                                    </div>
                                </div>

                                <div className="border-t pt-3 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/50 text-center">
                                    <span className="text-gray-500 block uppercase font-bold tracking-wider text-[9px]">Calculated Unit Cost</span>
                                    <span className="font-extrabold text-lg text-emerald-700">
                                        {fmt(calculatedUnitCost)} <span className="text-xs font-normal text-emerald-600">/ Kg</span>
                                    </span>
                                </div>

                                {/* Julian Batch Code preview */}
                                <div className="border-t pt-3">
                                    <span className="text-gray-405 block uppercase font-bold tracking-wider text-[10px] mb-1">Generated Julian Batch Code</span>
                                    <div className="bg-gray-800 text-emerald-400 px-3 py-2 rounded-lg font-mono text-xs font-bold text-center select-all tracking-wider shadow-inner">
                                        {getJulianBatchPreview(
                                            activeTab === 'recipe' 
                                                ? selectedRecipe.destinationProductId?.productShortCode || 'FIN' 
                                                : (yieldPrediction ? yieldPrediction.outputProduct?.productShortCode : activeDestProd?.productShortCode)
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* General instructions card */}
                    <Card className="p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 space-y-3">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Conversion Guide</h3>
                        <ul className="text-xs space-y-2 text-gray-500 pl-4 list-disc font-medium">
                            <li>Conversions will decrease raw material stock and increase finished goods stock in the selected warehouse in real-time.</li>
                            <li>Recipe-based conversions dynamically calculate finished goods yield based on crop input weights.</li>
                            <li>Actual labor and overhead costs roll up to compute the produced item's unit cost.</li>
                            <li>A completed production log will be automatically entered into the **Production Batches** registry with the generated Julian code.</li>
                        </ul>
                    </Card>

                </div>

            </div>
        </div>
    );
}
