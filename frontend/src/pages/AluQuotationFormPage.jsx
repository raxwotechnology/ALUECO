import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';

const AluQuotationFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // present if editing
    const routerLocation = useLocation();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [templates, setTemplates] = useState([]);
    
    // Form State
    const [formData, setFormData] = useState({
        customerName: '',
        projectName: '',
        description: '',
        location: '',
        validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{
            applicationType: '',
            configuration: '',
            description: '',
            width: 2400,
            height: 2100,
            quantity: 1,
            profileSpec: 'Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)',
            glassSpec: '5mm Single Tempered Clear Glass',
            hardwareSpec: 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals',
            scopeSpec: 'Fabrication, Delivery & Installation Inclusive'
        }],
        transportCost: 0,
        includeVat: true,
        distributeTransportCost: false,
        additionalCosts: [],
        profitMarginPercent: 20,
        discount: 0,
        manualAdjustment: 0,
        termsAndConditions: '',
        terms: [
            'This quotation is valid for 30 days from date of issue.',
            '60% advance payment is required to proceed with fabrication.',
            'Balance payment of 40% is due immediately after installation.',
            'Delivery period: 2-3 weeks from receipt of advance payment.'
        ],
        checklist: [
            'Verify exact site opening measurements before glass ordering.',
            'Aluminium powder coating surface check (10 Year Swisstek Warranty).',
            'Kinlong / 3H hardware alignment check.',
            'Water tightness and silicone seal integrity inspection.'
        ]
    });

    const [expandedSpecs, setExpandedSpecs] = useState({});

    const toggleSpecs = (idx) => {
        setExpandedSpecs(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    useEffect(() => {
        const fetchTemplatesAndQuote = async () => {
            try {
                // Fetch application templates
                const { data: tempRes } = await api.get('/alu/applications');
                setTemplates(tempRes.data || []);
                
                // If editing, load the quotation
                if (id) {
                    const { data: quoteRes } = await api.get(`/alu/quotations/${id}`);
                    const q = quoteRes.data;
                    if (q.status === 'converted') {
                        toast.error('This quotation has already been converted to an order. Please create a revision to modify.');
                        navigate(`/alu/quotations/${id}`);
                        return;
                    }
                    
                    setFormData({
                        customerName: q.customerName || '',
                        projectName: q.projectName || '',
                        description: q.description || '',
                        location: q.location || '',
                        validTill: q.validTill ? new Date(q.validTill).toISOString().split('T')[0] : '',
                        items: q.items.map(item => ({
                            applicationType: item.applicationType,
                            configuration: item.configuration,
                            description: item.description || '',
                            width: item.width,
                            height: item.height,
                            quantity: item.quantity,
                            profileSpec: item.profileSpec || 'Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)',
                            glassSpec: item.glassSpec || '5mm Single Tempered Clear Glass',
                            hardwareSpec: item.hardwareSpec || 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals',
                            scopeSpec: item.scopeSpec || 'Fabrication, Delivery & Installation Inclusive',
                            trackSystem: item.trackSystem,
                            topSection: item.topSection,
                            panelArrangement: item.panelArrangement,
                            sketchImage: item.sketchImage
                        })),
                        transportCost: q.transportCost || 0,
                        includeVat: q.includeVat !== undefined ? q.includeVat : true,
                        distributeTransportCost: q.distributeTransportCost !== undefined ? q.distributeTransportCost : false,
                        additionalCosts: q.additionalCosts || [],
                        profitMarginPercent: q.profitMarginPercent || 20,
                        discount: q.discount || 0,
                        manualAdjustment: q.manualAdjustment || 0,
                        termsAndConditions: q.termsAndConditions || '',
                        terms: q.terms?.length ? q.terms : formData.terms,
                        checklist: q.checklist?.length ? q.checklist : formData.checklist
                    });
                } else if (routerLocation.state) {
                    const s = routerLocation.state;
                    setFormData(prev => ({
                        ...prev,
                        customerName: s.customerName || '',
                        projectName: s.projectName || '',
                        description: s.description || '',
                        items: s.items && s.items.length > 0 ? s.items : prev.items
                    }));
                }
            } catch (error) {
                toast.error('Failed to load form details');
            } finally {
                setLoading(false);
            }
        };
        fetchTemplatesAndQuote();
    }, [id]);

    // Default standard application types & configurations if DB templates are clean/empty
    const DEFAULT_TYPES_CONFIGS = {
        'Sliding Door': ['2 Panel', '3 Panel - 2 Track', '3 Panel - 3 Track', '4 Panel - 2 Track', '1 Panel Single Slide', 'Custom 2-Track / 3-Track'],
        'Sliding Window': ['2 Panel', '3 Panel - 2 Track', '3 Panel - 3 Track', '4 Panel - 2 Track', '1 Panel Single Slide'],
        'Casement Door': ['Single Sash (1 Panel)', 'Double Sash (French Door)', 'Single Sash with Fixed Fanlight'],
        'Casement Window': ['1 Panel Side-Hung', '2 Panel Double Vent', '3 Panel Casement', '4 Panel Casement'],
        'Awning / Top-Hung Window': ['1 Panel Top-Hung', '2 Panel Top-Hung', '3 Panel Top-Hung'],
        'Fixed Glass Partition': ['1 Panel Fixed', '2 Panel Fixed Grid', '3 Panel Fixed Partition', 'Custom Fixed Channel'],
        'Louver Window': ['Single Bay (1 Slat Column)', 'Double Bay (2 Columns)', 'Triple Bay'],
        'Folding / Bi-fold Door': ['3 Panel Bi-Fold', '4 Panel Bi-Fold', '5 Panel Bi-Fold', '6 Panel Bi-Fold'],
        'Custom Project': ['Custom Ad-Hoc Design', 'Architectural Specialized Frame', 'Custom Section Profile']
    };

    // Unique application types (e.g. Sliding Door, Fixed Glass)
    const availableTypes = Array.from(
        new Set([
            ...Object.keys(DEFAULT_TYPES_CONFIGS),
            ...templates.map(t => t.type).filter(Boolean)
        ])
    );

    // Filter configurations for a selected type with robust defaults
    const getConfigurationsForType = (type, currentConfig = '') => {
        const defaultList = DEFAULT_TYPES_CONFIGS[type] || ['Standard Opening', 'Custom Configuration'];
        const dbList = templates.filter(t => t.type === type).map(t => t.configuration).filter(Boolean);
        const set = new Set([...defaultList, ...dbList]);
        if (currentConfig && !set.has(currentConfig)) {
            set.add(currentConfig);
        }
        return Array.from(set);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        
        // If applicationType or configuration changed, update specs from template
        if (field === 'applicationType' || field === 'configuration') {
            const appType = field === 'applicationType' ? value : newItems[index].applicationType;
            const config = field === 'configuration' ? value : newItems[index].configuration;
            
            // Find matching template
            const template = templates.find(t => t.type === appType && t.configuration === config);
            if (template) {
                newItems[index].profileSpec = template.profileSpec || 'Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)';
                newItems[index].glassSpec = template.glassSpec || '5mm Single Tempered Clear Glass';
                newItems[index].hardwareSpec = template.hardwareSpec || 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals';
                newItems[index].scopeSpec = template.scopeSpec || 'Fabrication, Delivery & Installation Inclusive';
            }
            
            // If applicationType changed, also update configuration options
            if (field === 'applicationType') {
                const configs = getConfigurationsForType(value);
                newItems[index].configuration = configs[0] || 'Standard Opening';
            }
        }
        
        setFormData({ ...formData, items: newItems });
    };

    const addOpening = () => {
        const firstType = availableTypes[0] || 'Sliding Door';
        const configs = getConfigurationsForType(firstType);
        const firstConfig = configs[0] || '2 Panel';
        
        // Find matching template for specs
        const template = templates.find(t => t.type === firstType && t.configuration === firstConfig);
        
        setFormData({
            ...formData,
            items: [...formData.items, {
                applicationType: firstType,
                configuration: firstConfig,
                description: '',
                width: 2400,
                height: 2100,
                quantity: 1,
                profileSpec: template?.profileSpec || 'Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)',
                glassSpec: template?.glassSpec || '5mm Single Tempered Clear Glass',
                hardwareSpec: template?.hardwareSpec || 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals',
                scopeSpec: template?.scopeSpec || 'Fabrication, Delivery & Installation Inclusive'
            }]
        });
    };

    const removeOpening = (index) => {
        if (formData.items.length === 1) {
            toast.error('Quotation must contain at least one opening item');
            return;
        }
        setFormData({
            ...formData,
            items: formData.items.filter((_, idx) => idx !== index)
        });
    };

    const addAdditionalCost = () => {
        setFormData({
            ...formData,
            additionalCosts: [...formData.additionalCosts, { name: '', cost: 0 }]
        });
    };

    const removeAdditionalCost = (index) => {
        setFormData({
            ...formData,
            additionalCosts: formData.additionalCosts.filter((_, idx) => idx !== index)
        });
    };

    const handleAddCostChange = (index, field, value) => {
        const newCosts = [...formData.additionalCosts];
        newCosts[index][field] = field === 'cost' ? Number(value) : value;
        setFormData({ ...formData, additionalCosts: newCosts });
    };

    const handleListChange = (listName, index, value) => {
        const newList = [...formData[listName]];
        newList[index] = value;
        setFormData({ ...formData, [listName]: newList });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.customerName.trim() || !formData.projectName.trim()) {
            toast.error('Customer name and Project name are required');
            return;
        }
        
        if (formData.items.some(item => !item.applicationType || !item.configuration || item.width <= 0 || item.height <= 0 || item.quantity <= 0)) {
            toast.error('Please enter valid dimensions and configurations for all openings');
            return;
        }

        setSaving(true);
        try {
            if (id) {
                const { data } = await api.put(`/alu/quotations/${id}`, formData);
                toast.success('Quotation updated successfully');
                navigate(`/alu/quotations/${id}`);
            } else {
                const { data } = await api.post('/alu/quotations', formData);
                toast.success('Quotation created successfully');
                navigate(`/alu/quotations/${data.data._id}`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save quotation');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-40">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-4">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate('/alu/quotations')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-800">{id ? 'Edit Quotation details' : 'Create Aluminium Quotation'}</h1>
                        <p className="text-sm text-slate-500">Enter customer details, openings dimensions, and costing variables.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button type="button" onClick={() => navigate('/alu/quotations')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm">Cancel</Button>
                    <Button type="submit" disabled={saving} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-sm">
                        <Save size={16} /> {saving ? 'Saving...' : 'Save & Calculate'}
                    </Button>
                </div>
            </div>

            {/* Customer & Project metadata */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-800">1. Project & Customer Metadata</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Customer / Client Name</label>
                        <input type="text" placeholder="e.g. Mr. Chaminda Perera" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Project Name</label>
                        <input type="text" placeholder="e.g. Green Villa Residence" value={formData.projectName} onChange={e => setFormData({ ...formData, projectName: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Location / Site Address</label>
                        <input type="text" placeholder="e.g. Nugegoda, Sri Lanka" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Quotation Validity Date</label>
                        <input type="date" value={formData.validTill} onChange={e => setFormData({ ...formData, validTill: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">General Quotation Scope / Work Description (Optional)</label>
                    <input
                        type="text"
                        placeholder="e.g. Supply and installation of aluminium sliding doors, casement windows and fixed glass partitions as per BOQ specifications"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-600"
                    />
                </div>
            </div>

            {/* Opening Dimensions Input */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">2. Openings Dimension &amp; Description Entries</h3>
                    <button type="button" onClick={addOpening} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                        <PlusCircle size={16} /> Add Opening Item
                    </button>
                </div>
                
                <div className="space-y-4 divide-y divide-slate-100">
                    {formData.items.map((item, idx) => (
                        <div key={idx} className="space-y-2 pt-4">
                            {/* Main Dimension Row */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Application Type</label>
                                    <select
                                        value={item.applicationType}
                                        onChange={e => handleItemChange(idx, 'applicationType', e.target.value)}
                                        required
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600 bg-white"
                                    >
                                        <option value="" disabled>Select Application</option>
                                        {availableTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Configuration</label>
                                    <select
                                        value={item.configuration}
                                        onChange={e => handleItemChange(idx, 'configuration', e.target.value)}
                                        required
                                        disabled={!item.applicationType}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600 bg-white"
                                    >
                                        <option value="">Select Config</option>
                                        {getConfigurationsForType(item.applicationType, item.configuration).map(config => (
                                            <option key={config} value={config}>{config}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Width (mm)</label>
                                    <input type="number" placeholder="2400" value={item.width} onChange={e => handleItemChange(idx, 'width', Number(e.target.value))} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Height (mm)</label>
                                    <input type="number" placeholder="2100" value={item.height} onChange={e => handleItemChange(idx, 'height', Number(e.target.value))} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>

                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Qty (Nos)</label>
                                    <input type="number" placeholder="1" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>

                                <div className="md:col-span-1 text-right">
                                    <button type="button" onClick={() => removeOpening(idx)} className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Item Description and Specs Row */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                                <div className="md:col-span-8">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Item Description / Special Location Remark (Manual)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Master Bedroom Balcony Door, Living Area Window, Toilet Louver"
                                        value={item.description || ''}
                                        onChange={e => handleItemChange(idx, 'description', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="md:col-span-4 text-right">
                                    <button
                                        type="button"
                                        onClick={() => toggleSpecs(idx)}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 shadow-xs transition"
                                    >
                                        {expandedSpecs[idx] ? '▲ Hide Specifications' : '⚙️ Custom Specifications'}
                                    </button>
                                </div>
                            </div>

                            {/* Expandable Specifications Editor */}
                            {expandedSpecs[idx] && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100 text-xs">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Profile Spec</label>
                                        <input
                                            type="text"
                                            value={item.profileSpec || ''}
                                            onChange={e => handleItemChange(idx, 'profileSpec', e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Glass Spec</label>
                                        <input
                                            type="text"
                                            value={item.glassSpec || ''}
                                            onChange={e => handleItemChange(idx, 'glassSpec', e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Hardware Spec</label>
                                        <input
                                            type="text"
                                            value={item.hardwareSpec || ''}
                                            onChange={e => handleItemChange(idx, 'hardwareSpec', e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Scope Spec</label>
                                        <input
                                            type="text"
                                            value={item.scopeSpec || ''}
                                            onChange={e => handleItemChange(idx, 'scopeSpec', e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Costing parameters & Extra charges */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Transport & Extras */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800">3. Transport & Additional Costs</h3>
                        <button type="button" onClick={addAdditionalCost} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold">+ Add Cost Line</button>
                    </div>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1">Transport Cost (LKR)</label>
                            <input type="number" value={formData.transportCost} onChange={e => setFormData({ ...formData, transportCost: Number(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                        </div>

                        {/* Transport cost distribution checkbox */}
                        <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="distributeTransportCost"
                                checked={formData.distributeTransportCost} 
                                onChange={e => setFormData({ ...formData, distributeTransportCost: e.target.checked })} 
                                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer" 
                            />
                            <label htmlFor="distributeTransportCost" className="text-xs font-bold text-emerald-950 cursor-pointer select-none">
                                Automatically Distribute Transport Cost into Item Rates (Hide separate Transport Line)
                            </label>
                        </div>
                        
                        {formData.additionalCosts.map((ac, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <div className="flex-[2]">
                                    <input type="text" placeholder="Charge Name (e.g. Scaffolding)" value={ac.name} onChange={e => handleAddCostChange(idx, 'name', e.target.value)} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                                </div>
                                <div className="flex-1">
                                    <input type="number" placeholder="Cost (LKR)" value={ac.cost} onChange={e => handleAddCostChange(idx, 'cost', e.target.value)} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                                </div>
                                <button type="button" onClick={() => removeAdditionalCost(idx)} className="text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Profit Margin & Tax / Adjustments */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-slate-800">4. Margin, Tax &amp; Pricing Adjustments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1">Profit Margin (%)</label>
                            <input type="number" value={formData.profitMarginPercent} onChange={e => setFormData({ ...formData, profitMarginPercent: Number(e.target.value) })} required className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1">Special Discount (LKR)</label>
                            <input type="number" value={formData.discount} onChange={e => setFormData({ ...formData, discount: Number(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                        </div>

                        {/* Include VAT Checkbox */}
                        <div className="md:col-span-2 p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="includeVat"
                                checked={formData.includeVat} 
                                onChange={e => setFormData({ ...formData, includeVat: e.target.checked })} 
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" 
                            />
                            <label htmlFor="includeVat" className="text-xs font-bold text-indigo-950 cursor-pointer select-none">
                                Include 18% VAT (Value Added Tax) on Quotation Summary
                            </label>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-600 mb-1">Manual Price Adjustment / Buffer (+/- LKR)</label>
                            <input type="number" placeholder="e.g. -5000 or 12000" value={formData.manualAdjustment} onChange={e => setFormData({ ...formData, manualAdjustment: Number(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                            <p className="text-xs text-slate-400 mt-1">Adjusts final selling price. Calculated original cost remains logged in database for audit.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms and Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t pt-6">
                {/* Terms and conditions */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <h3 className="text-lg font-bold text-slate-800">5. Terms &amp; Conditions (Customizable)</h3>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Custom Terms Paragraph / Lines (Enter each term on a new line)</label>
                        <textarea
                            rows={4}
                            placeholder="Enter custom terms and conditions here..."
                            value={formData.termsAndConditions}
                            onChange={e => setFormData({ ...formData, termsAndConditions: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-600 mb-3"
                        />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Individual Bullet Point Terms:</p>
                    {formData.terms.map((term, idx) => (
                        <div key={idx} className="flex gap-2">
                            <span className="text-sm font-semibold text-slate-400 mt-2">{idx + 1}.</span>
                            <input type="text" value={term} onChange={e => handleListChange('terms', idx, e.target.value)} required className="w-full border border-slate-100 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500" />
                        </div>
                    ))}
                </div>

                {/* Internal Quality Checklist */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <h3 className="text-lg font-bold text-slate-800">6. Production Checklist</h3>
                    {formData.checklist.map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                            <span className="text-sm font-semibold text-slate-400 mt-2">{idx + 1}.</span>
                            <input type="text" value={item} onChange={e => handleListChange('checklist', idx, e.target.value)} required className="w-full border border-slate-100 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500" />
                        </div>
                    ))}
                </div>
            </div>
        </form>
    );
};

export default AluQuotationFormPage;
