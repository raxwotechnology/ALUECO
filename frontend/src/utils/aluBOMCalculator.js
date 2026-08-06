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
    rates = null
}) => {
    // Sanitize inputs
    const W = Math.max(300, Number(width) || 2400);
    const H_total = Math.max(400, Number(height) || 2100);
    const Q = Math.max(1, Number(quantity) || 1);
    
    // Top Fanlight partitioning calculation
    const hasTop = topSection && topSection.enabled && Number(topSection.height) > 0 && Number(topSection.height) < H_total;
    const H_top = hasTop ? Math.min(H_total - 300, Math.max(200, Number(topSection.height))) : 0;
    const H_bottom = H_total - H_top;
    const topType = hasTop ? (topSection.type || 'fixed') : 'none';

    // Panel geometry & overlap calculation
    const P = Math.max(1, Number(panelCount) || 2);
    // Overlap for interlocking sashes: 32mm per interlock joint
    const interlockOverlap = 32;
    const totalOverlaps = (P - 1) * interlockOverlap;
    const panelWidth = Math.round((W + totalOverlaps) / P);
    const panelHeight = H_bottom - 70; // deduct outer frame header/sill thickness & track clearances

    // Default Rate Snapshot if custom rates not provided
    const profileRates = rates?.profiles || {
        'OUTER_HEAD': { name: 'Outer Frame Header / Track Profile', ratePerM: 1450, code: 'ALU-OUT-01' },
        'OUTER_SILL': { name: 'Outer Frame Bottom Sill Profile', ratePerM: 1550, code: 'ALU-OUT-02' },
        'OUTER_JAMB': { name: 'Outer Frame Side Jamb Profile', ratePerM: 1350, code: 'ALU-OUT-03' },
        'TRANSOM_BAR': { name: 'Transom Partition Bar Profile', ratePerM: 1600, code: 'ALU-TRN-01' },
        'SASH_INTERLOCK': { name: 'Sliding Sash Interlock Stile Profile', ratePerM: 1250, code: 'ALU-SSH-01' },
        'SASH_HOOK': { name: 'Sliding Sash Hook Stile Profile', ratePerM: 1250, code: 'ALU-SSH-02' },
        'SASH_RAIL': { name: 'Sliding Sash Top/Bottom Rail Profile', ratePerM: 1150, code: 'ALU-SSH-03' },
        'AWNING_FRAME': { name: 'Awning Top-Hung Outer Frame', ratePerM: 1400, code: 'ALU-AWN-01' },
        'AWNING_SASH': { name: 'Awning Top-Hung Vent Sash', ratePerM: 1300, code: 'ALU-AWN-02' },
        'LOUVER_FRAME': { name: 'Louver Channel Side Stile Frame', ratePerM: 1100, code: 'ALU-LOU-01' }
    };

    const glassRates = rates?.glass || {
        'CLEAR_5MM': { name: '5mm Clear Floating Glass', ratePerSqFt: 380, ratePerSqM: 4090 },
        'TINTED_6MM': { name: '6mm Dark Grey Tinted Glass', ratePerSqFt: 480, ratePerSqM: 5165 },
        'TEMPERED_6MM': { name: '6mm Clear Tempered Safety Glass', ratePerSqFt: 620, ratePerSqM: 6670 }
    };

    const accessoryRates = rates?.accessories || {
        'ROLLER_HEAVY': { name: 'Heavy Duty Bearing Roller Wheels', unitRate: 450, unit: 'pcs' },
        'TOUCH_LOCK': { name: 'Flush Touch Lock Set with Key', unitRate: 850, unit: 'pcs' },
        'INTERLOCK_BLOCK': { name: 'Weather Seal Interlock Block', unitRate: 120, unit: 'pcs' },
        'AWNING_STAY': { name: '12" Stainless Friction Stay Hinges (Pair)', unitRate: 1850, unit: 'pair' },
        'AWNING_HANDLE': { name: 'Awning Cockspur Locking Handle', unitRate: 650, unit: 'pcs' },
        'LOUVER_CLIP': { name: 'Louver Clip Kit (4" Slats, Pair)', unitRate: 950, unit: 'pair' },
        'CORNER_CLEAT': { name: 'Heavy Aluminium Corner Cleat Joint', unitRate: 90, unit: 'pcs' },
        'RUBBER_EPDM': { name: 'EPDM Rubber Glass Gasket Strip', unitRate: 45, unit: 'm' },
        'WOOLPILE': { name: 'Silicone Weatherstrip Woolpile Seal', unitRate: 35, unit: 'm' }
    };

    // ----------------------------------------------------
    // 1. ALUMINIUM PROFILE CUTTING SPECIFICATIONS
    // ----------------------------------------------------
    const profileCuts = [];

    // Outer Frame Header & Sill
    profileCuts.push({
        code: profileRates.OUTER_HEAD.code,
        name: profileRates.OUTER_HEAD.name,
        length: W,
        qty: 1 * Q,
        totalLengthM: (W / 1000) * 1 * Q,
        unitRate: profileRates.OUTER_HEAD.ratePerM,
        cost: (W / 1000) * profileRates.OUTER_HEAD.ratePerM * Q
    });

    profileCuts.push({
        code: profileRates.OUTER_SILL.code,
        name: profileRates.OUTER_SILL.name,
        length: W,
        qty: 1 * Q,
        totalLengthM: (W / 1000) * 1 * Q,
        unitRate: profileRates.OUTER_SILL.ratePerM,
        cost: (W / 1000) * profileRates.OUTER_SILL.ratePerM * Q
    });

    // Outer Frame Side Jambs
    profileCuts.push({
        code: profileRates.OUTER_JAMB.code,
        name: profileRates.OUTER_JAMB.name,
        length: H_total,
        qty: 2 * Q,
        totalLengthM: (H_total / 1000) * 2 * Q,
        unitRate: profileRates.OUTER_JAMB.ratePerM,
        cost: (H_total / 1000) * 2 * profileRates.OUTER_JAMB.ratePerM * Q
    });

    // Transom Bar (if top fanlight section enabled)
    if (hasTop) {
        profileCuts.push({
            code: profileRates.TRANSOM_BAR.code,
            name: profileRates.TRANSOM_BAR.name,
            length: W,
            qty: 1 * Q,
            totalLengthM: (W / 1000) * 1 * Q,
            unitRate: profileRates.TRANSOM_BAR.ratePerM,
            cost: (W / 1000) * profileRates.TRANSOM_BAR.ratePerM * Q
        });

        // Top Section Specific Profiles
        if (topType === 'awning') {
            // Awning Sash outer frame & vent sash
            profileCuts.push({
                code: profileRates.AWNING_SASH.code,
                name: 'Top Awning Sash Horizontal Rails',
                length: W - 40,
                qty: 2 * Q,
                totalLengthM: ((W - 40) / 1000) * 2 * Q,
                unitRate: profileRates.AWNING_SASH.ratePerM,
                cost: ((W - 40) / 1000) * 2 * profileRates.AWNING_SASH.ratePerM * Q
            });
            profileCuts.push({
                code: profileRates.AWNING_SASH.code,
                name: 'Top Awning Sash Vertical Stiles',
                length: H_top - 40,
                qty: 2 * Q,
                totalLengthM: ((H_top - 40) / 1000) * 2 * Q,
                unitRate: profileRates.AWNING_SASH.ratePerM,
                cost: ((H_top - 40) / 1000) * 2 * profileRates.AWNING_SASH.ratePerM * Q
            });
        } else if (topType === 'louver') {
            profileCuts.push({
                code: profileRates.LOUVER_FRAME.code,
                name: profileRates.LOUVER_FRAME.name,
                length: H_top - 20,
                qty: 2 * Q,
                totalLengthM: ((H_top - 20) / 1000) * 2 * Q,
                unitRate: profileRates.LOUVER_FRAME.ratePerM,
                cost: ((H_top - 20) / 1000) * 2 * profileRates.LOUVER_FRAME.ratePerM * Q
            });
        }
    }

    // Bottom Sliding Sash Profiles
    // Each panel requires 2 Stiles (Interlock/Hook) and 2 Rails (Top/Bottom)
    const totalStiles = P * 2;
    const totalRails = P * 2;

    profileCuts.push({
        code: profileRates.SASH_INTERLOCK.code,
        name: 'Sliding Sash Vertical Interlock Stiles',
        length: panelHeight,
        qty: totalStiles * Q,
        totalLengthM: (panelHeight / 1000) * totalStiles * Q,
        unitRate: profileRates.SASH_INTERLOCK.ratePerM,
        cost: (panelHeight / 1000) * totalStiles * profileRates.SASH_INTERLOCK.ratePerM * Q
    });

    profileCuts.push({
        code: profileRates.SASH_RAIL.code,
        name: 'Sliding Sash Horizontal Rails (Top & Bottom)',
        length: panelWidth,
        qty: totalRails * Q,
        totalLengthM: (panelWidth / 1000) * totalRails * Q,
        unitRate: profileRates.SASH_RAIL.ratePerM,
        cost: (panelWidth / 1000) * totalRails * profileRates.SASH_RAIL.ratePerM * Q
    });

    // Sum Aluminium Cost
    const totalAluminiumCost = Math.round(profileCuts.reduce((sum, item) => sum + item.cost, 0));

    // ----------------------------------------------------
    // 2. GLASS CUTTING & AREA CALCULATIONS
    // ----------------------------------------------------
    const glassItems = [];

    // Top Section Glass
    if (hasTop && topType !== 'louver') {
        const topGlassW = W - 50;
        const topGlassH = H_top - 50;
        const areaSqFt = (topGlassW * topGlassH) / 92903.04;
        const glassRate = glassRates.CLEAR_5MM;
        const cost = areaSqFt * glassRate.ratePerSqFt * Q;

        glassItems.push({
            section: 'Top Fanlight Section',
            type: glassRate.name,
            width: topGlassW,
            height: topGlassH,
            qty: 1 * Q,
            areaSqFt: parseFloat(areaSqFt.toFixed(2)),
            unitRate: glassRate.ratePerSqFt,
            cost: Math.round(cost)
        });
    }

    // Bottom Sliding Glass Panels
    const bottomGlassW = panelWidth - 90;
    const bottomGlassH = panelHeight - 90;
    const bottomSingleAreaSqFt = (bottomGlassW * bottomGlassH) / 92903.04;
    const bottomGlassRate = glassRates.CLEAR_5MM;
    const bottomTotalCost = bottomSingleAreaSqFt * bottomGlassRate.ratePerSqFt * P * Q;

    glassItems.push({
        section: 'Bottom Sliding Panels',
        type: bottomGlassRate.name,
        width: bottomGlassW,
        height: bottomGlassH,
        qty: P * Q,
        areaSqFt: parseFloat((bottomSingleAreaSqFt * P * Q).toFixed(2)),
        unitRate: bottomGlassRate.ratePerSqFt,
        cost: Math.round(bottomTotalCost)
    });

    const totalGlassCost = Math.round(glassItems.reduce((sum, g) => sum + g.cost, 0));

    // ----------------------------------------------------
    // 3. HARDWARE ACCESSORIES & RUBBER SEALS
    // ----------------------------------------------------
    const accessories = [];

    // Number of sliding panels vs fixed panels
    const slidingPanels = panelArrangement.length > 0 
        ? panelArrangement.filter(p => p.action !== 'fixed').length 
        : Math.max(1, P - 1);

    // Rollers (2 per sliding panel)
    const rollerCount = slidingPanels * 2 * Q;
    accessories.push({
        code: 'ROLLER_HEAVY',
        name: accessoryRates.ROLLER_HEAVY.name,
        qty: rollerCount,
        unit: 'pcs',
        unitRate: accessoryRates.ROLLER_HEAVY.unitRate,
        cost: rollerCount * accessoryRates.ROLLER_HEAVY.unitRate
    });

    // Touch locks (1 per sliding panel)
    const lockCount = Math.max(1, slidingPanels) * Q;
    accessories.push({
        code: 'TOUCH_LOCK',
        name: accessoryRates.TOUCH_LOCK.name,
        qty: lockCount,
        unit: 'pcs',
        unitRate: accessoryRates.TOUCH_LOCK.unitRate,
        cost: lockCount * accessoryRates.TOUCH_LOCK.unitRate
    });

    // Weather seal interlock blocks
    const interlockBlockCount = (P - 1) * 2 * Q;
    accessories.push({
        code: 'INTERLOCK_BLOCK',
        name: accessoryRates.INTERLOCK_BLOCK.name,
        qty: interlockBlockCount,
        unit: 'pcs',
        unitRate: accessoryRates.INTERLOCK_BLOCK.unitRate,
        cost: interlockBlockCount * accessoryRates.INTERLOCK_BLOCK.unitRate
    });

    // Corner Cleats
    const cleatCount = (4 + P * 4) * Q;
    accessories.push({
        code: 'CORNER_CLEAT',
        name: accessoryRates.CORNER_CLEAT.name,
        qty: cleatCount,
        unit: 'pcs',
        unitRate: accessoryRates.CORNER_CLEAT.unitRate,
        cost: cleatCount * accessoryRates.CORNER_CLEAT.unitRate
    });

    // Awning Stays & Handles if Top Awning
    if (hasTop && topType === 'awning') {
        accessories.push({
            code: 'AWNING_STAY',
            name: accessoryRates.AWNING_STAY.name,
            qty: 1 * Q,
            unit: 'pair',
            unitRate: accessoryRates.AWNING_STAY.unitRate,
            cost: 1 * Q * accessoryRates.AWNING_STAY.unitRate
        });
        accessories.push({
            code: 'AWNING_HANDLE',
            name: accessoryRates.AWNING_HANDLE.name,
            qty: 1 * Q,
            unit: 'pcs',
            unitRate: accessoryRates.AWNING_HANDLE.unitRate,
            cost: 1 * Q * accessoryRates.AWNING_HANDLE.unitRate
        });
    }

    // Louver Clips if Top Louver
    if (hasTop && topType === 'louver') {
        const slatPairs = Math.ceil((H_top - 40) / 100);
        accessories.push({
            code: 'LOUVER_CLIP',
            name: accessoryRates.LOUVER_CLIP.name,
            qty: slatPairs * Q,
            unit: 'pair',
            unitRate: accessoryRates.LOUVER_CLIP.unitRate,
            cost: slatPairs * Q * accessoryRates.LOUVER_CLIP.unitRate
        });
    }

    // EPDM Rubber & Woolpile Seals
    const glassPerimeterM = ((bottomGlassW + bottomGlassH) * 2 * P / 1000) * Q;
    accessories.push({
        code: 'RUBBER_EPDM',
        name: accessoryRates.RUBBER_EPDM.name,
        qty: parseFloat(glassPerimeterM.toFixed(1)),
        unit: 'm',
        unitRate: accessoryRates.RUBBER_EPDM.unitRate,
        cost: Math.round(glassPerimeterM * accessoryRates.RUBBER_EPDM.unitRate)
    });

    const woolpilePerimeterM = ((panelWidth + panelHeight) * 2 * P / 1000) * Q;
    accessories.push({
        code: 'WOOLPILE',
        name: accessoryRates.WOOLPILE.name,
        qty: parseFloat(woolpilePerimeterM.toFixed(1)),
        unit: 'm',
        unitRate: accessoryRates.WOOLPILE.unitRate,
        cost: Math.round(woolpilePerimeterM * accessoryRates.WOOLPILE.unitRate)
    });

    const totalAccessoriesCost = Math.round(accessories.reduce((sum, a) => sum + a.cost, 0));

    // ----------------------------------------------------
    // 4. LABOUR COST & TOTAL ESTIMATION SUMMARY
    // ----------------------------------------------------
    const totalAreaSqFt = (W * H_total * Q) / 92903.04;
    const labourRatePerSqFt = 120; // LKR per sqft
    const totalLabourCost = Math.round(totalAreaSqFt * labourRatePerSqFt);

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
