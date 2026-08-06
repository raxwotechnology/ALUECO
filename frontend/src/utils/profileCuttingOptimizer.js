/**
 * ALUECO Smart 1D Profile Cutting Stock & Wastage Optimization Engine
 * Evaluates combinations of standard stock bar lengths (8ft, 14ft, 16ft, 21ft) to minimize off-cut wastage and raw material cost.
 */

// Standard Extrusion Stock Lengths (in mm and ft)
export const STANDARD_STOCK_BARS = [
    { lengthFt: 8, lengthMm: 2438, name: '8 ft (2.44m)' },
    { lengthFt: 14, lengthMm: 4267, name: '14 ft (4.27m)' },
    { lengthFt: 16, lengthMm: 4877, name: '16 ft (4.88m)' },
    { lengthFt: 21, lengthMm: 6401, name: '21 ft (6.40m)' }
];

/**
 * Solve 1D Multi-Length Bin Packing Optimization for a single profile cut list.
 * @param {Array<number>} requiredCuts - Array of required cut lengths in mm (e.g. [2134, 2134, 1828, 1828])
 * @param {Array<{lengthMm: number, price?: number}>} stockOptions - Standard stock lengths available
 * @returns {Object} Optimization result containing allocated bars, cuts per bar, waste, and efficiency
 */
export const solveMultiLengthCutting = (requiredCuts = [], stockOptions = null) => {
    if (!requiredCuts || requiredCuts.length === 0) {
        return {
            bars: [],
            totalBarsCount: 0,
            totalPurchasedLengthMm: 0,
            totalUtilizedLengthMm: 0,
            totalWastageMm: 0,
            wastePercent: 0,
            efficiencyPercent: 100
        };
    }

    // Default to standard stock lengths if not specified
    const availableBars = (stockOptions && stockOptions.length > 0)
        ? [...stockOptions].sort((a, b) => a.lengthMm - b.lengthMm)
        : STANDARD_STOCK_BARS.map(b => ({
            lengthMm: b.lengthMm,
            price: b.lengthMm * 0.45 // proportional cost per mm if price not specified
        })).sort((a, b) => a.lengthMm - b.lengthMm);

    // Kerf saw blade width loss per cut (3mm)
    const kerf = 3;
    const sortedCuts = [...requiredCuts].sort((a, b) => b - a);

    const maxBarLength = availableBars[availableBars.length - 1].lengthMm;
    const validCuts = [];
    const oversizedCuts = [];

    for (const cut of sortedCuts) {
        if (cut > maxBarLength) {
            oversizedCuts.push(cut);
        } else {
            validCuts.push(cut);
        }
    }

    let bestSolution = null;
    let bestCost = Infinity;

    // Search function for Branch and Bound optimization
    const search = (cutIdx, openBars) => {
        const currentCost = openBars.reduce((sum, bar) => sum + bar.price, 0);
        if (currentCost >= bestCost) return;

        if (cutIdx === validCuts.length) {
            bestCost = currentCost;
            bestSolution = openBars.map(bar => ({
                lengthMm: bar.lengthMm,
                price: bar.price,
                cuts: [...bar.cuts],
                usedMm: bar.usedMm,
                wasteMm: bar.lengthMm - bar.usedMm
            }));
            return;
        }

        const cut = validCuts[cutIdx];
        const triedCapacities = new Set();

        // 1. Try placing cut into an already opened bar
        for (let i = 0; i < openBars.length; i++) {
            const bar = openBars[i];
            const requiredSpace = cut + (bar.cuts.length > 0 ? kerf : 0);
            const remaining = bar.lengthMm - bar.usedMm;

            if (remaining >= requiredSpace && !triedCapacities.has(remaining)) {
                triedCapacities.add(remaining);
                bar.cuts.push(cut);
                bar.usedMm += requiredSpace;

                search(cutIdx + 1, openBars);

                bar.usedMm -= requiredSpace;
                bar.cuts.pop();
            }
        }

        // 2. Try opening a new stock bar from standard length options
        for (const stdBar of availableBars) {
            if (stdBar.lengthMm >= cut) {
                const newBar = {
                    lengthMm: stdBar.lengthMm,
                    price: stdBar.price || (stdBar.lengthMm * 0.45),
                    cuts: [cut],
                    usedMm: cut
                };
                openBars.push(newBar);
                search(cutIdx + 1, openBars);
                openBars.pop();
            }
        }
    };

    // Run exact branch-and-bound for small-to-medium cut lists
    if (validCuts.length <= 16) {
        search(0, []);
    }

    // Heuristic Fallback (Best-Fit Decreasing) for larger cut lists or if B&B skipped
    if (!bestSolution) {
        bestSolution = [];
        for (const cut of validCuts) {
            let bestBarIdx = -1;
            let minWasteAfterCut = Infinity;

            // Try fitting into existing opened bar with minimum remaining waste
            for (let i = 0; i < bestSolution.length; i++) {
                const bar = bestSolution[i];
                const requiredSpace = cut + kerf;
                const remaining = bar.lengthMm - bar.usedMm;
                if (remaining >= requiredSpace) {
                    const wasteAfter = remaining - requiredSpace;
                    if (wasteAfter < minWasteAfterCut) {
                        minWasteAfterCut = wasteAfter;
                        bestBarIdx = i;
                    }
                }
            }

            if (bestBarIdx !== -1) {
                bestSolution[bestBarIdx].cuts.push(cut);
                bestSolution[bestBarIdx].usedMm += (cut + kerf);
                bestSolution[bestBarIdx].wasteMm = bestSolution[bestBarIdx].lengthMm - bestSolution[bestBarIdx].usedMm;
            } else {
                // Open new smallest stock bar that can hold the cut
                let chosenBar = availableBars.find(b => b.lengthMm >= cut) || availableBars[availableBars.length - 1];
                bestSolution.push({
                    lengthMm: chosenBar.lengthMm,
                    price: chosenBar.price || (chosenBar.lengthMm * 0.45),
                    cuts: [cut],
                    usedMm: cut,
                    wasteMm: chosenBar.lengthMm - cut
                });
            }
        }
    }

    // Add oversized cuts as special single bars
    for (const cut of oversizedCuts) {
        bestSolution.push({
            lengthMm: maxBarLength,
            price: availableBars[availableBars.length - 1].price,
            cuts: [cut],
            usedMm: cut,
            wasteMm: 0,
            isOversized: true
        });
    }

    // Calculate aggregated metrics
    const totalPurchasedLengthMm = bestSolution.reduce((sum, b) => sum + b.lengthMm, 0);
    const totalUtilizedLengthMm = bestSolution.reduce((sum, b) => sum + b.cuts.reduce((s, c) => s + c, 0), 0);
    const totalWastageMm = Math.max(0, totalPurchasedLengthMm - totalUtilizedLengthMm);
    const wastePercent = totalPurchasedLengthMm > 0 ? parseFloat(((totalWastageMm / totalPurchasedLengthMm) * 100).toFixed(1)) : 0;
    const efficiencyPercent = parseFloat((100 - wastePercent).toFixed(1));

    return {
        bars: bestSolution,
        totalBarsCount: bestSolution.length,
        totalPurchasedLengthMm,
        totalUtilizedLengthMm,
        totalWastageMm,
        wastePercent,
        efficiencyPercent
    };
};

/**
 * Aggregates required cut lengths across all openings in a quotation project by profile code.
 * @param {Array<Object>} items - Array of quotation item objects
 * @returns {Object} Map of profileCode -> Array of cut lengths (in mm)
 */
export const aggregateProjectCuts = (items = []) => {
    const aggregatedCuts = {};

    items.forEach(item => {
        const Q = Number(item.quantity) || 1;
        const profileCuts = item.profileCuts || [];

        profileCuts.forEach(p => {
            const code = p.profileCode || p.code || 'GENERIC_PROFILE';
            if (!aggregatedCuts[code]) {
                aggregatedCuts[code] = [];
            }
            const cutLength = Math.round(p.length);
            const qtyPerOpening = p.qty || 1;
            const totalCutsCount = qtyPerOpening * Q;

            for (let k = 0; k < totalCutsCount; k++) {
                aggregatedCuts[code].push(cutLength);
            }
        });
    });

    return aggregatedCuts;
};
