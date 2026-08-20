import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { 
    Sparkles, Settings, Layers, Eye, FileText, Plus, ChevronRight, 
    Sliders, CheckCircle2, Package, Grid, AlertCircle, Info, Lock, ArrowLeftRight, 
    MoveLeft, MoveRight, Trash2, Wrench, RefreshCw, Box, ShoppingBag, ListPlus, FolderPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Alu2DInteractiveCanvas from '../components/aluminium/Alu2DInteractiveCanvas';
import ProfileCuttingVisualizer from '../components/aluminium/ProfileCuttingVisualizer';
import { calculateBOM } from '../utils/aluBOMCalculator';

const PRODUCT_CATEGORIES = [
    { id: 'Sliding Door', label: 'Sliding Door', defaultW: 2400, defaultH: 2100, defaultP: 2 },
    { id: 'Sliding Window', label: 'Sliding Window', defaultW: 1500, defaultH: 1200, defaultP: 2 },
    { id: 'Casement Door', label: 'Casement Door', defaultW: 900, defaultH: 2100, defaultP: 1 },
    { id: 'Casement Window', label: 'Casement Window', defaultW: 1200, defaultH: 1200, defaultP: 1 },
    { id: 'Awning / Top-Hung Window', label: 'Awning / Top-Hung', defaultW: 1200, defaultH: 800, defaultP: 1 },
    { id: 'Fixed Glass Partition', label: 'Fixed Glass Partition', defaultW: 1500, defaultH: 2400, defaultP: 1 },
    { id: 'Louver Window', label: 'Louver Window', defaultW: 600, defaultH: 1200, defaultP: 1 },
    { id: 'Folding / Bi-fold Door', label: 'Folding / Bi-fold Door', defaultW: 3000, defaultH: 2400, defaultP: 3 },
    { id: 'CUSTOM_PRODUCT', label: '✨ Custom Product / Formula', defaultW: 2000, defaultH: 2100, defaultP: 2 }
];

const AluConfiguratorPage = () => {
    const navigate = useNavigate();

    // Mode: 'standard' (Automatic Formula BOM) vs 'custom' (Ad-Hoc Manual BOM Builder)
    const [calculationMode, setCalculationMode] = useState('standard');

    // Multi-Item Quotation Basket (for accumulating multiple items across different categories)
    const [projectBasket, setProjectBasket] = useState([]);

    // Configuration Inputs State
    const [appType, setAppType] = useState('Sliding Door');
    const [customProductName, setCustomProductName] = useState('Custom Aluminium Project');
    const [baseFormula, setBaseFormula] = useState('Sliding Door');
    const [dbTemplates, setDbTemplates] = useState([]);
    const [trackSystem, setTrackSystem] = useState('2-Track');
    const [panelCount, setPanelCount] = useState(2);
    
    // Custom Panel Arrangements (Fixed, Sliding, Casement, Awning, Louver)
    const [panelArrangement, setPanelArrangement] = useState([
        { id: 0, action: 'slide_right' },
        { id: 1, action: 'slide_left' }
    ]);
    const [selectedPanelIndex, setSelectedPanelIndex] = useState(null);

    // Geometry Dimensions State
    const [width, setWidth] = useState(2400);
    const [height, setHeight] = useState(2100);
    const [quantity, setQuantity] = useState(1);

    // Vertical Sub-Division & Fanlight / Louver State
    const [topSection, setTopSection] = useState({
        enabled: false,
        height: 600,
        type: 'fixed' // 'fixed' | 'awning' | 'louver'
    });

    // Profit Margin % State
    const [profitMarginPercent, setProfitMarginPercent] = useState(20);

    // Active BOM View Tab State
    const [activeTab, setActiveTab] = useState('profiles'); // 'profiles' | 'glass' | 'accessories' | 'optimization' | 'summary'

    // Dynamic Database Rates State
    const [dbRates, setDbRates] = useState(null);

    // =========================================================================
    // CUSTOM AD-HOC BOM BUILDER STATE (FOR PROJECTS WITHOUT STANDARD FORMULA)
    // =========================================================================
    const [customProfiles, setCustomProfiles] = useState([
        { code: 'CUST-PROF-01', name: 'Custom Aluminium Outer Frame Profile', length: 2400, qty: 2, unitRate: 850 },
        { code: 'CUST-PROF-02', name: 'Custom Aluminium Sash Stile Profile', length: 2100, qty: 4, unitRate: 720 }
    ]);

    const [customGlass, setCustomGlass] = useState([
        { section: 'Main Panel Glass Pane', type: '6mm Clear Tempered Safety Glass', width: 1100, height: 2000, qty: 2, unitRate: 450 }
    ]);

    const [customAccessories, setCustomAccessories] = useState([
        { code: 'CUST-ACC-01', name: 'Heavy Duty Mortise Lock Set', qty: 1, unit: 'pcs', unitRate: 4500 },
        { code: 'CUST-ACC-02', name: 'EPDM Heavy Weather Seal Gasket', qty: 12, unit: 'm', unitRate: 150 }
    ]);

    // Labour Mode in Custom & Standard: 'fixed' (LKR amount) vs 'percentage' (% of material cost)
    const [customLabourType, setCustomLabourType] = useState('fixed');
    const [customLabourValue, setCustomLabourValue] = useState(7500);

    // Custom Hardware Add-ons & Extra Items State
    const [customAddons, setCustomAddons] = useState([]);

    // Fetch real-time rates and application templates from Database
    useEffect(() => {
        const fetchRates = async () => {
            try {
                const [pRes, gRes, aRes, tRes] = await Promise.all([
                    api.get('/alu/profiles').catch(() => ({ data: { data: [] } })),
                    api.get('/alu/glass').catch(() => ({ data: { data: [] } })),
                    api.get('/alu/accessories').catch(() => ({ data: { data: [] } })),
                    api.get('/alu/applications').catch(() => ({ data: { data: [] } }))
                ]);

                const profiles = pRes.data?.data || [];
                const glass = gRes.data?.data || [];
                const accessories = aRes.data?.data || [];
                const templates = tRes.data?.data || tRes.data || [];
                setDbTemplates(templates);

                const profMap = {};
                profiles.forEach(p => {
                    const pricePerM = p.standardLengths?.length > 0
                        ? (p.standardLengths[0].price / (p.standardLengths[0].lengthMm / 1000))
                        : 0;
                    profMap[p.profileCode] = { name: p.description, ratePerM: pricePerM, code: p.profileCode };
                });

                const glassMap = {};
                glass.forEach(g => {
                    glassMap[g.typeName] = { name: g.typeName, ratePerSqFt: g.ratePerSqFt || 0, ratePerSqM: g.ratePerSqM || 0 };
                });

                const accMap = {};
                accessories.forEach(a => {
                    accMap[a.code] = { name: a.name, unitRate: a.sellingRate || a.purchaseRate || 0, unit: a.unit };
                });

                setDbRates({
                    profiles: profMap,
                    glass: glassMap,
                    accessories: accMap
                });
            } catch (err) {
                console.log('Error fetching DB rates:', err);
            }
        };
        fetchRates();
    }, []);

    // Update panel arrangement array when panelCount changes or preset selection
    const applyPresetConfiguration = (presetKey, pCount = panelCount, tSys = trackSystem, currentApp = appType) => {
        let newArrangement = [];
        const isCasement = currentApp.toLowerCase().includes('casement');
        const isFixed = currentApp.toLowerCase().includes('fixed');
        const isAwning = currentApp.toLowerCase().includes('awning') || currentApp.toLowerCase().includes('hung');
        const isLouver = currentApp.toLowerCase().includes('louver');
        const isFolding = currentApp.toLowerCase().includes('fold');

        if (pCount === 1) {
            let act = 'slide_right';
            if (isFixed) act = 'fixed';
            else if (isCasement) act = 'casement_left';
            else if (isAwning) act = 'awning_top';
            else if (isLouver) act = 'louver';
            newArrangement = [{ id: 0, action: act }];
        } else if (presetKey === '2panel_casement') {
            newArrangement = [
                { id: 0, action: 'casement_left' },
                { id: 1, action: 'casement_right' }
            ];
        } else if (presetKey === '2panel_standard') {
            newArrangement = [
                { id: 0, action: 'slide_right' },
                { id: 1, action: 'slide_left' }
            ];
        } else if (presetKey === '3panel_2track') {
            newArrangement = [
                { id: 0, action: 'fixed' },
                { id: 1, action: 'slide_left' },
                { id: 2, action: 'slide_right' }
            ];
        } else if (presetKey === '3panel_3track') {
            newArrangement = [
                { id: 0, action: 'slide_right' },
                { id: 1, action: 'slide_right' },
                { id: 2, action: 'slide_left' }
            ];
        } else if (presetKey === '4panel_center_slide') {
            newArrangement = [
                { id: 0, action: 'fixed' },
                { id: 1, action: 'slide_right' },
                { id: 2, action: 'slide_left' },
                { id: 3, action: 'fixed' }
            ];
        } else {
            for (let i = 0; i < pCount; i++) {
                let defaultAct = 'slide_right';
                if (isFixed) defaultAct = 'fixed';
                else if (isCasement) defaultAct = i % 2 === 0 ? 'casement_left' : 'casement_right';
                else if (isAwning) defaultAct = 'awning_top';
                else if (isLouver) defaultAct = 'louver';
                else if (isFolding) defaultAct = 'fold_left';
                else defaultAct = (i === 0 || i === pCount - 1) ? 'fixed' : 'slide_right';

                newArrangement.push({ id: i, action: defaultAct });
            }
        }
        setPanelArrangement(newArrangement);
    };

    // Handle Panel Count Button Change (1 to 6 Panels)
    const handlePanelCountChange = (count) => {
        const pCount = Math.max(1, Math.min(6, count));
        setPanelCount(pCount);
        
        if (pCount === 1) {
            setTrackSystem('1-Track');
            applyPresetConfiguration('1panel', 1, '1-Track');
        } else if (pCount === 2) {
            setTrackSystem('2-Track');
            if (appType.toLowerCase().includes('casement')) {
                applyPresetConfiguration('2panel_casement', 2, '2-Track');
            } else {
                applyPresetConfiguration('2panel_standard', 2, '2-Track');
            }
        } else if (pCount === 3) {
            applyPresetConfiguration('3panel_2track', 3, trackSystem);
        } else if (pCount === 4) {
            applyPresetConfiguration('4panel_center_slide', 4, trackSystem);
        } else {
            applyPresetConfiguration('custom_multi', pCount, trackSystem);
        }
    };

    // Change action for a specific panel in custom arrangement grid
    const handlePanelActionChange = (index, action) => {
        setPanelArrangement(prev => {
            const next = [...prev];
            if (next[index]) {
                next[index] = { ...next[index], action };
            }
            return next;
        });
    };

    // Handle Application Category Select
    const handleAppTypeSelect = (catId) => {
        setAppType(catId);
        if (catId === 'CUSTOM_PRODUCT') {
            setBaseFormula('Sliding Door');
            applyPresetConfiguration('default', 2, trackSystem, 'Sliding Door');
            return;
        }
        const catObj = PRODUCT_CATEGORIES.find(c => c.id === catId);
        if (catObj) {
            setWidth(catObj.defaultW);
            setHeight(catObj.defaultH);
            setPanelCount(catObj.defaultP);
            applyPresetConfiguration('default', catObj.defaultP, trackSystem, catId);
        }
    };

    // Handle Multi-Track System selection (1-Track, 2-Track, 3-Track, 4-Track)
    const handleTrackSystemSelect = (t) => {
        setTrackSystem(t);
        if (t === '1-Track') {
            setPanelCount(1);
            applyPresetConfiguration('1panel', 1, '1-Track');
        } else if (t === '3-Track') {
            setPanelCount(3);
            applyPresetConfiguration('3panel_3track', 3, '3-Track');
        } else if (t === '4-Track') {
            setPanelCount(4);
            applyPresetConfiguration('4panel_center_slide', 4, '4-Track');
        } else if (t === '2-Track') {
            setPanelCount(2);
            applyPresetConfiguration('2panel_standard', 2, '2-Track');
        }
    };

    const handleAddPresetAddon = (name, cost) => {
        setCustomAddons(prev => [
            ...prev,
            { name, qty: 1, unitRate: cost, cost }
        ]);
        toast.success(`Added ${name} to quotation BOM!`);
    };

    const [selectedTemplate, setSelectedTemplate] = useState(null);

    const activeAppType = appType === 'CUSTOM_PRODUCT' ? customProductName : appType;
    const activeFormula = appType === 'CUSTOM_PRODUCT' ? baseFormula : appType;

    // Real-Time Dynamic BOM Calculation
    const bomResult = useMemo(() => {
        return calculateBOM({
            appType: activeAppType,
            baseFormula: activeFormula,
            selectedTemplate: appType === 'CUSTOM_PRODUCT' ? selectedTemplate : null,
            width: Number(width) || 0,
            height: Number(height) || 0,
            trackSystem,
            panelCount,
            panelArrangement,
            topSection,
            quantity: Number(quantity) || 1,
            profitMarginPercent: Number(profitMarginPercent) || 0,
            rates: dbRates,
            customAddons,
            calculationMode,
            customProfiles,
            customGlass,
            customAccessories,
            customLabourType,
            customLabourValue
        });
    }, [activeAppType, activeFormula, selectedTemplate, width, height, trackSystem, panelCount, panelArrangement, topSection, quantity, profitMarginPercent, dbRates, customAddons, calculationMode, customProfiles, customGlass, customAccessories, customLabourType, customLabourValue]);

    // Build single opening object from current state
    const getCurrentOpeningItem = () => {
        const configTitle = calculationMode === 'custom'
            ? `${activeAppType} (Custom Ad-Hoc BOM)`
            : `${panelCount} Panel ${activeAppType} (${trackSystem})`;
        
        return {
            applicationType: activeAppType,
            configuration: configTitle,
            width: Number(width),
            height: Number(height),
            quantity: Number(quantity),
            profileSpec: `Swisstek 100mm Series (${activeAppType})`,
            glassSpec: '5mm / 6mm Single Tempered Clear Glass',
            hardwareSpec: 'Heavy Duty Locks, Bearings, Hinges & EPDM Seals',
            scopeSpec: 'Fabrication, Delivery & Installation Inclusive',
            profileCuts: bomResult.profileCuts,
            glassItems: bomResult.glassItems,
            accessories: bomResult.accessories,
            labourCost: bomResult.summary.totalLabourCost,
            unitPrice: Math.round(bomResult.summary.finalSellingPrice / (Number(quantity) || 1)),
            totalPrice: bomResult.summary.finalSellingPrice,
            topSection,
            panelArrangement,
            trackSystem
        };
    };

    // Add current configured item to project basket (allows adding multiple different openings into 1 quotation)
    const handleAddToBasket = () => {
        const item = getCurrentOpeningItem();
        setProjectBasket(prev => [...prev, item]);
        toast.success(`Added ${activeAppType} (${quantity} Units) to project basket! Total: ${projectBasket.length + 1} Openings`);
    };

    const handleRemoveFromBasket = (index) => {
        setProjectBasket(prev => prev.filter((_, i) => i !== index));
        toast.success('Removed opening from project basket');
    };

    // Handle Create Quotation (Supports single item OR all multi-category items from basket!)
    const handleAddToQuotation = () => {
        let itemsToSubmit = [...projectBasket];
        if (itemsToSubmit.length === 0) {
            itemsToSubmit.push(getCurrentOpeningItem());
        }

        const projectTitle = itemsToSubmit.length > 1
            ? `Multi-Opening Project (${itemsToSubmit.length} Openings)`
            : `${itemsToSubmit[0].applicationType} - ${itemsToSubmit[0].configuration}`;

        toast.success(`Preparing quotation with ${itemsToSubmit.length} openings...`);
        navigate('/alu/quotations/new', {
            state: {
                projectName: projectTitle,
                items: itemsToSubmit
            }
        });
    };

    return (
        <div className="p-4 md:p-6 max-w-[1650px] mx-auto space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                            ALUECO 2D CAD & BOM ENGINE
                        </span>
                        {calculationMode === 'custom' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <Wrench size={12} /> Custom Ad-Hoc Mode Active
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5 mt-1">
                        <Sparkles className="text-indigo-600 animate-pulse" size={28} /> Advanced 2D Window &amp; Door Configurator
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                        Design 1-Panel to Multi-Panel sliding, casement, fixed, awning &amp; louver systems with real-time CAD sketch and automatic BOM formulas or custom ad-hoc costing.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Calculation Mode Toggle Button */}
                    <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                        <button
                            onClick={() => setCalculationMode('standard')}
                            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${calculationMode === 'standard' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <Box size={14} /> Standard BOM
                        </button>
                        <button
                            onClick={() => setCalculationMode('custom')}
                            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${calculationMode === 'custom' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <Wrench size={14} /> Custom Ad-Hoc BOM
                        </button>
                    </div>

                    {/* Add to Basket Button */}
                    <Button
                        onClick={handleAddToBasket}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-2.5 px-4 rounded-xl text-xs md:text-sm transition-all shadow-xs flex items-center gap-2"
                    >
                        <ShoppingBag size={16} /> Add to Basket
                        {projectBasket.length > 0 && (
                            <span className="bg-indigo-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full">
                                {projectBasket.length}
                            </span>
                        )}
                    </Button>

                    {/* Finalize Quotation Button */}
                    <Button
                        onClick={handleAddToQuotation}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs md:text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        <Plus size={16} /> {projectBasket.length > 0 ? `Create Quotation (${projectBasket.length} Openings)` : 'Create Quotation'}
                    </Button>
                </div>
            </div>

            {/* Main Configurator Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ======================================================== */}
                {/* 1. LEFT CONTROL PANEL (CONFIGURATIONS & SYSTEM INPUTS)    */}
                {/* ======================================================== */}
                <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                    
                    {/* Section 1: Product Category Selection */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b pb-2 flex items-center gap-1.5">
                            <Layers size={16} /> 1. Product Type &amp; Architectural Category
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-2">
                            {PRODUCT_CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleAppTypeSelect(cat.id)}
                                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold text-left transition-all border ${appType === cat.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500/20 font-black' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* BOM Source Selector: Standard Formula | Saved ERP Template | Custom Ad-Hoc */}
                        <div className="pt-1.5 space-y-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">BOM Formula Source</label>
                            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl text-[10.5px] font-bold">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCalculationMode('standard');
                                        setSelectedTemplate(null);
                                    }}
                                    className={`py-1.5 px-1 rounded-lg transition-all text-center ${calculationMode === 'standard' && !selectedTemplate ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:bg-white/80'}`}
                                >
                                    ⚡ Standard
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCalculationMode('standard');
                                        if (dbTemplates.length > 0 && !selectedTemplate) {
                                            const match = dbTemplates.find(t => t.type.toLowerCase().includes(appType.toLowerCase().split(' ')[0])) || dbTemplates[0];
                                            setSelectedTemplate(match);
                                        }
                                    }}
                                    className={`py-1.5 px-1 rounded-lg transition-all text-center ${selectedTemplate ? 'bg-emerald-600 text-white shadow-xs font-black' : 'text-slate-600 hover:bg-white/80'}`}
                                >
                                    📁 ERP Template
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCalculationMode('custom');
                                        setSelectedTemplate(null);
                                    }}
                                    className={`py-1.5 px-1 rounded-lg transition-all text-center ${calculationMode === 'custom' ? 'bg-amber-500 text-slate-950 shadow-xs font-black' : 'text-slate-600 hover:bg-white/80'}`}
                                >
                                    🛠️ Custom Ad-Hoc
                                </button>
                            </div>

                            {/* Saved ERP Template Selection Dropdown when active */}
                            {selectedTemplate && (
                                <div className="space-y-2 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 mt-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Select Saved ERP Template</label>
                                        <button 
                                            onClick={() => setSelectedTemplate(null)} 
                                            className="text-[10px] font-bold text-slate-400 hover:text-slate-700 underline"
                                        >
                                            Reset to Standard
                                        </button>
                                    </div>
                                    <select
                                        value={selectedTemplate._id}
                                        onChange={(e) => {
                                            const t = dbTemplates.find(x => x._id === e.target.value);
                                            if (t) {
                                                setSelectedTemplate(t);
                                                setCustomProductName(`${t.type} (${t.configuration})`);
                                                setBaseFormula(t.type);
                                            }
                                        }}
                                        className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs text-emerald-950 font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        {dbTemplates.map(t => (
                                            <option key={t._id} value={t._id}>
                                                {t.type} - {t.configuration} ({t.brand || 'Standard'})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="p-2 bg-white rounded-lg border border-emerald-100 text-[10px] text-slate-600 space-y-0.5">
                                        <div className="flex justify-between font-bold text-slate-800">
                                            <span>{selectedTemplate.type} ({selectedTemplate.configuration})</span>
                                            <span className="text-emerald-700 font-extrabold">{selectedTemplate.brand || 'Standard'}</span>
                                        </div>
                                        <div className="text-slate-500">
                                            Profiles: <b>{selectedTemplate.profileBOM?.length || 0}</b> | Glass: <b>{selectedTemplate.glassBOM?.length || 0}</b> | Labour: <b>{selectedTemplate.labourRate} LKR</b>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Custom Ad-Hoc Notification Banner when active */}
                            {calculationMode === 'custom' && (
                                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between">
                                    <span>🛠️ Custom Ad-Hoc BOM Active (Edit items below canvas)</span>
                                </div>
                            )}
                        </div>

                        {/* Custom Product Name for custom products */}
                        {appType === 'CUSTOM_PRODUCT' && (
                            <div className="pt-2">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Custom Product Name / Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Shower Cubicle Partition, Shopfront French Door"
                                    value={customProductName}
                                    onChange={(e) => setCustomProductName(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                                />
                            </div>
                        )}

                        {/* Track System Selector (for Sliding systems) */}
                        {activeFormula.toLowerCase().includes('sliding') && (
                            <div className="space-y-1 pt-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Multi-Track System</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['2-Track', '3-Track', '4-Track'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => handleTrackSystemSelect(t)}
                                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${trackSystem === t ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 2: Panel Count & Arrangement (With 1-Panel Option!) */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                                <Grid size={16} /> 2. Panel Count & Presets
                            </h3>
                            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                                {panelCount} {panelCount === 1 ? 'Panel (Single)' : 'Panels'}
                            </span>
                        </div>

                        {/* Panel Count Buttons (1 to 6 Panels) */}
                        <div className="grid grid-cols-6 gap-1 bg-slate-100 p-1 rounded-xl">
                            {[1, 2, 3, 4, 5, 6].map(count => (
                                <button
                                    key={count}
                                    onClick={() => handlePanelCountChange(count)}
                                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${panelCount === count ? 'bg-indigo-600 text-white shadow-sm font-black' : 'text-slate-600 hover:text-slate-900 bg-white'}`}
                                >
                                    {count} P
                                </button>
                            ))}
                        </div>

                        {/* Quick Presets based on Product Type */}
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Presets for {appType}</label>
                            <div className="space-y-1.5 text-xs">
                                {panelCount === 1 ? (
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            onClick={() => applyPresetConfiguration('1panel_fixed', 1, trackSystem, 'Fixed Glass Partition')}
                                            className="p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left font-semibold text-slate-700"
                                        >
                                            1P Fixed Glass
                                        </button>
                                        <button
                                            onClick={() => applyPresetConfiguration('1panel_casement', 1, trackSystem, 'Casement Window')}
                                            className="p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left font-semibold text-slate-700"
                                        >
                                            1P Casement Vent
                                        </button>
                                        <button
                                            onClick={() => applyPresetConfiguration('1panel_awning', 1, trackSystem, 'Awning / Top-Hung Window')}
                                            className="p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left font-semibold text-slate-700"
                                        >
                                            1P Top-Hung Awning
                                        </button>
                                        <button
                                            onClick={() => applyPresetConfiguration('1panel_louver', 1, trackSystem, 'Louver Window')}
                                            className="p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left font-semibold text-slate-700"
                                        >
                                            1P Louver Panel
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => { setPanelCount(2); applyPresetConfiguration('2panel_standard', 2, '2-Track'); }}
                                            className="w-full text-left p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex justify-between items-center"
                                        >
                                            <span className="font-semibold text-slate-700">2-Panel Standard Slide</span>
                                            <span className="text-[10px] text-slate-400 font-mono">2-Track</span>
                                        </button>
                                        <button
                                            onClick={() => { setPanelCount(3); applyPresetConfiguration('3panel_2track', 3, '2-Track'); }}
                                            className="w-full text-left p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex justify-between items-center"
                                        >
                                            <span className="font-semibold text-slate-700">3-Panel Center Slide (1 Fixed, 2 Slide)</span>
                                            <span className="text-[10px] text-slate-400 font-mono">2-Track</span>
                                        </button>
                                        <button
                                            onClick={() => { setPanelCount(4); applyPresetConfiguration('4panel_center_slide', 4, '2-Track'); }}
                                            className="w-full text-left p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex justify-between items-center"
                                        >
                                            <span className="font-semibold text-slate-700">4-Panel Center Slide (Outer Fixed)</span>
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">Popular</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Per-Panel Customization Grid */}
                        <div className="space-y-1.5 pt-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Per-Panel Opening Setup</label>
                            <div className="grid grid-cols-2 gap-2">
                                {panelArrangement.map((p, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => setSelectedPanelIndex(idx)}
                                        className={`p-2 rounded-xl border transition-all cursor-pointer ${selectedPanelIndex === idx ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20' : 'border-slate-200 bg-slate-50'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[11px] font-black text-slate-700">Panel #{idx + 1}</span>
                                            {p.action === 'fixed' ? (
                                                <Lock size={12} className="text-slate-400" />
                                            ) : (
                                                <ArrowLeftRight size={12} className="text-sky-500" />
                                            )}
                                        </div>
                                        <select
                                            value={p.action}
                                            onChange={(e) => handlePanelActionChange(idx, e.target.value)}
                                            className="w-full text-[11px] font-bold p-1 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="fixed">Fixed Glass (අචල)</option>
                                            <option value="slide_left">Slide Left (◀)</option>
                                            <option value="slide_right">Slide Right (▶)</option>
                                            <option value="slide_both">Bi-Slide (◀▶)</option>
                                            <option value="casement_left">Casement Left (Hinged Left)</option>
                                            <option value="casement_right">Casement Right (Hinged Right)</option>
                                            <option value="awning_top">Awning (Top Hung)</option>
                                            <option value="louver">Louver Slats</option>
                                            <option value="fold_left">Bi-Fold Accordion</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Overall Dimensions */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                            <Sliders size={16} /> 3. Dimensions & Quantity
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Outer Width (mm)</label>
                                <input
                                    type="number"
                                    value={width}
                                    onChange={(e) => setWidth(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Height (mm)</label>
                                <input
                                    type="number"
                                    value={height}
                                    onChange={(e) => setHeight(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Openings Quantity</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Profit Margin %</label>
                                <input
                                    type="number"
                                    value={profitMarginPercent}
                                    onChange={(e) => setProfitMarginPercent(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-emerald-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Vertical Sub-Division (Fanlight / Louvers) */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                                <Layers size={16} /> 4. Vertical Sub-Division (Fanlight)
                            </h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={topSection.enabled}
                                    onChange={(e) => setTopSection(prev => ({ ...prev, enabled: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {topSection.enabled && (
                            <div className="space-y-3 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100">
                                <div>
                                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                                        <span>Top Section Height (H_top):</span>
                                        <span className="text-indigo-600 font-mono">{topSection.height} mm</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="200"
                                        max={Math.max(250, height - 400)}
                                        value={topSection.height}
                                        onChange={(e) => setTopSection(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                                        className="w-full accent-indigo-600"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Top Section Type</label>
                                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/60 rounded-xl">
                                        {[
                                            { id: 'fixed', label: 'Top Fixed (X)' },
                                            { id: 'awning', label: 'Top Hung (▲)' },
                                            { id: 'louver', label: 'Louver Blades' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setTopSection(prev => ({ ...prev, type: opt.id }))}
                                                className={`py-2 px-2 rounded-lg text-[10px] font-bold transition-all border ${topSection.type === opt.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ======================================================== */}
                {/* 2. CENTER & RIGHT PANELS (2D CAD CANVAS & ESTIMATION)     */}
                {/* ======================================================== */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Project Openings Basket Banner (When accumulating multi-category openings) */}
                    {projectBasket.length > 0 && (
                        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-2xl border-2 border-indigo-400/50 shadow-lg space-y-3">
                            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-indigo-800/80 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <ShoppingBag className="text-indigo-400" size={20} />
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-wider text-indigo-100 flex items-center gap-2">
                                            Project Quotation Basket 
                                            <span className="bg-indigo-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                                {projectBasket.length} {projectBasket.length === 1 ? 'Opening' : 'Openings'}
                                            </span>
                                        </h3>
                                        <p className="text-[11px] text-slate-300 font-medium">
                                            These items from various categories will be combined into a single unified quotation.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-300">
                                        Combined Total: <strong className="text-emerald-400 font-black text-base">LKR {projectBasket.reduce((sum, it) => sum + it.totalPrice, 0).toLocaleString()}</strong>
                                    </span>
                                    <button
                                        onClick={() => setProjectBasket([])}
                                        className="text-[11px] font-bold text-rose-300 hover:text-rose-100 underline"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {projectBasket.map((item, idx) => (
                                    <div key={idx} className="p-2.5 bg-slate-800/90 rounded-xl border border-indigo-500/30 flex justify-between items-center text-xs">
                                        <div>
                                            <div className="font-extrabold text-indigo-200">{item.applicationType}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{item.width} &times; {item.height} mm &bull; <b className="text-emerald-400">{item.quantity} Qty</b></div>
                                            <div className="text-[11px] font-bold text-emerald-400 font-mono mt-0.5">LKR {item.totalPrice.toLocaleString()}</div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFromBasket(idx)}
                                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-900/30 rounded-lg transition"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end pt-1">
                                <Button
                                    onClick={handleAddToQuotation}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-2 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md transition"
                                >
                                    <CheckCircle2 size={16} /> Proceed &amp; Create Combined Quotation ({projectBasket.length} Openings)
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {/* 2D Interactive CAD Visualizer */}
                    <Alu2DInteractiveCanvas
                        appType={activeFormula}
                        width={Number(width) || 2400}
                        height={Number(height) || 2100}
                        trackSystem={trackSystem}
                        panelCount={panelCount}
                        panelArrangement={panelArrangement}
                        topSection={topSection}
                        selectedPanelIndex={selectedPanelIndex}
                        onSelectPanel={(idx) => setSelectedPanelIndex(idx)}
                        customAddons={customAddons}
                    />

                    {/* Estimation Costing Overview Banner */}
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 rounded-2xl text-white shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                        <div>
                            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Raw Cost</span>
                            <span className="text-lg md:text-xl font-black text-slate-100">
                                LKR {bomResult.summary.totalRawCost.toLocaleString()}
                            </span>
                            {Number(quantity) > 1 && (
                                <span className="block text-[10px] text-slate-400 font-mono">
                                    LKR {Math.round(bomResult.summary.totalRawCost / quantity).toLocaleString()} / unit
                                </span>
                            )}
                        </div>
                        <div>
                            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Profit Margin ({profitMarginPercent}%)</span>
                            <span className="text-lg md:text-xl font-black text-emerald-400">
                                LKR {bomResult.summary.profitMargin.toLocaleString()}
                            </span>
                            <span className="block text-[10px] text-indigo-300 font-bold">
                                Qty: {quantity} {quantity > 1 ? 'Openings' : 'Opening'}
                            </span>
                        </div>
                        <div className="col-span-1 sm:col-span-2 lg:col-span-2 bg-emerald-900/40 p-3.5 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">Total Estimated Selling Price</span>
                                    {Number(quantity) > 1 && (
                                        <span className="text-[9px] bg-emerald-700/60 text-white font-bold px-1.5 py-0.2 rounded">
                                            {quantity} Units
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl md:text-2xl font-black text-emerald-400">
                                        LKR {bomResult.summary.finalSellingPrice.toLocaleString()}
                                    </span>
                                </div>
                                {Number(quantity) > 1 && (
                                    <span className="text-[11px] font-bold text-emerald-200 block font-mono">
                                        Unit Rate: LKR {Math.round(bomResult.summary.finalSellingPrice / quantity).toLocaleString()} / unit
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={handleAddToBasket}
                                    className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-700 shadow-sm"
                                >
                                    <ShoppingBag size={14} /> Add to Basket
                                </button>
                                <Button
                                    onClick={handleAddToQuotation}
                                    className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-2 px-4 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                                >
                                    <Plus size={15} /> {projectBasket.length > 0 ? `Create Quotation (${projectBasket.length})` : 'Create Quotation'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* ==================================================================== */}
                    {/* CUSTOM AD-HOC BOM BUILDER SECTION (IF CUSTOM AD-HOC MODE ACTIVE)    */}
                    {/* ==================================================================== */}
                    {calculationMode === 'custom' && (
                        <div className="bg-white p-5 rounded-2xl border-2 border-amber-400 shadow-sm space-y-4">
                            <div className="flex justify-between items-center border-b pb-3">
                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                                        <Wrench className="text-amber-500" size={18} /> Custom / Ad-Hoc Itemized BOM Builder
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Use this builder when your project opening has unique custom profiles, glass sizes, or hardware outside standard formulas.
                                    </p>
                                </div>
                            </div>

                            {/* 1. Custom Aluminium Profiles */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase">1. Custom Aluminium Profiles ({customProfiles.length})</h4>
                                    <button
                                        onClick={() => setCustomProfiles(prev => [...prev, { code: `CUST-PROF-${prev.length + 1}`, name: 'Custom Profile', length: 2400, qty: 1, unitRate: 800 }])}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                    >
                                        <Plus size={14} /> Add Profile
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    {customProfiles.map((p, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                                            <input
                                                type="text"
                                                placeholder="Profile Description"
                                                value={p.name}
                                                onChange={(e) => {
                                                    const next = [...customProfiles];
                                                    next[idx].name = e.target.value;
                                                    setCustomProfiles(next);
                                                }}
                                                className="col-span-4 px-2 py-1 bg-white border border-slate-200 rounded-lg font-semibold"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Length mm"
                                                value={p.length}
                                                onChange={(e) => {
                                                    const next = [...customProfiles];
                                                    next[idx].length = Number(e.target.value);
                                                    setCustomProfiles(next);
                                                }}
                                                className="col-span-2 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-mono"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                value={p.qty}
                                                onChange={(e) => {
                                                    const next = [...customProfiles];
                                                    next[idx].qty = Number(e.target.value);
                                                    setCustomProfiles(next);
                                                }}
                                                className="col-span-2 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Rate/m"
                                                value={p.unitRate}
                                                onChange={(e) => {
                                                    const next = [...customProfiles];
                                                    next[idx].unitRate = Number(e.target.value);
                                                    setCustomProfiles(next);
                                                }}
                                                className="col-span-3 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-mono"
                                            />
                                            <button
                                                onClick={() => setCustomProfiles(prev => prev.filter((_, i) => i !== idx))}
                                                className="col-span-1 text-rose-500 hover:text-rose-700 text-center"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Custom Glass Panes */}
                            <div className="space-y-2 pt-2 border-t">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase">2. Custom Glass Panes ({customGlass.length})</h4>
                                    <button
                                        onClick={() => setCustomGlass(prev => [...prev, { section: 'Glass Pane', type: '5mm Clear', width: 1200, height: 2100, qty: 1, unitRate: 400 }])}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                    >
                                        <Plus size={14} /> Add Glass Pane
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    {customGlass.map((g, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                                            <input
                                                type="text"
                                                placeholder="Glass Type"
                                                value={g.type}
                                                onChange={(e) => {
                                                    const next = [...customGlass];
                                                    next[idx].type = e.target.value;
                                                    setCustomGlass(next);
                                                }}
                                                className="col-span-4 px-2 py-1 bg-white border border-slate-200 rounded-lg font-semibold"
                                            />
                                            <input
                                                type="number"
                                                placeholder="W (mm)"
                                                value={g.width}
                                                onChange={(e) => {
                                                    const next = [...customGlass];
                                                    next[idx].width = Number(e.target.value);
                                                    setCustomGlass(next);
                                                }}
                                                className="col-span-2 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-mono"
                                            />
                                            <input
                                                type="number"
                                                placeholder="H (mm)"
                                                value={g.height}
                                                onChange={(e) => {
                                                    const next = [...customGlass];
                                                    next[idx].height = Number(e.target.value);
                                                    setCustomGlass(next);
                                                }}
                                                className="col-span-2 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-mono"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Rate/sqft"
                                                value={g.unitRate}
                                                onChange={(e) => {
                                                    const next = [...customGlass];
                                                    next[idx].unitRate = Number(e.target.value);
                                                    setCustomGlass(next);
                                                }}
                                                className="col-span-3 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-mono"
                                            />
                                            <button
                                                onClick={() => setCustomGlass(prev => prev.filter((_, i) => i !== idx))}
                                                className="col-span-1 text-rose-500 hover:text-rose-700 text-center"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. Custom Accessories & Labour */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-slate-700 uppercase">3. Hardware Accessories ({customAccessories.length})</h4>
                                        <button
                                            onClick={() => setCustomAccessories(prev => [...prev, { code: `CUST-ACC-${prev.length + 1}`, name: 'Accessory', qty: 1, unit: 'pcs', unitRate: 500 }])}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                        >
                                            <Plus size={14} /> Add Accessory
                                        </button>
                                    </div>
                                    {customAccessories.map((a, idx) => (
                                        <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                                            <input
                                                type="text"
                                                placeholder="Hardware Name"
                                                value={a.name}
                                                onChange={(e) => {
                                                    const next = [...customAccessories];
                                                    next[idx].name = e.target.value;
                                                    setCustomAccessories(next);
                                                }}
                                                className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg font-semibold"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                value={a.qty}
                                                onChange={(e) => {
                                                    const next = [...customAccessories];
                                                    next[idx].qty = Number(e.target.value);
                                                    setCustomAccessories(next);
                                                }}
                                                className="w-14 px-1 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Rate"
                                                value={a.unitRate}
                                                onChange={(e) => {
                                                    const next = [...customAccessories];
                                                    next[idx].unitRate = Number(e.target.value);
                                                    setCustomAccessories(next);
                                                }}
                                                className="w-20 px-1 py-1 bg-white border border-slate-200 rounded-lg text-right font-mono"
                                            />
                                            <button
                                                onClick={() => setCustomAccessories(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-rose-500 hover:text-rose-700"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-slate-700 uppercase">4. Fabrication &amp; Labour Charge</h4>
                                        <span className="text-xs font-black font-mono text-emerald-700">
                                            LKR {bomResult.summary.totalLabourCost.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Toggle: Fixed Amount vs % of Material Cost */}
                                    <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg border border-slate-200 text-[10.5px] font-bold">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCustomLabourType('fixed');
                                                if (customLabourValue < 100) setCustomLabourValue(7500);
                                            }}
                                            className={`py-1.5 rounded-md text-center transition ${customLabourType === 'fixed' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            Fixed Amount (LKR)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCustomLabourType('percentage');
                                                if (customLabourValue > 100) setCustomLabourValue(15);
                                            }}
                                            className={`py-1.5 rounded-md text-center transition ${customLabourType === 'percentage' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            % of Material Cost
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                            {customLabourType === 'percentage' ? 'Labour % of Raw Materials Cost' : 'Labour & Fabrication Cost per Opening (LKR)'}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={customLabourValue}
                                                onChange={(e) => setCustomLabourValue(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold font-mono text-sm text-indigo-700 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <span className="absolute right-3 top-2.5 text-xs font-black text-slate-400">
                                                {customLabourType === 'percentage' ? '%' : 'LKR'}
                                            </span>
                                        </div>
                                        {customLabourType === 'percentage' && (
                                            <span className="text-[10px] text-slate-500 font-medium block mt-1">
                                                Calculated: {customLabourValue}% of (Alu + Glass + Hardware) = <b>LKR {bomResult.summary.totalLabourCost.toLocaleString()}</b>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Detailed Dynamic BOM Breakdown Tabs */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        {/* Tab Headers */}
                        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-bold select-none">
                            {[
                                { id: 'profiles', label: `Aluminium Profiles (${bomResult.profileCuts.length})` },
                                { id: 'glass', label: `Glass Panels (${bomResult.glassItems.length})` },
                                { id: 'accessories', label: `Accessories & Seals (${bomResult.accessories.length})` },
                                { id: 'optimization', label: '1D Cutting & Stock Optimization' },
                                { id: 'summary', label: 'Costing Summary' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-2.5 px-4 rounded-t-xl transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content: Profiles */}
                        {activeTab === 'profiles' && (
                            <div className="overflow-x-auto">
                                {bomResult.profileCuts.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                                        No aluminium profile cuts calculated. Enter dimensions (Width & Height) to calculate BOM.
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-xs font-sans">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] border-b">
                                                <th className="p-2.5">Profile Code</th>
                                                <th className="p-2.5">Description</th>
                                                <th className="p-2.5">Cut Length</th>
                                                <th className="p-2.5 text-center">Qty</th>
                                                <th className="p-2.5 text-right">Total Meters</th>
                                                <th className="p-2.5 text-right">Estimated Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bomResult.profileCuts.map((item, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="p-2.5 font-bold font-mono text-indigo-600">{item.code}</td>
                                                    <td className="p-2.5 font-semibold text-slate-700">{item.name}</td>
                                                    <td className="p-2.5 font-mono text-slate-600">{item.length} mm</td>
                                                    <td className="p-2.5 text-center font-bold text-slate-700">{item.qty}</td>
                                                    <td className="p-2.5 text-right font-mono text-slate-600">{item.totalLengthM.toFixed(2)} m</td>
                                                    <td className="p-2.5 text-right font-bold text-slate-800">LKR {Math.round(item.cost).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Tab Content: Glass */}
                        {activeTab === 'glass' && (
                            <div className="overflow-x-auto">
                                {bomResult.glassItems.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                                        No glass panels calculated. Enter dimensions (Width & Height) to calculate BOM.
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-xs font-sans">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] border-b">
                                                <th className="p-2.5">Section</th>
                                                <th className="p-2.5">Glass Type</th>
                                                <th className="p-2.5">Pane Cut Size</th>
                                                <th className="p-2.5 text-center">Qty</th>
                                                <th className="p-2.5 text-right">Total Area</th>
                                                <th className="p-2.5 text-right">Estimated Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bomResult.glassItems.map((g, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="p-2.5 font-bold text-slate-700">{g.section}</td>
                                                    <td className="p-2.5 font-semibold text-indigo-600">{g.type}</td>
                                                    <td className="p-2.5 font-mono text-slate-600">{g.width} × {g.height} mm</td>
                                                    <td className="p-2.5 text-center font-bold text-slate-700">{g.qty}</td>
                                                    <td className="p-2.5 text-right font-mono text-slate-600">{g.areaSqFt} sq.ft</td>
                                                    <td className="p-2.5 text-right font-bold text-slate-800">LKR {g.cost.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Tab Content: Accessories */}
                        {activeTab === 'accessories' && (
                            <div className="overflow-x-auto">
                                {bomResult.accessories.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                                        No hardware accessories or seals calculated. Enter dimensions (Width & Height) to calculate BOM.
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-xs font-sans">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] border-b">
                                                <th className="p-2.5">Item Code</th>
                                                <th className="p-2.5">Description</th>
                                                <th className="p-2.5 text-center">Quantity</th>
                                                <th className="p-2.5 text-right">Unit Rate</th>
                                                <th className="p-2.5 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bomResult.accessories.map((acc, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="p-2.5 font-bold font-mono text-indigo-600">{acc.code}</td>
                                                    <td className="p-2.5 font-semibold text-slate-700">{acc.name}</td>
                                                    <td className="p-2.5 text-center font-bold text-slate-700">{acc.qty} {acc.unit}</td>
                                                    <td className="p-2.5 text-right font-mono text-slate-600">LKR {acc.unitRate}</td>
                                                    <td className="p-2.5 text-right font-bold text-slate-800">LKR {acc.cost.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Tab Content: 1D Cutting Stock Optimization */}
                        {activeTab === 'optimization' && (
                            <ProfileCuttingVisualizer
                                profileCuts={bomResult.profileCuts}
                                profileCode="ALUECO-COMBINED"
                            />
                        )}

                        {/* Tab Content: Costing Summary */}
                        {activeTab === 'summary' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="font-bold text-slate-800 border-b pb-1">Raw Material Breakdown</h4>
                                    <div className="flex justify-between py-1 border-b text-slate-600">
                                        <span>Aluminium Profiles</span>
                                        <span className="font-bold text-slate-800">LKR {bomResult.summary.totalAluminiumCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b text-slate-600">
                                        <span>Glass Sheets</span>
                                        <span className="font-bold text-slate-800">LKR {bomResult.summary.totalGlassCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b text-slate-600">
                                        <span>Hardware Accessories & Seals</span>
                                        <span className="font-bold text-slate-800">LKR {bomResult.summary.totalAccessoriesCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-1 text-slate-600">
                                        <span>Assembly & Installation Labour</span>
                                        <span className="font-bold text-slate-800">LKR {bomResult.summary.totalLabourCost.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-2 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 text-emerald-950">
                                    <h4 className="font-bold border-b border-emerald-200 pb-1">Commercial Price Calculation</h4>
                                    <div className="flex justify-between py-1 border-b border-emerald-200">
                                        <span>Total Raw Cost</span>
                                        <span className="font-bold">LKR {bomResult.summary.totalRawCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-emerald-200">
                                        <span>Fabrication Margin ({profitMarginPercent}%)</span>
                                        <span className="font-bold text-emerald-700">LKR {bomResult.summary.profitMargin.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-2 text-base font-extrabold text-emerald-900 border-t border-emerald-300">
                                        <span>Final Selling Price</span>
                                        <span>LKR {bomResult.summary.finalSellingPrice.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AluConfiguratorPage;
