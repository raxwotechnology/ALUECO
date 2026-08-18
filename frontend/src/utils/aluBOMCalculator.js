/**
 * ALUECO Aluminium System - Real-Time BOM & Costing Calculator
 * Computes exact cutting profiles, glass dimensions, rubber seals, accessories, and raw/selling costs.
 */

import { solveMultiLengthCutting } from './profileCuttingOptimizer.js';

export const calculateBOM = ({
    width = 2400,
    height = 2100,
    trackSystem = '2-Track',
    panelCount = 2,
    panelArrangement = [],
    topSection = { enabled: true, height: 600, type: 'fixed' },
    quantity = 1,
    profitMarginPercent = 20,
    rates = null,
    customAddons = []
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
    const P = Math.max(1, Number(panelCount) || 2);
    // Overlap for interlocking sashes: 32mm per interlock joint
    const interlockOverlap = 32;
    const totalOverlaps = (P - 1) * interlockOverlap;
    const panelWidth = Math.round((W + totalOverlaps) / P);
    const panelHeight = H_bottom - 70; // deduct outer frame header/sill thickness & track clearances

    // Default Rate Snapshot if custom rates not provided
    const defaultProfileRates = {
        'OUTER_HEAD': { name: 'Outer Frame Header / Track Profile', ratePerM: 0, code: 'ALU-OUT-01' },
        'OUTER_SILL': { name: 'Outer Frame Bottom Sill Profile', ratePerM: 0, code: 'ALU-OUT-02' },
        'OUTER_JAMB': { name: 'Outer Frame Side Jamb Profile', ratePerM: 0, code: 'ALU-OUT-03' },
        'TRANSOM_BAR': { name: 'Transom Partition Bar Profile', ratePerM: 0, code: 'ALU-TRN-01' },
        'SASH_INTERLOCK': { name: 'Sliding Sash Interlock Stile Profile', ratePerM: 0, code: 'ALU-SSH-01' },
        'SASH_HOOK': { name: 'Sliding Sash Hook Stile Profile', ratePerM: 0, code: 'ALU-SSH-02' },
        'SASH_RAIL': { name: 'Sliding Sash Top/Bottom Rail Profile', ratePerM: 0, code: 'ALU-SSH-03' },
        'AWNING_FRAME': { name: 'Awning Top-Hung Outer Frame', ratePerM: 0, code: 'ALU-AWN-01' },
        'AWNING_SASH': { name: 'Awning Top-Hung Vent Sash', ratePerM: 0, code: 'ALU-AWN-02' },
        'LOUVER_FRAME': { name: 'Louver Channel Side Stile Frame', ratePerM: 0, code: 'ALU-LOU-01' }
    };

    const defaultGlassRates = {
        'CLEAR_5MM': { name: '5mm Clear Floating Glass', ratePerSqFt: 0, ratePerSqM: 0 },
        'TINTED_6MM': { name: '6mm Dark Grey Tinted Glass', ratePerSqFt: 0, ratePerSqM: 0 },
        'TEMPERED_6MM': { name: '6mm Clear Tempered Safety Glass', ratePerSqFt: 0, ratePerSqM: 0 }
    };

    const defaultAccessoryRates = {
        'ROLLER_HEAVY': { name: 'Heavy Duty Bearing Roller Wheels', unitRate: 0, unit: 'pcs' },
        'TOUCH_LOCK': { name: 'Flush Touch Lock Set with Key', unitRate: 0, unit: 'pcs' },
        'INTERLOCK_BLOCK': { name: 'Weather Seal Interlock Block', unitRate: 0, unit: 'pcs' },
        'AWNING_STAY': { name: '12" Stainless Friction Stay Hinges (Pair)', unitRate: 0, unit: 'pair' },
        'AWNING_HANDLE': { name: 'Awning Cockspur Locking Handle', unitRate: 0, unit: 'pcs' },
        'LOUVER_CLIP': { name: 'Louver Clip Kit (4" Slats, Pair)', unitRate: 0, unit: 'pair' },
        'CORNER_CLEAT': { name: 'Heavy Aluminium Corner Cleat Joint', unitRate: 0, unit: 'pcs' },
        'RUBBER_EPDM': { name: 'EPDM Rubber Glass Gasket Strip', unitRate: 0, unit: 'm' },
        'WOOLPILE': { name: 'Silicone Weatherstrip Woolpile Seal', unitRate: 0, unit: 'm' }
    };

    const profileRates = { ...defaultProfileRates, ...(rates?.profiles || {}) };
    const glassRates = { ...defaultGlassRates, ...(rates?.glass || {}) };
    const accessoryRates = { ...defaultAccessoryRates, ...(rates?.accessories || {}) };

    const getProf = (key) => profileRates[key] || defaultProfileRates[key] || { name: key, ratePerM: 0, code: key };
    const getGlass = (key) => glassRates[key] || defaultGlassRates[key] || { name: key, ratePerSqFt: 0, ratePerSqM: 0 };
    const getAcc = (key) => accessoryRates[key] || defaultAccessoryRates[key] || { name: key, unitRate: 0, unit: 'pcs' };

    // ----------------------------------------------------
    // 1. ALUMINIUM PROFILE CUTTING SPECIFICATIONS
    // ----------------------------------------------------
    const profileCuts = [];
    const glassItems = [];
    const accessories = [];

    if (W > 0 && H_total > 0) {
        // Outer Frame Header & Sill
        profileCuts.push({
            code: getProf('OUTER_HEAD').code,
            name: getProf('OUTER_HEAD').name,
            length: W,
            qty: 1 * Q,
            totalLengthM: (W / 1000) * 1 * Q,
            unitRate: getProf('OUTER_HEAD').ratePerM || 0,
            cost: (W / 1000) * (getProf('OUTER_HEAD').ratePerM || 0) * Q
        });

        profileCuts.push({
            code: getProf('OUTER_SILL').code,
            name: getProf('OUTER_SILL').name,
            length: W,
            qty: 1 * Q,
            totalLengthM: (W / 1000) * 1 * Q,
            unitRate: getProf('OUTER_SILL').ratePerM || 0,
            cost: (W / 1000) * (getProf('OUTER_SILL').ratePerM || 0) * Q
        });

        // Outer Frame Side Jambs
        profileCuts.push({
            code: getProf('OUTER_JAMB').code,
            name: getProf('OUTER_JAMB').name,
            length: H_total,
            qty: 2 * Q,
            totalLengthM: (H_total / 1000) * 2 * Q,
            unitRate: getProf('OUTER_JAMB').ratePerM || 0,
            cost: (H_total / 1000) * 2 * (getProf('OUTER_JAMB').ratePerM || 0) * Q
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
                // Awning Sash outer frame & vent sash
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

        // Bottom Sliding Sash Profiles
        // Each panel requires 2 Stiles (Interlock/Hook) and 2 Rails (Top/Bottom)
        const totalStiles = P * 2;
        const totalRails = P * 2;

        profileCuts.push({
            code: getProf('SASH_INTERLOCK').code,
            name: 'Sliding Sash Vertical Interlock Stiles',
            length: panelHeight,
            qty: totalStiles * Q,
            totalLengthM: (panelHeight / 1000) * totalStiles * Q,
            unitRate: getProf('SASH_INTERLOCK').ratePerM || 0,
            cost: (panelHeight / 1000) * totalStiles * (getProf('SASH_INTERLOCK').ratePerM || 0) * Q
        });

        profileCuts.push({
            code: getProf('SASH_RAIL').code,
            name: 'Sliding Sash Horizontal Rails (Top & Bottom)',
            length: panelWidth,
            qty: totalRails * Q,
            totalLengthM: (panelWidth / 1000) * totalRails * Q,
            unitRate: getProf('SASH_RAIL').ratePerM || 0,
            cost: (panelWidth / 1000) * totalRails * (getProf('SASH_RAIL').ratePerM || 0) * Q
        });

        // ----------------------------------------------------
        // 2. GLASS CUTTING & AREA CALCULATIONS
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

        // Bottom Sliding Glass Panels
        const bottomGlassW = panelWidth - 90;
        const bottomGlassH = panelHeight - 90;
        const bottomSingleAreaSqFt = (bottomGlassW * bottomGlassH) / 92903.04;
        const bottomGlassRate = getGlass('CLEAR_5MM');
        const bottomTotalCost = bottomSingleAreaSqFt * (bottomGlassRate.ratePerSqFt || 0) * P * Q;

        glassItems.push({
            section: 'Bottom Sliding Panels',
            type: bottomGlassRate.name,
            width: bottomGlassW,
            height: bottomGlassH,
            qty: P * Q,
            areaSqFt: parseFloat((bottomSingleAreaSqFt * P * Q).toFixed(2)),
            unitRate: bottomGlassRate.ratePerSqFt || 0,
            cost: Math.round(bottomTotalCost)
        });

        // ----------------------------------------------------
        // 3. HARDWARE ACCESSORIES & RUBBER SEALS
        // ----------------------------------------------------
        // Number of sliding panels vs fixed panels
        const slidingPanels = panelArrangement.length > 0 
            ? panelArrangement.filter(p => p.action !== 'fixed').length 
            : Math.max(1, P - 1);

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

        // Weather seal interlock blocks
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

        // Corner Cleats
        const cleatCount = (4 + P * 4) * Q;
        const accCleat = getAcc('CORNER_CLEAT');
        accessories.push({
            code: 'CORNER_CLEAT',
            name: accCleat.name,
            qty: cleatCount,
            unit: accCleat.unit || 'pcs',
            unitRate: accCleat.unitRate || 0,
            cost: cleatCount * (accCleat.unitRate || 0)
        });

        // Awning Stays & Handles if Top Awning
        if (hasTop && topType === 'awning') {
            const accStay = getAcc('AWNING_STAY');
            accessories.push({
                code: 'AWNING_STAY',
                name: accStay.name,
                qty: 1 * Q,
                unit: accStay.unit || 'pair',
                unitRate: accStay.unitRate || 0,
                cost: 1 * Q * (accStay.unitRate || 0)
            });
            const accHandle = getAcc('AWNING_HANDLE');
            accessories.push({
                code: 'AWNING_HANDLE',
                name: accHandle.name,
                qty: 1 * Q,
                unit: accHandle.unit || 'pcs',
                unitRate: accHandle.unitRate || 0,
                cost: 1 * Q * (accHandle.unitRate || 0)
            });
        }

        // Louver Clips if Top Louver
        if (hasTop && topType === 'louver') {
            const slatPairs = Math.ceil((H_top - 40) / 100);
            const accLouver = getAcc('LOUVER_CLIP');
            accessories.push({
                code: 'LOUVER_CLIP',
                name: accLouver.name,
                qty: slatPairs * Q,
                unit: accLouver.unit || 'pair',
                unitRate: accLouver.unitRate || 0,
                cost: slatPairs * Q * (accLouver.unitRate || 0)
            });
        }

        // EPDM Rubber & Woolpile Seals
        const glassPerimeterM = ((bottomGlassW + bottomGlassH) * 2 * P / 1000) * Q;
        const accEpdm = getAcc('RUBBER_EPDM');
        accessories.push({
            code: 'RUBBER_EPDM',
            name: accEpdm.name,
            qty: parseFloat(glassPerimeterM.toFixed(1)),
            unit: accEpdm.unit || 'm',
            unitRate: accEpdm.unitRate || 0,
            cost: Math.round(glassPerimeterM * (accEpdm.unitRate || 0))
        });

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
    // 4. LABOUR COST & TOTAL ESTIMATION SUMMARY
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
            quantity: Q
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
