import asyncHandler from 'express-async-handler';
import AluProfile from '../models/AluProfile.js';
import AluGlass from '../models/AluGlass.js';
import AluAccessory from '../models/AluAccessory.js';
import AluApplication from '../models/AluApplication.js';
import AluQuotation from '../models/AluQuotation.js';
import SalesOrder from '../models/SalesOrder.js';
import Product from '../models/Product.js';
import AluScrap from '../models/AluScrap.js';
import AluJobCard from '../models/AluJobCard.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { solve2DGlassPacking } from '../utils/aluGlassSolver.js';

// === Helper Functions ===

// Safe formula evaluator
const evaluateFormula = (formulaStr, variables) => {
    try {
        const safeRegex = /^[0-9WHPQ+\-*/().\s]+$/i;
        if (!safeRegex.test(formulaStr)) {
            return 0;
        }
        let expr = formulaStr
            .replace(/\bW\b/g, variables.W)
            .replace(/\bH\b/g, variables.H)
            .replace(/\bP\b/g, variables.P)
            .replace(/\bQ\b/g, variables.Q);
        
        const val = Function(`"use strict"; return (${expr})`)();
        return isNaN(val) ? 0 : Number(val);
    } catch (e) {
        console.error(`Error evaluating formula: ${formulaStr}`, e);
        return 0;
    }
};

// 1D Bin Packing Optimization
const solve1DPacking = (requiredCuts, availableBars) => {
    const sortedBars = [...availableBars].sort((a, b) => a.lengthMm - b.lengthMm);
    const sortedCuts = [...requiredCuts].sort((a, b) => b - a);
    
    if (sortedCuts.length === 0) return [];
    
    const maxBarLength = sortedBars[sortedBars.length - 1].lengthMm;
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
    
    // Backtracking
    function search(cutIdx, openBars) {
        const currentCost = openBars.reduce((sum, bar) => sum + bar.price, 0);
        if (currentCost >= bestCost) {
            return;
        }
        
        if (cutIdx === validCuts.length) {
            bestCost = currentCost;
            bestSolution = openBars.map(bar => ({
                length: bar.length,
                price: bar.price,
                cuts: [...bar.cuts],
                used: bar.used,
                waste: bar.length - bar.used
            }));
            return;
        }
        
        const cut = validCuts[cutIdx];
        const triedCapacities = new Set();
        for (let i = 0; i < openBars.length; i++) {
            const bar = openBars[i];
            const remaining = bar.length - bar.used;
            if (remaining >= cut && !triedCapacities.has(remaining)) {
                triedCapacities.add(remaining);
                bar.cuts.push(cut);
                bar.used += cut;
                
                search(cutIdx + 1, openBars);
                
                bar.used -= cut;
                bar.cuts.pop();
            }
        }
        
        for (const stdBar of sortedBars) {
            if (stdBar.lengthMm >= cut) {
                const newBar = {
                    length: stdBar.lengthMm,
                    price: stdBar.price,
                    cuts: [cut],
                    used: cut
                };
                openBars.push(newBar);
                search(cutIdx + 1, openBars);
                openBars.pop();
            }
        }
    }
    
    if (validCuts.length <= 15) {
        search(0, []);
    }
    
    if (!bestSolution) {
        bestSolution = [];
        for (const cut of validCuts) {
            let bestBarIdx = -1;
            let minWasteAfterCut = Infinity;
            
            for (let i = 0; i < bestSolution.length; i++) {
                const bar = bestSolution[i];
                const remaining = bar.length - bar.used;
                if (remaining >= cut) {
                    const wasteAfter = remaining - cut;
                    if (wasteAfter < minWasteAfterCut) {
                        minWasteAfterCut = wasteAfter;
                        bestBarIdx = i;
                    }
                }
            }
            
            if (bestBarIdx !== -1) {
                bestSolution[bestBarIdx].cuts.push(cut);
                bestSolution[bestBarIdx].used += cut;
                bestSolution[bestBarIdx].waste = bestSolution[bestBarIdx].length - bestSolution[bestBarIdx].used;
            } else {
                let chosenBar = null;
                for (const bar of sortedBars) {
                    if (bar.lengthMm >= cut) {
                        chosenBar = bar;
                        break;
                    }
                }
                
                if (chosenBar) {
                    bestSolution.push({
                        length: chosenBar.lengthMm,
                        price: chosenBar.price,
                        cuts: [cut],
                        used: cut,
                        waste: chosenBar.lengthMm - cut
                    });
                }
            }
        }
    }
    
    for (const cut of oversizedCuts) {
        bestSolution.push({
            length: maxBarLength,
            price: sortedBars[sortedBars.length - 1].price,
            cuts: [cut],
            used: cut,
            waste: 0,
            isOversized: true
        });
    }
    
    return bestSolution;
};

// Compile rates snapshot
const captureRatesSnapshot = async () => {
    const profiles = await AluProfile.find({ isActive: true });
    const glass = await AluGlass.find({ isActive: true });
    const accessories = await AluAccessory.find({ isActive: true });
    const applications = await AluApplication.find({ isActive: true });
    
    const snapshot = {
        profiles: {},
        glass: {},
        accessories: {},
        applications: {}
    };
    
    profiles.forEach(p => {
        snapshot.profiles[p.profileCode] = {
            description: p.description,
            supplier: p.supplier,
            standardLengths: p.standardLengths.map(l => ({ lengthMm: l.lengthMm, price: l.price }))
        };
    });
    
    glass.forEach(g => {
        snapshot.glass[g.typeName] = {
            thickness: g.thickness,
            ratePerSqFt: g.ratePerSqFt,
            ratePerSqM: g.ratePerSqM,
            temperingCharge: g.temperingCharge,
            processingCharge: g.processingCharge
        };
    });
    
    accessories.forEach(a => {
        snapshot.accessories[a.code] = {
            name: a.name,
            brand: a.brand,
            unit: a.unit,
            purchaseRate: a.purchaseRate,
            sellingRate: a.sellingRate
        };
    });
    
    applications.forEach(app => {
        snapshot.applications[`${app.type}_${app.configuration}`] = {
            profileBOM: app.profileBOM,
            glassBOM: app.glassBOM,
            accessoryBOM: app.accessoryBOM,
            labourMethod: app.labourMethod,
            labourRate: app.labourRate
        };
    });
    
    return snapshot;
};

// Calculate and Optimize Quotation Pipeline
const calculateQuotation = async (itemsInput, rates, transportCost = 0, additionalCosts = [], profitMarginPercent = 20) => {
    let totalAluminiumCost = 0;
    let totalGlassCost = 0;
    let totalAccessoriesCost = 0;
    let totalLabourCost = 0;
    
    const projectCuts = {}; // profileCode -> array of cut lengths (in mm)
    const projectGlassPanels = {}; // glassType -> array of { width, height, glassType }
    
    // Step 1: Calculate individual elements (Cuts, Glass, Accessories)
    const items = [];
    
    for (const item of itemsInput) {
        const { applicationType, configuration, width, height, quantity } = item;
        
        // Parse panel count
        let P = 1;
        const panelMatch = configuration.match(/^(\d+)\s*Panel/i);
        if (panelMatch) {
            P = parseInt(panelMatch[1]);
        }
        
        const variables = { W: width, H: height, P, Q: quantity };
        
        // Find application configuration details
        const appKey = `${applicationType}_${configuration}`;
        const appData = rates.applications[appKey];
        if (!appData) {
            throw new Error(`Application configuration "${applicationType} - ${configuration}" is not defined in system templates.`);
        }
        
        // Profile cuts
        const profileCuts = [];
        appData.profileBOM.forEach(pb => {
            const qty = evaluateFormula(pb.quantityFormula, variables);
            const length = evaluateFormula(pb.lengthFormula, variables);
            if (qty > 0 && length > 0) {
                // Round length to nearest integer
                const roundedLength = Math.round(length);
                const totalQty = qty * quantity; // multiplier for number of openings
                
                profileCuts.push({
                    profileCode: pb.profileCode,
                    description: pb.description,
                    length: roundedLength,
                    qty: qty,
                    totalLength: roundedLength * qty
                });
                
                // Add to project-wide cuts for packing optimization
                if (!projectCuts[pb.profileCode]) {
                    projectCuts[pb.profileCode] = [];
                }
                for (let k = 0; k < totalQty; k++) {
                    projectCuts[pb.profileCode].push(roundedLength);
                }
            }
        });
        
        // Glass items
        const glassItems = [];
        let itemGlassCost = 0;
        appData.glassBOM.forEach(gb => {
            const gQty = evaluateFormula(gb.quantityFormula, variables);
            const gW = evaluateFormula(gb.widthFormula, variables);
            const gH = evaluateFormula(gb.heightFormula, variables);
            
            if (gQty > 0 && gW > 0 && gH > 0) {
                // Calculate area: Area of single sheet in sqft
                const areaSqFt = (gW * gH) / 92903.04;
                const totalAreaSqFt = areaSqFt * gQty * quantity;
                
                const glassRate = rates.glass[gb.glassType];
                if (glassRate) {
                    const unitRate = glassRate.ratePerSqFt + glassRate.temperingCharge + glassRate.processingCharge;
                    const cost = totalAreaSqFt * unitRate;
                    
                    glassItems.push({
                        glassType: gb.glassType,
                        width: Math.round(gW),
                        height: Math.round(gH),
                        qty: gQty * quantity,
                        areaSqFt: parseFloat(totalAreaSqFt.toFixed(2)),
                        unitRate: parseFloat(unitRate.toFixed(2)),
                        cost: parseFloat(cost.toFixed(2))
                    });
                    
                    itemGlassCost += cost;
                    
                    // Accumulate panels for 2D optimization
                    if (!projectGlassPanels[gb.glassType]) {
                        projectGlassPanels[gb.glassType] = [];
                    }
                    const totalQty = gQty * quantity;
                    for (let k = 0; k < totalQty; k++) {
                        projectGlassPanels[gb.glassType].push({
                            width: Math.round(gW),
                            height: Math.round(gH),
                            glassType: gb.glassType
                        });
                    }
                }
            }
        });
        totalGlassCost += itemGlassCost;
        
        // Accessories
        const accessories = [];
        let itemAccCost = 0;
        appData.accessoryBOM.forEach(ab => {
            const accQty = evaluateFormula(ab.quantityFormula, variables);
            if (accQty > 0) {
                const totalAccQty = accQty * quantity;
                const accRate = rates.accessories[ab.accessoryCode];
                if (accRate) {
                    const cost = totalAccQty * accRate.sellingRate; // use selling rate for quotation
                    accessories.push({
                        code: ab.accessoryCode,
                        name: accRate.name,
                        qty: totalAccQty,
                        unitRate: accRate.sellingRate,
                        cost: parseFloat(cost.toFixed(2))
                    });
                    itemAccCost += cost;
                }
            }
        });
        totalAccessoriesCost += itemAccCost;
        
        // Labour
        let labourCost = 0;
        const totalAreaSqFt = (width * height * quantity) / 92903.04;
        const totalAreaSqM = (width * height * quantity) / 1000000;
        
        if (appData.labourMethod === 'sqft') {
            labourCost = totalAreaSqFt * appData.labourRate;
        } else if (appData.labourMethod === 'sqm') {
            labourCost = totalAreaSqM * appData.labourRate;
        } else if (appData.labourMethod === 'opening') {
            labourCost = quantity * appData.labourRate;
        } else if (appData.labourMethod === 'fixed') {
            labourCost = appData.labourRate;
        } else if (appData.labourMethod === 'percentage') {
            // calculated later as percentage of material cost
            labourCost = (itemGlassCost + itemAccCost) * appData.labourRate / 100;
        }
        
        totalLabourCost += labourCost;
        
        items.push({
            applicationType,
            configuration,
            width,
            height,
            quantity,
            profileCuts,
            glassItems,
            accessories,
            labourCost: parseFloat(labourCost.toFixed(2)),
            unitPrice: 0, // updated after project optimization & profit margin
            totalPrice: 0
        });
    }
    
    // Step 2: 1D Cutting Optimization across all profiles in project
    const cuttingOptimizationResults = {};
    
    for (const code in projectCuts) {
        const cuts = projectCuts[code];
        const profile = rates.profiles[code];
        if (profile && profile.standardLengths && profile.standardLengths.length > 0) {
            // Find available scraps for this profile
            const dbScraps = await AluScrap.find({ profileCode: code, status: 'available' }).lean();
            
            // Map to a mutable scrap pool
            let scrapPool = dbScraps.map(s => ({
                id: s._id,
                length: s.lengthMm,
                used: 0,
                cuts: [],
                isScrap: true,
                price: 0
            }));
            
            // Try to match cuts to scrap first (Best-Fit Decreasing match)
            const sortedCuts = [...cuts].sort((a, b) => b - a);
            const cutsForNewBars = [];
            
            for (const cut of sortedCuts) {
                // Sort scraps by remaining capacity ascending (Best-Fit)
                scrapPool.sort((a, b) => (a.length - a.used) - (b.length - b.used));
                
                let matchedScrap = null;
                for (const scrap of scrapPool) {
                    const remaining = scrap.length - scrap.used;
                    if (remaining >= cut) {
                        matchedScrap = scrap;
                        break;
                    }
                }
                
                if (matchedScrap) {
                    matchedScrap.cuts.push(cut);
                    matchedScrap.used += cut;
                } else {
                    cutsForNewBars.push(cut);
                }
            }
            
            // Collect the scrap bars actually used
            const usedScraps = scrapPool.filter(s => s.used > 0).map(s => ({
                length: s.length,
                price: 0,
                cuts: s.cuts,
                used: s.used,
                waste: s.length - s.used,
                isScrap: true,
                scrapId: s.id
            }));
            
            // For the remaining cuts, solve using standard bars
            const newBarsPacking = solve1DPacking(cutsForNewBars, profile.standardLengths);
            
            // Combine scrap bars and new bars
            const packingLayout = [...usedScraps, ...newBarsPacking];
            
            // Calculate costs and waste lengths (only charge for new bars purchased)
            const totalBarsPurchased = newBarsPacking.length;
            const purchasedLength = newBarsPacking.reduce((sum, bar) => sum + bar.length, 0);
            const usedLength = cuts.reduce((sum, len) => sum + len, 0);
            const totalBarLength = packingLayout.reduce((sum, bar) => sum + bar.length, 0);
            const wasteLength = totalBarLength - usedLength;
            const wastePercent = totalBarLength > 0 ? (wasteLength / totalBarLength) * 100 : 0;
            const cost = newBarsPacking.reduce((sum, bar) => sum + bar.price, 0);
            
            cuttingOptimizationResults[code] = {
                profileCode: code,
                description: profile.description,
                supplier: profile.supplier,
                requiredCuts: cuts.sort((a, b) => b - a),
                bars: packingLayout,
                totalBarsPurchased,
                purchasedLengthMm: purchasedLength,
                usedLengthMm: usedLength,
                wasteLengthMm: wasteLength,
                wastePercent: parseFloat(wastePercent.toFixed(1)),
                totalCost: parseFloat(cost.toFixed(2))
            };
            
            totalAluminiumCost += cost;
        }
    }
    
    // Step 2.5: 2D Glass Cutting Optimization
    const glassOptimizationResults = {};
    let totalOptimizedGlassCost = 0;
    
    for (const type in projectGlassPanels) {
        const panels = projectGlassPanels[type];
        const glassRate = rates.glass[type];
        if (glassRate) {
            const unitRate = glassRate.ratePerSqFt + glassRate.temperingCharge + glassRate.processingCharge;
            // 8ft x 4ft raw glass sheets (2438mm x 1219mm)
            const sheetPackingLayout = solve2DGlassPacking(panels, 2438, 1219);
            
            const sheetsPurchased = sheetPackingLayout.length;
            const sheetAreaSqFt = 32.0;
            const cost = sheetsPurchased * sheetAreaSqFt * unitRate;
            
            glassOptimizationResults[type] = {
                glassType: type,
                thickness: glassRate.thickness,
                requiredPanels: panels,
                sheets: sheetPackingLayout,
                sheetsPurchased,
                totalCost: parseFloat(cost.toFixed(2))
            };
            
            totalOptimizedGlassCost += cost;
        }
    }
    
    // Override glass cost to reflect actual sheets purchased
    if (Object.keys(projectGlassPanels).length > 0) {
        totalGlassCost = totalOptimizedGlassCost;
    }
    
    // Resolve labour percentage methods that require aluminium cost
    items.forEach((item, index) => {
        const appKey = `${item.applicationType}_${item.configuration}`;
        const appData = rates.applications[appKey];
        if (appData && appData.labourMethod === 'percentage') {
            // Estimate item-level profile cost as proportional to its total cuts length vs total project cuts length
            // This is a reasonable proxy for itemized pricing
            let itemProfileCost = 0;
            item.profileCuts.forEach(pc => {
                const opt = cuttingOptimizationResults[pc.profileCode];
                if (opt && opt.purchasedLengthMm > 0) {
                    const proportion = (pc.length * pc.qty * item.quantity) / opt.usedLengthMm;
                    itemProfileCost += opt.totalCost * proportion;
                }
            });
            
            const matCost = itemProfileCost + item.glassItems.reduce((s, g) => s + g.cost, 0) + item.accessories.reduce((s, a) => s + a.cost, 0);
            const labour = matCost * appData.labourRate / 100;
            item.labourCost = parseFloat(labour.toFixed(2));
        }
    });
    
    // Re-sum labour
    totalLabourCost = items.reduce((sum, item) => sum + item.labourCost, 0);
    
    // Step 3: Quotation Summary Costs
    const sumAdditional = additionalCosts.reduce((sum, ac) => sum + ac.cost, 0);
    const materialCost = totalAluminiumCost + totalGlassCost + totalAccessoriesCost;
    const baseCostBeforeMargin = materialCost + totalLabourCost + transportCost + sumAdditional;
    
    // Profit margin added
    const profitCost = baseCostBeforeMargin * (profitMarginPercent / 100);
    const calculatedSellingPrice = baseCostBeforeMargin + profitCost;
    
    // Calculate final unit prices for client view
    items.forEach(item => {
        // Calculate item base cost (proportional profile cost + item glass + item accessory + item labour)
        let itemProfileCost = 0;
        item.profileCuts.forEach(pc => {
            const opt = cuttingOptimizationResults[pc.profileCode];
            if (opt && opt.usedLengthMm > 0) {
                const proportion = (pc.length * pc.qty * item.quantity) / opt.usedLengthMm;
                itemProfileCost += opt.totalCost * proportion;
            }
        });
        
        const itemGlass = item.glassItems.reduce((s, g) => s + g.cost, 0);
        const itemAcc = item.accessories.reduce((s, a) => s + a.cost, 0);
        const itemBaseCost = (itemProfileCost + itemGlass + itemAcc + (item.labourCost)) / item.quantity;
        
        // Add proportional transport + additional + margin
        const itemProportionOfCost = (itemBaseCost * item.quantity) / (materialCost + totalLabourCost);
        const proportionalExtras = (transportCost + sumAdditional) * itemProportionOfCost / item.quantity;
        
        const unitCost = itemBaseCost + proportionalExtras;
        const unitSelling = unitCost * (1 + profitMarginPercent / 100);
        
        item.unitPrice = parseFloat(unitSelling.toFixed(2));
        item.totalPrice = parseFloat((item.unitPrice * item.quantity).toFixed(2));
    });
    
    return {
        items,
        totalAluminiumCost: parseFloat(totalAluminiumCost.toFixed(2)),
        totalGlassCost: parseFloat(totalGlassCost.toFixed(2)),
        totalAccessoriesCost: parseFloat(totalAccessoriesCost.toFixed(2)),
        totalLabourCost: parseFloat(totalLabourCost.toFixed(2)),
        calculatedSellingPrice: parseFloat(calculatedSellingPrice.toFixed(2)),
        cuttingOptimizationResults,
        glassOptimizationResults
    };
};

// === Controller Actions ===

// Get all latest quotations (filtered to latest revisions)
export const getAluQuotations = asyncHandler(async (req, res) => {
    const filter = { isLatestRevision: true };
    const quotations = await AluQuotation.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: quotations });
});

// Get quotation details (by specific ID)
export const getAluQuotationById = asyncHandler(async (req, res) => {
    const quotation = await AluQuotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }
    
    // Find all revisions of this quotation
    const revisions = await AluQuotation.find({ revisionGroupCode: quotation.revisionGroupCode })
        .select('version status finalSellingPrice createdAt isLatestRevision')
        .sort({ version: -1 });
        
    res.json({ success: true, data: quotation, revisions });
});

// Create new quotation (Revision 00)
export const createAluQuotation = asyncHandler(async (req, res) => {
    const {
        customerName,
        projectName,
        location,
        validTill,
        items,
        transportCost,
        additionalCosts,
        profitMarginPercent,
        discount,
        manualAdjustment,
        terms,
        checklist
    } = req.body;
    
    const rates = await captureRatesSnapshot();
    
    const calc = await calculateQuotation(
        items,
        rates,
        Number(transportCost || 0),
        additionalCosts || [],
        Number(profitMarginPercent || 20)
    );
    
    // Generate unique quote number
    const date = new Date();
    const prefix = `QOT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await AluQuotation.countDocuments({ quoteNumber: { $regex: `^${prefix}` } });
    const quoteNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
    
    const finalPrice = calc.calculatedSellingPrice - (discount || 0) + (manualAdjustment || 0);
    
    let discountStatus = 'none';
    let discountApprovedBy = undefined;
    if (discount > 0) {
        const discountPercent = (discount / calc.calculatedSellingPrice) * 100;
        if (discountPercent > 10) {
            if (req.user && req.user.role === 'admin') {
                discountStatus = 'approved';
                discountApprovedBy = req.user._id;
            } else {
                discountStatus = 'pending';
            }
        } else {
            discountStatus = 'approved';
        }
    }

    const quotation = await AluQuotation.create({
        quoteNumber,
        version: 0,
        revisionGroupCode: quoteNumber,
        isLatestRevision: true,
        customerName,
        projectName,
        location,
        date: date,
        validTill: validTill || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // default 30 days
        items: calc.items,
        totalAluminiumCost: calc.totalAluminiumCost,
        totalGlassCost: calc.totalGlassCost,
        totalAccessoriesCost: calc.totalAccessoriesCost,
        totalLabourCost: calc.totalLabourCost,
        transportCost: Number(transportCost || 0),
        additionalCosts: additionalCosts || [],
        profitMarginPercent: Number(profitMarginPercent || 20),
        calculatedSellingPrice: calc.calculatedSellingPrice,
        discount: Number(discount || 0),
        discountStatus,
        discountApprovedBy,
        manualAdjustment: Number(manualAdjustment || 0),
        finalSellingPrice: parseFloat(finalPrice.toFixed(2)),
        status: 'draft',
        rateSnapshot: rates,
        cuttingOptimizationResults: calc.cuttingOptimizationResults,
        glassOptimizationResults: calc.glassOptimizationResults,
        terms: terms || [],
        checklist: checklist || [],
        createdBy: req.user._id
    });
    
    await createAuditLog({
        action: 'CREATE',
        module: 'CRM',
        documentId: quotation._id,
        documentCode: quotation.quoteNumber,
        description: `Created aluminium quotation ${quotation.quoteNumber}`,
        req
    });
    
    res.status(201).json({ success: true, data: quotation });
});

// Update existing draft quotation
export const updateAluQuotation = asyncHandler(async (req, res) => {
    const quotation = await AluQuotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }
    
    if (quotation.status !== 'draft') {
        res.status(400);
        throw new Error('Only draft quotations can be updated directly. Please create a revision instead.');
    }
    
    const {
        customerName,
        projectName,
        location,
        validTill,
        items,
        transportCost,
        additionalCosts,
        profitMarginPercent,
        discount,
        manualAdjustment,
        terms,
        checklist,
        status
    } = req.body;
    
    // Recalculate using snapshot rates preserved in the document
    const calc = await calculateQuotation(
        items,
        quotation.rateSnapshot,
        Number(transportCost || 0),
        additionalCosts || [],
        Number(profitMarginPercent || 20)
    );
    
    const finalPrice = calc.calculatedSellingPrice - (discount || 0) + (manualAdjustment || 0);

    let discountStatus = 'none';
    let discountApprovedBy = undefined;
    if (discount > 0) {
        const discountPercent = (discount / calc.calculatedSellingPrice) * 100;
        if (discountPercent > 10) {
            if (req.user && req.user.role === 'admin') {
                discountStatus = 'approved';
                discountApprovedBy = req.user._id;
            } else {
                discountStatus = 'pending';
            }
        } else {
            discountStatus = 'approved';
        }
    }
    
    quotation.customerName = customerName;
    quotation.projectName = projectName;
    quotation.location = location;
    if (validTill) quotation.validTill = validTill;
    quotation.items = calc.items;
    quotation.totalAluminiumCost = calc.totalAluminiumCost;
    quotation.totalGlassCost = calc.totalGlassCost;
    quotation.totalAccessoriesCost = calc.totalAccessoriesCost;
    quotation.totalLabourCost = calc.totalLabourCost;
    quotation.transportCost = Number(transportCost || 0);
    quotation.additionalCosts = additionalCosts || [];
    quotation.profitMarginPercent = Number(profitMarginPercent || 20);
    quotation.calculatedSellingPrice = calc.calculatedSellingPrice;
    quotation.discount = Number(discount || 0);
    quotation.discountStatus = discountStatus;
    if (discountApprovedBy) quotation.discountApprovedBy = discountApprovedBy;
    quotation.manualAdjustment = Number(manualAdjustment || 0);
    quotation.finalSellingPrice = parseFloat(finalPrice.toFixed(2));
    if (status) quotation.status = status;
    quotation.cuttingOptimizationResults = calc.cuttingOptimizationResults;
    quotation.glassOptimizationResults = calc.glassOptimizationResults;
    if (terms) quotation.terms = terms;
    if (checklist) quotation.checklist = checklist;
    
    await quotation.save();
    
    await createAuditLog({
        action: 'UPDATE',
        module: 'CRM',
        documentId: quotation._id,
        documentCode: quotation.quoteNumber,
        description: `Updated aluminium quotation ${quotation.quoteNumber} (Rev ${quotation.version})`,
        req
    });
    
    res.json({ success: true, data: quotation });
});

// Delete quotation (soft delete)
export const deleteAluQuotation = asyncHandler(async (req, res) => {
    const quotation = await AluQuotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }
    
    // If it's the latest, mark another revision as latest
    if (quotation.isLatestRevision) {
        const otherRev = await AluQuotation.findOne({
            revisionGroupCode: quotation.revisionGroupCode,
            _id: { $ne: quotation._id }
        }).sort({ version: -1 });
        
        if (otherRev) {
            otherRev.isLatestRevision = true;
            await otherRev.save();
        }
    }
    
    await AluQuotation.findByIdAndDelete(req.params.id);
    
    await createAuditLog({
        action: 'DELETE',
        module: 'CRM',
        documentId: quotation._id,
        documentCode: quotation.quoteNumber,
        description: `Deleted aluminium quotation ${quotation.quoteNumber} (Rev ${quotation.version})`,
        req
    });
    
    res.json({ success: true, message: 'Quotation deleted successfully' });
});

// Revise quotation (creates a new version copy using latest rates)
export const reviseAluQuotation = asyncHandler(async (req, res) => {
    const sourceQuote = await AluQuotation.findById(req.params.id);
    if (!sourceQuote) {
        res.status(404);
        throw new Error('Source quotation not found');
    }
    
    // Clear latest flag on all existing versions of this quote
    await AluQuotation.updateMany(
        { revisionGroupCode: sourceQuote.revisionGroupCode },
        { isLatestRevision: false }
    );
    
    // Fetch latest active rates
    const rates = await captureRatesSnapshot();
    
    // Calculate using the source quote items but with the LATEST active rates
    const calc = await calculateQuotation(
        sourceQuote.items.map(item => ({
            applicationType: item.applicationType,
            configuration: item.configuration,
            width: item.width,
            height: item.height,
            quantity: item.quantity
        })),
        rates,
        sourceQuote.transportCost,
        sourceQuote.additionalCosts,
        sourceQuote.profitMarginPercent
    );
    
    const nextVersion = sourceQuote.version + 1;
    const finalPrice = calc.calculatedSellingPrice - sourceQuote.discount + sourceQuote.manualAdjustment;
    
    const newRevision = await AluQuotation.create({
        quoteNumber: sourceQuote.quoteNumber,
        version: nextVersion,
        revisionGroupCode: sourceQuote.revisionGroupCode,
        isLatestRevision: true,
        customerName: sourceQuote.customerName,
        projectName: sourceQuote.projectName,
        location: sourceQuote.location,
        date: new Date(),
        validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // reset validity
        items: calc.items,
        totalAluminiumCost: calc.totalAluminiumCost,
        totalGlassCost: calc.totalGlassCost,
        totalAccessoriesCost: calc.totalAccessoriesCost,
        totalLabourCost: calc.totalLabourCost,
        transportCost: sourceQuote.transportCost,
        additionalCosts: sourceQuote.additionalCosts,
        profitMarginPercent: sourceQuote.profitMarginPercent,
        calculatedSellingPrice: calc.calculatedSellingPrice,
        discount: sourceQuote.discount,
        manualAdjustment: sourceQuote.manualAdjustment,
        finalSellingPrice: parseFloat(finalPrice.toFixed(2)),
        status: 'draft', // revision starts as draft
        rateSnapshot: rates,
        cuttingOptimizationResults: calc.cuttingOptimizationResults,
        glassOptimizationResults: calc.glassOptimizationResults,
        terms: sourceQuote.terms,
        checklist: sourceQuote.checklist,
        createdBy: req.user._id
    });
    
    await createAuditLog({
        action: 'CREATE',
        module: 'CRM',
        documentId: newRevision._id,
        documentCode: newRevision.quoteNumber,
        description: `Created revision ${nextVersion} for aluminium quotation ${newRevision.quoteNumber}`,
        req
    });
    
    res.status(201).json({ success: true, data: newRevision });
});

// Convert quotation to Sales Order
export const convertAluQuotationToOrder = asyncHandler(async (req, res) => {
    const quotation = await AluQuotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }
    
    if (quotation.status === 'converted') {
        res.status(400);
        throw new Error('Quotation has already been converted to a sales order.');
    }
    
    // Create standard Product mapping or order line items
    // In this ERP, SalesOrder references Products. Let's see if we should create a generic or custom wholesale product
    // or map items directly as custom line items.
    // Let's create a Sales Order document
    
    const items = quotation.items.map(item => ({
        productName: `${item.applicationType} (${item.configuration})`,
        description: `Size: ${item.width} x ${item.height} mm`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.totalPrice
    }));
    
    // Find or create a default wholesale client
    const { default: Customer } = await import('../models/Customer.js');
    let customer = await Customer.findOne({ displayName: quotation.customerName });
    if (!customer) {
        customer = await Customer.create({
            displayName: quotation.customerName,
            companyName: quotation.customerName,
            status: 'active'
        });
    }
    
    // Create the Sales Order
    const date = new Date();
    const prefix = `SO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await SalesOrder.countDocuments({ orderNumber: { $regex: `^${prefix}` } });
    const orderNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
    
    const salesOrder = await SalesOrder.create({
        orderNumber,
        customerId: customer._id,
        customerName: quotation.customerName,
        orderDate: date,
        deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // default 2 weeks
        items,
        totalAmount: quotation.calculatedSellingPrice - quotation.discount,
        discount: quotation.discount,
        tax: 0,
        grandTotal: quotation.finalSellingPrice,
        status: 'pending',
        notes: `Converted from Aluminium Quotation: ${quotation.quoteNumber} (Rev ${quotation.version}). Project: ${quotation.projectName}`,
        createdBy: req.user._id
    });
    
    // Update Scrap Database (Reserve used scraps, save new scraps)
    if (quotation.cuttingOptimizationResults) {
        for (const code in quotation.cuttingOptimizationResults) {
            const result = quotation.cuttingOptimizationResults[code];
            if (result.bars && Array.isArray(result.bars)) {
                for (const bar of result.bars) {
                    if (bar.isScrap && bar.scrapId) {
                        // Mark scrap as used
                        await AluScrap.findByIdAndUpdate(bar.scrapId, { status: 'used' });
                    } else if (!bar.isScrap && bar.waste >= 500) {
                        // Save new scrap length
                        await AluScrap.create({
                            profileCode: code,
                            lengthMm: bar.waste,
                            status: 'available',
                            sourceQuotationId: quotation._id,
                            notes: `Leftover from quotation ${quotation.quoteNumber} (Rev ${quotation.version})`
                        });
                    }
                }
            }
        }
    }

    // Update quotation status
    quotation.status = 'converted';
    await quotation.save();
    
    // Create production job card (Kanban)
    const jobPrefix = `JOB-${date.getFullYear()}`;
    const jobCount = await AluJobCard.countDocuments({ jobCardNumber: { $regex: `^${jobPrefix}` } });
    const jobCardNumber = `${jobPrefix}-${String(jobCount + 1).padStart(4, '0')}`;
    
    const jobCardItems = quotation.items.map(item => ({
        applicationType: item.applicationType,
        configuration: item.configuration,
        width: item.width,
        height: item.height,
        quantity: item.quantity,
        completedQty: 0
    }));

    await AluJobCard.create({
        jobCardNumber,
        salesOrderId: salesOrder._id,
        quotationId: quotation._id,
        customerName: quotation.customerName,
        projectName: quotation.projectName,
        status: 'cutting',
        items: jobCardItems,
        notes: `Production instructions for order ${salesOrder.orderNumber}`
    });

    await createAuditLog({
        action: 'CREATE',
        module: 'CRM',
        documentId: salesOrder._id,
        documentCode: salesOrder.orderNumber,
        description: `Converted aluminium quotation ${quotation.quoteNumber} to Sales Order ${salesOrder.orderNumber} & generated Job Card ${jobCardNumber}`,
        req
    });
    
    res.status(201).json({ success: true, data: salesOrder });
});

// Export CNC Double-Head Saw G-Code list
export const exportAluQuotationToCNC = asyncHandler(async (req, res) => {
    const quotation = await AluQuotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    let gcode = `[ALUECO CNC DOUBLE-HEAD SAW FILE]\n`;
    gcode += `JOB_NUMBER: JOB-${quotation._id.toString().slice(-6).toUpperCase()}\n`;
    gcode += `CLIENT_NAME: ${quotation.customerName}\n`;
    gcode += `PROJECT_NAME: ${quotation.projectName}\n`;
    gcode += `DATE: ${new Date().toISOString().split('T')[0]}\n\n`;
    gcode += `[CUTTING LIST]\n`;
    gcode += `; Format: PROFILE | LENGTH (mm) | LEFT ANGLE | RIGHT ANGLE | BAR INDEX\n`;

    if (quotation.cuttingOptimizationResults) {
        for (const code in quotation.cuttingOptimizationResults) {
            const opt = quotation.cuttingOptimizationResults[code];
            if (opt.bars && Array.isArray(opt.bars)) {
                opt.bars.forEach((bar, barIdx) => {
                    bar.cuts.forEach(cut => {
                        // Standard window casements cut at 45 deg, frames/sliding at 90 deg
                        const isCasement = opt.description?.toLowerCase().includes('casement') || opt.description?.toLowerCase().includes('window');
                        const angleLeft = isCasement ? 45 : 90;
                        const angleRight = isCasement ? 45 : 90;
                        
                        gcode += `${code.padEnd(10)} | ${String(cut).padEnd(6)} | ${angleLeft} | ${angleRight} | BAR_${String(barIdx + 1).padStart(2, '0')}\n`;
                    });
                });
            }
        }
    }

    res.json({ success: true, gcode });
});

// Approve/Reject pending discount
export const approveAluQuotationDiscount = asyncHandler(async (req, res) => {
    const quotation = await AluQuotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }
    
    if (req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Only administrators can approve high discounts.');
    }
    
    const { action } = req.body; // 'approve' or 'reject'
    if (action === 'approve') {
        quotation.discountStatus = 'approved';
        quotation.discountApprovedBy = req.user._id;
    } else {
        quotation.discountStatus = 'rejected';
        quotation.discount = 0; // reset discount
        // Recalculate price
        quotation.finalSellingPrice = quotation.calculatedSellingPrice + quotation.manualAdjustment;
    }
    
    await quotation.save();
    
    await createAuditLog({
        action: 'UPDATE',
        module: 'CRM',
        documentId: quotation._id,
        documentCode: quotation.quoteNumber,
        description: `Discount ${action === 'approve' ? 'Approved' : 'Rejected'} for quotation ${quotation.quoteNumber}`,
        req
    });
    
    res.json({ success: true, data: quotation });
});

// Get Standard vs. Actual Wastage Variance Report
export const getWastageVarianceReport = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const filter = { status: 'converted' };
    if (startDate || endDate) {
        filter.updatedAt = {};
        if (startDate) filter.updatedAt.$gte = new Date(startDate);
        if (endDate) filter.updatedAt.$lte = new Date(endDate);
    }
    
    const quotations = await AluQuotation.find(filter).lean();
    const report = [];
    
    for (const q of quotations) {
        if (!q.cuttingOptimizationResults) continue;
        
        let totalStdPurchasedLength = 0;
        let totalStdUsedLength = 0;
        let totalStdWasteLength = 0;
        
        for (const code in q.cuttingOptimizationResults) {
            const opt = q.cuttingOptimizationResults[code];
            totalStdPurchasedLength += opt.purchasedLengthMm || 0;
            totalStdUsedLength += opt.usedLengthMm || 0;
            totalStdWasteLength += opt.wasteLengthMm || 0;
        }
        
        const stdWastePercent = totalStdPurchasedLength > 0 
            ? (totalStdWasteLength / totalStdPurchasedLength) * 100 
            : 0;
            
        const SalesOrder = mongoose.model('SalesOrder');
        const salesOrder = await SalesOrder.findOne({ quotationId: q._id }).lean();
        
        let actualIssuedQty = 0;
        if (salesOrder) {
            const StockMovement = mongoose.model('StockMovement');
            const movements = await StockMovement.find({
                'sourceDocument.id': salesOrder._id,
                movementType: 'production_issue'
            }).lean();
            
            movements.forEach(m => {
                if (m.unitOfMeasure === 'bar') {
                    actualIssuedQty += m.quantity;
                }
            });
        }
        
        const actualIssuedLength = actualIssuedQty * 6000;
        const actualWasteLength = Math.max(0, actualIssuedLength - totalStdUsedLength);
        const actualWastePercent = actualIssuedLength > 0 
            ? (actualWasteLength / actualIssuedLength) * 100 
            : 0;
            
        report.push({
            quotationId: q._id,
            quoteNumber: q.quoteNumber,
            projectName: q.projectName,
            customerName: q.customerName,
            standardPurchasedLengthMm: totalStdPurchasedLength,
            standardUsedLengthMm: totalStdUsedLength,
            standardWasteLengthMm: totalStdWasteLength,
            standardWastePercent: parseFloat(stdWastePercent.toFixed(2)),
            actualIssuedLengthMm: actualIssuedLength,
            actualWasteLengthMm: actualWasteLength,
            actualWastePercent: parseFloat(actualWastePercent.toFixed(2)),
            varianceLengthMm: parseFloat((actualWasteLength - totalStdWasteLength).toFixed(2)),
            variancePercent: parseFloat((actualWastePercent - stdWastePercent).toFixed(2))
        });
    }
    
    res.json({ success: true, data: report });
});

// Get Project Costing Sheet (Budget vs Actual)
export const getProjectCostingSheet = asyncHandler(async (req, res) => {
    const { id } = req.params; // salesOrderId
    
    const SalesOrder = mongoose.model('SalesOrder');
    const salesOrder = await SalesOrder.findById(id);
    if (!salesOrder) {
        res.status(404);
        throw new Error('Sales Order not found');
    }
    
    const quotation = await AluQuotation.findById(salesOrder.quotationId);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found for this project');
    }
    
    // --- 1. Budget (Estimated) Costs ---
    const budget = {
        aluminium: quotation.totalAluminiumCost || 0,
        glass: quotation.totalGlassCost || 0,
        accessories: quotation.totalAccessoriesCost || 0,
        labour: quotation.totalLabourCost || 0,
        transport: quotation.transportCost || 0,
        additional: (quotation.additionalCosts || []).reduce((s, a) => s + a.amount, 0),
        total: 0
    };
    budget.total = budget.aluminium + budget.glass + budget.accessories + budget.labour + budget.transport + budget.additional;
    
    // --- 2. Actual Costs (issued materials from stock) ---
    const StockMovement = mongoose.model('StockMovement');
    const movements = await StockMovement.find({
        'sourceDocument.id': salesOrder._id,
        movementType: 'production_issue'
    }).populate('productId').lean();
    
    let actualAluminium = 0;
    let actualGlass = 0;
    let actualAccessories = 0;
    
    movements.forEach(m => {
        const cost = m.quantity * m.costPerUnit;
        const code = m.productCode || '';
        
        if (m.unitOfMeasure === 'bar' || code.includes('ALU') || code.includes('PRF')) {
            actualAluminium += cost;
        } else if (m.unitOfMeasure === 'sqft' || code.includes('GLS') || code.includes('GLA')) {
            actualGlass += cost;
        } else {
            actualAccessories += cost;
        }
    });
    
    const actual = {
        aluminium: parseFloat(actualAluminium.toFixed(2)),
        glass: parseFloat(actualGlass.toFixed(2)),
        accessories: parseFloat(actualAccessories.toFixed(2)),
        labour: budget.labour,
        transport: budget.transport,
        additional: 0,
        total: 0
    };
    actual.total = actual.aluminium + actual.glass + actual.accessories + actual.labour + actual.transport + actual.additional;
    
    // --- 3. Variance ---
    const variance = {
        aluminium: parseFloat((actual.aluminium - budget.aluminium).toFixed(2)),
        glass: parseFloat((actual.glass - budget.glass).toFixed(2)),
        accessories: parseFloat((actual.accessories - budget.accessories).toFixed(2)),
        labour: parseFloat((actual.labour - budget.labour).toFixed(2)),
        transport: parseFloat((actual.transport - budget.transport).toFixed(2)),
        additional: parseFloat((actual.additional - budget.additional).toFixed(2)),
        total: parseFloat((actual.total - budget.total).toFixed(2))
    };
    
    // --- 4. Profitability ---
    const revenue = salesOrder.grandTotal;
    const budgetedProfit = revenue - budget.total;
    const actualProfit = revenue - actual.total;
    
    const profitability = {
        revenue,
        budgetedCost: budget.total,
        budgetedProfit: parseFloat(budgetedProfit.toFixed(2)),
        budgetedProfitPercent: revenue > 0 ? parseFloat(((budgetedProfit / revenue) * 100).toFixed(2)) : 0,
        actualCost: actual.total,
        actualProfit: parseFloat(actualProfit.toFixed(2)),
        actualProfitPercent: revenue > 0 ? parseFloat(((actualProfit / revenue) * 100).toFixed(2)) : 0,
        varianceProfit: parseFloat((actualProfit - budgetedProfit).toFixed(2))
    };
    
    res.json({
        success: true,
        data: {
            salesOrderId: salesOrder._id,
            orderNumber: salesOrder.orderNumber,
            projectName: salesOrder.projectName,
            customerName: salesOrder.customerSnapshot?.name || salesOrder.customerName,
            budget,
            actual,
            variance,
            profitability
        }
    });
});
