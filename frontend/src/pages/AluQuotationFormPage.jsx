import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
    ArrowLeft, Save, Plus, Trash2, PlusCircle, Sparkles, Layers, Box, 
    CheckCircle2, Search, Sliders, ChevronDown, ChevronUp, Eye, EyeOff, 
    Wrench, X, Calculator, DollarSign, Truck, Package, ShieldCheck, Info, Percent
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { calculateBOM } from '../utils/aluBOMCalculator';

const isGasketItem = (a) => {
    if (!a) return false;
    if (a.isGasket === true) return true;
    const u = (a.unit || '').trim().toLowerCase();
    if (u === 'm' || u === 'meter' || u === 'meters' || u === 'metre' || u === 'metres' || u === 'mtr') return true;
    const c = (a.code || a.actualCode || a.productCode || '').trim().toUpperCase();
    if (c.startsWith('GSK') || c.startsWith('GSH') || c.startsWith('GAS')) return true;
    const n = (a.name || a.description || '').trim().toLowerCase();
    if (n.includes('gasket') || n.includes('weather seal') || n.includes('wool pile') || n.includes('epdm') || n.includes('rubber seal') || n.includes('glazing seal')) return true;
    return false;
};

const AluQuotationFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // present if editing
    const routerLocation = useLocation();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [dbRates, setDbRates] = useState(null);
    const [fromConfigurator, setFromConfigurator] = useState(false);
    
    // Modal state for selecting openings from BOM Library
    const [showBOMModal, setShowBOMModal] = useState(false);
    const [bomSearchQuery, setBomSearchQuery] = useState('');
    const [bomCategoryFilter, setBomCategoryFilter] = useState('ALL');
    const [modalLabourRatePerSqFt, setModalLabourRatePerSqFt] = useState(150);
    const [modalProfitMargin, setModalProfitMargin] = useState(20);
    
    // Accordion toggles for each opening item
    const [expandedBOM, setExpandedBOM] = useState({});
    const [expandedSpecs, setExpandedSpecs] = useState({});

    const toggleBOMDetails = (idx) => {
        setExpandedBOM(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const toggleSpecs = (idx) => {
        setExpandedSpecs(prev => ({ ...prev, [idx]: !prev[idx] }));
    };
    
    // Form State
    const [formData, setFormData] = useState({
        customerName: '',
        projectName: '',
        description: '',
        location: '',
        validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [],
        transportCost: 0,
        totalLabourCost: 0,
        otherCost: 0,
        includeVat: true,
        distributeTransportCost: false,
        profitMarginPercent: 20,
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

    // Helper: Compute BOM for a given template and dimensions with customizable labour & profit margin
    const computeOpeningBOM = (
        template, 
        width = 2400, 
        height = 2100, 
        quantity = 1, 
        currentRates = null, 
        profitMargin = null, 
        labourCost = undefined,
        labourRatePerSqFt = 150
    ) => {
        const activeRates = currentRates || dbRates;
        const margin = profitMargin !== null ? Number(profitMargin) : (Number(formData.profitMarginPercent) || 20);
        const q = Math.max(1, Number(quantity) || 1);
        const w = Number(width) || 2400;
        const h = Number(height) || 2100;
        const ratePerSqFt = (labourRatePerSqFt !== undefined && labourRatePerSqFt !== null && labourRatePerSqFt !== '') 
            ? Math.max(0, Number(labourRatePerSqFt) || 0) 
            : 150;

        const bom = calculateBOM({
            appType: template.type,
            baseFormula: template.type,
            selectedTemplate: template,
            width: w,
            height: h,
            quantity: q,
            rates: activeRates,
            calculationMode: 'template',
            profitMarginPercent: margin,
            labourRatePerSqFt: ratePerSqFt,
            totalLabourCost: labourCost
        });

        const areaSqFt = bom?.summary?.totalAreaSqFt || parseFloat(((w * h * q) / 92903.04).toFixed(2));
        const unitAreaSqFt = bom?.summary?.unitAreaSqFt || parseFloat(((w * h) / 92903.04).toFixed(2));
        const finalSellingPrice = bom?.summary?.finalSellingPrice || 0;
        const unitPrice = Math.round(finalSellingPrice / q);
        const unitLabour = bom?.summary?.unitLabourCost ?? Math.round(unitAreaSqFt * ratePerSqFt);
        const totalLabour = bom?.summary?.totalLabourCost ?? (unitLabour * q);

        const configTitle = `${template.type} - ${template.configuration}${template.brand ? ` (${template.brand})` : ''}`;

        return {
            templateId: template._id,
            applicationType: template.type,
            configuration: configTitle,
            description: '',
            width: w,
            height: h,
            quantity: q,
            profileSpec: template.profileSpec || `${template.brand || 'Standard'} Series (1.2-1.5mm Thickness, Powder Coated)`,
            glassSpec: template.glassSpec || '5mm Single Tempered Clear Glass',
            hardwareSpec: template.hardwareSpec || 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals',
            scopeSpec: template.scopeSpec || 'Fabrication, Delivery & Installation Inclusive',
            profileCuts: bom?.profileCuts || [],
            glassItems: bom?.glassItems || [],
            accessories: bom?.accessories || [],
            totalAreaSqFt: areaSqFt,
            unitAreaSqFt,
            unitPrice,
            totalPrice: finalSellingPrice,
            labourRatePerSqFt: ratePerSqFt,
            labourCost: unitLabour,
            costingSummary: {
                ...(bom?.summary || {}),
                totalLabourCost: totalLabour,
                unitLabourCost: unitLabour,
                labourRatePerSqFt: ratePerSqFt,
                profitMarginPercent: margin,
                finalSellingPrice
            },
            profitMarginPercent: margin,
            topSection: { enabled: false },
            panelArrangement: []
        };
    };

    // Fetch real-time rates and application templates from Database
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pRes, gRes, aRes, tRes, rawRes] = await Promise.all([
                    api.get('/alu/profiles').catch(() => ({ data: { data: [] } })),
                    api.get('/alu/glass').catch(() => ({ data: { data: [] } })),
                    api.get('/alu/accessories').catch(() => ({ data: { data: [] } })),
                    api.get('/alu/applications').catch(() => ({ data: { data: [] } })),
                    api.get('/alu/raw-materials').catch(() => ({ data: { data: { products: [] } } }))
                ]);

                const profiles = pRes.data?.data || [];
                const glass = gRes.data?.data || [];
                const accessories = aRes.data?.data || [];
                const loadedTemplates = (tRes.data?.data || tRes.data || []).filter(t => t.isActive !== false);
                const rawMaterialsData = rawRes.data?.data?.products || (Array.isArray(rawRes.data?.data) ? rawRes.data.data : []);
                setTemplates(loadedTemplates);

                // Build Rates Map
                const profMap = {};
                profiles.forEach(p => {
                    let pricePerM = 0;
                    if (p.standardLengths?.length > 0) {
                        const ratesPerM = p.standardLengths.map(sl => sl.price / (sl.lengthMm / 1000));
                        pricePerM = ratesPerM.reduce((sum, rate) => sum + rate, 0) / ratesPerM.length;
                    }
                    profMap[p.profileCode] = { name: p.description, ratePerM: Math.round(pricePerM), code: p.profileCode };
                    if (p.profileCode) profMap[p.profileCode.toUpperCase()] = { name: p.description, ratePerM: Math.round(pricePerM), code: p.profileCode };
                });

                const glassMap = {};
                glass.forEach(g => {
                    const rate = Number(g.ratePerSqFt) || 0;
                    const item = {
                        name: g.typeName,
                        code: g.typeName,
                        ratePerSqFt: rate,
                        ratePerSqM: g.ratePerSqM || Math.round(rate * 10.7639),
                        thickness: g.thickness || ''
                    };
                    glassMap[g.typeName] = item;
                    glassMap[g.typeName.toUpperCase()] = item;
                    glassMap[g.typeName.toLowerCase()] = item;
                });

                // Material Inventory Products (PRIMARY source for inventory glass rates)
                rawMaterialsData.forEach(p => {
                    const isGlass = p.aluCategory === 'glass' || 
                                    p.aluSpecs?.type === 'GL' || 
                                    (p.productCode && p.productCode.toUpperCase().startsWith('GL')) ||
                                    (p.name && p.name.toLowerCase().includes('glass'));
                    if (isGlass) {
                        const sqftRate = Number(p.basePrice || p.costs?.lastPurchaseCost || p.costs?.standardCost || p.costs?.averageCost) || 0;
                        const glassItem = {
                            name: p.name || p.productCode,
                            code: p.productCode || p.name,
                            ratePerSqFt: sqftRate,
                            ratePerSqM: Math.round(sqftRate * 10.7639),
                            thickness: p.aluSpecs?.thickness || '',
                            id: p._id?.toString()
                        };

                        if (p.productCode) {
                            glassMap[p.productCode] = glassItem;
                            glassMap[p.productCode.toUpperCase()] = glassItem;
                            glassMap[p.productCode.toLowerCase()] = glassItem;
                            glassMap[p.productCode.replace(/[-_\s]/g, '').toUpperCase()] = glassItem;
                        }
                        if (p.name) {
                            glassMap[p.name] = glassItem;
                            glassMap[p.name.toUpperCase()] = glassItem;
                            glassMap[p.name.toLowerCase()] = glassItem;
                        }
                        if (p._id) {
                            glassMap[p._id.toString()] = glassItem;
                        }
                    }
                });

                const accMap = {};
                accessories.forEach(a => {
                    accMap[a.code] = { name: a.name, unitRate: a.sellingRate || a.purchaseRate || 0, unit: a.unit };
                    if (a.code) accMap[a.code.toUpperCase()] = { name: a.name, unitRate: a.sellingRate || a.purchaseRate || 0, unit: a.unit };
                });

                rawMaterialsData.forEach(p => {
                    if (p.aluCategory === 'profiles') {
                        const code = p.productCode || p.name;
                        const price = Number(p.basePrice || p.costs?.lastPurchaseCost || p.costs?.standardCost || p.costs?.averageCost) || 0;
                        let lengthM = 0;
                        if (p.aluSpecs?.lengthMm > 0) {
                            lengthM = p.aluSpecs.lengthMm / 1000;
                        } else if (p.aluSpecs?.standardLength) {
                            const stdL = parseFloat(p.aluSpecs.standardLength);
                            lengthM = stdL > 50 ? (stdL / 1000) : (stdL * 0.3048);
                        } else {
                            lengthM = 5.8;
                        }
                        const ratePerM = lengthM > 0 ? Math.round(price / lengthM) : price;
                        const profItem = {
                            code: code,
                            name: p.name || code,
                            ratePerM: ratePerM > 0 ? ratePerM : (price > 0 ? price : 750),
                            description: p.name || code
                        };
                        if (p.productCode) {
                            profMap[p.productCode] = profItem;
                            profMap[p.productCode.toUpperCase()] = profItem;
                            profMap[p.productCode.replace(/[-_\s]/g, '').toUpperCase()] = profItem;
                        }
                        if (p.name) {
                            profMap[p.name] = profItem;
                            profMap[p.name.toUpperCase()] = profItem;
                        }
                    } else if (p.aluCategory === 'accessories' || p.aluCategory === 'hardware' || p.aluCategory === 'gaskets') {
                        let code = p.productCode?.toUpperCase();
                        if (!code || code.startsWith('P-')) code = p.aluSpecs?.profile?.toUpperCase();
                        if (!code) code = p.name?.toUpperCase();
                        if (code && !accMap[code]) {
                            accMap[code] = { 
                                name: p.name || code, 
                                unitRate: p.basePrice || p.mrp || 0, 
                                unit: p.unitOfMeasure || (p.aluCategory === 'gaskets' ? 'm' : 'pcs'),
                                isGasket: p.aluCategory === 'gaskets'
                            };
                        }
                    }
                });

                const ratesSnapshot = { profiles: profMap, glass: glassMap, accessories: accMap };
                setDbRates(ratesSnapshot);

                // Handle edit quotation or state from 2D configurator
                if (id) {
                    const { data: quoteRes } = await api.get(`/alu/quotations/${id}`);
                    const q = quoteRes.data;
                    if (q.status === 'converted') {
                        toast.error('This quotation has already been converted to an order.');
                        navigate(`/alu/quotations/${id}`);
                        return;
                    }
                    
                    setFormData({
                        customerName: q.customerName || '',
                        projectName: q.projectName || '',
                        description: q.description || '',
                        location: q.location || '',
                        validTill: q.validTill ? new Date(q.validTill).toISOString().split('T')[0] : '',
                        items: q.items.map(item => {
                            // Find matching application template to heal legacy missing cut codes/names
                            const tmpl = loadedTemplates.find(t => 
                                (t.type?.toLowerCase() === (item.applicationType || '').toLowerCase() || (item.applicationType || '').toLowerCase().includes(t.type?.toLowerCase())) &&
                                (String(t.configuration).trim() === String(item.configuration).trim() || 
                                 (item.configuration || '').includes(String(t.configuration)) || 
                                 String(t.configuration).includes(item.configuration || ''))
                            );

                            const enrichedProfileCuts = (item.profileCuts || []).map((pc, idx) => {
                                const templateProf = tmpl?.profileBOM?.[idx];
                                const code = pc.profileCode || pc.code || templateProf?.profileCode || templateProf?.actualCode || '';
                                const profInfo = profMap[code] || profMap[code?.toUpperCase()] || {};
                                const unitRate = Number(pc.unitRate) || profInfo.ratePerM || 750;
                                const length = Number(pc.length) || 0;
                                const qty = Number(pc.qty) || 1;
                                const totalLengthM = (length * qty) / 1000;
                                const cost = Number(pc.cost) > 0 ? Number(pc.cost) : Math.round(totalLengthM * unitRate);
                                const name = pc.name || pc.description || profInfo.name || templateProf?.description || code || 'Aluminium Profile';
                                return {
                                    ...pc,
                                    profileCode: code,
                                    code: code,
                                    name: name,
                                    description: name,
                                    length: length,
                                    qty: qty,
                                    totalLength: length * qty,
                                    totalLengthM: parseFloat(totalLengthM.toFixed(3)),
                                    unitRate: unitRate,
                                    cost: cost
                                };
                            });

                            const gasketItems = (item.gasketItems && item.gasketItems.length > 0)
                                ? item.gasketItems.map(g => ({ ...g, isGasket: true, unit: g.unit || 'm' }))
                                : (item.accessories || []).filter(isGasketItem).map(a => ({ ...a, isGasket: true, unit: a.unit || 'm' }));

                            const hardwareAccessories = (item.accessories || []).filter(a => !isGasketItem(a)).map(a => ({ ...a, isGasket: false, unit: a.unit || 'pcs' }));

                            const calcGlassCost = item.costingSummary?.totalGlassCost !== undefined && Number(item.costingSummary.totalGlassCost) > 0
                                ? Number(item.costingSummary.totalGlassCost)
                                : (item.glassItems || []).reduce((s, g) => s + (Number(g.cost) || 0), 0);

                            const calcGasketCost = item.costingSummary?.totalGasketCost !== undefined && Number(item.costingSummary.totalGasketCost) > 0
                                ? Number(item.costingSummary.totalGasketCost)
                                : gasketItems.reduce((s, g) => s + (Number(g.cost) || ((Number(g.qty) || 0) * (Number(g.unitRate) || 0))), 0);

                            const calcHardwareCost = item.costingSummary?.totalAccessoriesCost !== undefined && Number(item.costingSummary.totalAccessoriesCost) > 0
                                ? Math.max(0, Number(item.costingSummary.totalAccessoriesCost) - calcGasketCost)
                                : hardwareAccessories.reduce((s, a) => s + (Number(a.cost) || ((Number(a.qty) || 0) * (Number(a.unitRate) || 0))), 0);

                            let calcAluCost = item.costingSummary?.totalAluminiumCost !== undefined && Number(item.costingSummary.totalAluminiumCost) > 0
                                ? Number(item.costingSummary.totalAluminiumCost)
                                : enrichedProfileCuts.reduce((s, pc) => s + (Number(pc.cost) || 0), 0);

                            const itemMargin = item.profitMarginPercent ?? q.profitMarginPercent ?? 20;
                            const totalLabour = item.costingSummary?.totalLabourCost !== undefined && Number(item.costingSummary.totalLabourCost) > 0
                                ? Number(item.costingSummary.totalLabourCost)
                                : ((item.labourCost || 0) * (item.quantity || 1));

                            const calcRawCost = calcAluCost + calcGlassCost + calcHardwareCost + calcGasketCost;
                            const itemSelling = item.totalPrice || Math.round((calcRawCost + totalLabour) * (1 + itemMargin / 100));

                            const hydratedCostingSummary = {
                                ...(item.costingSummary || {}),
                                totalAluminiumCost: calcAluCost,
                                totalGlassCost: calcGlassCost,
                                totalAccessoriesCost: calcHardwareCost + calcGasketCost,
                                totalGasketCost: calcGasketCost,
                                totalLabourCost: totalLabour,
                                unitLabourCost: item.quantity > 0 ? Math.round(totalLabour / item.quantity) : totalLabour,
                                labourRatePerSqFt: item.labourRatePerSqFt || 150,
                                profitMarginPercent: itemMargin,
                                profitMarginAmount: item.costingSummary?.profitMarginAmount || Math.round((calcRawCost + totalLabour) * (itemMargin / 100)),
                                totalRawCost: calcRawCost,
                                finalSellingPrice: itemSelling
                            };

                            return {
                                applicationType: item.applicationType,
                                configuration: item.configuration,
                                description: item.description || '',
                                width: item.width,
                                height: item.height,
                                quantity: item.quantity,
                                profileSpec: item.profileSpec || 'Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)',
                                glassSpec: item.glassSpec || '5mm Single Tempered Clear Glass',
                                hardwareSpec: item.hardwareSpec || 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals',
                                gasketSpec: item.gasketSpec || 'EPDM Weather Seal Gaskets Inclusive',
                                scopeSpec: item.scopeSpec || 'Fabrication, Delivery & Installation Inclusive',
                                trackSystem: item.trackSystem,
                                topSection: item.topSection,
                                panelArrangement: item.panelArrangement,
                                sketchImage: item.sketchImage,
                                profileCuts: enrichedProfileCuts,
                                glassItems: item.glassItems || [],
                                accessories: hardwareAccessories,
                                gasketItems,
                                totalGasketMeters: item.totalGasketMeters || parseFloat(gasketItems.reduce((s, g) => s + (Number(g.qty) || 0), 0).toFixed(2)),
                                totalAreaSqFt: item.totalAreaSqFt || parseFloat(((item.width * item.height * item.quantity) / 92903.04).toFixed(2)),
                                labourRatePerSqFt: item.labourRatePerSqFt || 150,
                                labourMethod: item.labourMethod || 'sqft',
                                labourCost: item.labourCost || (item.quantity > 0 ? Math.round(totalLabour / item.quantity) : 0),
                                unitPrice: item.unitPrice || (item.quantity > 0 ? Math.round(itemSelling / item.quantity) : itemSelling),
                                totalPrice: itemSelling,
                                costingSummary: hydratedCostingSummary,
                                aluminiumDiscountPercent: item.aluminiumDiscountPercent || 0,
                                profitMarginPercent: itemMargin
                            };
                        }),
                        transportCost: q.transportCost || 0,
                        totalLabourCost: q.totalLabourCost || 0,
                        otherCost: q.otherCost || 0,
                        includeVat: q.includeVat !== undefined ? q.includeVat : true,
                        distributeTransportCost: q.distributeTransportCost !== undefined ? q.distributeTransportCost : false,
                        profitMarginPercent: q.profitMarginPercent || 20,
                        termsAndConditions: q.termsAndConditions || '',
                        terms: q.terms?.length ? q.terms : formData.terms,
                        checklist: q.checklist?.length ? q.checklist : formData.checklist
                    });
                } else if (routerLocation.state) {
                    const s = routerLocation.state;
                    setFromConfigurator(true);
                    
                    const itemsFromConfigurator = s.items && s.items.length > 0 ? s.items.map(item => ({
                        applicationType: item.applicationType,
                        configuration: item.configuration,
                        description: item.description || '',
                        width: item.width,
                        height: item.height,
                        quantity: item.quantity,
                        profileSpec: item.profileSpec || 'Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)',
                        glassSpec: item.glassSpec || '5mm Single Tempered Clear Glass',
                        hardwareSpec: item.hardwareSpec || 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals',
                        gasketSpec: item.gasketSpec || 'EPDM Weather Seal Gaskets Inclusive',
                        scopeSpec: item.scopeSpec || 'Fabrication, Delivery & Installation Inclusive',
                        profileCuts: item.profileCuts || [],
                        glassItems: item.glassItems || [],
                        accessories: item.accessories || [],
                        gasketItems: item.gasketItems || [],
                        totalGasketMeters: item.totalGasketMeters || 0,
                        totalAreaSqFt: item.totalAreaSqFt || parseFloat(((item.width * item.height * item.quantity) / 92903.04).toFixed(2)),
                        labourRatePerSqFt: item.labourRatePerSqFt || 150,
                        labourMethod: item.labourMethod || 'sqft',
                        labourCost: item.labourCost || (item.costingSummary?.totalLabourCost ? Math.round(item.costingSummary.totalLabourCost / (item.quantity || 1)) : 0),
                        unitPrice: item.unitPrice || 0,
                        totalPrice: item.totalPrice || 0,
                        trackSystem: item.trackSystem,
                        topSection: item.topSection,
                        panelArrangement: item.panelArrangement,
                        costingSummary: item.costingSummary || { finalSellingPrice: item.totalPrice || 0 },
                        aluminiumDiscountPercent: item.aluminiumDiscountPercent || 0,
                        profitMarginPercent: item.profitMarginPercent || 20
                    })) : [];

                    setFormData(prev => ({
                        ...prev,
                        customerName: s.customerName || '',
                        projectName: s.projectName || '',
                        description: s.description || '',
                        items: itemsFromConfigurator,
                        totalLabourCost: 0
                    }));
                } else {
                    // New quotation from scratch: if templates exist, automatically populate with first BOM template
                    if (loadedTemplates.length > 0) {
                        const firstOpening = computeOpeningBOM(loadedTemplates[0], 2400, 2100, 1, ratesSnapshot, 20, 0);
                        setFormData(prev => ({
                            ...prev,
                            items: [firstOpening]
                        }));
                    }
                }
            } catch (error) {
                console.error('Failed to load quotation form details:', error);
                toast.error('Failed to load form details');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    // Handle Opening Parameter Adjustments (Dimensions, Quantity, Labour Cost, Profit Margin)
    const handleOpeningParamChange = (index, field, value) => {
        const numVal = Math.max(0, Number(value) || 0);
        const updatedItems = [...formData.items];
        const item = { ...updatedItems[index], [field]: numVal };

        const oldQ = Math.max(1, Number(item.quantity) || 1);
        const w = field === 'width' ? numVal : item.width;
        const h = field === 'height' ? numVal : item.height;
        const q = Math.max(1, field === 'quantity' ? numVal : item.quantity);
        const margin = field === 'profitMarginPercent' ? numVal : (item.profitMarginPercent ?? formData.profitMarginPercent ?? 20);

        const unitAreaSqFt = parseFloat(((w * h) / 92903.04).toFixed(2));
        const totalAreaSqFt = parseFloat((unitAreaSqFt * q).toFixed(2));

        let ratePerSqFt = item.labourRatePerSqFt !== undefined && item.labourRatePerSqFt !== null ? Number(item.labourRatePerSqFt) : 150;
        let unitLabour = item.labourCost || 0;

        if (field === 'labourRatePerSqFt') {
            ratePerSqFt = numVal;
            unitLabour = Math.round(unitAreaSqFt * ratePerSqFt);
        } else if (field === 'labourCost') {
            unitLabour = numVal;
            ratePerSqFt = unitAreaSqFt > 0 ? parseFloat((unitLabour / unitAreaSqFt).toFixed(2)) : ratePerSqFt;
        } else if (field === 'width' || field === 'height' || field === 'quantity') {
            unitLabour = Math.round(unitAreaSqFt * ratePerSqFt);
        }

        const totalLabour = unitLabour * q;
        item.width = w;
        item.height = h;
        item.quantity = q;
        item.labourRatePerSqFt = ratePerSqFt;
        item.labourCost = unitLabour;
        item.unitAreaSqFt = unitAreaSqFt;
        item.totalAreaSqFt = totalAreaSqFt;

        // Match template from database
        const matchedTemplate = templates.find(t => 
            (item.templateId && t._id === item.templateId) ||
            (t.type === item.applicationType && item.configuration?.includes(t.configuration))
        ) || templates.find(t => t.type === item.applicationType);

        if (matchedTemplate && dbRates) {
            const bom = calculateBOM({
                appType: matchedTemplate.type,
                baseFormula: matchedTemplate.type,
                selectedTemplate: matchedTemplate,
                width: w,
                height: h,
                quantity: q,
                rates: dbRates,
                calculationMode: 'template',
                profitMarginPercent: margin,
                labourRatePerSqFt: ratePerSqFt,
                totalLabourCost: unitLabour
            });

            const finalSellingPrice = bom?.summary?.finalSellingPrice || 0;

            item.profileCuts = bom?.profileCuts || item.profileCuts;
            item.glassItems = bom?.glassItems || item.glassItems;
            item.accessories = bom?.accessories || item.accessories;
            item.gasketItems = bom?.gasketItems || item.gasketItems;
            item.totalGasketMeters = bom?.summary?.totalGasketMeters !== undefined ? bom?.summary?.totalGasketMeters : item.totalGasketMeters;
            item.totalAreaSqFt = totalAreaSqFt;
            item.unitPrice = Math.round(finalSellingPrice / q);
            item.totalPrice = finalSellingPrice;
            item.profitMarginPercent = margin;
            item.labourRatePerSqFt = ratePerSqFt;
            item.labourCost = unitLabour;
            item.costingSummary = {
                ...(bom?.summary || {}),
                totalLabourCost: totalLabour,
                unitLabourCost: unitLabour,
                labourRatePerSqFt: ratePerSqFt,
                profitMarginPercent: margin,
                finalSellingPrice
            };
        } else {
            // For openings from 2D configurator, recalculate selling price with proper material scaling
            let unitAlu = (Number(item.costingSummary?.totalAluminiumCost) || 0) / oldQ;
            let unitGlass = (Number(item.costingSummary?.totalGlassCost) || 0) / oldQ;
            let unitGasket = (Number(item.costingSummary?.totalGasketCost) || (item.gasketItems ? item.gasketItems.reduce((s, g) => s + (Number(g.cost) || 0), 0) : 0)) / oldQ;
            let unitHardware = (item.costingSummary?.totalAccessoriesCost !== undefined
                ? Math.max(0, (Number(item.costingSummary.totalAccessoriesCost) || 0) - (unitGasket * oldQ))
                : (item.accessories || []).filter(a => !isGasketItem(a)).reduce((s, a) => s + (Number(a.cost) || 0), 0)
            ) / oldQ;

            // Fallback for gaskets if unitGasket was 0
            if (unitGasket <= 0 && ((item.gasketItems && item.gasketItems.length > 0) || (item.accessories && item.accessories.length > 0))) {
                const gItems = (item.gasketItems && item.gasketItems.length > 0) ? item.gasketItems : item.accessories.filter(isGasketItem);
                unitGasket = (gItems.reduce((s, g) => s + (Number(g.cost) || ((Number(g.qty) || 0) * (Number(g.unitRate) || 0))), 0)) / oldQ;
            }

            // Fallback for hardware if unitHardware was 0
            if (unitHardware <= 0 && item.accessories && item.accessories.length > 0) {
                const hItems = item.accessories.filter(a => !isGasketItem(a));
                unitHardware = (hItems.reduce((s, a) => s + (Number(a.cost) || ((Number(a.qty) || 0) * (Number(a.unitRate) || 0))), 0)) / oldQ;
            }

            // Fallback for profile cuts if unitAlu was 0
            if (unitAlu <= 0 && item.profileCuts && item.profileCuts.length > 0) {
                const totalCutsCost = item.profileCuts.reduce((sum, pc) => {
                    const profRate = dbRates?.profiles?.[pc.profileCode || pc.code]?.ratePerM || Number(pc.unitRate) || 750;
                    const lenM = ((pc.length || 0) * (pc.qty || 1)) / 1000;
                    return sum + (Number(pc.cost) > 0 ? Number(pc.cost) : (lenM * profRate));
                }, 0);
                unitAlu = totalCutsCost / oldQ;
            }

            // Fallback for glass if unitGlass was 0
            if (unitGlass <= 0 && item.glassItems && item.glassItems.length > 0) {
                unitGlass = (item.glassItems.reduce((s, g) => s + (Number(g.cost) || 0), 0)) / oldQ;
            }

            // If dimensions changed, scale area/perimeter materials proportionally
            if (field === 'width' || field === 'height') {
                const oldUnitArea = parseFloat(((item.width * item.height) / 92903.04).toFixed(2)) || unitAreaSqFt || 1;
                const areaRatio = oldUnitArea > 0 ? (unitAreaSqFt / oldUnitArea) : 1;
                unitGlass = Math.round(unitGlass * areaRatio);
                const perimeterRatio = (w + h) / Math.max(1, (item.width + item.height));
                unitAlu = Math.round(unitAlu * perimeterRatio);
                unitGasket = Math.round(unitGasket * perimeterRatio);
            }

            const newAluCost = Math.round(unitAlu * q);
            const newGlassCost = Math.round(unitGlass * q);
            const newHardwareCost = Math.round(unitHardware * q);
            const newGasketCost = Math.round(unitGasket * q);
            const newRawCost = newAluCost + newGlassCost + newHardwareCost + newGasketCost;

            const baseWithLabour = newRawCost + totalLabour;
            const profitAmount = Math.round(baseWithLabour * (margin / 100));
            const newFinalSelling = Math.round(baseWithLabour + profitAmount);

            // Scale item cut & component quantities proportionally if quantity changed
            const qRatio = q / oldQ;
            if (field === 'quantity' && qRatio !== 1) {
                item.profileCuts = (item.profileCuts || []).map(pc => ({
                    ...pc,
                    qty: Math.max(1, Math.round((pc.qty || 1) * qRatio)),
                    cost: Math.round((Number(pc.cost) || 0) * qRatio)
                }));
                item.accessories = (item.accessories || []).map(a => ({
                    ...a,
                    qty: Math.max(1, Math.round((a.qty || 1) * qRatio)),
                    cost: Math.round((Number(a.cost) || 0) * qRatio)
                }));
                item.gasketItems = (item.gasketItems || []).map(g => ({
                    ...g,
                    qty: Math.max(1, Math.round((g.qty || 1) * qRatio)),
                    cost: Math.round((Number(g.cost) || 0) * qRatio)
                }));
            }

            item.profitMarginPercent = margin;
            item.labourRatePerSqFt = ratePerSqFt;
            item.labourCost = unitLabour;
            item.totalPrice = newFinalSelling;
            item.unitPrice = Math.round(newFinalSelling / q);
            item.totalAreaSqFt = totalAreaSqFt;

            item.costingSummary = {
                ...(item.costingSummary || {}),
                totalAluminiumCost: newAluCost,
                totalGlassCost: newGlassCost,
                totalAccessoriesCost: newHardwareCost + newGasketCost,
                totalGasketCost: newGasketCost,
                totalLabourCost: totalLabour,
                unitLabourCost: unitLabour,
                labourRatePerSqFt: ratePerSqFt,
                profitMarginPercent: margin,
                profitMarginAmount: profitAmount,
                totalRawCost: newRawCost,
                finalSellingPrice: newFinalSelling
            };
        }

        updatedItems[index] = item;
        setFormData(prev => ({ ...prev, items: updatedItems }));
    };

    // Generic item text change (description, specs)
    const handleItemTextChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    // Add Opening from BOM Template Modal
    const handleSelectTemplateToAdd = (template) => {
        const newOpening = computeOpeningBOM(
            template, 
            2400, 
            2100, 
            1, 
            dbRates, 
            modalProfitMargin, 
            undefined,
            modalLabourRatePerSqFt
        );
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newOpening]
        }));
        setShowBOMModal(false);
        toast.success(`Added ${template.type} (${template.configuration}) with custom Labour & Margin!`);
    };

    // Remove opening
    const removeOpening = (index) => {
        if (formData.items.length === 1) {
            toast.error('Quotation must contain at least one opening item');
            return;
        }
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, idx) => idx !== index)
        }));
        toast.success('Removed opening from quotation');
    };

    const handleListChange = (listName, index, value) => {
        const newList = [...formData[listName]];
        newList[index] = value;
        setFormData({ ...formData, [listName]: newList });
    };

    // ==========================================
    // REAL-TIME QUOTATION CALCULATION SUMMARY
    // ==========================================
    const calculations = useMemo(() => {
        // Raw Subtotal = Sum of all openings' Final Selling Prices
        const rawSubtotal = formData.items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
        const transport = Number(formData.transportCost) || 0;
        const other = Number(formData.otherCost) || 0;

        // When distributeTransportCost is true, subtotal includes transport
        const subtotal = formData.distributeTransportCost ? (rawSubtotal + transport) : rawSubtotal;

        // Base amount before VAT (strictly rawSubtotal + transport + other)
        const baseAmount = rawSubtotal + transport + other;

        // 18% VAT if checked
        const vatAmount = formData.includeVat ? parseFloat((baseAmount * 0.18).toFixed(2)) : 0;
        const finalQuotationValue = baseAmount + vatAmount;

        // Calculate apportioned transport per item
        const itemsWithTransport = formData.items.map(item => {
            const rawPrice = Number(item.totalPrice) || 0;
            const qty = Math.max(1, Number(item.quantity) || 1);
            let apportionedTransport = 0;
            if (formData.distributeTransportCost && transport > 0 && rawSubtotal > 0) {
                apportionedTransport = (rawPrice / rawSubtotal) * transport;
            }
            const effectiveTotalPrice = rawPrice + apportionedTransport;
            const effectiveUnitPrice = qty > 0 ? (effectiveTotalPrice / qty) : 0;
            return {
                ...item,
                apportionedTransport,
                effectiveTotalPrice,
                effectiveUnitPrice
            };
        });

        // Materials & Labour totals across all openings
        const totalAluminium = Math.round(formData.items.reduce((s, it) => {
            const c = it.costingSummary?.totalAluminiumCost;
            if (c !== undefined && Number(c) > 0) return s + Number(c);
            const pcCost = (it.profileCuts || []).reduce((sum, pc) => {
                if (Number(pc.cost) > 0) return sum + Number(pc.cost);
                const r = dbRates?.profiles?.[pc.profileCode || pc.code]?.ratePerM || Number(pc.unitRate) || 750;
                return sum + (((pc.length || 0) * (pc.qty || 1)) / 1000) * r;
            }, 0);
            return s + (pcCost || 0);
        }, 0));

        const totalGlass = Math.round(formData.items.reduce((s, it) => {
            const c = it.costingSummary?.totalGlassCost;
            if (c !== undefined && Number(c) > 0) return s + Number(c);
            return s + (it.glassItems || []).reduce((sum, g) => sum + (Number(g.cost) || 0), 0);
        }, 0));

        const totalHardware = Math.round(formData.items.reduce((s, it) => {
            const accItems = (it.accessories || []).filter(a => !isGasketItem(a));
            if (accItems.length > 0) return s + accItems.reduce((sum, a) => sum + (Number(a.cost) || ((Number(a.qty) || 0) * (Number(a.unitRate) || 0))), 0);
            const gasketPart = Number(it.costingSummary?.totalGasketCost) || 0;
            return s + Math.max(0, (Number(it.costingSummary?.totalAccessoriesCost) || 0) - gasketPart);
        }, 0));

        const totalGaskets = Math.round(formData.items.reduce((s, it) => {
            if (it.costingSummary?.totalGasketCost !== undefined && Number(it.costingSummary.totalGasketCost) > 0) {
                return s + Number(it.costingSummary.totalGasketCost);
            }
            if (it.gasketItems && it.gasketItems.length > 0) {
                return s + it.gasketItems.reduce((sum, g) => sum + (Number(g.cost) || ((Number(g.qty) || 0) * (Number(g.unitRate) || 0))), 0);
            }
            return s + (it.accessories || []).filter(isGasketItem).reduce((sum, a) => sum + (Number(a.cost) || ((Number(a.qty) || 0) * (Number(a.unitRate) || 0))), 0);
        }, 0));

        const totalGasketMeters = parseFloat(formData.items.reduce((s, it) => {
            if (Number(it.totalGasketMeters) > 0) return s + Number(it.totalGasketMeters);
            const gItems = (it.gasketItems && it.gasketItems.length > 0) ? it.gasketItems : (it.accessories || []).filter(isGasketItem);
            return s + gItems.reduce((sum, g) => sum + (Number(g.qty) || 0), 0);
        }, 0).toFixed(2));
        const totalRaw = totalAluminium + totalGlass + totalHardware + totalGaskets;
        const totalLabour = Math.round(formData.items.reduce((s, it) => s + (it.costingSummary?.totalLabourCost || ((it.labourCost || 0) * (it.quantity || 1))), 0));
        const totalProfitMargin = Math.round(formData.items.reduce((s, it) => s + (it.costingSummary?.profitMarginAmount || Math.round(((it.costingSummary?.totalRawCost || totalRaw) + (it.costingSummary?.totalLabourCost || totalLabour)) * ((it.profitMarginPercent ?? 20) / 100))), 0));
        const totalAreaSqFt = parseFloat(formData.items.reduce((s, it) => s + (Number(it.totalAreaSqFt) || 0), 0).toFixed(2));

        return {
            rawSubtotal,
            subtotal,
            transport,
            other,
            baseAmount,
            vatAmount,
            finalQuotationValue,
            itemsWithTransport,
            totalAluminium,
            totalGlass,
            totalHardware,
            totalGaskets,
            totalGasketMeters,
            totalRaw,
            totalLabour,
            totalProfitMargin,
            totalAreaSqFt
        };
    }, [formData.items, formData.transportCost, formData.otherCost, formData.includeVat, formData.distributeTransportCost]);

    // Filter templates for BOM Library Modal
    const filteredTemplates = useMemo(() => {
        return templates.filter(t => {
            const matchesSearch = !bomSearchQuery.trim() || 
                t.type?.toLowerCase().includes(bomSearchQuery.toLowerCase()) ||
                t.configuration?.toLowerCase().includes(bomSearchQuery.toLowerCase()) ||
                t.brand?.toLowerCase().includes(bomSearchQuery.toLowerCase());
            
            const matchesCategory = bomCategoryFilter === 'ALL' || t.type === bomCategoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [templates, bomSearchQuery, bomCategoryFilter]);

    // Unique application categories from BOM templates
    const templateCategories = useMemo(() => {
        return Array.from(new Set(templates.map(t => t.type).filter(Boolean)));
    }, [templates]);

    // Handle Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.customerName.trim() || !formData.projectName.trim()) {
            toast.error('Customer name and Project name are required');
            return;
        }
        
        if (formData.items.length === 0) {
            toast.error('Please add at least one opening from the BOM library');
            return;
        }

        if (formData.items.some(item => !item.applicationType || item.width <= 0 || item.height <= 0 || item.quantity <= 0)) {
            toast.error('Please ensure all openings have valid dimensions and quantities');
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
            <div className="flex flex-col justify-center items-center py-40 space-y-3">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-sm font-semibold text-slate-500">Loading BOM Engine & Quotation Details...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-24">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <button 
                        type="button" 
                        onClick={() => navigate('/alu/quotations')} 
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="Back to Quotations"
                    >
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ERP BOM Quoting System
                            </span>
                            {fromConfigurator && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    From 2D Configurator
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                            {id ? 'Edit Aluminium Quotation' : 'Create Aluminium Quotation'}
                        </h1>
                        <p className="text-xs text-slate-500">
                            Configure verified BOM openings, adjust quantities, labour &amp; profit margins, and review real-time pricing.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button 
                        type="button" 
                        onClick={() => navigate('/alu/quotations')} 
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs flex-1 sm:flex-none"
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={saving} 
                        className="flex items-center justify-center gap-1.5 bg-[#064E3B] hover:bg-emerald-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md flex-1 sm:flex-none cursor-pointer"
                    >
                        <Save size={16} /> {saving ? 'Saving...' : 'Save & Generate Quotation'}
                    </Button>
                </div>
            </div>

            {/* 1. Customer & Project Metadata */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-6 h-6 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center text-xs font-black">1</span>
                        Project &amp; Client Details
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Customer / Client Name *</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Mr. Chaminda Perera" 
                            value={formData.customerName} 
                            onChange={e => setFormData({ ...formData, customerName: e.target.value })} 
                            required 
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-emerald-600 bg-white" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Project Name *</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Green Villa Residence" 
                            value={formData.projectName} 
                            onChange={e => setFormData({ ...formData, projectName: e.target.value })} 
                            required 
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-emerald-600 bg-white" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Location / Site Address</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Nugegoda, Colombo" 
                            value={formData.location} 
                            onChange={e => setFormData({ ...formData, location: e.target.value })} 
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-emerald-600 bg-white" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Quotation Validity Date</label>
                        <input 
                            type="date" 
                            value={formData.validTill} 
                            onChange={e => setFormData({ ...formData, validTill: e.target.value })} 
                            required 
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-emerald-600 bg-white" 
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">General Scope / Project Remarks (Optional)</label>
                    <input
                        type="text"
                        placeholder="e.g. Supply and installation of aluminium sliding doors, casement windows and fixed glass partitions as per BOQ"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-600 bg-white"
                    />
                </div>
            </div>

            {/* 2. Openings & BOM Entries Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-6 h-6 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-xs font-black">2</span>
                                Configured Openings (BOM Library Verified)
                            </h3>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                {formData.items.length} Opening{formData.items.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Only verified BOM templates with accurate profile cuts, glass, and hardware can be added. Adjust dimensions, labour, or profit margins to recalculate in real-time.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowBOMModal(true)}
                        className="flex items-center gap-2 bg-[#064E3B] hover:bg-emerald-900 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition-all cursor-pointer border border-emerald-800"
                    >
                        <PlusCircle size={16} /> Add Opening from BOM Library
                    </button>
                </div>

                {/* Openings List */}
                {formData.items.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                        <Box size={36} className="mx-auto text-slate-400" />
                        <h4 className="font-bold text-slate-700 text-sm">No openings added yet</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Click below to select verified openings from your BOM templates library with real-time cutting lists, labour costs, and profit margins.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowBOMModal(true)}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs cursor-pointer"
                        >
                            <Plus size={16} /> Open BOM Library
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {formData.items.map((item, idx) => (
                            <div 
                                key={idx} 
                                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-4 transition-all hover:border-slate-300"
                            >
                                {/* Opening Header Bar */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="w-6 h-6 bg-slate-800 text-white rounded-lg flex items-center justify-center text-xs font-black">
                                            #{idx + 1}
                                        </span>
                                        <h4 className="font-extrabold text-slate-800 text-sm">
                                            {item.applicationType} - {item.configuration}
                                        </h4>
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                                            <CheckCircle2 size={11} className="text-indigo-600" /> BOM Verified
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                                            Area: {item.totalAreaSqFt} sq.ft
                                        </span>
                                        {Number(item.totalGasketMeters) > 0 && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                                                🪢 Gaskets: {Number(item.totalGasketMeters).toFixed(1)} m
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={() => toggleBOMDetails(idx)}
                                            className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                                        >
                                            {expandedBOM[idx] ? <EyeOff size={13} /> : <Eye size={13} />}
                                            {expandedBOM[idx] ? 'Hide BOM Cuts' : 'BOM Breakdown'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => toggleSpecs(idx)}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 shadow-xs transition cursor-pointer"
                                        >
                                            {expandedSpecs[idx] ? '▲ Specs' : '⚙️ Specs'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeOpening(idx)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                            title="Remove Opening"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Main Dimensions, Quantity, Labour & Profit Margin Controls */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            Width (mm)
                                        </label>
                                        <input
                                            type="number"
                                            value={item.width}
                                            onChange={e => handleOpeningParamChange(idx, 'width', e.target.value)}
                                            required
                                            min="100"
                                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            Height (mm)
                                        </label>
                                        <input
                                            type="number"
                                            value={item.height}
                                            onChange={e => handleOpeningParamChange(idx, 'height', e.target.value)}
                                            required
                                            min="100"
                                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            Quantity (Nos)
                                        </label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => handleOpeningParamChange(idx, 'quantity', e.target.value)}
                                            required
                                            min="1"
                                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                                        />
                                    </div>

                                    {/* Labour Rate / Sqft & Calculated Cost Input */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                                                <Wrench size={12} className="text-amber-600" /> Labour Rate / Sqft (LKR)
                                            </label>
                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">
                                                {((item.width * item.height) / 92903.04).toFixed(1)} sqft
                                            </span>
                                        </div>
                                        <input
                                            type="number"
                                            value={item.labourRatePerSqFt ?? 150}
                                            onChange={e => handleOpeningParamChange(idx, 'labourRatePerSqFt', e.target.value)}
                                            min="0"
                                            placeholder="150"
                                            className="w-full bg-amber-50/20 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-amber-700 focus:outline-none focus:border-emerald-600"
                                        />
                                        <div className="mt-1 text-[10px] text-slate-500 font-medium flex justify-between items-center">
                                            <span>Labour: <strong className="text-amber-800 font-mono">LKR {(item.labourCost || 0).toLocaleString()}</strong> / unit</span>
                                            {item.quantity > 1 && (
                                                <span className="text-slate-400 font-mono">Tot: LKR {((item.labourCost || 0) * item.quantity).toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Profit Margin % Input */}
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                                            <Percent size={12} className="text-emerald-600" /> Profit Margin (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={item.profitMarginPercent ?? 20}
                                            onChange={e => handleOpeningParamChange(idx, 'profitMarginPercent', e.target.value)}
                                            min="0"
                                            placeholder="20"
                                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                                        />
                                    </div>
                                </div>

                                {/* Live Pricing Summary Bar for Opening */}
                                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-emerald-800">
                                                Unit Rate:{' '}
                                                <span className="font-mono text-sm text-emerald-950 font-black">
                                                    LKR {(formData.distributeTransportCost 
                                                        ? Math.round(calculations.itemsWithTransport[idx]?.effectiveUnitPrice || item.unitPrice || 0) 
                                                        : (item.unitPrice || 0)
                                                    ).toLocaleString()}
                                                </span>
                                            </span>
                                            {formData.distributeTransportCost && (calculations.itemsWithTransport[idx]?.apportionedTransport || 0) > 0 && (
                                                <span className="text-[10px] text-emerald-800 bg-emerald-200/90 px-2 py-0.5 rounded-full font-bold">
                                                    + Transport Apportioned
                                                </span>
                                            )}
                                            <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                                                Margin: {item.profitMarginPercent ?? 20}%
                                            </span>
                                            {(item.labourCost || 0) > 0 && (
                                                <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                                                    Labour: LKR {((item.labourCost || 0) * (item.quantity || 1)).toLocaleString()} ({((item.width * item.height * (item.quantity || 1)) / 92903.04).toFixed(1)} sqft × LKR {item.labourRatePerSqFt ?? 150})
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-500">
                                            {formData.distributeTransportCost && (calculations.itemsWithTransport[idx]?.apportionedTransport || 0) > 0
                                                ? `Calculated from BOM + Labour + Margin + LKR ${Math.round(calculations.itemsWithTransport[idx]?.apportionedTransport || 0).toLocaleString()} Apportioned Transport`
                                                : 'Calculated from BOM (Raw Materials + Labour Cost + Profit Margin)'}
                                        </span>
                                    </div>
                                    <div className="text-right self-end sm:self-auto">
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                            Opening Line Total
                                        </span>
                                        <span className="text-lg font-black text-emerald-950 font-mono">
                                            LKR {(formData.distributeTransportCost 
                                                ? Math.round(calculations.itemsWithTransport[idx]?.effectiveTotalPrice || item.totalPrice || 0) 
                                                : (item.totalPrice || 0)
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Location Remark Input */}
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Location Remark / Opening Tag (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Master Bedroom Balcony Door, Living Area Front Window"
                                        value={item.description || ''}
                                        onChange={e => handleItemTextChange(idx, 'description', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                                    />
                                </div>

                                {/* Expandable BOM Breakdown Accordion */}
                                {expandedBOM[idx] && (
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 text-xs">
                                        <h5 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] border-b pb-2 flex items-center gap-1.5">
                                            <Layers size={14} className="text-emerald-700" />
                                            Live BOM Cost &amp; Cutting Breakdown for Opening #{idx + 1}
                                        </h5>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                            {/* 1. Profile Cuts */}
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                                                <div className="flex justify-between font-bold text-slate-800 border-b pb-1 text-[11px]">
                                                    <span>📦 1. Aluminium Profiles</span>
                                                    <span className="font-mono">LKR {Math.round(
                                                        (item.costingSummary?.totalAluminiumCost !== undefined && Number(item.costingSummary.totalAluminiumCost) > 0)
                                                            ? Number(item.costingSummary.totalAluminiumCost)
                                                            : (item.profileCuts || []).reduce((sum, pc) => {
                                                                if (Number(pc.cost) > 0) return sum + Number(pc.cost);
                                                                const r = dbRates?.profiles?.[pc.profileCode || pc.code]?.ratePerM || Number(pc.unitRate) || 750;
                                                                return sum + (((pc.length || 0) * (pc.qty || 1)) / 1000) * r;
                                                            }, 0)
                                                    ).toLocaleString()}</span>
                                                </div>
                                                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                                    {(item.profileCuts || []).map((pc, i) => (
                                                        <div key={i} className="flex justify-between text-[10px] text-slate-600 border-b border-slate-100 py-0.5">
                                                            <span className="truncate max-w-[140px]" title={pc.name || pc.description || pc.code || pc.profileCode}>
                                                                {pc.name || pc.description || pc.code || pc.profileCode || 'Aluminium Profile'}
                                                            </span>
                                                            <span className="font-mono font-bold">{pc.length}mm × {pc.qty}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 2. Glass Items */}
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                                                <div className="flex justify-between font-bold text-slate-800 border-b pb-1 text-[11px]">
                                                    <span>🪟 2. Glass Panels</span>
                                                    <span className="font-mono">LKR {Math.round(
                                                        (item.costingSummary?.totalGlassCost !== undefined && Number(item.costingSummary.totalGlassCost) > 0)
                                                            ? Number(item.costingSummary.totalGlassCost)
                                                            : (item.glassItems || []).reduce((sum, g) => sum + (Number(g.cost) || 0), 0)
                                                    ).toLocaleString()}</span>
                                                </div>
                                                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                                    {(item.glassItems || []).map((g, i) => (
                                                        <div key={i} className="flex justify-between text-[10px] text-slate-600 border-b border-slate-100 py-0.5">
                                                            <span className="truncate max-w-[140px]">{g.type || 'Glass'}</span>
                                                            <span className="font-mono font-bold">{g.width}×{g.height}mm</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 3. Hardware & Accessories */}
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                                                <div className="flex justify-between font-bold text-slate-800 border-b pb-1 text-[11px]">
                                                    <span>⚙️ 3. Hardware &amp; Accessories</span>
                                                    <span className="font-mono">LKR {Math.round(
                                                        (() => {
                                                            const hItems = (item.accessories || []).filter(a => !isGasketItem(a));
                                                            if (hItems.length > 0) return hItems.reduce((sum, a) => sum + (Number(a.cost) || ((Number(a.qty) || 0) * (Number(a.unitRate) || 0))), 0);
                                                            const gCost = Number(item.costingSummary?.totalGasketCost) || 0;
                                                            return Math.max(0, (Number(item.costingSummary?.totalAccessoriesCost) || 0) - gCost);
                                                        })()
                                                    ).toLocaleString()}</span>
                                                </div>
                                                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                                    {(() => {
                                                        const hItems = (item.accessories || []).filter(a => !isGasketItem(a));
                                                        return hItems.length === 0 ? (
                                                            <div className="text-[10px] text-slate-400 italic py-1">No hardware items</div>
                                                        ) : (
                                                            hItems.map((a, i) => (
                                                                <div key={i} className="flex justify-between text-[10px] text-slate-600 border-b border-slate-100 py-0.5">
                                                                    <span className="truncate max-w-[130px] font-semibold" title={a.name || a.code}>{a.name || a.code}</span>
                                                                    <span className="font-mono font-bold">{a.qty} {a.unit || 'pcs'}</span>
                                                                </div>
                                                            ))
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* 4. Gaskets */}
                                            <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 space-y-1.5">
                                                <div className="flex justify-between font-bold text-amber-950 border-b border-amber-200 pb-1 text-[11px]">
                                                    <span>🪢 4. Gaskets</span>
                                                    <span className="font-mono">LKR {Math.round(
                                                        (() => {
                                                            if (item.costingSummary?.totalGasketCost !== undefined && Number(item.costingSummary.totalGasketCost) > 0) {
                                                                return Number(item.costingSummary.totalGasketCost);
                                                            }
                                                            const gList = (item.gasketItems && item.gasketItems.length > 0)
                                                                ? item.gasketItems
                                                                : (item.accessories || []).filter(isGasketItem);
                                                            return gList.reduce((sum, g) => sum + (Number(g.cost) || ((Number(g.qty) || 0) * (Number(g.unitRate) || 0))), 0);
                                                        })()
                                                    ).toLocaleString()}</span>
                                                </div>
                                                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                                    {(() => {
                                                        const gList = (item.gasketItems && item.gasketItems.length > 0)
                                                            ? item.gasketItems
                                                            : (item.accessories || []).filter(isGasketItem);
                                                        return gList.length === 0 ? (
                                                            <div className="text-[10px] text-slate-400 italic py-1">No gaskets specified</div>
                                                        ) : (
                                                            gList.map((gk, i) => (
                                                                <div key={i} className="flex justify-between text-[10px] text-amber-900 border-b border-amber-100 py-0.5">
                                                                    <span className="truncate max-w-[120px] font-semibold" title={gk.name || gk.code}>{gk.name || gk.code}</span>
                                                                    <span className="font-mono font-bold">{gk.qty} m</span>
                                                                </div>
                                                            ))
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Commercial Costing Flow Strip */}
                                        {(() => {
                                            const itemRaw = Math.round(
                                                item.costingSummary?.totalRawCost ||
                                                ((item.costingSummary?.totalAluminiumCost || 0) + (item.costingSummary?.totalGlassCost || 0) + (item.costingSummary?.totalAccessoriesCost || 0) + (item.costingSummary?.totalGasketCost || 0))
                                            );
                                            const itemLabour = Math.round(item.costingSummary?.totalLabourCost || ((item.labourCost || 0) * (item.quantity || 1)));
                                            const itemBase = itemRaw + itemLabour;
                                            const itemProfit = Math.round(item.costingSummary?.profitMarginAmount || (itemBase * ((item.profitMarginPercent ?? 20) / 100)));
                                            const itemFinal = Math.round(item.costingSummary?.finalSellingPrice || item.totalPrice || (itemBase + itemProfit));

                                            return (
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                                                    <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                                                        <span className="block text-[10px] text-slate-500 font-bold uppercase">1. Raw Materials</span>
                                                        <span className="font-mono font-bold text-slate-900">LKR {itemRaw.toLocaleString()}</span>
                                                    </div>
                                                    <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                                                        <span className="block text-[10px] text-slate-500 font-bold uppercase">2. Total Labour</span>
                                                        <span className="font-mono font-bold text-slate-900">LKR {itemLabour.toLocaleString()}</span>
                                                    </div>
                                                    <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                                                        <span className="block text-[10px] text-slate-500 font-bold uppercase">3. Margin ({item.profitMarginPercent ?? 20}%)</span>
                                                        <span className="font-mono font-bold text-emerald-700">+ LKR {itemProfit.toLocaleString()}</span>
                                                    </div>
                                                    <div className="p-2 bg-emerald-700 text-white rounded-lg shadow-2xs">
                                                        <span className="block text-[10px] text-emerald-100 font-bold uppercase">Opening Selling Price</span>
                                                        <span className="font-mono font-black text-sm">LKR {itemFinal.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Expandable Specifications Accordion */}
                                {expandedSpecs[idx] && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 text-xs">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Profile Specification</label>
                                            <input
                                                type="text"
                                                value={item.profileSpec || ''}
                                                onChange={e => handleItemTextChange(idx, 'profileSpec', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Glass Specification</label>
                                            <input
                                                type="text"
                                                value={item.glassSpec || ''}
                                                onChange={e => handleItemTextChange(idx, 'glassSpec', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Hardware Specification</label>
                                            <input
                                                type="text"
                                                value={item.hardwareSpec || ''}
                                                onChange={e => handleItemTextChange(idx, 'hardwareSpec', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Gasket Specification</label>
                                            <input
                                                type="text"
                                                value={item.gasketSpec || ''}
                                                onChange={e => handleItemTextChange(idx, 'gasketSpec', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                                                placeholder="e.g. EPDM Weather Seal Gasket"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Scope of Work Specification</label>
                                            <input
                                                type="text"
                                                value={item.scopeSpec || ''}
                                                onChange={e => handleItemTextChange(idx, 'scopeSpec', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. Real-Time Quotation Calculation & Pricing Summary */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="border-b pb-3">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-6 h-6 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center text-xs font-black">3</span>
                        Live Quotation Pricing &amp; Cost Calculation Summary
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Real-time mathematical breakdown of subtotal, transport, taxes, and final quotation value.
                    </p>
                </div>

                {/* Project-Wide Live BOM Costing Summary (Identical to 2D Configurator) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
                    {/* 1. Project Raw Materials Breakdown */}
                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                        <span>📦</span> 1. Project Raw Material Breakdown
                                    </h4>
                                    <span className="text-[11px] text-slate-500">Cumulative BOM material costs for all {formData.items.length} openings</span>
                                </div>
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                    4 Categories
                                </span>
                            </div>

                            <div className="space-y-2.5">
                                {/* 1.1 Aluminium Profiles */}
                                <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex justify-between items-center text-slate-800 font-bold">
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-slate-400 font-mono text-[11px]">1.1</span>
                                        <span>Aluminium Profiles</span>
                                    </span>
                                    <span className="font-mono text-slate-900 font-black text-sm">
                                        LKR {calculations.totalAluminium.toLocaleString()}
                                    </span>
                                </div>

                                {/* 1.2 Glass Sheets */}
                                <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex justify-between items-center text-slate-800 font-bold">
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-slate-400 font-mono text-[11px]">1.2</span>
                                        <span>Glass Sheets &amp; Panels</span>
                                    </span>
                                    <span className="font-mono text-slate-900 font-black text-sm">
                                        LKR {calculations.totalGlass.toLocaleString()}
                                    </span>
                                </div>

                                {/* 1.3 Hardware & Accessories */}
                                <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex justify-between items-center text-slate-800 font-bold">
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-slate-400 font-mono text-[11px]">1.3</span>
                                        <span>Hardware &amp; Accessories</span>
                                    </span>
                                    <span className="font-mono text-slate-900 font-black text-sm">
                                        LKR {calculations.totalHardware.toLocaleString()}
                                    </span>
                                </div>

                                {/* 1.4 Gaskets */}
                                <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex justify-between items-center text-slate-800 font-bold">
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-slate-400 font-mono text-[11px]">1.4</span>
                                        <span>Gaskets</span>
                                        {calculations.totalGasketMeters > 0 && (
                                            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-bold">
                                                {calculations.totalGasketMeters.toFixed(2)} m
                                            </span>
                                        )}
                                    </span>
                                    <span className="font-mono text-slate-900 font-black text-sm">
                                        LKR {calculations.totalGaskets.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Total Raw Materials Cost Footer */}
                        <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex justify-between items-center text-indigo-950">
                            <div className="flex flex-col">
                                <span className="font-extrabold text-xs uppercase tracking-wider text-indigo-900">Total Raw Materials Cost (A)</span>
                                <span className="text-[10px] text-indigo-600">Profiles + Glass + Accessories + Gaskets</span>
                            </div>
                            <span className="font-black font-mono text-base text-indigo-900">
                                LKR {calculations.totalRaw.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* 2. Project Commercial Price Calculation */}
                    <div className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-200 shadow-2xs flex flex-col justify-between space-y-4">
                        <div>
                            <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5 mb-3">
                                <div>
                                    <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                                        <span>💼</span> 2. Commercial Cost &amp; Margin Flow
                                    </h4>
                                    <span className="text-[11px] text-emerald-700">Project-wide production and profit structure</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                    Costing Flow
                                </span>
                            </div>

                            <div className="space-y-2.5">
                                {/* Step 1: Raw Materials */}
                                <div className="p-3 bg-white rounded-xl border border-emerald-100 flex justify-between items-center text-slate-700">
                                    <span className="font-semibold">1. Total Raw Materials (A)</span>
                                    <span className="font-mono font-bold text-slate-900">LKR {calculations.totalRaw.toLocaleString()}</span>
                                </div>

                                {/* Step 2: Labour Cost */}
                                <div className="p-3 bg-white rounded-xl border border-emerald-100 flex justify-between items-center text-slate-700">
                                    <div className="flex flex-col">
                                        <span className="font-semibold">2. Total Labour Cost (B)</span>
                                        <span className="text-[10px] text-emerald-700 font-medium">
                                            {calculations.totalAreaSqFt} sqft total project area
                                        </span>
                                    </div>
                                    <span className="font-mono font-bold text-slate-900">LKR {calculations.totalLabour.toLocaleString()}</span>
                                </div>

                                {/* Step 3: Base Production Cost */}
                                <div className="p-3 bg-emerald-100/60 rounded-xl border border-emerald-200 flex justify-between items-center text-emerald-950">
                                    <span className="font-bold text-[11px]">Base Production Cost (A + B)</span>
                                    <span className="font-mono font-extrabold text-sm text-emerald-900">
                                        LKR {(calculations.totalRaw + calculations.totalLabour).toLocaleString()}
                                    </span>
                                </div>

                                {/* Step 4: Profit Margin */}
                                <div className="p-3 bg-white rounded-xl border border-emerald-100 flex justify-between items-center text-slate-700">
                                    <span className="font-semibold">3. Total Profit Margin</span>
                                    <span className="font-mono font-bold text-emerald-700">
                                        + LKR {calculations.totalProfitMargin.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Openings Selling Price Subtotal */}
                        <div className="p-3.5 bg-emerald-700 text-white rounded-xl shadow-xs flex justify-between items-center">
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200">Openings Subtotal</span>
                                <span className="text-[10px] text-emerald-100 font-medium">Sum of all configured openings</span>
                            </div>
                            <span className="text-base font-black font-mono">
                                LKR {Math.round(calculations.subtotal).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Additional Charges Inputs */}
                    <div className="lg:col-span-6 space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <Truck size={14} className="text-slate-600" /> Logistics &amp; Transport Settings
                            </h4>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Transport &amp; Handling Cost (LKR)</label>
                                <input 
                                    type="number" 
                                    value={formData.transportCost} 
                                    onChange={e => setFormData({ ...formData, transportCost: Math.max(0, Number(e.target.value) || 0) })} 
                                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-600" 
                                />
                            </div>

                            <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="distributeTransportCost"
                                    checked={formData.distributeTransportCost}
                                    onChange={e => setFormData({ ...formData, distributeTransportCost: e.target.checked })}
                                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                />
                                <label htmlFor="distributeTransportCost" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                    Distribute Transport Cost into Item Rates (Hide separate Transport Line)
                                </label>
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Other Incidental Cost (LKR)</label>
                                <input 
                                    type="number" 
                                    value={formData.otherCost} 
                                    onChange={e => setFormData({ ...formData, otherCost: Math.max(0, Number(e.target.value) || 0) })} 
                                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-600" 
                                />
                            </div>

                            <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center gap-2">
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
                        </div>
                    </div>

                    {/* Right: Live Mathematical Cost Summary Box */}
                    <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <span className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Calculator size={15} className="text-emerald-700" />
                                Quotation Amount Summary
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                                {formData.items.length} Item(s)
                            </span>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                                <div>
                                    <span className="font-bold text-slate-800">
                                        Sub Total {formData.distributeTransportCost ? '(Transport Apportioned into Items)' : ''}
                                    </span>
                                    <span className="block text-[10px] text-slate-500">
                                        {formData.distributeTransportCost 
                                            ? '(Sum of all Openings including apportioned transport)' 
                                            : '(Final Selling Price sum of all BOM Openings)'}
                                    </span>
                                </div>
                                <span className="font-mono font-bold text-slate-900 text-sm">
                                    LKR {calculations.subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            {calculations.transport > 0 && (
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/70 text-slate-700">
                                    <span className="flex items-center gap-1.5">
                                        <span>Transport &amp; Handling</span>
                                        {formData.distributeTransportCost && (
                                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                                Apportioned into Items
                                            </span>
                                        )}
                                    </span>
                                    <span className="font-mono font-bold text-slate-800">
                                        {formData.distributeTransportCost ? (
                                            <span className="text-emerald-700 font-bold text-xs">
                                                Included in Sub Total (LKR {calculations.transport.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                            </span>
                                        ) : (
                                            `LKR ${calculations.transport.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        )}
                                    </span>
                                </div>
                            )}

                            {calculations.other > 0 && (
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/70 text-slate-700">
                                    <span>Other Additional Cost</span>
                                    <span className="font-mono font-bold text-slate-800">
                                        LKR {calculations.other.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between items-center py-1 border-b border-slate-200/70 text-slate-700">
                                <span>VAT (Value Added Tax) {formData.includeVat ? '18%' : '(Exempt)'}</span>
                                <span className="font-mono font-bold text-slate-800">
                                    {formData.includeVat ? `LKR ${calculations.vatAmount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'LKR 0.00'}
                                </span>
                            </div>
                        </div>

                        {/* Grand Total Highlight Banner */}
                        <div className="bg-[#064E3B] text-white p-4 rounded-xl shadow-md flex justify-between items-center">
                            <div>
                                <span className="block text-[9px] font-bold tracking-widest uppercase text-emerald-200">
                                    FINAL QUOTATION VALUE
                                </span>
                                <span className="text-[10px] text-emerald-100 font-medium">
                                    {formData.includeVat ? '(Including 18% VAT)' : '(Excluding VAT)'}
                                </span>
                            </div>
                            <div className="text-right font-mono font-black text-xl text-white">
                                <span className="text-xs text-emerald-200 font-normal mr-1.5">LKR</span>
                                {calculations.finalQuotationValue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Terms and Production Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t pt-6">
                {/* Terms and conditions */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-6 h-6 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center text-xs font-black">4</span>
                        Terms &amp; Conditions
                    </h3>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Custom Terms Paragraph (Optional)</label>
                        <textarea
                            rows={3}
                            placeholder="Enter custom terms and conditions here..."
                            value={formData.termsAndConditions}
                            onChange={e => setFormData({ ...formData, termsAndConditions: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-600 mb-2"
                        />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Standard Terms:</p>
                    {formData.terms.map((term, idx) => (
                        <div key={idx} className="flex gap-2">
                            <span className="text-sm font-semibold text-slate-400 mt-1">{idx + 1}.</span>
                            <input 
                                type="text" 
                                value={term} 
                                onChange={e => handleListChange('terms', idx, e.target.value)} 
                                required 
                                className="w-full border border-slate-100 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600 bg-slate-50/50" 
                            />
                        </div>
                    ))}
                </div>

                {/* Internal Quality Checklist */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-6 h-6 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center text-xs font-black">5</span>
                        Production &amp; Site Checklist
                    </h3>
                    <div className="space-y-2 pt-2">
                        {formData.checklist.map((item, idx) => (
                            <div key={idx} className="flex gap-2">
                                <span className="text-sm font-semibold text-slate-400 mt-1">{idx + 1}.</span>
                                <input 
                                    type="text" 
                                    value={item} 
                                    onChange={e => handleListChange('checklist', idx, e.target.value)} 
                                    required 
                                    className="w-full border border-slate-100 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600 bg-slate-50/50" 
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ============================================================== */}
            {/* INTERACTIVE MODAL: SELECT OPENING FROM BOM TEMPLATE LIBRARY    */}
            {/* ============================================================== */}
            {showBOMModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                        BOM Library
                                    </span>
                                    <h3 className="text-lg font-black text-slate-800">
                                        Select Opening from Verified BOM Templates
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Only templates with real database BOM configurations (profiles, glass, hardware) can be added.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBOMModal(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search & Category Filter Bar */}
                        <div className="p-4 border-b border-slate-100 bg-white space-y-3">
                            <div className="relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by application type, configuration, or brand..."
                                    value={bomSearchQuery}
                                    onChange={e => setBomSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                                />
                            </div>

                            {/* Category Filter Pills */}
                            {templateCategories.length > 0 && (
                                <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setBomCategoryFilter('ALL')}
                                        className={`px-3 py-1 rounded-lg font-bold transition text-[11px] whitespace-nowrap cursor-pointer ${
                                            bomCategoryFilter === 'ALL'
                                                ? 'bg-[#064E3B] text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        All ({templates.length})
                                    </button>
                                    {templateCategories.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setBomCategoryFilter(cat)}
                                            className={`px-3 py-1 rounded-lg font-bold transition text-[11px] whitespace-nowrap cursor-pointer ${
                                                bomCategoryFilter === cat
                                                    ? 'bg-[#064E3B] text-white'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Initial Opening Costing Overrides (Labour & Margin) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                <div className="flex items-center gap-2">
                                    <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
                                        <Wrench size={12} className="text-amber-600" /> Labour Rate / Sqft (LKR):
                                    </label>
                                    <input
                                        type="number"
                                        value={modalLabourRatePerSqFt}
                                        onChange={e => setModalLabourRatePerSqFt(Math.max(0, Number(e.target.value) || 0))}
                                        placeholder="150"
                                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
                                        <Percent size={12} className="text-emerald-600" /> Profit Margin (%):
                                    </label>
                                    <input
                                        type="number"
                                        value={modalProfitMargin}
                                        onChange={e => setModalProfitMargin(Math.max(0, Number(e.target.value) || 0))}
                                        placeholder="20"
                                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Templates Grid */}
                        <div className="p-5 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
                            {filteredTemplates.length === 0 ? (
                                <div className="text-center py-16 space-y-3">
                                    <Box size={40} className="mx-auto text-slate-400" />
                                    <h4 className="font-bold text-slate-700 text-sm">No BOM templates found</h4>
                                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                        No templates matched your search. Ensure templates are configured under Applications / ERP Database.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {filteredTemplates.map(template => {
                                        const profileCount = template.profileBOM?.length || 0;
                                        const glassCount = template.glassBOM?.length || 0;
                                        const accCount = template.accessoryBOM?.length || 0;

                                        return (
                                            <div
                                                key={template._id}
                                                className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div>
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                                {template.type}
                                                            </span>
                                                            <h4 className="font-extrabold text-slate-800 text-sm mt-1">
                                                                {template.configuration}
                                                            </h4>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                            {template.brand || 'Standard'} Series
                                                        </span>
                                                    </div>

                                                    {/* BOM Item Badges */}
                                                    <div className="flex gap-2 mt-2 text-[10px] text-slate-600 font-medium">
                                                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                                            🔩 {profileCount} Profiles
                                                        </span>
                                                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                                            🪟 {glassCount} Glass Panes
                                                        </span>
                                                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                                            ⚙️ {accCount} Accessories
                                                        </span>
                                                        {template.gasketBOM?.length > 0 && (
                                                            <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                                                                🪢 {template.gasketBOM.length} Gaskets
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                                                        {template.profileSpec || 'Standard Aluminium Series, Powder Coated with EPDM seals.'}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectTemplateToAdd(template)}
                                                    className="w-full mt-3 bg-[#064E3B] hover:bg-emerald-900 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                                                >
                                                    <Plus size={14} /> Add This Opening to Quotation
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
                            <Button
                                type="button"
                                onClick={() => setShowBOMModal(false)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
};

export default AluQuotationFormPage;
