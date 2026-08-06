import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { 
    Sparkles, Settings, Layers, Eye, FileText, Plus, ChevronRight, 
    Sliders, CheckCircle2, Package, Grid, AlertCircle, Info, Lock, ArrowLeftRight, MoveLeft, MoveRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Alu2DInteractiveCanvas from '../components/aluminium/Alu2DInteractiveCanvas';
import ProfileCuttingVisualizer from '../components/aluminium/ProfileCuttingVisualizer';
import { calculateBOM } from '../utils/aluBOMCalculator';

const AluConfiguratorPage = () => {
    const navigate = useNavigate();

    // Configuration Inputs State
    const [appType, setAppType] = useState('Sliding Door');
    const [trackSystem, setTrackSystem] = useState('2-Track');
    const [panelCount, setPanelCount] = useState(2);
    
    // Custom Panel Arrangements (Fixed vs Sliding per panel)
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
        enabled: true,
        height: 600,
        type: 'fixed' // 'fixed' | 'awning' | 'louver'
    });

    // Profit Margin % State
    const [profitMarginPercent, setProfitMarginPercent] = useState(20);

    // Active BOM View Tab State
    const [activeTab, setActiveTab] = useState('profiles'); // 'profiles' | 'glass' | 'accessories' | 'summary'

    // Update panel arrangement array when panelCount changes or preset selection
    const applyPresetConfiguration = (presetKey, pCount = panelCount, tSys = trackSystem) => {
        let newArrangement = [];
        if (presetKey === '2panel_standard') {
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
        } else if (presetKey === '4panel_all_slide') {
            newArrangement = [
                { id: 0, action: 'slide_right' },
                { id: 1, action: 'slide_right' },
                { id: 2, action: 'slide_left' },
                { id: 3, action: 'slide_left' }
            ];
        } else {
            // Default generate matching array
            for (let i = 0; i < pCount; i++) {
                newArrangement.push({
                    id: i,
                    action: (i === 0 || i === pCount - 1) ? 'fixed' : 'slide_right'
                });
            }
        }
        setPanelArrangement(newArrangement);
    };

    // Handle Panel Count Slider/Button Change
    const handlePanelCountChange = (count) => {
        const pCount = Math.max(1, Math.min(6, count));
        setPanelCount(pCount);
        
        if (pCount === 2) {
            setTrackSystem('2-Track');
            applyPresetConfiguration('2panel_standard', 2, '2-Track');
        } else if (pCount === 3) {
            applyPresetConfiguration('3panel_2track', 3, trackSystem);
        } else if (pCount === 4) {
            applyPresetConfiguration('4panel_center_slide', 4, trackSystem);
        } else {
            // General multi-panel fallback
            let arr = [];
            for (let i = 0; i < pCount; i++) {
                arr.push({
                    id: i,
                    action: (i === 0 || i === pCount - 1) ? 'fixed' : 'slide_right'
                });
            }
            setPanelArrangement(arr);
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

    // Real-Time Dynamic BOM Calculation using client calculator
    const bomResult = useMemo(() => {
        return calculateBOM({
            width: Number(width) || 2400,
            height: Number(height) || 2100,
            trackSystem,
            panelCount,
            panelArrangement,
            topSection,
            quantity: Number(quantity) || 1,
            profitMarginPercent: Number(profitMarginPercent) || 20
        });
    }, [width, height, trackSystem, panelCount, panelArrangement, topSection, quantity, profitMarginPercent]);

    // Handle "Add to New Quotation"
    const handleAddToQuotation = () => {
        const configTitle = `${panelCount} Panel ${trackSystem} (${panelArrangement.map(p => p.action).join('-')})`;
        toast.success('Custom system configuration added to quotation!');
        navigate('/alu/quotations/new', {
            state: {
                projectName: `${appType} ${configTitle} - Custom Configuration`,
                items: [{
                    applicationType: appType,
                    configuration: configTitle,
                    width: Number(width),
                    height: Number(height),
                    quantity: Number(quantity),
                    topSection,
                    panelArrangement
                }]
            }
        });
    };

    return (
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
                        <Sparkles className="text-indigo-600 animate-pulse" size={28} /> Advanced 2D Window & Door Configurator
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm mt-1">
                        Configure multi-track sliding systems, custom panel arrangements, vertical fanlight height splits, and real-time BOM costing.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleAddToQuotation}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs md:text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        <Plus size={16} /> Add to New Quotation
                    </Button>
                </div>
            </div>

            {/* Main Configurator Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ======================================================== */}
                {/* 1. LEFT CONTROL PANEL (CONFIGURATIONS & SYSTEM INPUTS)    */}
                {/* ======================================================== */}
                <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                    
                    {/* Section 1: System & Category Selection */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b pb-2 flex items-center gap-1.5">
                            <Layers size={16} /> 1. System Category & Tracks
                        </h3>
                        
                        {/* Application Type */}
                        <div className="grid grid-cols-2 gap-2">
                            {['Sliding Door', 'Sliding Window'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setAppType(cat)}
                                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${appType === cat ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Multi-Track System Selection */}
                        <div className="space-y-1 pt-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Multi-Track System</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['2-Track', '3-Track', '4-Track'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setTrackSystem(t)}
                                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${trackSystem === t ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Panel Count & Arrangement Presets */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                                <Grid size={16} /> 2. Panel Count & Presets
                            </h3>
                            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                {panelCount} Panels
                            </span>
                        </div>

                        {/* Panel Count Buttons */}
                        <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-xl">
                            {[2, 3, 4, 5, 6].map(count => (
                                <button
                                    key={count}
                                    onClick={() => handlePanelCountChange(count)}
                                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${panelCount === count ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    {count} P
                                </button>
                            ))}
                        </div>

                        {/* Preset Configurations */}
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Preset Layouts</label>
                            <div className="space-y-1.5 text-xs">
                                <button
                                    onClick={() => { setPanelCount(2); setTrackSystem('2-Track'); applyPresetConfiguration('2panel_standard', 2, '2-Track'); }}
                                    className="w-full text-left p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex justify-between items-center"
                                >
                                    <span className="font-semibold text-slate-700">2-Panel Standard Slide</span>
                                    <span className="text-[10px] text-slate-400 font-mono">2-Track</span>
                                </button>
                                <button
                                    onClick={() => { setPanelCount(3); setTrackSystem('2-Track'); applyPresetConfiguration('3panel_2track', 3, '2-Track'); }}
                                    className="w-full text-left p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex justify-between items-center"
                                >
                                    <span className="font-semibold text-slate-700">3-Panel Center Slide (1 Fixed, 2 Slide)</span>
                                    <span className="text-[10px] text-slate-400 font-mono">2-Track</span>
                                </button>
                                <button
                                    onClick={() => { setPanelCount(3); setTrackSystem('3-Track'); applyPresetConfiguration('3panel_3track', 3, '3-Track'); }}
                                    className="w-full text-left p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex justify-between items-center"
                                >
                                    <span className="font-semibold text-slate-700">3-Panel Triple Slide</span>
                                    <span className="text-[10px] text-slate-400 font-mono">3-Track</span>
                                </button>
                                <button
                                    onClick={() => { setPanelCount(4); setTrackSystem('2-Track'); applyPresetConfiguration('4panel_center_slide', 4, '2-Track'); }}
                                    className="w-full text-left p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex justify-between items-center"
                                >
                                    <span className="font-semibold text-slate-700">4-Panel Center Slide (Outer Fixed)</span>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">Popular</span>
                                </button>
                            </div>
                        </div>

                        {/* Per-Panel Customization Grid */}
                        <div className="space-y-1.5 pt-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Per-Panel Fixed / Sliding Setup</label>
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
                                            <option value="fixed">Fixed (අචල)</option>
                                            <option value="slide_left">Slide Left (◀)</option>
                                            <option value="slide_right">Slide Right (▶)</option>
                                            <option value="slide_both">Bi-Slide (◀▶)</option>
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
                                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                                        <span>Top: {topSection.height}mm</span>
                                        <span>Bottom Main: {Math.max(0, height - topSection.height)}mm</span>
                                    </div>
                                </div>

                                {/* Top Section Selection Tabs (UI Control Integration) */}
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Top Section Type (Interactive Tabs)</label>
                                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/60 rounded-xl">
                                        {[
                                            { id: 'fixed', label: 'Top Fixed (X)' },
                                            { id: 'awning', label: 'Top Hung (V)' },
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

                                {/* Top Section Specific Dimension Inputs */}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Top Height (H_top mm)</label>
                                        <input
                                            type="number"
                                            value={topSection.height}
                                            onChange={(e) => setTopSection(prev => ({ ...prev, height: Math.max(100, parseInt(e.target.value) || 0) }))}
                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Top Width (W_top mm)</label>
                                        <input
                                            type="number"
                                            value={width}
                                            onChange={(e) => setWidth(Math.max(100, parseInt(e.target.value) || 0))}
                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono focus:outline-none focus:border-indigo-500"
                                        />
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
                    
                    {/* 2D Interactive CAD Visualizer */}
                    <Alu2DInteractiveCanvas
                        width={Number(width) || 2400}
                        height={Number(height) || 2100}
                        trackSystem={trackSystem}
                        panelCount={panelCount}
                        panelArrangement={panelArrangement}
                        topSection={topSection}
                        selectedPanelIndex={selectedPanelIndex}
                        onSelectPanel={(idx) => setSelectedPanelIndex(idx)}
                    />

                    {/* Estimation Costing Overview Banner */}
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-2xl text-white shadow-lg grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                        <div>
                            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Raw Cost</span>
                            <span className="text-lg md:text-xl font-black text-slate-100">
                                LKR {bomResult.summary.totalRawCost.toLocaleString()}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Profit Margin ({profitMarginPercent}%)</span>
                            <span className="text-lg md:text-xl font-black text-emerald-400">
                                LKR {bomResult.summary.profitMargin.toLocaleString()}
                            </span>
                        </div>
                        <div className="col-span-2 bg-emerald-900/40 p-3 rounded-xl border border-emerald-500/30 flex justify-between items-center">
                            <div>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-300">Estimated Selling Price</span>
                                <span className="text-xl md:text-2xl font-black text-emerald-400">
                                    LKR {bomResult.summary.finalSellingPrice.toLocaleString()}
                                </span>
                            </div>
                            <Button
                                onClick={handleAddToQuotation}
                                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-2 px-3 rounded-lg text-xs transition shadow-sm flex items-center gap-1"
                            >
                                <Plus size={14} /> Quote
                            </Button>
                        </div>
                    </div>

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
                            </div>
                        )}

                        {/* Tab Content: Glass */}
                        {activeTab === 'glass' && (
                            <div className="overflow-x-auto">
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
                            </div>
                        )}

                        {/* Tab Content: Accessories */}
                        {activeTab === 'accessories' && (
                            <div className="overflow-x-auto">
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
                                                <td className="p-2.5 text-right font-mono text-slate-600">LKR {acc.unitRate.toLocaleString()}</td>
                                                <td className="p-2.5 text-right font-bold text-slate-800">LKR {acc.cost.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
