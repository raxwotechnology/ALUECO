/**
 * ALUECO Aluminium System - Real-Time BOM & Costing Calculator
 * Computes exact cutting profiles, glass dimensions, rubber seals, accessories, and raw/selling costs.
 * Supports 1-Panel, Multi-Panel, Sliding, Casement, Fixed, Awning, Louver, Folding, and Custom Ad-Hoc BOMs.
 */

import { solveMultiLengthCutting } from './profileCuttingOptimizer.js';

// Default fallback rates when database rates are not available
const defaultProfileRates = {
    'OUTER_HEAD': { name: 'Outer Frame Header', ratePerM: 850, code: 'OUTER_HEAD' },
    'OUTER_SILL': { name: 'Outer Frame Sill', ratePerM: 850, code: 'OUTER_SILL' },
    'OUTER_JAMB': { name: 'Outer Frame Jamb', ratePerM: 850, code: 'OUTER_JAMB' },
    'CASEMENT_FRAME': { name: 'Casement Frame', ratePerM: 900, code: 'CASEMENT_FRAME' },
    'CASEMENT_SASH': { name: 'Casement Sash', ratePerM: 820, code: 'CASEMENT_SASH' },
    'FIXED_CHANNEL': { name: 'Fixed Glass Channel', ratePerM: 750, code: 'FIXED_CHANNEL' },
    'TRANSOM_BAR': { name: 'Transom Bar', ratePerM: 720, code: 'TRANSOM_BAR' },
    'AWNING_SASH': { name: 'Awning Sash', ratePerM: 820, code: 'AWNING_SASH' },
    'LOUVER_FRAME': { name: 'Louver Frame', ratePerM: 780, code: 'LOUVER_FRAME' },
    'SASH_INTERLOCK': { name: 'Sash Interlock', ratePerM: 850, code: 'SASH_INTERLOCK' },
    'SASH_RAIL': { name: 'Sash Rail', ratePerM: 850, code: 'SASH_RAIL' }
};

const defaultGlassRates = {
    'CLEAR_5MM': { name: '5mm Clear Float Glass', ratePerSqFt: 220, ratePerSqM: 2368 },
    'CLEAR_6MM': { name: '6mm Clear Float Glass', ratePerSqFt: 280, ratePerSqM: 3013 },
    'TEMPERED_5MM': { name: '5mm Tempered Clear Glass', ratePerSqFt: 350, ratePerSqM: 3767 },
    'TEMPERED_6MM': { name: '6mm Tempered Clear Glass', ratePerSqFt: 450, ratePerSqM: 4843 }
};

const defaultAccessoryRates = {
    'ROLLER': { name: 'Heavy Duty Roller', unitRate: 350, unit: 'pcs' },
    'LOCK': { name: 'Mortise Lock', unitRate: 600, unit: 'pcs' },
    'HANDLE': { name: 'Flush Handle', unitRate: 450, unit: 'pcs' },
    'WOOL_PILE': { name: 'Wool Pile Weatherstrip', unitRate: 60, unit: 'm' },
    'SEALANT': { name: 'Silicone Sealant', unitRate: 800, unit: 'Nos' },
    'HINGE': { name: 'Friction Stay Hinge', unitRate: 150, unit: 'pcs' },
    'BRACKET': { name: 'Corner Bracket', unitRate: 80, unit: 'pcs' }
};

export const calculateBOM = ({
    appType = 'Sliding Door',
    baseFormula = '',
    selectedTemplate = null,
    width = 2400,
    height = 2100,
    trackSystem = '2-Track',
    panelCount = 2,
    panelArrangement = [],
    topSection = { enabled: true, height: 600, type: 'fixed' },
    quantity = 1,
    rates = null,
    selectedGlassCode = '',
    customAddons = [],
    calculationMode = 'template', // 'template' | 'custom'
    customProfiles = [],
    customGlass = [],
    customAccessories = [],
    customGaskets = [],
    aluminiumDiscountPercent = 0,
    profitMarginPercent = 20,
    totalLabourCost = undefined,
    labourRatePerSqFt = undefined
}) => {
    // Sanitize inputs (allow 0 width/height)
    const W = Number(width) > 0 ? Number(width) : 0;
    const H_total = Number(height) > 0 ? Number(height) : 0;
    const Q = Math.max(1, Number(quantity) || 1);
    
    // Top Fanlight partitioning calculation
    const hasTop = H_total > 0 && topSection && topSection.enabled && Number(topSection.height) > 0 && Number(topSection.height) < H_total;
    const H_top = hasTop ? Math.min(H_total - 100, Math.max(0, Number(topSection.height))) : 0;
    const H_bottom = Math.max(0, H_total - H_top);
    const topType = hasTop ? (topSection.type || 'fixed') : 'none';

    // Panel geometry & overlap calculation
    const P = Math.max(1, Number(panelCount) || 1);
    const formulaType = (baseFormula || appType).toLowerCase();
    const isSliding = formulaType.includes('sliding') || formulaType.includes('fold');
    const isCasement = formulaType.includes('casement');
    const isFixed = formulaType.includes('fixed');
    const isAwning = formulaType.includes('awning') || formulaType.includes('hung');
    const isLouver = formulaType.includes('louver');

    // Overlap for interlocking sashes: 32mm per interlock joint (only for sliding multi-panel)
    const interlockOverlap = (isSliding && P > 1) ? 32 : 0;
    const totalOverlaps = (P - 1) * interlockOverlap;
    const panelWidth = P === 1 ? Math.max(0, W - 70) : Math.round((W + totalOverlaps) / P);
    const panelHeight = Math.max(0, H_bottom - 70); // deduct outer frame header/sill thickness & clearances

    const profileRates = { ...defaultProfileRates, ...(rates?.profiles || {}) };
    const glassRates = { ...defaultGlassRates, ...(rates?.glass || {}) };
    const accessoryRates = { ...defaultAccessoryRates, ...(rates?.accessories || {}) };

    const getProf = (key) => {
        if (!key) return { name: '', ratePerM: 750, code: '' };
        const upper = String(key).toUpperCase();
        const clean = upper.replace(/[-_\s]/g, '');
        const found = profileRates[key] || profileRates[upper] || profileRates[clean] || defaultProfileRates[key] || defaultProfileRates[upper];
        if (found && Number(found.ratePerM) > 0) return found;
        return { name: found?.name || key, ratePerM: 750, code: key };
    };

    const getGlass = (key) => {
        if (!key) {
            const first = Object.values(glassRates).find(g => Number(g?.ratePerSqFt) > 0);
            if (first) return first;
            return defaultGlassRates['CLEAR_5MM'];
        }

        // 1. Direct match
        if (glassRates[key] && Number(glassRates[key].ratePerSqFt) > 0) {
            return glassRates[key];
        }

        // 2. Case-insensitive & normalized match (ignoring whitespace, dashes, underscores)
        const normKey = String(key).trim().toLowerCase();
        const cleanKey = normKey.replace(/[-_\s]/g, '');

        for (const [k, val] of Object.entries(glassRates)) {
            const normK = String(k).trim().toLowerCase();
            const cleanK = normK.replace(/[-_\s]/g, '');
            if ((normK === normKey || cleanK === cleanKey) && Number(val?.ratePerSqFt) > 0) {
                return val;
            }
        }

        // 3. Substring match
        for (const [k, val] of Object.entries(glassRates)) {
            const normK = String(k).trim().toLowerCase();
            if ((normK.includes(normKey) || normKey.includes(normK)) && Number(val?.ratePerSqFt) > 0) {
                return val;
            }
        }

        // 4. Default glass rates check
        const def = defaultGlassRates[key] || defaultGlassRates[normKey.toUpperCase()] || defaultGlassRates[cleanKey.toUpperCase()];
        if (def && Number(def.ratePerSqFt) > 0) return def;

        // 5. If key is generic (like CLEAR_5MM), fallback to any inventory glass with a valid rate
        const anyInvGlass = Object.values(glassRates).find(g => Number(g?.ratePerSqFt) > 0);
        if (anyInvGlass) return { ...anyInvGlass, name: anyInvGlass.name || key };

        return { name: key, ratePerSqFt: 450, ratePerSqM: 4850 };
    };

    const getAcc = (key) => {
        const found = accessoryRates[key] || defaultAccessoryRates[key];
        if (found && Number(found.unitRate) > 0) return found;
        return { name: found?.name || key, unitRate: 0, unit: found?.unit || 'pcs' };
    };

    // Helper to evaluate string formulas like "W - 50", "2 * P", "(W + 32) / 2", "[W - (70 x 4)] / 2"
    const evalFormula = (expr, scope, allowDecimal = false) => {
        if (typeof expr === 'number') return expr;
        if (!expr || typeof expr !== 'string') return 0;
        try {
            let sanitized = expr.trim()
                // Replace brackets [] with parentheses
                .replace(/\[/g, '(')
                .replace(/\]/g, ')')
                // Replace 'x' or 'X' with '*' for multiplication
                .replace(/(\d+|\b[whpqWHPQ]\b|\))\s*[xX]\s*(\d+|\b[whpqWHPQ]\b|\()/g, '$1 * $2')
                .replace(/\bx\b/gi, '*')
                // Handle implicit multiplication like "2W", "4P", "2(W+H)", "(W)(H)"
                .replace(/(\d+)\s*([whpqWHPQ])/gi, '$1 * $2')
                .replace(/(\d+)\s*\(/g, '$1 * (')
                .replace(/\)\s*\(/g, ') * (')
                .replace(/\)\s*(\d+|[whpqWHPQ])/gi, ') * $1')
                // Replace variable names with their values
                .replace(/\bW\b/g, scope.W)
                .replace(/\bH\b/g, scope.H)
                .replace(/\bH_top\b/g, scope.H_top)
                .replace(/\bH_bottom\b/g, scope.H_bottom)
                .replace(/\bP\b/g, scope.P)
                .replace(/\bQ\b/g, scope.Q);
            const fn = new Function(`return (${sanitized})`);
            const res = fn();
            if (isNaN(res) || !isFinite(res)) return 0;
            return allowDecimal ? Math.max(0, parseFloat(Number(res).toFixed(2))) : Math.max(0, Math.round(res));
        } catch {
            return 0;
        }
    };

    // =========================================================================
    // IF SAVED DATABASE TEMPLATE (AluApplication) IS SELECTED AND HAS BOM ITEMS:
    // =========================================================================
    if (selectedTemplate && (selectedTemplate.profileBOM?.length > 0 || selectedTemplate.glassBOM?.length > 0) && calculationMode === 'template') {
        const scope = { W, H: H_total, H_top, H_bottom, P, Q };

        const profileCuts = (selectedTemplate.profileBOM || []).map(p => {
                const cutLength = evalFormula(p.lengthFormula, scope);
                const unitQty = evalFormula(p.quantityFormula, { ...scope, Q: 1 }) || 1;
                const totalQty = unitQty * Q;
                const profObj = getProf(p.profileCode);
                const ratePerM = profObj.ratePerM || 0;
                const totalLengthM = (cutLength / 1000) * totalQty;
                const discountMultiplier = 1 - (aluminiumDiscountPercent / 100);
                const discountedRate = ratePerM * discountMultiplier;
                return {
                    code: p.profileCode,
                    profileCode: p.profileCode,
                    name: p.description || profObj.name,
                    length: cutLength,
                    qty: totalQty,
                    totalLengthM: parseFloat(totalLengthM.toFixed(2)),
                    unitRate: ratePerM,
                    discountedRate: parseFloat(discountedRate.toFixed(2)),
                    discountPercent: aluminiumDiscountPercent,
                    cost: Math.round(totalLengthM * discountedRate)
                };
            });

            const glassItems = (selectedTemplate.glassBOM || []).map(g => {
                const gw = evalFormula(g.widthFormula, scope);
                const gh = evalFormula(g.heightFormula, scope);
                const unitQty = evalFormula(g.quantityFormula, { ...scope, Q: 1 }) || 1;
                const totalQty = unitQty * Q;
                const areaSqFt = (gw * gh * totalQty) / 92903.04;
                const lookupCode = selectedGlassCode || g.glassCode || g.glassType;
                const glassObj = getGlass(lookupCode);
                const ratePerSqFt = Number(glassObj.ratePerSqFt) || 0;
                return {
                    section: `${selectedTemplate.type || 'Template'} Glass Pane`,
                    type: glassObj.code ? `${glassObj.code} - ${glassObj.name}` : (g.glassCode || glassObj.name),
                    glassCode: glassObj.code || g.glassCode || '',
                    width: gw || 0,
                    height: gh || 0,
                    qty: totalQty,
                    areaSqFt: parseFloat((areaSqFt || 0).toFixed(2)),
                    unitRate: ratePerSqFt,
                    cost: Math.round((areaSqFt || 0) * ratePerSqFt)
                };
            });

            const accessories = (selectedTemplate.accessoryBOM || []).map(a => {
                const isMeter = (a.unit || '').toLowerCase() === 'm' || (a.accessoryCode || '').toLowerCase().includes('gasket');
                const unitQty = evalFormula(a.quantityFormula, { ...scope, Q: 1 }, isMeter) || 1;
                const totalQty = isMeter ? parseFloat((unitQty * Q).toFixed(2)) : (unitQty * Q);
                const accObj = getAcc(a.accessoryCode);
                const unitRate = accObj.unitRate || 0;
                return {
                    code: a.accessoryCode,
                    actualCode: a.actualCode || a.accessoryCode,
                    name: accObj.name || a.accessoryCode,
                    qty: totalQty,
                    unit: a.unit || accObj.unit || (isMeter ? 'm' : 'pcs'),
                    unitRate,
                    cost: Math.round(totalQty * unitRate),
                    isGasket: isMeter
                };
            });

            // Gaskets calculated from selectedTemplate.gasketBOM
            const gasketItems = (selectedTemplate.gasketBOM || []).map(g => {
                if (!g.gasketCode && !g.formula) return null;
                let unitMeters = evalFormula(g.formula || '0', { ...scope, Q: 1 }, true) || 0;
                // If user wrote formula in mm without division (e.g. 2*(W+H)), convert to meters
                if (unitMeters > 50 && (scope.W > 50 || scope.H > 50)) {
                    unitMeters = parseFloat((unitMeters / 1000).toFixed(2));
                }
                const totalMeters = parseFloat((unitMeters * Q).toFixed(2));
                const accObj = getAcc(g.gasketCode);
                const unitRate = accObj.unitRate || 150;
                return {
                    code: g.gasketCode || 'GASKET-EPDM',
                    actualCode: g.actualCode || g.gasketCode,
                    name: g.name || accObj.name || 'EPDM Weather Seal Gasket',
                    qty: totalMeters,
                    unit: g.unit || 'm',
                    unitRate,
                    cost: Math.round(totalMeters * unitRate),
                    isGasket: true
                };
            }).filter(Boolean);

            const combinedAccessories = [...accessories, ...gasketItems];

            const totalAluminiumCost = Math.round(profileCuts.reduce((sum, p) => sum + p.cost, 0));
            const totalGlassCost = Math.round(glassItems.reduce((sum, g) => sum + g.cost, 0));
            const totalAccessoriesCost = Math.round(combinedAccessories.reduce((sum, a) => sum + a.cost, 0));

            // Calculate aluminium discount amount
            const totalAluminiumCostBeforeDiscount = Math.round(profileCuts.reduce((sum, p) => {
                const originalCost = p.totalLengthM * p.unitRate;
                return sum + originalCost;
            }, 0));
            const aluminiumDiscountAmount = totalAluminiumCostBeforeDiscount - totalAluminiumCost;

            const isZeroDim = (W === 0 || H_total === 0);
            const unitAreaSqFt = isZeroDim ? 0 : parseFloat(((W * H_total) / 92903.04).toFixed(2));
            const totalAreaSqFt = isZeroDim ? 0 : parseFloat((unitAreaSqFt * Q).toFixed(2));

            // Labour Cost = Sqft Qty x Sqft Rate
            let effectiveLabourRate = 150;
            let unitLabourCost = 0;
            if (labourRatePerSqFt !== undefined && labourRatePerSqFt !== null && labourRatePerSqFt !== '') {
                effectiveLabourRate = Math.max(0, Number(labourRatePerSqFt) || 0);
                unitLabourCost = Math.round(unitAreaSqFt * effectiveLabourRate);
            } else if (totalLabourCost !== undefined && totalLabourCost !== null && Number(totalLabourCost) > 0) {
                unitLabourCost = Math.round(Number(totalLabourCost));
                effectiveLabourRate = unitAreaSqFt > 0 ? parseFloat((unitLabourCost / unitAreaSqFt).toFixed(2)) : 0;
            } else {
                effectiveLabourRate = 150;
                unitLabourCost = Math.round(unitAreaSqFt * effectiveLabourRate);
            }
            const calculatedTotalLabour = isZeroDim ? 0 : (unitLabourCost * Q);

            const totalRawCost = isZeroDim ? 0 : (totalAluminiumCost + totalGlassCost + totalAccessoriesCost);
            const baseWithLabour = totalRawCost + calculatedTotalLabour;
            const profitMarginAmount = baseWithLabour * (profitMarginPercent / 100);
            const finalSellingPrice = isZeroDim ? 0 : (baseWithLabour + profitMarginAmount);

            const cuttingOptimization = {};
            profileCuts.forEach(p => {
                const cutList = Array(p.qty).fill(p.length);
                const profObj = getProf(p.code);
                const stdBars = [
                    { lengthMm: 6096, price: Math.round((profObj.ratePerM || 750) * 6.096), label: '20ft (6.10m)' }
                ];
                cuttingOptimization[p.code] = solveMultiLengthCutting(cutList, stdBars);
                cuttingOptimization[p.code].description = p.name;
            });

            return {
                dimensions: {
                    width: W,
                    height: H_total,
                    topHeight: H_top,
                    bottomHeight: H_bottom,
                    panelWidth,
                    panelHeight,
                    panelCount: P,
                    trackSystem,
                    hasTop,
                    topType,
                    quantity: Q,
                    appType: selectedTemplate.type || appType
                },
                profileCuts,
                glassItems,
                accessories: combinedAccessories,
                gasketItems,
                cuttingOptimization,
                summary: {
                    totalAreaSqFt,
                    unitAreaSqFt,
                    labourRatePerSqFt: effectiveLabourRate,
                    unitLabourCost,
                    totalAluminiumCost,
                    totalAluminiumCostBeforeDiscount,
                    aluminiumDiscountAmount,
                    aluminiumDiscountPercent,
                    totalGlassCost,
                    totalAccessoriesCost,
                    totalGasketMeters: parseFloat(gasketItems.reduce((s, g) => s + (Number(g.qty) || 0), 0).toFixed(2)),
                    totalGasketCost: Math.round(gasketItems.reduce((s, g) => s + (Number(g.cost) || 0), 0)),
                    totalRawCost,
                    totalLabourCost: calculatedTotalLabour,
                    profitMarginPercent,
                    profitMarginAmount,
                    finalSellingPrice
                }
            };
    } else if (calculationMode === 'custom') {
        const discountMultiplier = 1 - (aluminiumDiscountPercent / 100);
        const profileCuts = (customProfiles || []).map((p, idx) => {
            const unitRate = Number(p.unitRate) || 0;
            const discountedRate = unitRate * discountMultiplier;
            return {
                code: p.code || `CUST-PROF-${idx + 1}`,
                profileCode: p.code || `CUST-PROF-${idx + 1}`,
                name: p.name || 'Custom Aluminium Profile',
                length: Number(p.length) || 0,
                qty: (Number(p.qty) || 1) * Q,
                totalLengthM: ((Number(p.length) || 0) / 1000) * (Number(p.qty) || 1) * Q,
                unitRate: unitRate,
                discountedRate: parseFloat(discountedRate.toFixed(2)),
                discountPercent: aluminiumDiscountPercent,
                cost: ((Number(p.length) || 0) / 1000) * (Number(p.qty) || 1) * discountedRate * Q
            };
        });

        const glassItems = (customGlass || []).map((g, idx) => {
            const gw = Number(g.width) || 0;
            const gh = Number(g.height) || 0;
            const gqty = Number(g.qty) || 1;
            const areaSqFt = (gw * gh * gqty) / 92903.04;
            const unitRate = Number(g.unitRate) || 0;
            const cost = areaSqFt * unitRate * Q;
            return {
                section: g.section || `Custom Glass Pane #${idx + 1}`,
                type: g.type || 'Custom Glass',
                width: gw || 0,
                height: gh || 0,
                qty: gqty * Q,
                areaSqFt: parseFloat((areaSqFt || 0).toFixed(2)),
                unitRate,
                cost: Math.round(cost)
            };
        });

        const accessories = (customAccessories || []).map((a, idx) => ({
            code: a.code || `CUST-ACC-${idx + 1}`,
            name: a.name || 'Custom Hardware Accessory',
            qty: (Number(a.qty) || 1) * Q,
            unit: a.unit || 'pcs',
            unitRate: Number(a.unitRate) || 0,
            cost: (Number(a.qty) || 1) * (Number(a.unitRate) || 0) * Q,
            isGasket: false
        }));

        const gasketItems = (customGaskets || []).map((g, idx) => {
            const meters = Number(g.meters || g.qty) || 0;
            const unitRate = Number(g.unitRate) || 150;
            const totalMeters = parseFloat((meters * Q).toFixed(2));
            return {
                code: g.code || `CUST-GSK-${idx + 1}`,
                actualCode: g.code || `CUST-GSK-${idx + 1}`,
                name: g.name || 'Custom EPDM Weather Seal Gasket',
                qty: totalMeters,
                unit: 'm',
                unitRate,
                cost: Math.round(totalMeters * unitRate),
                isGasket: true
            };
        });

        const combinedAccessories = [...accessories, ...gasketItems];
        const totalAluminiumCost = Math.round(profileCuts.reduce((sum, p) => sum + p.cost, 0));
        const totalGlassCost = Math.round(glassItems.reduce((sum, g) => sum + g.cost, 0));
        const totalAccessoriesCost = Math.round(combinedAccessories.reduce((sum, a) => sum + a.cost, 0));
        const totalGasketMeters = parseFloat(gasketItems.reduce((s, g) => s + (Number(g.qty) || 0), 0).toFixed(2));
        const totalGasketCost = Math.round(gasketItems.reduce((s, g) => s + (Number(g.cost) || 0), 0));

        // Calculate aluminium discount amount
        const totalAluminiumCostBeforeDiscount = Math.round(profileCuts.reduce((sum, p) => {
            const originalCost = p.totalLengthM * p.unitRate;
            return sum + originalCost;
        }, 0));
        const aluminiumDiscountAmount = totalAluminiumCostBeforeDiscount - totalAluminiumCost;

        const isZeroDim = (W === 0 || H_total === 0);
        const unitAreaSqFt = isZeroDim ? 0 : parseFloat(((W * H_total) / 92903.04).toFixed(2));
        const totalAreaSqFt = isZeroDim ? 0 : parseFloat((unitAreaSqFt * Q).toFixed(2));

        // Labour Cost = Sqft Qty x Sqft Rate
        let effectiveLabourRate = 150;
        let unitLabourCost = 0;
        if (labourRatePerSqFt !== undefined && labourRatePerSqFt !== null && labourRatePerSqFt !== '') {
            effectiveLabourRate = Math.max(0, Number(labourRatePerSqFt) || 0);
            unitLabourCost = Math.round(unitAreaSqFt * effectiveLabourRate);
        } else if (totalLabourCost !== undefined && totalLabourCost !== null && Number(totalLabourCost) > 0) {
            unitLabourCost = Math.round(Number(totalLabourCost));
            effectiveLabourRate = unitAreaSqFt > 0 ? parseFloat((unitLabourCost / unitAreaSqFt).toFixed(2)) : 0;
        } else {
            effectiveLabourRate = 150;
            unitLabourCost = Math.round(unitAreaSqFt * effectiveLabourRate);
        }
        const calculatedTotalLabour = isZeroDim ? 0 : (unitLabourCost * Q);

        const totalRawCost = totalAluminiumCost + totalGlassCost + totalAccessoriesCost;
        const baseWithLabour = totalRawCost + calculatedTotalLabour;
        const profitMarginAmount = baseWithLabour * (profitMarginPercent / 100);
        const finalSellingPrice = baseWithLabour + profitMarginAmount;

        return {
            dimensions: {
                width: W,
                height: H_total,
                topHeight: H_top,
                bottomHeight: H_bottom,
                panelWidth,
                panelHeight,
                panelCount: P,
                trackSystem,
                hasTop,
                topType,
                quantity: Q,
                appType
            },
            profileCuts,
            glassItems,
            accessories: combinedAccessories,
            gasketItems,
            summary: {
                totalAreaSqFt,
                unitAreaSqFt,
                labourRatePerSqFt: effectiveLabourRate,
                unitLabourCost,
                totalAluminiumCost,
                totalAluminiumCostBeforeDiscount,
                aluminiumDiscountAmount,
                aluminiumDiscountPercent,
                totalGlassCost,
                totalAccessoriesCost,
                totalGasketMeters,
                totalGasketCost,
                totalRawCost,
                totalLabourCost: calculatedTotalLabour,
                profitMarginPercent,
                profitMarginAmount,
                finalSellingPrice
            }
        };
    } else {
        // =========================================================================
        // STANDARD FORMULA MODE (AUTOMATIC CALCULATION BASED ON APPLICATION TYPE)
        // =========================================================================
        const profileCuts = [];
        const glassItems = [];
        const accessories = [];

        // Helper to apply discount to profile cost
        const discountMultiplier = 1 - (aluminiumDiscountPercent / 100);
        const applyDiscount = (ratePerM) => {
            const discountedRate = ratePerM * discountMultiplier;
            return {
                unitRate: ratePerM,
                discountedRate: parseFloat(discountedRate.toFixed(2)),
                discountPercent: aluminiumDiscountPercent
            };
        };

        if (W > 0 && H_total > 0) {
            // ----------------------------------------------------
            // 1. OUTER PERIMETER FRAME
            // ----------------------------------------------------
            const headCode = isFixed ? 'FIXED_CHANNEL' : (isCasement ? 'CASEMENT_FRAME' : 'OUTER_HEAD');
            const sillCode = isFixed ? 'FIXED_CHANNEL' : (isCasement ? 'CASEMENT_FRAME' : 'OUTER_SILL');
            const jambCode = isFixed ? 'FIXED_CHANNEL' : (isCasement ? 'CASEMENT_FRAME' : 'OUTER_JAMB');

            // Header & Sill
            const headRates = applyDiscount(getProf(headCode).ratePerM || 0);
            profileCuts.push({
                code: getProf(headCode).code,
                profileCode: getProf(headCode).code,
                name: getProf(headCode).name,
                length: W,
                qty: 1 * Q,
                totalLengthM: (W / 1000) * 1 * Q,
                unitRate: headRates.unitRate,
                discountedRate: headRates.discountedRate,
                discountPercent: headRates.discountPercent,
                cost: (W / 1000) * headRates.discountedRate * Q
            });

            const sillRates = applyDiscount(getProf(sillCode).ratePerM || 0);
            profileCuts.push({
                code: getProf(sillCode).code,
                profileCode: getProf(sillCode).code,
                name: getProf(sillCode).name,
                length: W,
                qty: 1 * Q,
                totalLengthM: (W / 1000) * 1 * Q,
                unitRate: sillRates.unitRate,
                discountedRate: sillRates.discountedRate,
                discountPercent: sillRates.discountPercent,
                cost: (W / 1000) * sillRates.discountedRate * Q
            });

            // Side Jambs
            const jambRates = applyDiscount(getProf(jambCode).ratePerM || 0);
            profileCuts.push({
                code: getProf(jambCode).code,
                profileCode: getProf(jambCode).code,
                name: getProf(jambCode).name,
                length: H_total,
                qty: 2 * Q,
                totalLengthM: (H_total / 1000) * 2 * Q,
                unitRate: jambRates.unitRate,
                discountedRate: jambRates.discountedRate,
                discountPercent: jambRates.discountPercent,
                cost: (H_total / 1000) * 2 * jambRates.discountedRate * Q
            });

            // Transom Bar (if top fanlight section enabled)
            if (hasTop) {
                const transomRates = applyDiscount(getProf('TRANSOM_BAR').ratePerM || 0);
                profileCuts.push({
                    code: getProf('TRANSOM_BAR').code,
                    profileCode: getProf('TRANSOM_BAR').code,
                    name: getProf('TRANSOM_BAR').name,
                    length: W,
                    qty: 1 * Q,
                    totalLengthM: (W / 1000) * 1 * Q,
                    unitRate: transomRates.unitRate,
                    discountedRate: transomRates.discountedRate,
                    discountPercent: transomRates.discountPercent,
                    cost: (W / 1000) * transomRates.discountedRate * Q
                });

                // Top Section Specific Profiles
                if (topType === 'awning') {
                    const awningRates = applyDiscount(getProf('AWNING_SASH').ratePerM || 0);
                    profileCuts.push({
                        code: getProf('AWNING_SASH').code,
                        profileCode: getProf('AWNING_SASH').code,
                        name: 'Top Awning Sash Horizontal Rails',
                        length: W - 40,
                        qty: 2 * Q,
                        totalLengthM: ((W - 40) / 1000) * 2 * Q,
                        unitRate: awningRates.unitRate,
                        discountedRate: awningRates.discountedRate,
                        discountPercent: awningRates.discountPercent,
                        cost: ((W - 40) / 1000) * 2 * awningRates.discountedRate * Q
                    });
                    profileCuts.push({
                        code: getProf('AWNING_SASH').code,
                        profileCode: getProf('AWNING_SASH').code,
                        name: 'Top Awning Sash Vertical Stiles',
                        length: H_top - 40,
                        qty: 2 * Q,
                        totalLengthM: ((H_top - 40) / 1000) * 2 * Q,
                        unitRate: awningRates.unitRate,
                        discountedRate: awningRates.discountedRate,
                        discountPercent: awningRates.discountPercent,
                        cost: ((H_top - 40) / 1000) * 2 * awningRates.discountedRate * Q
                    });
                } else if (topType === 'louver') {
                    const louverRates = applyDiscount(getProf('LOUVER_FRAME').ratePerM || 0);
                    profileCuts.push({
                        code: getProf('LOUVER_FRAME').code,
                        profileCode: getProf('LOUVER_FRAME').code,
                        name: getProf('LOUVER_FRAME').name,
                        length: H_top - 20,
                        qty: 2 * Q,
                        totalLengthM: ((H_top - 20) / 1000) * 2 * Q,
                        unitRate: louverRates.unitRate,
                        discountedRate: louverRates.discountedRate,
                        discountPercent: louverRates.discountPercent,
                        cost: ((H_top - 20) / 1000) * 2 * louverRates.discountedRate * Q
                    });
                }
            }

            // ----------------------------------------------------
            // 2. VENT / SASH PROFILES (FOR NON-FIXED OPENINGS)
            // ----------------------------------------------------
            if (!isFixed && !isLouver) {
                const sashStileCode = isCasement ? 'CASEMENT_SASH' : (isAwning ? 'AWNING_SASH' : 'SASH_INTERLOCK');
                const sashRailCode = isCasement ? 'CASEMENT_SASH' : (isAwning ? 'AWNING_SASH' : 'SASH_RAIL');
                const sashName = isCasement ? 'Casement Vent Sash' : (isAwning ? 'Awning Top-Hung Sash' : 'Sliding Sash');

                const totalStiles = P * 2;
                const totalRails = P * 2;

                const stileRates = applyDiscount(getProf(sashStileCode).ratePerM || 0);
                profileCuts.push({
                    code: getProf(sashStileCode).code,
                    profileCode: getProf(sashStileCode).code,
                    name: `${sashName} Vertical Stiles`,
                    length: panelHeight,
                    qty: totalStiles * Q,
                    totalLengthM: (panelHeight / 1000) * totalStiles * Q,
                    unitRate: stileRates.unitRate,
                    discountedRate: stileRates.discountedRate,
                    discountPercent: stileRates.discountPercent,
                    cost: (panelHeight / 1000) * totalStiles * stileRates.discountedRate * Q
                });

                const railRates = applyDiscount(getProf(sashRailCode).ratePerM || 0);
                profileCuts.push({
                    code: getProf(sashRailCode).code,
                    profileCode: getProf(sashRailCode).code,
                    name: `${sashName} Horizontal Rails (Top & Bottom)`,
                    length: panelWidth,
                    qty: totalRails * Q,
                    totalLengthM: (panelWidth / 1000) * totalRails * Q,
                    unitRate: railRates.unitRate,
                    discountedRate: railRates.discountedRate,
                    discountPercent: railRates.discountPercent,
                    cost: (panelWidth / 1000) * totalRails * railRates.discountedRate * Q
                });
            }

            // ----------------------------------------------------
            // 3. GLASS CUTTING & AREA CALCULATIONS
            // ----------------------------------------------------
            if (hasTop && topType !== 'louver') {
                const topGlassW = W - 50;
                const topGlassH = H_top - 50;
                const areaSqFt = (topGlassW * topGlassH) / 92903.04;
                const glassRate = getGlass(selectedGlassCode || 'CLEAR_5MM');
                const ratePerSqFt = Number(glassRate.ratePerSqFt) || 0;
                const cost = areaSqFt * ratePerSqFt * Q;

                glassItems.push({
                    section: 'Top Fanlight Section',
                    type: glassRate.code ? `${glassRate.code} - ${glassRate.name}` : glassRate.name,
                    glassCode: glassRate.code || 'CLEAR_5MM',
                    width: topGlassW || 0,
                    height: topGlassH || 0,
                    qty: 1 * Q,
                    areaSqFt: parseFloat((areaSqFt || 0).toFixed(2)),
                    unitRate: ratePerSqFt,
                    cost: Math.round(cost)
                });
            }

            // Main Bottom Section Glass
            if (!isLouver) {
                const deduct = isFixed ? 40 : 90;
                const bottomGlassW = (isFixed && P === 1) ? (W - 40) : Math.max(0, panelWidth - deduct);
                const bottomGlassH = (isFixed && P === 1) ? (H_bottom - 40) : Math.max(0, panelHeight - deduct);
                const bottomSingleAreaSqFt = (bottomGlassW * bottomGlassH) / 92903.04;
                const bottomGlassRate = getGlass(selectedGlassCode || 'CLEAR_5MM');
                const ratePerSqFt = Number(bottomGlassRate.ratePerSqFt) || 0;
                const bottomTotalCost = bottomSingleAreaSqFt * ratePerSqFt * P * Q;

                glassItems.push({
                    section: isFixed ? 'Fixed Glass Partition' : (isCasement ? 'Casement Glass Panes' : 'Sliding Glass Panels'),
                    type: bottomGlassRate.code ? `${bottomGlassRate.code} - ${bottomGlassRate.name}` : bottomGlassRate.name,
                    glassCode: bottomGlassRate.code || 'CLEAR_5MM',
                    width: bottomGlassW || 0,
                    height: bottomGlassH || 0,
                    qty: P * Q,
                    areaSqFt: parseFloat((bottomSingleAreaSqFt * P * Q || 0).toFixed(2)),
                    unitRate: ratePerSqFt,
                    cost: Math.round(bottomTotalCost)
                });
            }

            // ----------------------------------------------------
            // 4. HARDWARE ACCESSORIES & RUBBER SEALS
            // ----------------------------------------------------
            // Sliding Specific Accessories
            if (isSliding) {
                const slidingPanels = panelArrangement.length > 0 
                    ? panelArrangement.filter(p => p.action !== 'fixed').length 
                    : Math.max(1, P - (P > 1 ? 1 : 0));

                // Rollers (2 per sliding panel)
                const rollerCount = slidingPanels * 2 * Q;
                const accRoller = getAcc('ROLLER_HEAVY');
                accessories.push({
                    code: 'ROLLER_HEAVY',
                    name: accRoller.name,
                    qty: rollerCount,
                    unit: accRoller.unit || 'pcs',
                    unitRate: accRoller.unitRate || 0,
                    cost: rollerCount * (accRoller.unitRate || 0)
                });

                // Touch locks (1 per sliding panel)
                const lockCount = Math.max(1, slidingPanels) * Q;
                const accLock = getAcc('TOUCH_LOCK');
                accessories.push({
                    code: 'TOUCH_LOCK',
                    name: accLock.name,
                    qty: lockCount,
                    unit: accLock.unit || 'pcs',
                    unitRate: accLock.unitRate || 0,
                    cost: lockCount * (accLock.unitRate || 0)
                });

                // Interlock blocks (multi-panel sliding)
                if (P > 1) {
                    const interlockBlockCount = (P - 1) * 2 * Q;
                    const accInterlock = getAcc('INTERLOCK_BLOCK');
                    accessories.push({
                        code: 'INTERLOCK_BLOCK',
                        name: accInterlock.name,
                        qty: interlockBlockCount,
                        unit: accInterlock.unit || 'pcs',
                        unitRate: accInterlock.unitRate || 0,
                        cost: interlockBlockCount * (accInterlock.unitRate || 0)
                    });
                }
            }

            // Casement / Awning Specific Accessories
            if (isCasement || isAwning) {
                const hingesCount = P * 1 * Q;
                const accHinge = isCasement ? getAcc('CASEMENT_HINGE') : getAcc('AWNING_STAY');
                accessories.push({
                    code: accHinge.code || 'CASEMENT_HINGE',
                    name: accHinge.name,
                    qty: hingesCount,
                    unit: 'pair',
                    unitRate: accHinge.unitRate || 0,
                    cost: hingesCount * (accHinge.unitRate || 0)
                });

                const handlesCount = P * 1 * Q;
                const accHandle = isCasement ? getAcc('CASEMENT_HANDLE') : getAcc('AWNING_HANDLE');
                accessories.push({
                    code: accHandle.code || 'CASEMENT_HANDLE',
                    name: accHandle.name,
                    qty: handlesCount,
                    unit: 'pcs',
                    unitRate: accHandle.unitRate || 0,
                    cost: handlesCount * (accHandle.unitRate || 0)
                });
            }

            // Louver Specific Accessories
            if (isLouver) {
                const slatPairs = Math.ceil((H_bottom - 40) / 100) * P;
                const accLouver = getAcc('LOUVER_CLIP');
                accessories.push({
                    code: 'LOUVER_CLIP',
                    name: accLouver.name,
                    qty: slatPairs * Q,
                    unit: 'pair',
                    unitRate: accLouver.unitRate || 0,
                    cost: slatPairs * Q * (accLouver.unitRate || 0)
                });
            }

            // Corner Cleats
            const cleatCount = (4 + (isFixed ? 0 : P * 4)) * Q;
            const accCleat = getAcc('CORNER_CLEAT');
            accessories.push({
                code: 'CORNER_CLEAT',
                name: accCleat.name,
                qty: cleatCount,
                unit: accCleat.unit || 'pcs',
                unitRate: accCleat.unitRate || 0,
                cost: cleatCount * (accCleat.unitRate || 0)
            });

            // EPDM Rubber & Woolpile Seals
            const glassPerimeterM = ((panelWidth + panelHeight) * 2 * P / 1000) * Q;
            const accEpdm = getAcc('RUBBER_EPDM');
            accessories.push({
                code: 'RUBBER_EPDM',
                name: accEpdm.name,
                qty: parseFloat(glassPerimeterM.toFixed(1)),
                unit: accEpdm.unit || 'm',
                unitRate: accEpdm.unitRate || 0,
                cost: Math.round(glassPerimeterM * (accEpdm.unitRate || 0))
            });

            if (!isFixed) {
                const woolpilePerimeterM = ((panelWidth + panelHeight) * 2 * P / 1000) * Q;
                const accWool = getAcc('WOOLPILE');
                accessories.push({
                    code: 'WOOLPILE',
                    name: accWool.name,
                    qty: parseFloat(woolpilePerimeterM.toFixed(1)),
                    unit: accWool.unit || 'm',
                    unitRate: accWool.unitRate || 0,
                    cost: Math.round(woolpilePerimeterM * (accWool.unitRate || 0))
                });
            }
        }

        const totalAluminiumCost = Math.round(profileCuts.reduce((sum, item) => sum + item.cost, 0));
        const totalGlassCost = Math.round(glassItems.reduce((sum, g) => sum + g.cost, 0));
        const totalAccessoriesCost = Math.round(accessories.reduce((sum, a) => sum + a.cost, 0));

        // Calculate aluminium discount amount
        const totalAluminiumCostBeforeDiscount = Math.round(profileCuts.reduce((sum, item) => {
            const originalCost = item.totalLengthM * item.unitRate;
            return sum + originalCost;
        }, 0));
        const aluminiumDiscountAmount = totalAluminiumCostBeforeDiscount - totalAluminiumCost;

        // Custom Add-ons & Hardware Extras (Flyscreen, Special Lock, DGU Glass, Sub-frame, etc.)
        const customAddonItems = [];
        if (Array.isArray(customAddons) && customAddons.length > 0) {
            customAddons.forEach((item, idx) => {
                if (item.name && item.cost > 0) {
                    const itemObj = {
                        code: item.code || `CUSTOM_ADDON_${idx + 1}`,
                        name: item.name,
                        qty: Number(item.qty) || 1,
                        unit: item.unit || 'pcs',
                        unitRate: Number(item.unitRate) || Number(item.cost),
                        cost: Math.round(Number(item.cost))
                    };
                    accessories.push(itemObj);
                    customAddonItems.push(itemObj);
                }
            });
        }

        // ----------------------------------------------------
        // 5. TOTAL ESTIMATION SUMMARY
        // ----------------------------------------------------
        const isZeroDim = (W === 0 || H_total === 0);
        const unitAreaSqFt = isZeroDim ? 0 : parseFloat(((W * H_total) / 92903.04).toFixed(2));
        const totalAreaSqFt = isZeroDim ? 0 : parseFloat((unitAreaSqFt * Q).toFixed(2));

        // Labour Cost = Sqft Qty x Sqft Rate
        let effectiveLabourRate = 150;
        let unitLabourCost = 0;
        if (labourRatePerSqFt !== undefined && labourRatePerSqFt !== null && labourRatePerSqFt !== '') {
            effectiveLabourRate = Math.max(0, Number(labourRatePerSqFt) || 0);
            unitLabourCost = Math.round(unitAreaSqFt * effectiveLabourRate);
        } else if (totalLabourCost !== undefined && totalLabourCost !== null && Number(totalLabourCost) > 0) {
            unitLabourCost = Math.round(Number(totalLabourCost));
            effectiveLabourRate = unitAreaSqFt > 0 ? parseFloat((unitLabourCost / unitAreaSqFt).toFixed(2)) : 0;
        } else {
            effectiveLabourRate = 150;
            unitLabourCost = Math.round(unitAreaSqFt * effectiveLabourRate);
        }
        const calculatedTotalLabour = isZeroDim ? 0 : (unitLabourCost * Q);

        const totalRawCost = isZeroDim ? 0 : (totalAluminiumCost + totalGlassCost + totalAccessoriesCost);
        const baseWithLabour = totalRawCost + calculatedTotalLabour;
        const profitMarginAmount = baseWithLabour * (profitMarginPercent / 100);
        const finalSellingPrice = isZeroDim ? 0 : (baseWithLabour + profitMarginAmount);

        return {
            dimensions: {
                width: W,
                height: H_total,
                topHeight: H_top,
                bottomHeight: H_bottom,
                panelWidth,
                panelHeight,
                panelCount: P,
                trackSystem,
                hasTop,
                topType,
                quantity: Q,
                appType
            },
            profileCuts,
            glassItems,
            accessories,
            gasketItems: accessories.filter(a => a.isGasket || (a.unit || '').toLowerCase() === 'm'),
            summary: {
                totalAreaSqFt,
                unitAreaSqFt,
                labourRatePerSqFt: effectiveLabourRate,
                unitLabourCost,
                totalAluminiumCost,
                totalAluminiumCostBeforeDiscount,
                aluminiumDiscountAmount,
                aluminiumDiscountPercent,
                totalGlassCost,
                totalAccessoriesCost,
                totalGasketMeters: parseFloat(accessories.filter(a => a.isGasket || (a.unit || '').toLowerCase() === 'm').reduce((s, a) => s + (Number(a.qty) || 0), 0).toFixed(2)),
                totalGasketCost: Math.round(accessories.filter(a => a.isGasket || (a.unit || '').toLowerCase() === 'm').reduce((s, a) => s + (Number(a.cost) || 0), 0)),
                totalRawCost,
                totalLabourCost: calculatedTotalLabour,
                profitMarginPercent,
                profitMarginAmount,
                finalSellingPrice
            }
        };
    }
}

