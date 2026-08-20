/**
 * ALUECO Aluminium System - Real-Time BOM & Costing Calculator
 * Computes exact cutting profiles, glass dimensions, rubber seals, accessories, and raw/selling costs.
 * Supports 1-Panel, Multi-Panel, Sliding, Casement, Fixed, Awning, Louver, Folding, and Custom Ad-Hoc BOMs.
 */

import { solveMultiLengthCutting } from './profileCuttingOptimizer.js';

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
    profitMarginPercent = 0,
    rates = null,
    customAddons = [],
    calculationMode = 'standard', // 'standard' | 'custom'
    customProfiles = [],
    customGlass = [],
    customAccessories = [],
    customLabourType = 'fixed', // 'fixed' | 'percentage' | 'sqft' | 'opening'
    customLabourValue = 7500,
    customLabourCost = 7500
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

    // Default Commercial Market Rates Snapshot (used when DB items don't have custom pricing set)
    const defaultProfileRates = {
        'OUTER_HEAD': { name: 'Outer Frame Header / Track Profile', ratePerM: 850, code: 'ALU-OUT-01' },
        'OUTER_SILL': { name: 'Outer Frame Bottom Sill Profile', ratePerM: 920, code: 'ALU-OUT-02' },
        'OUTER_JAMB': { name: 'Outer Frame Side Jamb Profile', ratePerM: 780, code: 'ALU-OUT-03' },
        'TRANSOM_BAR': { name: 'Transom Partition Bar Profile', ratePerM: 800, code: 'ALU-TRN-01' },
        'SASH_INTERLOCK': { name: 'Sliding Sash Interlock Stile Profile', ratePerM: 720, code: 'ALU-SSH-01' },
        'SASH_HOOK': { name: 'Sliding Sash Hook Stile Profile', ratePerM: 750, code: 'ALU-SSH-02' },
        'SASH_RAIL': { name: 'Sliding Sash Top/Bottom Rail Profile', ratePerM: 680, code: 'ALU-SSH-03' },
        'CASEMENT_FRAME': { name: 'Casement Outer Perimeter Frame', ratePerM: 850, code: 'ALU-CAS-01' },
        'CASEMENT_SASH': { name: 'Casement Vent Sash Profile', ratePerM: 790, code: 'ALU-CAS-02' },
        'FIXED_CHANNEL': { name: 'Fixed Glass Partition Channel Frame', ratePerM: 550, code: 'ALU-FIX-01' },
        'AWNING_FRAME': { name: 'Awning Top-Hung Outer Frame', ratePerM: 820, code: 'ALU-AWN-01' },
        'AWNING_SASH': { name: 'Awning Top-Hung Vent Sash', ratePerM: 760, code: 'ALU-AWN-02' },
        'LOUVER_FRAME': { name: 'Louver Channel Side Stile Frame', ratePerM: 650, code: 'ALU-LOU-01' },
        // Code-based mapping
        'ALU-OUT-01': { name: 'Outer Frame Header / Track Profile', ratePerM: 850, code: 'ALU-OUT-01' },
        'ALU-OUT-02': { name: 'Outer Frame Bottom Sill Profile', ratePerM: 920, code: 'ALU-OUT-02' },
        'ALU-OUT-03': { name: 'Outer Frame Side Jamb Profile', ratePerM: 780, code: 'ALU-OUT-03' },
        'ALU-TRN-01': { name: 'Transom Partition Bar Profile', ratePerM: 800, code: 'ALU-TRN-01' },
        'ALU-SSH-01': { name: 'Sliding Sash Vertical Stiles', ratePerM: 720, code: 'ALU-SSH-01' },
        'ALU-SSH-02': { name: 'Sliding Sash Hook Stile Profile', ratePerM: 750, code: 'ALU-SSH-02' },
        'ALU-SSH-03': { name: 'Sliding Sash Horizontal Rails (Top & Bottom)', ratePerM: 680, code: 'ALU-SSH-03' },
        'ALU-CAS-01': { name: 'Casement Outer Frame', ratePerM: 850, code: 'ALU-CAS-01' },
        'ALU-CAS-02': { name: 'Casement Vent Sash', ratePerM: 790, code: 'ALU-CAS-02' },
        'ALU-FIX-01': { name: 'Fixed Glass Channel Frame', ratePerM: 550, code: 'ALU-FIX-01' },
        'ALU-AWN-01': { name: 'Awning Top-Hung Frame', ratePerM: 820, code: 'ALU-AWN-01' },
        'ALU-AWN-02': { name: 'Awning Top-Hung Sash', ratePerM: 760, code: 'ALU-AWN-02' },
        'ALU-LOU-01': { name: 'Louver Channel Frame', ratePerM: 650, code: 'ALU-LOU-01' }
    };

    const defaultGlassRates = {
        'CLEAR_5MM': { name: '5mm Clear Floating Glass', ratePerSqFt: 450, ratePerSqM: 4850 },
        'TINTED_6MM': { name: '6mm Dark Grey Tinted Glass', ratePerSqFt: 580, ratePerSqM: 6240 },
        'TEMPERED_6MM': { name: '6mm Clear Tempered Safety Glass', ratePerSqFt: 650, ratePerSqM: 7000 },
        '5mm Clear': { name: '5mm Clear Floating Glass', ratePerSqFt: 450, ratePerSqM: 4850 },
        '6mm Tinted': { name: '6mm Dark Grey Tinted Glass', ratePerSqFt: 580, ratePerSqM: 6240 },
        '6mm Tempered': { name: '6mm Clear Tempered Safety Glass', ratePerSqFt: 650, ratePerSqM: 7000 }
    };

    const defaultAccessoryRates = {
        'ROLLER_HEAVY': { name: 'Heavy Duty Bearing Roller Wheels', unitRate: 1200, unit: 'pcs' },
        'TOUCH_LOCK': { name: 'Flush Touch Lock Set with Key', unitRate: 1850, unit: 'pcs' },
        'INTERLOCK_BLOCK': { name: 'Weather Seal Interlock Block', unitRate: 250, unit: 'pcs' },
        'CASEMENT_HINGE': { name: 'Stainless Steel Friction Stay / Butt Hinge (Pair)', unitRate: 1450, unit: 'pair' },
        'CASEMENT_HANDLE': { name: 'Casement Cockspur Locking Handle', unitRate: 1650, unit: 'pcs' },
        'AWNING_STAY': { name: '12" Stainless Friction Stay Hinges (Pair)', unitRate: 1950, unit: 'pair' },
        'AWNING_HANDLE': { name: 'Awning Cockspur Locking Handle', unitRate: 1650, unit: 'pcs' },
        'LOUVER_CLIP': { name: 'Louver Clip Kit (4" Slats, Pair)', unitRate: 850, unit: 'pair' },
        'CORNER_CLEAT': { name: 'Heavy Aluminium Corner Cleat Joint', unitRate: 180, unit: 'pcs' },
        'RUBBER_EPDM': { name: 'EPDM Rubber Glass Gasket Strip', unitRate: 65, unit: 'm' },
        'WOOLPILE': { name: 'Silicone Weatherstrip Woolpile Seal', unitRate: 45, unit: 'm' },
        'ALU-ACC-01': { name: 'Bearing Roller Wheels', unitRate: 1200, unit: 'pcs' },
        'ALU-ACC-02': { name: 'Flush Touch Lock Set', unitRate: 1850, unit: 'pcs' },
        'ALU-ACC-03': { name: 'Interlock Weather Seal', unitRate: 250, unit: 'pcs' },
        'ALU-ACC-04': { name: 'Friction Hinges Pair', unitRate: 1450, unit: 'pair' },
        'ALU-ACC-05': { name: 'Cockspur Handle', unitRate: 1650, unit: 'pcs' },
        'ALU-ACC-06': { name: 'EPDM Rubber Gasket', unitRate: 65, unit: 'm' },
        'ALU-ACC-07': { name: 'Woolpile Weatherstrip', unitRate: 45, unit: 'm' }
    };

    const profileRates = { ...defaultProfileRates, ...(rates?.profiles || {}) };
    const glassRates = { ...defaultGlassRates, ...(rates?.glass || {}) };
    const accessoryRates = { ...defaultAccessoryRates, ...(rates?.accessories || {}) };

    const getProf = (key) => {
        const found = profileRates[key] || defaultProfileRates[key];
        if (found && Number(found.ratePerM) > 0) return found;
        return { name: found?.name || key, ratePerM: 750, code: key };
    };

    const getGlass = (key) => {
        const found = glassRates[key] || defaultGlassRates[key];
        if (found && Number(found.ratePerSqFt) > 0) return found;
        return { name: found?.name || key, ratePerSqFt: 450, ratePerSqM: 4850 };
    };

    const getAcc = (key) => {
        const found = accessoryRates[key] || defaultAccessoryRates[key];
        if (found && Number(found.unitRate) > 0) return found;
        return { name: found?.name || key, unitRate: 350, unit: found?.unit || 'pcs' };
    };

    // Helper to evaluate string formulas like "W - 50", "2 * P", "(W + 32) / 2"
    const evalFormula = (expr, scope) => {
        if (typeof expr === 'number') return expr;
        if (!expr || typeof expr !== 'string') return 0;
        try {
            const sanitized = expr
                .replace(/\bW\b/g, scope.W)
                .replace(/\bH\b/g, scope.H)
                .replace(/\bH_top\b/g, scope.H_top)
                .replace(/\bH_bottom\b/g, scope.H_bottom)
                .replace(/\bP\b/g, scope.P)
                .replace(/\bQ\b/g, scope.Q);
            const fn = new Function(`return (${sanitized})`);
            const res = fn();
            return isNaN(res) ? 0 : Math.max(0, Math.round(res));
        } catch {
            return 0;
        }
    };

    // =========================================================================
    // IF SAVED DATABASE TEMPLATE (AluApplication) IS SELECTED:
    // =========================================================================
    if (selectedTemplate && (selectedTemplate.profileBOM?.length > 0 || selectedTemplate.glassBOM?.length > 0)) {
        const scope = { W, H: H_total, H_top, H_bottom, P, Q };

        const profileCuts = (selectedTemplate.profileBOM || []).map(p => {
            const cutLength = evalFormula(p.lengthFormula, scope);
            const unitQty = evalFormula(p.quantityFormula, { ...scope, Q: 1 }) || 1;
            const totalQty = unitQty * Q;
            const profObj = getProf(p.profileCode);
            const ratePerM = profObj.ratePerM || 0;
            const totalLengthM = (cutLength / 1000) * totalQty;
            return {
                code: p.profileCode,
                name: p.description || profObj.name,
                length: cutLength,
                qty: totalQty,
                totalLengthM: parseFloat(totalLengthM.toFixed(2)),
                unitRate: ratePerM,
                cost: Math.round(totalLengthM * ratePerM)
            };
        });

        const glassItems = (selectedTemplate.glassBOM || []).map(g => {
            const gw = evalFormula(g.widthFormula, scope);
            const gh = evalFormula(g.heightFormula, scope);
            const unitQty = evalFormula(g.quantityFormula, { ...scope, Q: 1 }) || 1;
            const totalQty = unitQty * Q;
            const areaSqFt = (gw * gh * totalQty) / 92903.04;
            const glassObj = getGlass(g.glassType);
            const ratePerSqFt = glassObj.ratePerSqFt || 0;
            return {
                section: `${selectedTemplate.type} Glass Pane`,
                type: g.glassType || glassObj.name,
                width: gw,
                height: gh,
                qty: totalQty,
                areaSqFt: parseFloat(areaSqFt.toFixed(2)),
                unitRate: ratePerSqFt,
                cost: Math.round(areaSqFt * ratePerSqFt)
            };
        });

        const accessories = (selectedTemplate.accessoryBOM || []).map(a => {
            const unitQty = evalFormula(a.quantityFormula, { ...scope, Q: 1 }) || 1;
            const totalQty = unitQty * Q;
            const accObj = getAcc(a.accessoryCode);
            const unitRate = accObj.unitRate || 0;
            return {
                code: a.accessoryCode,
                name: accObj.name || a.accessoryCode,
                qty: totalQty,
                unit: accObj.unit || 'pcs',
                unitRate,
                cost: Math.round(totalQty * unitRate)
            };
        });

        const totalAluminiumCost = Math.round(profileCuts.reduce((sum, p) => sum + p.cost, 0));
        const totalGlassCost = Math.round(glassItems.reduce((sum, g) => sum + g.cost, 0));
        const totalAccessoriesCost = Math.round(accessories.reduce((sum, a) => sum + a.cost, 0));

        const totalAreaSqFt = (W * H_total * Q) / 92903.04;
        let totalLabourCost = 0;
        const labourRate = Number(selectedTemplate.labourRate) || 0;
        if (selectedTemplate.labourMethod === 'sqft') {
            totalLabourCost = Math.round(totalAreaSqFt * labourRate);
        } else if (selectedTemplate.labourMethod === 'opening') {
            totalLabourCost = Math.round(labourRate * Q);
        } else if (selectedTemplate.labourMethod === 'fixed') {
            totalLabourCost = Math.round(labourRate);
        } else if (selectedTemplate.labourMethod === 'percentage') {
            totalLabourCost = Math.round((totalAluminiumCost + totalGlassCost + totalAccessoriesCost) * (labourRate / 100));
        }

        const isZeroDim = (W === 0 || H_total === 0);
        const totalRawCost = isZeroDim ? 0 : (totalAluminiumCost + totalGlassCost + totalAccessoriesCost + totalLabourCost);
        const profitMargin = isZeroDim ? 0 : Math.round((totalRawCost * profitMarginPercent) / 100);
        const finalSellingPrice = isZeroDim ? 0 : (totalRawCost + profitMargin);

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
                appType: selectedTemplate.type
            },
            profileCuts,
            glassItems,
            accessories,
            cuttingOptimization,
            summary: {
                totalAluminiumCost,
                totalGlassCost,
                totalAccessoriesCost,
                totalLabourCost,
                totalRawCost,
                profitMarginPercent,
                profitMargin,
                finalSellingPrice,
                totalAreaSqFt: parseFloat(totalAreaSqFt.toFixed(2))
            }
        };
    }

    // =========================================================================
    // IF CUSTOM AD-HOC BOM BUILDER MODE IS ACTIVE:
    // =========================================================================
    if (calculationMode === 'custom') {
        const profileCuts = (customProfiles || []).map((p, idx) => ({
            code: p.code || `CUST-PROF-${idx + 1}`,
            name: p.name || 'Custom Aluminium Profile',
            length: Number(p.length) || 0,
            qty: (Number(p.qty) || 1) * Q,
            totalLengthM: ((Number(p.length) || 0) / 1000) * (Number(p.qty) || 1) * Q,
            unitRate: Number(p.unitRate) || 0,
            cost: ((Number(p.length) || 0) / 1000) * (Number(p.qty) || 1) * (Number(p.unitRate) || 0) * Q
        }));

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
                width: gw,
                height: gh,
                qty: gqty * Q,
                areaSqFt: parseFloat(areaSqFt.toFixed(2)),
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
            cost: (Number(a.qty) || 1) * (Number(a.unitRate) || 0) * Q
        }));

        const totalAluminiumCost = Math.round(profileCuts.reduce((sum, p) => sum + p.cost, 0));
        const totalGlassCost = Math.round(glassItems.reduce((sum, g) => sum + g.cost, 0));
        const totalAccessoriesCost = Math.round(accessories.reduce((sum, a) => sum + a.cost, 0));
        
        const totalAreaSqFt = (W * H_total * Q) / 92903.04;
        const rawMaterialsSum = totalAluminiumCost + totalGlassCost + totalAccessoriesCost;
        let totalLabourCost = 0;
        const val = Number(customLabourValue !== undefined ? customLabourValue : customLabourCost) || 0;
        if (customLabourType === 'percentage') {
            totalLabourCost = Math.round(rawMaterialsSum * (val / 100));
        } else if (customLabourType === 'sqft') {
            totalLabourCost = Math.round(totalAreaSqFt * val);
        } else if (customLabourType === 'opening') {
            totalLabourCost = Math.round(val * Q);
        } else {
            totalLabourCost = Math.round(val * Q);
        }

        const totalRawCost = totalAluminiumCost + totalGlassCost + totalAccessoriesCost + totalLabourCost;
        const profitMargin = Math.round((totalRawCost * profitMarginPercent) / 100);
        const finalSellingPrice = totalRawCost + profitMargin;

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
            summary: {
                totalAluminiumCost,
                totalGlassCost,
                totalAccessoriesCost,
                totalLabourCost,
                totalRawCost,
                profitMarginPercent,
                profitMargin,
                finalSellingPrice,
                totalAreaSqFt: parseFloat(totalAreaSqFt.toFixed(2))
            }
        };
    }

    // =========================================================================
    // STANDARD FORMULA MODE (AUTOMATIC CALCULATION BASED ON APPLICATION TYPE)
    // =========================================================================
    const profileCuts = [];
    const glassItems = [];
    const accessories = [];

    if (W > 0 && H_total > 0) {
        // ----------------------------------------------------
        // 1. OUTER PERIMETER FRAME
        // ----------------------------------------------------
        const headCode = isFixed ? 'FIXED_CHANNEL' : (isCasement ? 'CASEMENT_FRAME' : 'OUTER_HEAD');
        const sillCode = isFixed ? 'FIXED_CHANNEL' : (isCasement ? 'CASEMENT_FRAME' : 'OUTER_SILL');
        const jambCode = isFixed ? 'FIXED_CHANNEL' : (isCasement ? 'CASEMENT_FRAME' : 'OUTER_JAMB');

        // Header & Sill
        profileCuts.push({
            code: getProf(headCode).code,
            name: getProf(headCode).name,
            length: W,
            qty: 1 * Q,
            totalLengthM: (W / 1000) * 1 * Q,
            unitRate: getProf(headCode).ratePerM || 0,
            cost: (W / 1000) * (getProf(headCode).ratePerM || 0) * Q
        });

        profileCuts.push({
            code: getProf(sillCode).code,
            name: getProf(sillCode).name,
            length: W,
            qty: 1 * Q,
            totalLengthM: (W / 1000) * 1 * Q,
            unitRate: getProf(sillCode).ratePerM || 0,
            cost: (W / 1000) * (getProf(sillCode).ratePerM || 0) * Q
        });

        // Side Jambs
        profileCuts.push({
            code: getProf(jambCode).code,
            name: getProf(jambCode).name,
            length: H_total,
            qty: 2 * Q,
            totalLengthM: (H_total / 1000) * 2 * Q,
            unitRate: getProf(jambCode).ratePerM || 0,
            cost: (H_total / 1000) * 2 * (getProf(jambCode).ratePerM || 0) * Q
        });

        // Transom Bar (if top fanlight section enabled)
        if (hasTop) {
            profileCuts.push({
                code: getProf('TRANSOM_BAR').code,
                name: getProf('TRANSOM_BAR').name,
                length: W,
                qty: 1 * Q,
                totalLengthM: (W / 1000) * 1 * Q,
                unitRate: getProf('TRANSOM_BAR').ratePerM || 0,
                cost: (W / 1000) * (getProf('TRANSOM_BAR').ratePerM || 0) * Q
            });

            // Top Section Specific Profiles
            if (topType === 'awning') {
                profileCuts.push({
                    code: getProf('AWNING_SASH').code,
                    name: 'Top Awning Sash Horizontal Rails',
                    length: W - 40,
                    qty: 2 * Q,
                    totalLengthM: ((W - 40) / 1000) * 2 * Q,
                    unitRate: getProf('AWNING_SASH').ratePerM || 0,
                    cost: ((W - 40) / 1000) * 2 * (getProf('AWNING_SASH').ratePerM || 0) * Q
                });
                profileCuts.push({
                    code: getProf('AWNING_SASH').code,
                    name: 'Top Awning Sash Vertical Stiles',
                    length: H_top - 40,
                    qty: 2 * Q,
                    totalLengthM: ((H_top - 40) / 1000) * 2 * Q,
                    unitRate: getProf('AWNING_SASH').ratePerM || 0,
                    cost: ((H_top - 40) / 1000) * 2 * (getProf('AWNING_SASH').ratePerM || 0) * Q
                });
            } else if (topType === 'louver') {
                profileCuts.push({
                    code: getProf('LOUVER_FRAME').code,
                    name: getProf('LOUVER_FRAME').name,
                    length: H_top - 20,
                    qty: 2 * Q,
                    totalLengthM: ((H_top - 20) / 1000) * 2 * Q,
                    unitRate: getProf('LOUVER_FRAME').ratePerM || 0,
                    cost: ((H_top - 20) / 1000) * 2 * (getProf('LOUVER_FRAME').ratePerM || 0) * Q
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

            profileCuts.push({
                code: getProf(sashStileCode).code,
                name: `${sashName} Vertical Stiles`,
                length: panelHeight,
                qty: totalStiles * Q,
                totalLengthM: (panelHeight / 1000) * totalStiles * Q,
                unitRate: getProf(sashStileCode).ratePerM || 0,
                cost: (panelHeight / 1000) * totalStiles * (getProf(sashStileCode).ratePerM || 0) * Q
            });

            profileCuts.push({
                code: getProf(sashRailCode).code,
                name: `${sashName} Horizontal Rails (Top & Bottom)`,
                length: panelWidth,
                qty: totalRails * Q,
                totalLengthM: (panelWidth / 1000) * totalRails * Q,
                unitRate: getProf(sashRailCode).ratePerM || 0,
                cost: (panelWidth / 1000) * totalRails * (getProf(sashRailCode).ratePerM || 0) * Q
            });
        }

        // ----------------------------------------------------
        // 3. GLASS CUTTING & AREA CALCULATIONS
        // ----------------------------------------------------
        if (hasTop && topType !== 'louver') {
            const topGlassW = W - 50;
            const topGlassH = H_top - 50;
            const areaSqFt = (topGlassW * topGlassH) / 92903.04;
            const glassRate = getGlass('CLEAR_5MM');
            const cost = areaSqFt * (glassRate.ratePerSqFt || 0) * Q;

            glassItems.push({
                section: 'Top Fanlight Section',
                type: glassRate.name,
                width: topGlassW,
                height: topGlassH,
                qty: 1 * Q,
                areaSqFt: parseFloat(areaSqFt.toFixed(2)),
                unitRate: glassRate.ratePerSqFt || 0,
                cost: Math.round(cost)
            });
        }

        // Main Bottom Section Glass
        if (!isLouver) {
            const deduct = isFixed ? 40 : 90;
            const bottomGlassW = (isFixed && P === 1) ? (W - 40) : Math.max(0, panelWidth - deduct);
            const bottomGlassH = (isFixed && P === 1) ? (H_bottom - 40) : Math.max(0, panelHeight - deduct);
            const bottomSingleAreaSqFt = (bottomGlassW * bottomGlassH) / 92903.04;
            const bottomGlassRate = getGlass('CLEAR_5MM');
            const bottomTotalCost = bottomSingleAreaSqFt * (bottomGlassRate.ratePerSqFt || 0) * P * Q;

            glassItems.push({
                section: isFixed ? 'Fixed Glass Partition' : (isCasement ? 'Casement Glass Panes' : 'Sliding Glass Panels'),
                type: bottomGlassRate.name,
                width: bottomGlassW,
                height: bottomGlassH,
                qty: P * Q,
                areaSqFt: parseFloat((bottomSingleAreaSqFt * P * Q).toFixed(2)),
                unitRate: bottomGlassRate.ratePerSqFt || 0,
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
    // 5. LABOUR COST & TOTAL ESTIMATION SUMMARY
    // ----------------------------------------------------
    const totalAreaSqFt = (W * H_total * Q) / 92903.04;
    const labourRatePerSqFt = rates?.labourRate || 0; // Defaults to 0 when DB is empty
    const totalLabourCost = (W === 0 || H_total === 0) ? 0 : Math.round(totalAreaSqFt * labourRatePerSqFt);

    const isZeroDim = (W === 0 || H_total === 0);
    const totalRawCost = isZeroDim ? 0 : (totalAluminiumCost + totalGlassCost + totalAccessoriesCost + totalLabourCost);
    const profitMargin = isZeroDim ? 0 : Math.round((totalRawCost * profitMarginPercent) / 100);
    const finalSellingPrice = isZeroDim ? 0 : (totalRawCost + profitMargin);

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
        summary: {
            totalAluminiumCost,
            totalGlassCost,
            totalAccessoriesCost,
            totalLabourCost,
            totalRawCost,
            profitMarginPercent,
            profitMargin,
            finalSellingPrice,
            totalAreaSqFt: parseFloat(totalAreaSqFt.toFixed(2))
        }
    };
};

