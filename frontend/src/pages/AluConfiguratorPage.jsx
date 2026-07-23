import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Layers, Settings, Eye, Info, Plus, ChevronRight, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';

const AluConfiguratorPage = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [categories, setCategories] = useState([]);
    const [configurations, setConfigurations] = useState([]);
    const [isTemplatesLoading, setIsTemplatesLoading] = useState(true);
    
    const [appType, setAppType] = useState('');
    const [config, setConfig] = useState('');
    const [width, setWidth] = useState(1800);
    const [height, setHeight] = useState(2100);
    const [quantity, setQuantity] = useState(1);
    
    // Calculated estimation preview
    const [estimations, setEstimations] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch active templates on mount
    useEffect(() => {
        const fetchTemplates = async () => {
            setIsTemplatesLoading(true);
            try {
                const res = await api.get('/alu/applications');
                if (res.data?.success) {
                    const allTemplates = res.data.data || [];
                    setTemplates(allTemplates);
                    
                    const uniqueCats = [...new Set(allTemplates.map(t => t.type))];
                    setCategories(uniqueCats);
                    
                    if (uniqueCats.length > 0) {
                        const defaultCat = uniqueCats[0];
                        setAppType(defaultCat);
                        
                        const catConfigs = allTemplates.filter(t => t.type === defaultCat);
                        setConfigurations(catConfigs);
                        
                        if (catConfigs.length > 0) {
                            setConfig(catConfigs[0].configuration);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load BOM templates', err);
                toast.error('Failed to load BOM templates');
            } finally {
                setIsTemplatesLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    const handleCategoryChange = (newCat) => {
        setAppType(newCat);
        const catConfigs = templates.filter(t => t.type === newCat);
        setConfigurations(catConfigs);
        if (catConfigs.length > 0) {
            setConfig(catConfigs[0].configuration);
        } else {
            setConfig('');
        }
    };

    const handleAddToQuotation = () => {
        if (!appType || !config) {
            toast.error('Please select a valid BOM template first.');
            return;
        }
        toast.success('Configured item added to new quotation!');
        navigate('/alu/quotations/new', {
            state: {
                projectName: `${appType} (${config}) - Configured Item`,
                items: [{
                    applicationType: appType,
                    configuration: config,
                    width: Number(width),
                    height: Number(height),
                    quantity: Number(quantity)
                }]
            }
        });
    };

    // Fetch live estimations based on formula preview
    const fetchEstimations = async () => {
        if (!appType || !config) return;
        setLoading(true);
        try {
            // We simulate a draft calculation by sending this single item to the calc endpoint
            const res = await api.post('/alu/quotations', {
                customerName: 'Configurator Temp',
                projectName: 'Visual Configuration Preview',
                validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [{
                    applicationType: appType,
                    configuration: config,
                    width: Number(width),
                    height: Number(height),
                    quantity: Number(quantity)
                }],
                status: 'draft'
            });
            // We only need the calculation results, so we delete this draft quotation immediately to keep DB clean
            const quoteId = res.data.data._id;
            setEstimations(res.data.data);
            await api.delete(`/alu/quotations/${quoteId}`);
        } catch (error) {
            console.error('Calculation failed', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchEstimations();
        }, 600); // debounce API calls while inputs change

        return () => clearTimeout(delayDebounceFn);
    }, [appType, config, width, height, quantity]);

    // Parse panels count
    const panelMatch = config.match(/^(\d+)\s*Panel/i);
    let panelCount = panelMatch ? parseInt(panelMatch[1]) : 1;
    if (panelCount === 1 && config.includes('3 Panel')) {
        panelCount = 3;
    } else if (panelCount === 1 && config.includes('2 Panel')) {
        panelCount = 2;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                    <Sparkles className="text-indigo-600" /> 2D Interactive Window Configurator
                </h1>
                <p className="text-slate-500 mt-1">Visually design doors and window structures, configure sashes, and preview instant estimations.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Configuration Controls Card */}
                <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 border-b pb-2 flex items-center gap-1.5">
                            <Settings size={16} className="text-indigo-500" /> Design Configuration
                        </h3>

                        {/* Product Type Selection */}
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Category</label>
                            {isTemplatesLoading ? (
                                <div className="text-slate-400 text-xs py-2 italic animate-pulse">Loading templates...</div>
                            ) : categories.length === 0 ? (
                                <div className="text-rose-500 text-xs py-2 italic font-bold">No active templates found!</div>
                            ) : (
                                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                                    {categories.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => handleCategoryChange(type)}
                                            className={`py-2 px-3 rounded-lg transition-all ${appType === type ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Config Panel count Selection */}
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Panel Configuration</label>
                            <select
                                value={config}
                                onChange={(e) => setConfig(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                disabled={isTemplatesLoading || configurations.length === 0}
                            >
                                {configurations.length === 0 ? (
                                    <option value="">No configurations available</option>
                                ) : (
                                    configurations.map(c => (
                                        <option key={c._id} value={c.configuration}>
                                            {c.configuration} {c.brand ? `(${c.brand})` : ''}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* Dimensions inputs */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Outer Width (mm)</label>
                                <input
                                    type="number"
                                    value={width}
                                    onChange={(e) => setWidth(Math.max(300, parseInt(e.target.value) || 0))}
                                    className="w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Outer Height (mm)</label>
                                <input
                                    type="number"
                                    value={height}
                                    onChange={(e) => setHeight(Math.max(300, parseInt(e.target.value) || 0))}
                                    className="w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                                className="w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                        <Button
                            onClick={handleAddToQuotation}
                            className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition shadow-sm"
                        >
                            <Plus size={14} /> Add to New Quotation
                        </Button>
                    </div>
                </div>

                {/* 2D Visual Canvas Card */}
                <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 border-b pb-2 flex items-center gap-1.5">
                            <Eye size={16} className="text-indigo-500" /> Interactive 2D Canvas
                        </h3>
                    </div>

                    {/* Outer Frame Representation */}
                    <div className="flex-1 flex items-center justify-center py-8">
                        <div className="relative border-4 border-slate-800 bg-slate-100 rounded-lg shadow-inner max-w-full flex"
                             style={{
                                 width: '320px',
                                 height: `${(height / width) * 320}px`,
                                 maxHeight: '340px'
                             }}
                        >
                            {/* Inner Panels */}
                            {Array.from({ length: panelCount }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className="h-full border-r-2 last:border-r-0 border-slate-800 flex-1 flex flex-col justify-between items-center p-2 relative bg-sky-50"
                                >
                                    {/* Glass reflection sash */}
                                    <div className="absolute inset-2 border border-slate-400 bg-sky-100/40 rounded flex items-center justify-center hover:bg-sky-100/60 transition">
                                        <span className="text-[7px] text-slate-400 font-mono font-bold tracking-tighter">5mm glass</span>
                                    </div>
                                    
                                    {/* Dynamic sliding indicator arrows for sliding doors */}
                                    {appType === 'Sliding Door' && panelCount > 1 && (idx === 0 || idx === panelCount - 1) && (
                                        <div className="absolute top-1/2 -translate-y-1/2 bg-white/80 px-1 py-0.5 rounded border text-[8px] font-black text-slate-500 flex items-center gap-1 shadow-sm">
                                            {idx === 0 ? 'Slide' : 'Slide'} <ChevronRight size={8} className={idx === 0 ? 'rotate-180' : ''} />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Dimension Labels */}
                            <div className="absolute -left-9 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500 bg-white px-1 py-0.5 rounded border font-mono">
                                {height} mm
                            </div>
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border font-mono">
                                {width} mm
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 border rounded-xl p-3 flex gap-2 text-slate-600 text-[10px]">
                        <Info size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                        <p>Outer frame sizes determine profiles cuts and glass pane requirements automatically. Slide parameters indicate interlocking sashes.</p>
                    </div>
                </div>

                {/* Instant Estimation Sidebar Card */}
                <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 border-b pb-2 flex items-center gap-1.5">
                            <FileText size={16} className="text-emerald-500" /> Estimation Preview
                        </h3>

                        {loading ? (
                            <div className="text-center py-20 text-slate-400 text-xs italic">Calculating raw costs...</div>
                        ) : estimations ? (
                            <div className="space-y-4 text-[10px]">
                                {/* Total card */}
                                <div className="bg-teal-950 text-teal-100 p-3.5 rounded-xl">
                                    <span className="block text-[8px] font-bold text-teal-300 uppercase">Estimated Selling Value</span>
                                    <span className="text-base font-black mt-1 block">LKR {estimations.finalSellingPrice.toLocaleString()}</span>
                                </div>

                                {/* Breakdown */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-slate-500 border-b pb-1">
                                        <span>Aluminium Profiles</span>
                                        <span className="font-semibold text-slate-800">LKR {estimations.totalAluminiumCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-500 border-b pb-1">
                                        <span>Glass Panels</span>
                                        <span className="font-semibold text-slate-800">LKR {estimations.totalGlassCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-500 border-b pb-1">
                                        <span>Hardware Accessories</span>
                                        <span className="font-semibold text-slate-800">LKR {estimations.totalAccessoriesCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-500 border-b pb-1">
                                        <span>Estimated Labour</span>
                                        <span className="font-semibold text-slate-800">LKR {estimations.totalLabourCost.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Layout metrics */}
                                <div className="bg-slate-50 p-2.5 rounded-xl border space-y-1.5">
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Cutting Efficiency</span>
                                    {Object.values(estimations.cuttingOptimizationResults).map(p => (
                                        <div key={p.profileCode} className="flex justify-between text-[9px] font-semibold text-slate-600">
                                            <span>{p.profileCode} waste</span>
                                            <span className="text-rose-600">{p.wastePercent}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-xs italic text-center py-10">No calculations generated.</p>
                        )}
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2 text-emerald-800 text-[10px]">
                        <Sparkles size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        <p className="font-medium">Estimation is computed live using active templates rates.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AluConfiguratorPage;
