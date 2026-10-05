import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import AluProfile from '../models/AluProfile.js';
import AluGlass from '../models/AluGlass.js';
import AluAccessory from '../models/AluAccessory.js';
import AluApplication from '../models/AluApplication.js';
import AluQuotation from '../models/AluQuotation.js';
import AluPurchaseOrder from '../models/AluPurchaseOrder.js';
import SalesOrder from '../models/SalesOrder.js';
import Product from '../models/Product.js';
import StockItem from '../models/StockItem.js';
import Warehouse from '../models/Warehouse.js';
import AluScrap from '../models/AluScrap.js';
import AluJobCard from '../models/AluJobCard.js';
import StockReservation from '../models/StockReservation.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { solve2DGlassPacking } from '../utils/aluGlassSolver.js';
import { evaluateFormula } from '../utils/aluFormulaHelper.js';
import { decreaseStock } from '../services/stockService.js';

// === Helper Functions ===

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

// Helper to identify gasket items
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
        let pricePerM = 0;
        if (p.standardLengths?.length > 0) {
            const valid = p.standardLengths.filter(l => l.lengthMm > 0 && l.price > 0);
            if (valid.length > 0) {
                const sum = valid.reduce((acc, l) => acc + (l.price / (l.lengthMm / 1000)), 0);
                pricePerM = Math.round(sum / valid.length);
            }
        }
        const profItem = {
            description: p.description,
            name: p.description || p.profileCode,
            code: p.profileCode,
            supplier: p.supplier,
            ratePerM: pricePerM || 750,
            standardLengths: p.standardLengths.map(l => ({ lengthMm: l.lengthMm, price: l.price }))
        };
        snapshot.profiles[p.profileCode] = profItem;
        snapshot.profiles[p.profileCode.toUpperCase()] = profItem;
    });
    
    glass.forEach(g => {
        const item = {
            name: g.typeName,
            code: g.typeName,
            thickness: g.thickness,
            ratePerSqFt: g.ratePerSqFt,
            ratePerSqM: g.ratePerSqM,
            temperingCharge: g.temperingCharge || 0,
            processingCharge: g.processingCharge || 0
        };
        snapshot.glass[g.typeName] = item;
        snapshot.glass[g.typeName.toUpperCase()] = item;
    });

    try {
        const Product = (await import('../models/Product.js')).default;
        const rawMaterials = await Product.find({ businessType: 'alueco', deletedAt: null });
        rawMaterials.forEach(p => {
            const isGlass = p.aluCategory === 'glass' || 
                            p.aluSpecs?.type === 'GL' || 
                            (p.productCode && p.productCode.toUpperCase().startsWith('GL')) ||
                            (p.name && p.name.toLowerCase().includes('glass'));
            if (isGlass) {
                const sqftRate = Number(p.basePrice || p.costs?.lastPurchaseCost || p.costs?.standardCost || p.costs?.averageCost) || 0;
                const item = {
                    name: p.name || p.productCode,
                    code: p.productCode || p.name,
                    thickness: p.aluSpecs?.thickness || '',
                    ratePerSqFt: sqftRate,
                    ratePerSqM: Math.round(sqftRate * 10.7639),
                    temperingCharge: 0,
                    processingCharge: 0
                };
                if (p.productCode) {
                    snapshot.glass[p.productCode] = item;
                    snapshot.glass[p.productCode.toUpperCase()] = item;
                    snapshot.glass[p.productCode.replace(/[-_\s]/g, '').toUpperCase()] = item;
                }
                if (p.name) {
                    snapshot.glass[p.name] = item;
                    snapshot.glass[p.name.toUpperCase()] = item;
                }
            } else if (p.aluCategory === 'profiles') {
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
                    description: p.name || code,
                    supplier: p.aluSpecs?.brand || 'Swisstek',
                    ratePerM: ratePerM > 0 ? ratePerM : (price > 0 ? price : 750),
                    standardLengths: [{ lengthMm: Math.round(lengthM * 1000), price: price }]
                };
                if (p.productCode) {
                    snapshot.profiles[p.productCode] = profItem;
                    snapshot.profiles[p.productCode.toUpperCase()] = profItem;
                    snapshot.profiles[p.productCode.replace(/[-_\s]/g, '').toUpperCase()] = profItem;
                }
                if (p.name) {
                    snapshot.profiles[p.name] = profItem;
                    snapshot.profiles[p.name.toUpperCase()] = profItem;
                }
            } else if (['accessories', 'hardware', 'gaskets'].includes(p.aluCategory)) {
                let code = p.productCode?.toUpperCase();
                if (!code || code.startsWith('P-')) code = p.aluSpecs?.profile?.toUpperCase();
                if (!code) code = p.name?.toUpperCase();
                if (code && !snapshot.accessories[code]) {
                    snapshot.accessories[code] = {
                        name: p.name || code,
                        unit: p.unitOfMeasure || (p.aluCategory === 'gaskets' ? 'm' : 'pcs'),
                        isGasket: p.aluCategory === 'gaskets',
                        purchaseRate: Number(p.costs?.lastPurchaseCost || p.basePrice) || 0,
                        sellingRate: Number(p.basePrice || p.mrp) || 0
                    };
                }
            }
        });
    } catch (e) {
        console.warn('Failed to load raw material products for rate snapshot:', e.message);
    }
    
    accessories.forEach(a => {
        snapshot.accessories[a.code] = {
            name: a.name,
            brand: a.brand,
            unit: a.unit,
            purchaseRate: a.purchaseRate,
            sellingRate: a.sellingRate
        };
        snapshot.accessories[a.code.toUpperCase()] = snapshot.accessories[a.code];
    });
    
    applications.forEach(app => {
        snapshot.applications[`${app.type}_${app.configuration}`] = {
            profileBOM: app.profileBOM,
            glassBOM: app.glassBOM,
            accessoryBOM: app.accessoryBOM,
            gasketBOM: app.gasketBOM || [],
            labourMethod: app.labourMethod,
            labourRate: app.labourRate,
            profileSpec: app.profileSpec,
            glassSpec: app.glassSpec,
            hardwareSpec: app.hardwareSpec,
            scopeSpec: app.scopeSpec
        };
    });
    
    return snapshot;
};

// Calculate and Optimize Quotation Pipeline
const calculateQuotation = async (itemsInput, rates, transportCost = 0, additionalCosts = [], profitMarginPercent = 20, manualLabourCost = 0, manualOtherCost = 0) => {
    let totalAluminiumCost = 0;
    let totalGlassCost = 0;
    let totalAccessoriesCost = 0;
    let totalGasketCost = 0;
    let totalLabourCost = manualLabourCost || 0;
    
    const projectCuts = {}; // profileCode -> array of cut lengths (in mm)
    const projectGlassPanels = {}; // glassCode -> array of { width, height, glassCode }
    let hasPreCalculatedData = false; // Flag to track if any item has pre-calculated BOM
    
    // Step 1: Calculate individual elements (Cuts, Glass, Accessories)
    const items = [];
    
    for (const item of itemsInput) {
        const { applicationType, configuration, width, height, quantity } = item;
        
        // Check if item has pre-calculated BOM data from 2D configurator
        const hasPreCalculatedBOM = item.profileCuts && item.profileCuts.length > 0 &&
                                     item.glassItems && item.glassItems.length > 0 &&
                                     item.accessories && item.accessories.length > 0;
        
        // Check if item has pre-calculated pricing from configurator
        const hasPreCalculatedPricing = item.unitPrice > 0 && item.totalPrice > 0;
        
        let profileCuts = [];
        let glassItems = [];
        let accessories = [];
        let itemGlassCost = 0;
        let itemAccCost = 0;
        let itemGasketCost = 0;
        let itemHardwareCost = 0;
        let itemProfileCost = 0;
        let labourCost = 0;
        let totalAreaSqFt = 0;
        let unitPrice = 0;
        let totalPrice = 0;
        
        if (hasPreCalculatedBOM) {
            // Use pre-calculated BOM data from configurator
            hasPreCalculatedData = true;
            profileCuts = item.profileCuts;
            glassItems = item.glassItems;
            accessories = item.accessories;
            totalAreaSqFt = item.totalAreaSqFt || ((width * height * quantity) / 92903.04);
            const effectiveRatePerSqFt = Number(item.labourRatePerSqFt) > 0 ? Number(item.labourRatePerSqFt) : 150;
            // Labour Cost = Sqft Qty x Sqft Rate
            labourCost = item.costingSummary?.totalLabourCost !== undefined && item.costingSummary?.totalLabourCost !== null && Number(item.costingSummary.totalLabourCost) > 0
                ? Number(item.costingSummary.totalLabourCost)
                : parseFloat((totalAreaSqFt * effectiveRatePerSqFt).toFixed(2));
            
            // Calculate glass cost: prioritize costingSummary if provided
            itemGlassCost = item.costingSummary?.totalGlassCost !== undefined && Number(item.costingSummary.totalGlassCost) > 0
                ? Number(item.costingSummary.totalGlassCost)
                : glassItems.reduce((sum, g) => sum + (g.cost || 0), 0);
            
            // Separate gaskets and hardware accessories
            if (item.costingSummary?.totalGasketCost !== undefined && Number(item.costingSummary.totalGasketCost) > 0) {
                itemGasketCost = Number(item.costingSummary.totalGasketCost);
            } else if (item.gasketItems && item.gasketItems.length > 0) {
                itemGasketCost = item.gasketItems.reduce((sum, g) => sum + (Number(g.cost) || ((Number(g.qty) || 0) * (Number(g.unitRate) || 0))), 0);
            } else {
                itemGasketCost = accessories.filter(isGasketItem).reduce((sum, a) => sum + (Number(a.cost) || ((Number(a.qty) || 0) * (Number(a.unitRate) || 0))), 0);
            }

            if (item.costingSummary?.totalAccessoriesCost !== undefined && Number(item.costingSummary.totalAccessoriesCost) > 0) {
                const rawAcc = Number(item.costingSummary.totalAccessoriesCost);
                itemHardwareCost = Math.max(0, rawAcc >= itemGasketCost ? (rawAcc - itemGasketCost) : rawAcc);
            } else {
                itemHardwareCost = accessories.filter(a => !isGasketItem(a)).reduce((sum, a) => sum + (Number(a.cost) || ((Number(a.qty) || 0) * (Number(a.unitRate) || 0))), 0);
            }
            itemAccCost = itemHardwareCost;

            // Calculate profile cost: prioritize item.costingSummary.totalAluminiumCost if provided
            if (item.costingSummary?.totalAluminiumCost !== undefined && Number(item.costingSummary.totalAluminiumCost) > 0) {
                itemProfileCost = Number(item.costingSummary.totalAluminiumCost);
            } else {
                itemProfileCost = profileCuts.reduce((sum, pc) => {
                    if (Number(pc.cost) > 0) return sum + Number(pc.cost);
                    const profRate = rates.profiles[pc.profileCode || pc.code] || rates.profiles[(pc.profileCode || pc.code)?.toUpperCase()];
                    const r = profRate?.ratePerM || (Number(pc.unitRate) > 0 ? Number(pc.unitRate) : 750);
                    const lengthM = ((pc.length || 0) * (pc.qty || 1)) / 1000;
                    return sum + (lengthM * r);
                }, 0);
            }

            // Use pre-calculated pricing from configurator if available
            if (hasPreCalculatedPricing) {
                unitPrice = item.unitPrice;
                totalPrice = item.totalPrice;
            }
            
            totalAluminiumCost += itemProfileCost;
            totalGlassCost += itemGlassCost;
            totalAccessoriesCost += itemHardwareCost;
            totalGasketCost += itemGasketCost;
            
            // Add profile cuts to project-wide optimization
            profileCuts.forEach(pc => {
                const code = pc.profileCode || pc.code;
                if (!projectCuts[code]) {
                    projectCuts[code] = [];
                }
                const cutLength = pc.length || 0;
                const cutQty = pc.qty || 1;
                for (let k = 0; k < cutQty * quantity; k++) {
                    projectCuts[code].push(cutLength);
                }
            });
            
            // Add glass panels to project-wide optimization
            glassItems.forEach(g => {
                const code = g.glassCode || g.type;
                if (!projectGlassPanels[code]) {
                    projectGlassPanels[code] = [];
                }
                const panelQty = g.qty || 1;
                for (let k = 0; k < panelQty * quantity; k++) {
                    projectGlassPanels[code].push({
                        width: g.width || 0,
                        height: g.height || 0,
                        glassCode: code,
                        glassSheetLength: g.glassSheetLength || '8',
                        base21ftPrice: g.base21ftPrice || 0
                    });
                }
            });
        } else {
            // Parse panel count
            let P = 1;
            const panelMatch = configuration.match(/^(\d+)\s*Panel/i);
            if (panelMatch) {
                P = parseInt(panelMatch[1]);
            }
            
            const variables = { W: width, H: height, P, Q: quantity };
            
            // Find application configuration details with graceful fallback for custom configurations
            const appKey = `${applicationType}_${configuration}`;
            let appData = rates.applications[appKey];
            if (!appData) {
                const fallbackKeys = Object.keys(rates.applications).filter(k => k.startsWith(applicationType));
                if (fallbackKeys.length > 0) {
                    appData = rates.applications[fallbackKeys[0]];
                } else {
                    appData = rates.applications[Object.keys(rates.applications)[0]];
                }
            }
            if (!appData) {
                throw new Error(`Application configuration "${applicationType} - ${configuration}" is not defined in system templates.`);
            }
            
            // Profile cuts
            appData.profileBOM.forEach(pb => {
                const qty = evaluateFormula(pb.quantityFormula, variables);
                const length = evaluateFormula(pb.lengthFormula, variables);
                if (qty > 0 && length > 0) {
                    // Round length to nearest integer
                    const roundedLength = Math.round(length);
                    const totalQty = qty * quantity; // multiplier for number of openings
                    
                    profileCuts.push({
                        profileCode: pb.profileCode,
                        actualCode: pb.actualCode || pb.profileCode,
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
            appData.glassBOM.forEach(gb => {
                const gQty = evaluateFormula(gb.quantityFormula, variables);
                const gW = evaluateFormula(gb.widthFormula, variables);
                const gH = evaluateFormula(gb.heightFormula, variables);
                
                if (gQty > 0 && gW > 0 && gH > 0) {
                    // Calculate area: Area of single sheet in sqft
                    const areaSqFt = (gW * gH) / 92903.04;
                    const totalAreaSqFt_item = areaSqFt * gQty * quantity;
                    
                    const lookupGlass = (code) => {
                        if (!code || !rates.glass) return null;
                        if (rates.glass[code]) return rates.glass[code];
                        const up = String(code).toUpperCase();
                        if (rates.glass[up]) return rates.glass[up];
                        const clean = up.replace(/[-_\s]/g, '');
                        for (const [k, val] of Object.entries(rates.glass)) {
                            if (String(k).toUpperCase().replace(/[-_\s]/g, '') === clean) return val;
                        }
                        return Object.entries(rates.glass).find(([k]) => String(k).toLowerCase() === String(code).toLowerCase())?.[1] || null;
                    };
                    const glassRate = lookupGlass(gb.glassCode);
                    if (glassRate) {
                        // Use pricing formula: (base21ftPrice/21) * glassSheetLength * 1.05 if base21ftPrice is provided
                        let cost;
                        if (gb.base21ftPrice && gb.base21ftPrice > 0) {
                            const sheetLength = parseFloat(gb.glassSheetLength) || 8;
                            const pricePerFoot = gb.base21ftPrice / 21;
                            const sheetCost = pricePerFoot * sheetLength * 1.05;
                            cost = totalAreaSqFt_item * sheetCost;
                        } else {
                            const unitRate = glassRate.ratePerSqFt + glassRate.temperingCharge + glassRate.processingCharge;
                            cost = totalAreaSqFt_item * unitRate;
                        }

                        glassItems.push({
                            glassCode: gb.glassCode,
                            width: Math.round(gW),
                            height: Math.round(gH),
                            qty: gQty * quantity,
                            areaSqFt: parseFloat(totalAreaSqFt_item.toFixed(2)),
                            unitRate: parseFloat((gb.base21ftPrice ? (gb.base21ftPrice / 21) * parseFloat(gb.glassSheetLength || 8) * 1.05 : (glassRate.ratePerSqFt + glassRate.temperingCharge + glassRate.processingCharge)).toFixed(2)),
                            cost: parseFloat(cost.toFixed(2)),
                            glassSheetLength: gb.glassSheetLength || '8',
                            base21ftPrice: gb.base21ftPrice || 0
                        });

                        itemGlassCost += cost;

                        // Accumulate panels for 2D optimization with sheet length
                        if (!projectGlassPanels[gb.glassCode]) {
                            projectGlassPanels[gb.glassCode] = [];
                        }
                        const totalQty = gQty * quantity;
                        for (let k = 0; k < totalQty; k++) {
                            projectGlassPanels[gb.glassCode].push({
                                width: Math.round(gW),
                                height: Math.round(gH),
                                glassCode: gb.glassCode,
                                glassSheetLength: gb.glassSheetLength || '8',
                                base21ftPrice: gb.base21ftPrice || 0
                            });
                        }
                    }
                }
            });
            
            totalGlassCost += itemGlassCost;
            
            // Accessories
            appData.accessoryBOM.forEach(ab => {
                const accQty = evaluateFormula(ab.quantityFormula, variables);
                if (accQty > 0) {
                    const totalAccQty = accQty * quantity;
                    const accRate = rates.accessories[ab.accessoryCode];
                    if (accRate) {
                        const cost = totalAccQty * accRate.sellingRate; // use selling rate for quotation
                        accessories.push({
                            code: ab.accessoryCode,
                            actualCode: ab.actualCode || ab.accessoryCode,
                            name: accRate.name,
                            qty: totalAccQty,
                            unitRate: accRate.sellingRate,
                            cost: parseFloat(cost.toFixed(2))
                        });
                        itemAccCost += cost;
                    }
                }
            });
            
            // Gaskets & Weatherstrips (Meters calculated from W & H formula)
            if (appData.gasketBOM && appData.gasketBOM.length > 0) {
                appData.gasketBOM.forEach(gb => {
                    if (!gb.gasketCode && !gb.formula) return;
                    let gasketMeters = evaluateFormula(gb.formula || '0', variables);
                    // If result > 50 and W/H > 50, user likely provided formula in mm, convert to meters
                    if (gasketMeters > 50 && (width > 50 || height > 50)) {
                        gasketMeters = parseFloat((gasketMeters / 1000).toFixed(2));
                    }
                    gasketMeters = Math.max(0, parseFloat(Number(gasketMeters).toFixed(2)));
                    if (gasketMeters > 0) {
                        const totalGasketMeters = parseFloat((gasketMeters * quantity).toFixed(2));
                        const accRate = rates.accessories[gb.gasketCode] || rates.accessories[gb.actualCode] || { sellingRate: 150, name: gb.name || gb.gasketCode };
                        const unitRate = accRate.sellingRate || 150;
                        const cost = parseFloat((totalGasketMeters * unitRate).toFixed(2));
                        accessories.push({
                            code: gb.gasketCode,
                            actualCode: gb.actualCode || gb.gasketCode,
                            name: gb.name || accRate.name || 'Rubber Gasket Weatherseal',
                            qty: totalGasketMeters,
                            unit: gb.unit || 'm',
                            unitRate,
                            cost,
                            isGasket: true
                        });
                        itemGasketCost += cost;
                    }
                });
            }

            totalAccessoriesCost += itemAccCost;
            totalGasketCost += itemGasketCost;
            
            // Labour Calculation (supports Square Feet Rate, linear feet, opening, fixed, percentage)
            const totalAreaSqFt_item = (width * height * quantity) / 92903.04;
            const totalAreaSqM = (width * height * quantity) / 1000000;
            const totalLinearFeet = (2 * (width + height) / 304.8) * quantity;
            
            // Labour Calculation: Labour Cost = (Sqft Qty x Sqft Rate)
            const unitAreaSqFt = (width * height) / 92903.04;
            const effectiveRatePerSqFt = Number(item.labourRatePerSqFt) > 0 
                ? Number(item.labourRatePerSqFt) 
                : (appData.labourMethod === 'sqft' && Number(appData.labourRate) > 0 
                    ? Number(appData.labourRate) 
                    : (unitAreaSqFt > 0 && Number(item.labourCost) > 0 
                        ? parseFloat((Number(item.labourCost) / unitAreaSqFt).toFixed(2)) 
                        : 150));

            labourCost = totalAreaSqFt_item * effectiveRatePerSqFt;
            labourCost = parseFloat(labourCost.toFixed(2));
            totalAreaSqFt = totalAreaSqFt_item;
        }
        
        totalLabourCost += labourCost;
        
        const effectiveRawCost = (itemProfileCost || 0) + (itemGlassCost || 0) + (itemAccCost || 0) + (itemGasketCost || 0);
        const itemMargin = Number(item.profitMarginPercent) || Number(profitMarginPercent) || 20;
        const itemSellingPrice = totalPrice || (unitPrice > 0 ? unitPrice * quantity : Math.round((effectiveRawCost + labourCost) * (1 + itemMargin / 100)));
        const finalUnitPrice = unitPrice || (quantity > 0 ? Math.round(itemSellingPrice / quantity) : itemSellingPrice);
        const effectiveGasketItems = (item.gasketItems && item.gasketItems.length > 0)
            ? item.gasketItems.map(g => ({ ...g, isGasket: true, unit: g.unit || 'm' }))
            : accessories.filter(isGasketItem).map(a => ({ ...a, isGasket: true, unit: a.unit || 'm' }));

        const cleanAccessories = accessories.filter(a => !isGasketItem(a)).map(a => ({ ...a, isGasket: false, unit: a.unit || 'pcs' }));

        const enrichedProfileCuts = profileCuts.map((pc) => {
            const code = pc.profileCode || pc.code || '';
            const rateObj = (rates?.profiles && (rates.profiles[code] || rates.profiles[code?.toUpperCase()])) || {};
            const unitRate = Number(pc.unitRate) || rateObj.ratePerM || 750;
            const length = pc.length || 0;
            const qty = pc.qty || 1;
            const totalLengthM = ((length * qty) / 1000);
            const cost = Number(pc.cost) || Math.round(totalLengthM * unitRate);
            const name = pc.name || pc.description || rateObj.name || rateObj.description || code || 'Aluminium Profile';
            return {
                ...pc,
                profileCode: code || pc.profileCode,
                code: code || pc.code,
                name: name,
                description: name,
                length: length,
                qty: qty,
                totalLength: length * qty,
                totalLengthM: parseFloat(totalLengthM.toFixed(3)),
                unitRate: unitRate,
                discountedRate: Number(pc.discountedRate) || unitRate,
                cost: cost
            };
        });

        items.push({
            applicationType,
            configuration,
            width,
            height,
            quantity,
            trackSystem: item.trackSystem,
            topSection: item.topSection,
            panelArrangement: item.panelArrangement,
            description: item.description,
            profileSpec: item.profileSpec || 'Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)',
            glassSpec: item.glassSpec || '5mm Single Tempered Clear Glass',
            hardwareSpec: item.hardwareSpec || 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals',
            gasketSpec: item.gasketSpec || 'EPDM Weather Seal Gaskets Inclusive',
            scopeSpec: item.scopeSpec || 'Fabrication, Delivery & Installation Inclusive',
            sketchImage: item.sketchImage,
            totalAreaSqFt: parseFloat(totalAreaSqFt.toFixed(2)),
            labourRatePerSqFt: Number(item.labourRatePerSqFt) || 150,
            labourMethod: 'sqft',
            profileCuts: enrichedProfileCuts,
            glassItems,
            accessories: cleanAccessories,
            gasketItems: effectiveGasketItems,
            totalGasketMeters: Number(item.totalGasketMeters) || parseFloat(effectiveGasketItems.reduce((s, g) => s + (Number(g.qty) || 0), 0).toFixed(2)),
            aluminiumDiscountPercent: Number(item.aluminiumDiscountPercent) || 0,
            profitMarginPercent: itemMargin,
            costingSummary: item.costingSummary && (Number(item.costingSummary.totalAluminiumCost) > 0 || Number(item.costingSummary.totalRawCost) > 0)
                ? {
                    ...item.costingSummary,
                    totalAluminiumCost: Number(item.costingSummary.totalAluminiumCost) || itemProfileCost,
                    totalGlassCost: Number(item.costingSummary.totalGlassCost) || itemGlassCost,
                    totalAccessoriesCost: (Number(item.costingSummary.totalAccessoriesCost) > 0)
                        ? Number(item.costingSummary.totalAccessoriesCost)
                        : (itemHardwareCost + itemGasketCost),
                    totalGasketCost: (Number(item.costingSummary.totalGasketCost) > 0)
                        ? Number(item.costingSummary.totalGasketCost)
                        : itemGasketCost,
                    finalSellingPrice: itemSellingPrice
                }
                : {
                    totalAluminiumCost: itemProfileCost,
                    totalGlassCost: itemGlassCost,
                    totalAccessoriesCost: itemHardwareCost + itemGasketCost,
                    totalGasketCost: itemGasketCost,
                    totalLabourCost: labourCost,
                    unitLabourCost: quantity > 0 ? Math.round(labourCost / quantity) : labourCost,
                    labourRatePerSqFt: Number(item.labourRatePerSqFt) || 150,
                    totalRawCost: effectiveRawCost,
                    profitMarginPercent: itemMargin,
                    profitMarginAmount: Math.round((effectiveRawCost + labourCost) * (itemMargin / 100)),
                    finalSellingPrice: itemSellingPrice
                },
            labourCost,
            unitPrice: finalUnitPrice,
            totalPrice: itemSellingPrice
        });
    }
    
    // Step 2: 1D Cutting Optimization across all profiles in project
    const cuttingOptimizationResults = {};
    let totalOptimizedAluCost = 0;

    // Always run cutting optimization for display purposes, even when using pre-calculated data
    // When using configurator, we use pre-calculated costs but still show optimization results
    for (const code in projectCuts) {
            const cuts = projectCuts[code];
            // Try exact match, then uppercase, then stripped key
            const profile = rates.profiles[code]
                || rates.profiles[code?.toUpperCase()]
                || rates.profiles[code?.toUpperCase()?.replace(/[-_\s]/g, '')];
            
            // Fallback: if profile not found or has no standardLengths, use a default 6100mm (20ft) bar
            const DEFAULT_BAR = { lengthMm: 6100, price: 0 };
            const effectiveStandardLengths = (profile?.standardLengths?.length > 0)
                ? profile.standardLengths
                : [DEFAULT_BAR];
            
            if (cuts && cuts.length > 0) {
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
                const newBarsPacking = solve1DPacking(cutsForNewBars, effectiveStandardLengths);
                
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
                    description: profile?.description || profile?.name || code,
                    supplier: profile?.supplier || '',
                    requiredCuts: cuts.sort((a, b) => b - a),
                    bars: packingLayout,
                    totalBarsPurchased,
                    purchasedLengthMm: purchasedLength,
                    usedLengthMm: usedLength,
                    wasteLengthMm: wasteLength,
                    wastePercent: parseFloat(wastePercent.toFixed(1)),
                    totalCost: parseFloat(cost.toFixed(2))
                };
                
                totalOptimizedAluCost += cost;
            }
        }

    // Override aluminium cost to reflect actual bars purchased (only when not using pre-calculated data)
    if (Object.keys(projectCuts).length > 0 && !hasPreCalculatedData) {
        totalAluminiumCost = totalOptimizedAluCost;
    }
    
    // Step 2.5: 2D Glass Cutting Optimization
    const glassOptimizationResults = {};
    let totalOptimizedGlassCost = 0;

    // Always run glass optimization for display purposes, even when using pre-calculated data
    // Standard glass sheet dimensions (length in ft to mm, standard height 4ft = 1219mm)
    const GLASS_SHEET_DIMENSIONS = {
        '4': { lengthMm: 1219, heightMm: 1219, areaSqFt: 16.0 },
        '7': { lengthMm: 2134, heightMm: 1219, areaSqFt: 28.0 },
        '8': { lengthMm: 2438, heightMm: 1219, areaSqFt: 32.0 },
        '14': { lengthMm: 4267, heightMm: 1219, areaSqFt: 56.0 },
        '16': { lengthMm: 4877, heightMm: 1219, areaSqFt: 64.0 },
        '21': { lengthMm: 6401, heightMm: 1219, areaSqFt: 84.0 }
    };

    for (const type in projectGlassPanels) {
        const panels = projectGlassPanels[type];
        const glassRate = rates.glass[type];
        if (glassRate) {
            const unitRate = glassRate.ratePerSqFt + glassRate.temperingCharge + glassRate.processingCharge;
            const cuttingCharge = glassRate.cuttingServiceCharge || 0;

            // Group panels by sheet length
            const panelsBySheetLength = {};
            panels.forEach(panel => {
                const sheetLength = panel.glassSheetLength || '8';
                if (!panelsBySheetLength[sheetLength]) {
                    panelsBySheetLength[sheetLength] = [];
                }
                panelsBySheetLength[sheetLength].push(panel);
            });

            // Optimize for each sheet length
            const sheetPackingLayout = [];
            let sheetsPurchased = 0;
            let totalCost = 0;

            for (const sheetLength in panelsBySheetLength) {
                const sheetDims = GLASS_SHEET_DIMENSIONS[sheetLength] || GLASS_SHEET_DIMENSIONS['8'];
                const panelsForLength = panelsBySheetLength[sheetLength];
                const packingLayout = solve2DGlassPacking(panelsForLength, sheetDims.lengthMm, sheetDims.heightMm);

                sheetPackingLayout.push(...packingLayout);
                sheetsPurchased += packingLayout.length;

                // Use pricing formula: (base21ftPrice/21) * sheetLength * 1.05 if base21ftPrice is provided
                const base21ftPrice = panelsForLength[0]?.base21ftPrice || 0;
                if (base21ftPrice > 0) {
                    const pricePerFoot = base21ftPrice / 21;
                    const sheetCost = pricePerFoot * parseFloat(sheetLength) * 1.05;
                    totalCost += packingLayout.length * sheetCost;
                } else {
                    totalCost += packingLayout.length * sheetDims.areaSqFt * unitRate;
                }

                // Add cutting service charge per sheet
                totalCost += packingLayout.length * cuttingCharge;
            }

            glassOptimizationResults[type] = {
                glassCode: type,
                thickness: glassRate.thickness,
                requiredPanels: panels,
                sheets: sheetPackingLayout,
                sheetsPurchased,
                totalCost: parseFloat(totalCost.toFixed(2)),
                cuttingServiceCharge: cuttingCharge
            };

            totalOptimizedGlassCost += totalCost;
        }
    }

    // Override glass cost to reflect actual sheets purchased (only when not using pre-calculated data)
    if (Object.keys(projectGlassPanels).length > 0 && !hasPreCalculatedData) {
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

            // If we have pre-calculated data from configurator, calculate profile cost directly from cuts
            if (hasPreCalculatedData) {
                item.profileCuts.forEach(pc => {
                    const profRate = rates.profiles[pc.profileCode || pc.code];
                    if (profRate) {
                        const lengthM = (pc.length * pc.qty) / 1000;
                        itemProfileCost += lengthM * (profRate.ratePerM || 0);
                    }
                });
            } else {
                item.profileCuts.forEach(pc => {
                    const opt = cuttingOptimizationResults[pc.profileCode];
                    if (opt && opt.purchasedLengthMm > 0) {
                        const proportion = (pc.length * pc.qty * item.quantity) / opt.usedLengthMm;
                        itemProfileCost += opt.totalCost * proportion;
                    }
                });
            }

            const matCost = itemProfileCost + item.glassItems.reduce((s, g) => s + g.cost, 0) + item.accessories.reduce((s, a) => s + a.cost, 0);
            const labour = matCost * appData.labourRate / 100;
            item.labourCost = parseFloat(labour.toFixed(2));
        }
    });
    
    // Re-sum labour
    totalLabourCost = items.reduce((sum, item) => sum + item.labourCost, 0);

    // Step 3: Quotation Summary Costs
    const sumAdditional = additionalCosts.reduce((sum, ac) => sum + ac.cost, 0);
    const materialCost = totalAluminiumCost + totalGlassCost + totalAccessoriesCost + totalGasketCost;

    // Check if all items have pre-calculated pricing from 2D configurator
    const allItemsHavePreCalculatedPricing = items.every(item => item.unitPrice > 0 && item.totalPrice > 0);

    let calculatedSellingPrice;
    let subtotal;

    if (allItemsHavePreCalculatedPricing) {
        // Use configurator's final selling prices as the base (no recalculation)
        const configuratorTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        // Subtotal = Final Selling Price from 2D Configuration Cost Summary
        // This is the base selling amount before adding Tax, Travelling Cost, and Other Cost
        subtotal = configuratorTotal;
        // calculatedSellingPrice = Subtotal + Transport Cost + Other Cost + Additional Costs
        // Note: Profit margin is already included in the configurator's Final Selling Price
        calculatedSellingPrice = configuratorTotal + transportCost + sumAdditional + (manualOtherCost || 0);
    } else {
        // Standard calculation for items without pre-calculated pricing
        const baseCostBeforeMargin = materialCost + totalLabourCost + transportCost + sumAdditional + (manualOtherCost || 0);
        const profitCost = baseCostBeforeMargin * (profitMarginPercent / 100);
        calculatedSellingPrice = baseCostBeforeMargin + profitCost;
        // Subtotal is base cost before profit margin
        subtotal = baseCostBeforeMargin;
    }
    
    // Calculate final unit prices for client view
    items.forEach(item => {
        // If item has pre-calculated pricing from configurator, use it directly
        if (item.unitPrice > 0 && item.totalPrice > 0) {
            // Pricing already set from configurator, skip recalculation
            return;
        }

        // Calculate item base cost (proportional profile cost + item glass + item accessory + item labour)
        let itemProfileCost = 0;

        // If we have pre-calculated data from configurator, calculate profile cost directly from cuts
        if (hasPreCalculatedData) {
            item.profileCuts.forEach(pc => {
                const profRate = rates.profiles[pc.profileCode || pc.code];
                if (profRate) {
                    const lengthM = (pc.length * pc.qty) / 1000;
                    itemProfileCost += lengthM * (profRate.ratePerM || 0);
                }
            });
        } else {
            // Use optimization results for formula-based calculations
            item.profileCuts.forEach(pc => {
                const opt = cuttingOptimizationResults[pc.profileCode];
                if (opt && opt.usedLengthMm > 0) {
                    const proportion = (pc.length * pc.qty * item.quantity) / opt.usedLengthMm;
                    itemProfileCost += opt.totalCost * proportion;
                }
            });
        }

        const itemGlass = item.glassItems.reduce((s, g) => s + g.cost, 0);
        const itemAcc = item.accessories.reduce((s, a) => s + a.cost, 0);
        const itemBaseCost = (itemProfileCost + itemGlass + itemAcc + (item.labourCost)) / item.quantity;

        // Add proportional transport + additional + margin
        // Calculate the proportion of this item's cost to the total project cost (excluding transport/additional)
        const totalBaseCost = materialCost + totalLabourCost;
        const itemProportionOfCost = totalBaseCost > 0 ? (itemBaseCost * item.quantity) / totalBaseCost : 0;
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
        totalGasketCost: parseFloat(totalGasketCost.toFixed(2)),
        totalLabourCost: parseFloat(totalLabourCost.toFixed(2)),
        subtotal: parseFloat(subtotal.toFixed(2)),
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
    let quotation = await AluQuotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }
    
    // Auto-enrich legacy or incomplete quote items
    let needsSave = false;
    const qObj = JSON.parse(JSON.stringify(quotation));
    if (qObj.items && qObj.items.length > 0) {
        let applications = null;
        let ratesSnapshot = null;

        for (let i = 0; i < qObj.items.length; i++) {
            const it = qObj.items[i];
            const hasMissingProfileCodes = (it.profileCuts || []).some(pc => !pc.profileCode && !pc.code);
            const hasMissingCosting = !it.costingSummary || !Number(it.costingSummary.totalAluminiumCost);
            const hasMissingGaskets = (!it.gasketItems || it.gasketItems.length === 0) && (it.accessories || []).some(isGasketItem);

            if (hasMissingProfileCodes || hasMissingCosting || hasMissingGaskets) {
                if (!applications) {
                    applications = await AluApplication.find({ isActive: true }).lean();
                }
                if (!ratesSnapshot) {
                    ratesSnapshot = await captureRatesSnapshot();
                }

                // Match application template
                const tmpl = applications.find(t => 
                    (t.type?.toLowerCase() === (it.applicationType || '').toLowerCase() || (it.applicationType || '').toLowerCase().includes(t.type?.toLowerCase())) &&
                    (String(t.configuration).trim() === String(it.configuration).trim() || 
                     (it.configuration || '').includes(String(t.configuration)) || 
                     String(t.configuration).includes(it.configuration || ''))
                );

                // Enrich profile cuts
                if (it.profileCuts && it.profileCuts.length > 0) {
                    it.profileCuts = it.profileCuts.map((pc, idx) => {
                        const templateProf = tmpl?.profileBOM?.[idx];
                        const code = pc.profileCode || pc.code || templateProf?.profileCode || templateProf?.actualCode || '';
                        const rateObj = (ratesSnapshot?.profiles && (ratesSnapshot.profiles[code] || ratesSnapshot.profiles[code?.toUpperCase()])) || {};
                        const unitRate = Number(pc.unitRate) || rateObj.ratePerM || 750;
                        const len = pc.length || 0;
                        const q = pc.qty || 1;
                        const totalLengthM = (len * q) / 1000;
                        const cost = Number(pc.cost) || Math.round(totalLengthM * unitRate);
                        const name = pc.name || pc.description || templateProf?.description || rateObj.name || rateObj.description || code || 'Aluminium Profile';
                        return {
                            ...pc,
                            profileCode: code,
                            code: code,
                            name: name,
                            description: name,
                            length: len,
                            qty: q,
                            totalLength: len * q,
                            totalLengthM: parseFloat(totalLengthM.toFixed(3)),
                            unitRate: unitRate,
                            discountedRate: Number(pc.discountedRate) || unitRate,
                            cost: cost
                        };
                    });
                }

                // Separate gasket items from accessories
                const separatedGaskets = (it.gasketItems && it.gasketItems.length > 0)
                    ? it.gasketItems.map(g => ({ ...g, isGasket: true, unit: g.unit || 'm' }))
                    : (it.accessories || []).filter(isGasketItem).map(a => ({ ...a, isGasket: true, unit: a.unit || 'm' }));

                const separatedHardware = (it.accessories || []).filter(a => !isGasketItem(a)).map(a => ({ ...a, isGasket: false, unit: a.unit || 'pcs' }));

                it.gasketItems = separatedGaskets;
                it.accessories = separatedHardware;

                const aluCost = (it.profileCuts || []).reduce((s, pc) => s + (Number(pc.cost) || 0), 0);
                let glassCost = (it.glassItems || []).reduce((s, g) => s + (Number(g.cost) || 0), 0);
                if (glassCost <= 0 && quotation.totalGlassCost > 0) {
                    glassCost = Number(quotation.totalGlassCost);
                }

                if ((!it.glassItems || it.glassItems.length === 0) && tmpl?.glassBOM?.length > 0) {
                    const W = it.width || 2400;
                    const H = it.height || 2100;
                    const gW = Math.round(Math.max(100, (W - 280) / 2));
                    const gH = Math.round(Math.max(100, H - 100));
                    const areaSqFt = (gW * gH) / 92903.04;
                    const perPanelCost = glassCost > 0 ? Math.round(glassCost / tmpl.glassBOM.length) : 0;
                    it.glassItems = tmpl.glassBOM.map(gb => ({
                        glassCode: gb.glassCode,
                        type: gb.glassCode || 'Glass',
                        width: gW,
                        height: gH,
                        qty: 1,
                        areaSqFt: parseFloat(areaSqFt.toFixed(2)),
                        cost: perPanelCost
                    }));
                }

                const hardCost = separatedHardware.reduce((s, a) => s + (Number(a.cost) || 0), 0);
                const gaskCost = separatedGaskets.reduce((s, g) => s + (Number(g.cost) || 0), 0);
                const labCost = (it.labourCost || 0) * (it.quantity || 1);
                const rawCost = aluCost + glassCost + hardCost + gaskCost;
                const margin = it.profitMarginPercent || 20;

                it.costingSummary = {
                    ...(it.costingSummary || {}),
                    totalAluminiumCost: aluCost,
                    totalGlassCost: glassCost,
                    totalAccessoriesCost: hardCost + gaskCost,
                    totalGasketCost: gaskCost,
                    totalLabourCost: labCost,
                    unitLabourCost: it.quantity > 0 ? Math.round(labCost / it.quantity) : labCost,
                    labourRatePerSqFt: it.labourRatePerSqFt || 150,
                    totalRawCost: rawCost,
                    profitMarginPercent: margin,
                    profitMarginAmount: Math.round((rawCost + labCost) * (margin / 100)),
                    finalSellingPrice: it.totalPrice || Math.round((rawCost + labCost) * (1 + margin / 100))
                };
                it.totalGasketMeters = parseFloat(separatedGaskets.reduce((s, g) => s + (Number(g.qty) || 0), 0).toFixed(2));
                needsSave = true;
            }
        }

        if (needsSave) {
            const totalAlu = qObj.items.reduce((s, it) => s + (Number(it.costingSummary?.totalAluminiumCost) || 0), 0);
            const totalGask = qObj.items.reduce((s, it) => s + (Number(it.costingSummary?.totalGasketCost) || 0), 0);
            const totalHard = qObj.items.reduce((s, it) => s + (it.accessories || []).reduce((sum, a) => sum + (Number(a.cost) || 0), 0), 0);

            await AluQuotation.collection.updateOne(
                { _id: quotation._id },
                {
                    $set: {
                        items: qObj.items,
                        totalAluminiumCost: totalAlu,
                        totalGasketCost: totalGask,
                        totalAccessoriesCost: totalHard
                    }
                }
            );
            quotation = await AluQuotation.findById(req.params.id);
        }
    }
    
    // Auto-heal: If cuttingOptimizationResults is empty, re-run optimization and save it
    const hasOptResults = quotation.cuttingOptimizationResults &&
        Object.keys(quotation.cuttingOptimizationResults).length > 0;
    
    if (!hasOptResults && quotation.items && quotation.items.length > 0) {
        try {
            // Always use fresh rates from DB (stored rateSnapshot may be old and missing standardLengths)
            const freshRates = await captureRatesSnapshot();
            
            const calc = await calculateQuotation(
                quotation.items,
                freshRates,
                quotation.transportCost || 0,
                quotation.additionalCosts || [],
                quotation.profitMarginPercent || 20,
                quotation.totalLabourCost || 0,
                quotation.otherCost || 0
            );
            
            if (calc.cuttingOptimizationResults && Object.keys(calc.cuttingOptimizationResults).length > 0) {
                await AluQuotation.collection.updateOne(
                    { _id: quotation._id },
                    { $set: { cuttingOptimizationResults: calc.cuttingOptimizationResults } }
                );
                quotation = await AluQuotation.findById(req.params.id);
            }
        } catch (healErr) {
            console.warn('[getAluQuotationById] Failed to auto-heal cuttingOptimizationResults:', healErr.message);
        }
    }
    
    // Find all revisions of this quotation
    const revisions = await AluQuotation.find({ revisionGroupCode: quotation.revisionGroupCode })
        .select('version status finalSellingPrice createdAt isLatestRevision')
        .sort({ version: -1 });
        
    res.json({ success: true, data: quotation, revisions });
});

// Helper to generate next unique quote number based on highest sequence
export const generateUniqueAluQuoteNumber = async () => {
    const date = new Date();
    const prefix = `QOT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existingQuotes = await AluQuotation.find(
        { quoteNumber: new RegExp(`^${prefix}`) },
        { quoteNumber: 1 }
    ).lean();

    let maxSeq = 0;
    existingQuotes.forEach(q => {
        const parts = q.quoteNumber?.split('-');
        const seq = parseInt(parts?.[parts.length - 1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
        }
    });

    let nextSeq = maxSeq + 1;
    let quoteNumber = `${prefix}-${String(nextSeq).padStart(4, '0')}`;

    while (await AluQuotation.exists({ quoteNumber })) {
        nextSeq++;
        quoteNumber = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
    }

    return quoteNumber;
};

// Create new quotation (Revision 00)
export const createAluQuotation = asyncHandler(async (req, res) => {
    const {
        customerName,
        projectName,
        description,
        location,
        validTill,
        items,
        transportCost,
        totalLabourCost,
        otherCost,
        additionalCosts,
        profitMarginPercent,
        discount,
        manualAdjustment,
        terms,
        checklist,
        includeVat,
        distributeTransportCost
    } = req.body;
    
    const rates = await captureRatesSnapshot();
    
    const calc = await calculateQuotation(
        items,
        rates,
        Number(transportCost || 0),
        additionalCosts || [],
        Number(profitMarginPercent || 20),
        Number(totalLabourCost || 0),
        Number(otherCost || 0)
    );
    
    const date = new Date();
    let quoteNumber = await generateUniqueAluQuoteNumber();
    
    // Apply VAT if enabled
    let finalPrice = calc.calculatedSellingPrice - (discount || 0) + (manualAdjustment || 0);
    let vatAmount = 0;
    let finalPriceWithVat = finalPrice;
    
    if (includeVat) {
        vatAmount = finalPrice * 0.18; // 18% VAT
        finalPriceWithVat = finalPrice + vatAmount;
    }
    
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

    let quotation;
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            quotation = await AluQuotation.create({
                quoteNumber,
                version: 0,
                revisionGroupCode: quoteNumber,
                isLatestRevision: true,
                customerName,
                projectName,
                description: description || '',
                location,
                date: date,
                validTill: validTill || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // default 30 days
                items: calc.items,
                totalAluminiumCost: calc.totalAluminiumCost,
                totalGlassCost: calc.totalGlassCost,
                totalAccessoriesCost: calc.totalAccessoriesCost,
                totalGasketCost: calc.totalGasketCost || 0,
                totalLabourCost: Number(totalLabourCost || calc.totalLabourCost),
                transportCost: Number(transportCost || 0),
                otherCost: Number(otherCost || 0),
                additionalCosts: additionalCosts || [],
                profitMarginPercent: Number(profitMarginPercent || 20),
                subtotal: calc.subtotal,
                calculatedSellingPrice: calc.calculatedSellingPrice,
                discount: Number(discount || 0),
                discountStatus,
                discountApprovedBy,
                manualAdjustment: Number(manualAdjustment || 0),
                finalSellingPrice: parseFloat(finalPrice.toFixed(2)),
                vatAmount: parseFloat(vatAmount.toFixed(2)),
                finalPriceWithVat: parseFloat(finalPriceWithVat.toFixed(2)),
                status: 'draft',
                rateSnapshot: rates,
                cuttingOptimizationResults: calc.cuttingOptimizationResults,
                glassOptimizationResults: calc.glassOptimizationResults,
                terms: terms || [],
                checklist: checklist || [],
                includeVat: includeVat !== undefined ? includeVat : true,
                distributeTransportCost: distributeTransportCost !== undefined ? distributeTransportCost : false,
                createdBy: req.user?._id
            });
            break;
        } catch (err) {
            if ((err.code === 11000 || err.message?.includes('duplicate')) && attempt < 4) {
                quoteNumber = await generateUniqueAluQuoteNumber();
                continue;
            }
            throw err;
        }
    }
    
    // Auto-create/integrate Lead into Sales Pipeline / Lead Follow-up Dashboard
    try {
        const { default: Inquiry } = await import('../models/Inquiry.js');
        const quoteVal = quotation.finalSellingPrice || quotation.calculatedSellingPrice || 0;
        const officerName = req.user ? (req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()) : 'Sales Officer';
        const followDate = quotation.validTill || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await Inquiry.create({
            customerName: customerName,
            companyName: customerName,
            contactPerson: customerName,
            projectLocation: location || projectName || 'Colombo',
            requirement: `Aluminium Works - ${projectName || 'Custom Openings'}`,
            inquirySource: 'Direct',
            source: 'Direct',
            quotationNo: quotation.quoteNumber,
            quotationValue: quoteVal,
            aluQuotations: [quotation._id],
            status: 'Quotation Sent',
            result: 'Pending',
            nextFollowUpDate: followDate,
            followUpDate: followDate,
            notes: `Aluminium Quotation #${quotation.quoteNumber} (${projectName || 'Custom Project'})`,
            followUpHistory: [{
                date: new Date(),
                salesOfficer: officerName,
                user: req.user?._id,
                note: `Aluminium Quotation #${quotation.quoteNumber} generated directly (Quoted Value: Rs. ${quoteVal.toLocaleString()})`,
                nextFollowUpDate: followDate
            }],
            createdBy: req.user?._id
        });
    } catch (inqErr) {
        console.warn('Failed to auto-create lead in pipeline:', inqErr.message);
    }

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

// Update existing quotation (draft = full edit; sent/accepted/follow_up/expired = status + metadata only)
export const updateAluQuotation = asyncHandler(async (req, res) => {
    const quotation = await AluQuotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }
    
    if (quotation.status === 'converted') {
        res.status(400);
        throw new Error('Converted quotations cannot be edited. Please create a revision instead.');
    }
    
    const {
        customerName,
        projectName,
        description,
        location,
        validTill,
        items,
        transportCost,
        totalLabourCost,
        otherCost,
        additionalCosts,
        profitMarginPercent,
        discount,
        manualAdjustment,
        terms,
        checklist,
        status,
        includeVat,
        distributeTransportCost
    } = req.body;

    // For non-draft quotations only allow status/metadata changes, not full recalculation
    const isDraft = quotation.status === 'draft' || quotation.status === 'follow_up';
    const itemsToProcess = (isDraft && items && items.length > 0) ? items : quotation.items;
    
    // Recalculate using merged snapshot and active rates
    const activeRates = await captureRatesSnapshot();
    const effectiveRates = (quotation.rateSnapshot && Object.keys(quotation.rateSnapshot.profiles || {}).length > 0)
        ? {
            ...activeRates,
            ...quotation.rateSnapshot,
            profiles: { ...(activeRates.profiles || {}), ...(quotation.rateSnapshot.profiles || {}) },
            glass: { ...(activeRates.glass || {}), ...(quotation.rateSnapshot.glass || {}) },
            accessories: { ...(activeRates.accessories || {}), ...(quotation.rateSnapshot.accessories || {}) },
            applications: { ...(activeRates.applications || {}), ...(quotation.rateSnapshot.applications || {}) }
        }
        : activeRates;

    const calc = await calculateQuotation(
        itemsToProcess,
        effectiveRates,
        Number(isDraft ? (transportCost ?? quotation.transportCost) : quotation.transportCost),
        isDraft ? (additionalCosts || quotation.additionalCosts || []) : (quotation.additionalCosts || []),
        Number(isDraft ? (profitMarginPercent ?? quotation.profitMarginPercent) : quotation.profitMarginPercent) || 20,
        Number(isDraft ? (totalLabourCost ?? quotation.totalLabourCost) : quotation.totalLabourCost) || 0,
        Number(isDraft ? (otherCost ?? quotation.otherCost) : quotation.otherCost) || 0
    );
    
    // Apply VAT if enabled
    let finalPrice = calc.calculatedSellingPrice - (discount || 0) + (manualAdjustment || 0);
    let vatAmount = 0;
    let finalPriceWithVat = finalPrice;
    
    if (includeVat) {
        vatAmount = finalPrice * 0.18; // 18% VAT
        finalPriceWithVat = finalPrice + vatAmount;
    }

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
    
    if (customerName !== undefined) quotation.customerName = customerName;
    if (projectName !== undefined) quotation.projectName = projectName;
    if (description !== undefined) quotation.description = description;
    if (location !== undefined) quotation.location = location;
    if (validTill) quotation.validTill = validTill;
    quotation.items = calc.items;
    quotation.totalAluminiumCost = calc.totalAluminiumCost;
    quotation.totalGlassCost = calc.totalGlassCost;
    quotation.totalAccessoriesCost = calc.totalAccessoriesCost;
    quotation.totalGasketCost = calc.totalGasketCost || 0;
    if (isDraft) {
        quotation.totalLabourCost = Number(totalLabourCost ?? calc.totalLabourCost);
        quotation.transportCost = Number(transportCost ?? 0);
        quotation.otherCost = Number(otherCost ?? 0);
        quotation.additionalCosts = additionalCosts || [];
        quotation.profitMarginPercent = Number(profitMarginPercent || 20);
    }
    quotation.subtotal = calc.subtotal;
    quotation.calculatedSellingPrice = calc.calculatedSellingPrice;
    quotation.discount = Number(discount ?? quotation.discount ?? 0);
    quotation.discountStatus = discountStatus;
    if (discountApprovedBy) quotation.discountApprovedBy = discountApprovedBy;
    quotation.manualAdjustment = Number(manualAdjustment || 0);
    quotation.finalSellingPrice = parseFloat(finalPrice.toFixed(2));
    quotation.vatAmount = parseFloat(vatAmount.toFixed(2));
    quotation.finalPriceWithVat = parseFloat(finalPriceWithVat.toFixed(2));
    if (status) {
        quotation.status = status;
        if (status === 'sent') {
            try {
                const { default: Inquiry } = await import('../models/Inquiry.js');
                await Inquiry.updateMany(
                    { companyName: quotation.customerName, status: 'Quotation Pending' },
                    { status: 'Quotation Sent' }
                );
            } catch (inqErr) {
                console.warn('Failed to update lead status to Quotation Sent:', inqErr.message);
            }
        }
    }
    quotation.rateSnapshot = effectiveRates;
    quotation.cuttingOptimizationResults = calc.cuttingOptimizationResults;
    quotation.glassOptimizationResults = calc.glassOptimizationResults;
    if (terms) quotation.terms = terms;
    if (checklist) quotation.checklist = checklist;
    if (includeVat !== undefined) quotation.includeVat = includeVat;
    if (distributeTransportCost !== undefined) quotation.distributeTransportCost = distributeTransportCost;
    
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
    // Preserve pre-calculated pricing from configurator if available
    const calc = await calculateQuotation(
        sourceQuote.items.map(item => ({
            applicationType: item.applicationType,
            configuration: item.configuration,
            width: item.width,
            height: item.height,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            profileCuts: item.profileCuts,
            glassItems: item.glassItems,
            accessories: item.accessories,
            gasketItems: item.gasketItems,
            totalGasketMeters: item.totalGasketMeters,
            aluminiumDiscountPercent: item.aluminiumDiscountPercent,
            profitMarginPercent: item.profitMarginPercent,
            costingSummary: item.costingSummary,
            labourCost: item.labourCost,
            totalAreaSqFt: item.totalAreaSqFt,
            trackSystem: item.trackSystem,
            topSection: item.topSection,
            panelArrangement: item.panelArrangement,
            description: item.description,
            profileSpec: item.profileSpec,
            glassSpec: item.glassSpec,
            hardwareSpec: item.hardwareSpec,
            gasketSpec: item.gasketSpec,
            scopeSpec: item.scopeSpec,
            sketchImage: item.sketchImage
        })),
        rates,
        sourceQuote.transportCost,
        sourceQuote.additionalCosts,
        sourceQuote.profitMarginPercent,
        sourceQuote.totalLabourCost
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
        totalGasketCost: calc.totalGasketCost || 0,
        totalLabourCost: calc.totalLabourCost,
        transportCost: sourceQuote.transportCost,
        additionalCosts: sourceQuote.additionalCosts,
        profitMarginPercent: sourceQuote.profitMarginPercent,
        subtotal: calc.subtotal,
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
        includeVat: sourceQuote.includeVat !== undefined ? sourceQuote.includeVat : true,
        distributeTransportCost: sourceQuote.distributeTransportCost !== undefined ? sourceQuote.distributeTransportCost : false,
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

// Duplicate quotation (creates an exact independent clone as a new quote number)
export const duplicateAluQuotation = asyncHandler(async (req, res) => {
    const sourceQuote = await AluQuotation.findById(req.params.id);
    if (!sourceQuote) {
        res.status(404);
        throw new Error('Source quotation not found');
    }

    let newQuoteNumber = await generateUniqueAluQuoteNumber();
    let duplicate;
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            duplicate = await AluQuotation.create({
                quoteNumber: newQuoteNumber,
                version: 0,
                revisionGroupCode: newQuoteNumber,
                isLatestRevision: true,
                customerName: sourceQuote.customerName,
                projectName: `${sourceQuote.projectName} (Copy)`,
                location: sourceQuote.location,
                date: new Date(),
                validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: sourceQuote.items,
                totalAluminiumCost: sourceQuote.totalAluminiumCost,
                totalGlassCost: sourceQuote.totalGlassCost,
                totalAccessoriesCost: sourceQuote.totalAccessoriesCost,
                totalLabourCost: sourceQuote.totalLabourCost,
                transportCost: sourceQuote.transportCost,
                additionalCosts: sourceQuote.additionalCosts,
                profitMarginPercent: sourceQuote.profitMarginPercent,
                subtotal: sourceQuote.subtotal,
                calculatedSellingPrice: sourceQuote.calculatedSellingPrice,
                discount: sourceQuote.discount,
                manualAdjustment: sourceQuote.manualAdjustment,
                finalSellingPrice: sourceQuote.finalSellingPrice,
                status: 'draft',
                rateSnapshot: sourceQuote.rateSnapshot,
                cuttingOptimizationResults: sourceQuote.cuttingOptimizationResults,
                glassOptimizationResults: sourceQuote.glassOptimizationResults,
                terms: sourceQuote.terms,
                checklist: sourceQuote.checklist,
                includeVat: sourceQuote.includeVat !== undefined ? sourceQuote.includeVat : true,
                distributeTransportCost: sourceQuote.distributeTransportCost !== undefined ? sourceQuote.distributeTransportCost : false,
                createdBy: req.user?._id
            });
            break;
        } catch (err) {
            if ((err.code === 11000 || err.message?.includes('duplicate')) && attempt < 4) {
                newQuoteNumber = await generateUniqueAluQuoteNumber();
                continue;
            }
            throw err;
        }
    }

    await createAuditLog({
        action: 'CREATE',
        module: 'CRM',
        documentId: duplicate._id,
        documentCode: duplicate.quoteNumber,
        description: `Duplicated aluminium quotation from ${sourceQuote.quoteNumber} to ${duplicate.quoteNumber}`,
        req
    });

    res.status(201).json({ success: true, data: duplicate });
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
    
    const items = quotation.items.map((item, idx) => ({
        lineNumber: idx + 1,
        productName: `${item.applicationType} (${item.configuration})`,
        description: item.description || `Size: ${item.width} x ${item.height} mm`,
        orderedQuantity: item.quantity,
        unitOfMeasure: 'Pcs',
        unitPrice: item.unitPrice,
        lineSubtotal: item.totalPrice,
        lineTotal: item.totalPrice,
        applicationType: item.applicationType,
        configuration: item.configuration,
        width: item.width,
        height: item.height,
        profileSpec: item.profileSpec,
        glassSpec: item.glassSpec,
        hardwareSpec: item.hardwareSpec,
        scopeSpec: item.scopeSpec,
        topSection: item.topSection,
        panelArrangement: item.panelArrangement,
        trackSystem: item.trackSystem,
        sketchImage: item.sketchImage,
        totalAreaSqFt: item.totalAreaSqFt || parseFloat(((item.width * item.height * (item.quantity || 1)) / 92903.04).toFixed(2)),
        labourRatePerSqFt: item.labourRatePerSqFt || 150,
        labourCost: item.labourCost || 0
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
    
    // Create the Sales Order with a unique order number
    const date = new Date();
    const prefix = `SO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existingSOs = await SalesOrder.find({ orderNumber: new RegExp(`^${prefix}`) }, { orderNumber: 1 }).lean();
    let maxSOSeq = 0;
    existingSOs.forEach(so => {
        const parts = so.orderNumber?.split('-');
        const seq = parseInt(parts?.[parts.length - 1], 10);
        if (!isNaN(seq) && seq > maxSOSeq) maxSOSeq = seq;
    });
    let nextSOSeq = maxSOSeq + 1;
    let orderNumber = `${prefix}-${String(nextSOSeq).padStart(4, '0')}`;
    while (await SalesOrder.exists({ orderNumber })) {
        nextSOSeq++;
        orderNumber = `${prefix}-${String(nextSOSeq).padStart(4, '0')}`;
    }
    
    // Calculate sales order total based on quotation subtotal (Final Selling Price from 2D Config)
    // Add transport cost, other cost, and additional costs separately
    const sumAdditional = (quotation.additionalCosts || []).reduce((sum, ac) => sum + ac.cost, 0);
    const orderTotalAmount = (quotation.subtotal - quotation.discount) + (quotation.transportCost || 0) + (quotation.otherCost || 0) + sumAdditional;
    
    const salesOrder = await SalesOrder.create({
        orderNumber,
        businessType: 'alueco',
        quotationId: quotation._id,
        projectName: quotation.projectName,
        customerId: customer._id,
        customerName: quotation.customerName,
        orderDate: date,
        deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        items,
        totalAmount: orderTotalAmount,
        discount: quotation.discount,
        tax: quotation.vatAmount || 0,
        grandTotal: orderTotalAmount + (quotation.vatAmount || 0),
        status: 'pending',
        notes: `Converted from Aluminium Quotation: ${quotation.quoteNumber} (Rev ${quotation.version}). Project: ${quotation.projectName}`,
        createdBy: req.user._id
    });

    // Automatically create Invoice for this Sales Order
    const { default: Invoice } = await import('../models/Invoice.js');
    const invoiceItems = quotation.items.map((item, idx) => ({
        lineNumber: idx + 1,
        productName: `${item.applicationType} (${item.configuration})`,
        description: item.description || `Size: ${item.width} x ${item.height} mm`,
        quantity: item.quantity,
        unitOfMeasure: 'Pcs',
        unitPrice: item.unitPrice,
        discountPercent: 0,
        taxRate: 0,
        taxable: false,
        lineSubtotal: item.totalPrice,
        lineTotal: item.totalPrice,
        applicationType: item.applicationType,
        configuration: item.configuration,
        width: item.width,
        height: item.height,
        profileSpec: item.profileSpec,
        glassSpec: item.glassSpec,
        hardwareSpec: item.hardwareSpec,
        scopeSpec: item.scopeSpec,
        topSection: item.topSection,
        panelArrangement: item.panelArrangement,
        trackSystem: item.trackSystem,
        sketchImage: item.sketchImage,
        totalAreaSqFt: item.totalAreaSqFt || parseFloat(((item.width * item.height * (item.quantity || 1)) / 92903.04).toFixed(2)),
        labourRatePerSqFt: item.labourRatePerSqFt || 150,
        labourCost: item.labourCost || 0
    }));

    // Calculate invoice subtotal as the Final Selling Price from 2D Configuration
    // This is quotation.subtotal (which equals the configurator's Final Selling Price)
    const invoiceSubtotal = quotation.subtotal - quotation.discount;
    
    // Add transport cost, other cost, and additional costs separately
    const invoiceGrandTotal = invoiceSubtotal + (quotation.transportCost || 0) + (quotation.otherCost || 0) + sumAdditional;
    
    const invoice = await Invoice.create({
        businessType: 'alueco',
        customerId: customer._id,
        customerName: customer.displayName || quotation.customerName,
        customerSnapshot: {
            name: customer.displayName || quotation.customerName,
            code: customer.customerCode,
            taxRegistrationNumber: customer.taxRegistrationNumber,
            contactName: customer.primaryContact?.name,
        },
        billingAddress: customer.billingAddress,
        salesOrderIds: [salesOrder._id],
        salesOrderNumbers: [salesOrder.orderNumber],
        invoiceType: 'standard',
        invoiceDate: date,
        items: invoiceItems,
        subtotal: invoiceSubtotal,
        totalDiscount: quotation.discount,
        totalTax: quotation.vatAmount || 0,
        shippingCost: quotation.transportCost || 0,
        otherCharges: (quotation.otherCost || 0) + sumAdditional,
        grandTotal: invoiceGrandTotal + (quotation.vatAmount || 0),
        amountPaid: 0,
        balanceDue: invoiceGrandTotal + (quotation.vatAmount || 0),
        paymentStatus: 'unpaid',
        status: 'approved',
        notes: `Auto-generated Invoice for Sales Order ${salesOrder.orderNumber} (Quotation ${quotation.quoteNumber})`,
        createdBy: req.user._id
    });

    // Link Invoice to Sales Order & update status
    salesOrder.invoiceId = invoice._id;
    salesOrder.status = 'invoiced';
    await salesOrder.save();
    
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
        cuttingQty: item.quantity, // Start all items in cutting stage
        assemblyQty: 0,
        glazingQty: 0,
        qaQty: 0,
        readyQty: 0,
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

    // Resolve warehouse for stock reservation
    let warehouse = await Warehouse.findOne({ isDefault: true, deletedAt: null }) || await Warehouse.findOne({ deletedAt: null });
    const whId = warehouse?._id;

    // Check stock for all required materials, reserve available raw materials for the project, and auto-generate AluEco PO for shortages
    // NOTE: Stock is reserved but NOT auto-issued to production. User will manually issue later via "Issue to Production" button
    let aluPurchaseOrder = null;
    const { reserveStockForProject, checkStockAndShortages } = await import('../services/bomExplosionService.js');
    const reservationResult = await reserveStockForProject(salesOrder._id, whId, req.user._id);
    const reservedItems = reservationResult.reservations || [];
    const shortageItemsRaw = reservationResult.shortages || [];

    // Re-check stock after reservation to ensure accurate shortage calculation
    // This prevents PO creation for items that actually have stock
    const recheckResult = await checkStockAndShortages(salesOrder._id, whId);
    const finalShortages = recheckResult.items.filter(i => i.shortage > 0);

    const shortageItems = finalShortages.map(s => ({
        itemCode: s.itemCode,
        materialType: s.type || 'profile',
        productName: s.name,
        productId: s.productId,
        requiredQuantity: s.shortage,
        receivedQuantity: 0,
        pendingQuantity: s.shortage,
        unitOfMeasure: s.unitOfMeasure,
        estimatedUnitCost: s.unitCost || 0,
        estimatedTotalCost: +(s.shortage * (s.unitCost || 0)).toFixed(2),
        supplierId: null,
        status: 'pending',
        notes: `Shortage for Project ${quotation.projectName} (${s.requiredQty} ${s.unitOfMeasure} needed, ${s.availableStock} in stock)`
    }));

    if (shortageItems.length > 0) {
        aluPurchaseOrder = await AluPurchaseOrder.create({
            sourceType: 'quotation_shortage',
            quotationId: quotation._id,
            salesOrderId: salesOrder._id,
            projectName: quotation.projectName,
            customerName: quotation.customerName,
            items: shortageItems,
            status: 'pending',
            priority: 'high',
            notes: `Auto-generated material shortage PO for Project: ${quotation.projectName} (${salesOrder.orderNumber})`,
            createdBy: req.user._id
        });
    }

    await createAuditLog({
        action: 'CREATE',
        module: 'CRM',
        documentId: salesOrder._id,
        documentCode: salesOrder.orderNumber,
        description: `Converted aluminium quotation ${quotation.quoteNumber} to Sales Order ${salesOrder.orderNumber} & generated Job Card ${jobCardNumber}${aluPurchaseOrder ? ` and AluEco PO ${aluPurchaseOrder.poNumber}` : ''}. Reserved ${reservedItems.length} raw material items in stock. Materials will be issued to production manually when PO items are received.`,
        req
    });

    res.status(201).json({
        success: true,
        data: {
            salesOrder,
            invoice,
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            jobCardNumber,
            reservedItemCount: reservedItems.length,
            reservedItems,
            aluPurchaseOrder: aluPurchaseOrder ? {
                _id: aluPurchaseOrder._id,
                poNumber: aluPurchaseOrder.poNumber,
                shortageItemCount: shortageItems.length,
                totalEstimatedCost: aluPurchaseOrder.totalEstimatedCost
            } : null
        }
    });
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

// Recalculate quotation with latest rates and logic
export const recalculateAluQuotation = asyncHandler(async (req, res) => {
    const quotation = await AluQuotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    // Fetch latest active rates
    const rates = await captureRatesSnapshot();

    // Recalculate using the quotation items
    const calc = await calculateQuotation(
        quotation.items.map(item => ({
            applicationType: item.applicationType,
            configuration: item.configuration,
            width: item.width,
            height: item.height,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            profileCuts: item.profileCuts,
            glassItems: item.glassItems,
            accessories: item.accessories,
            gasketItems: item.gasketItems,
            totalGasketMeters: item.totalGasketMeters,
            aluminiumDiscountPercent: item.aluminiumDiscountPercent,
            profitMarginPercent: item.profitMarginPercent,
            costingSummary: item.costingSummary,
            labourCost: item.labourCost,
            totalAreaSqFt: item.totalAreaSqFt,
            trackSystem: item.trackSystem,
            topSection: item.topSection,
            panelArrangement: item.panelArrangement,
            description: item.description,
            profileSpec: item.profileSpec,
            glassSpec: item.glassSpec,
            hardwareSpec: item.hardwareSpec,
            gasketSpec: item.gasketSpec,
            scopeSpec: item.scopeSpec,
            sketchImage: item.sketchImage
        })),
        rates,
        quotation.transportCost,
        quotation.additionalCosts,
        quotation.profitMarginPercent,
        quotation.totalLabourCost,
        quotation.otherCost
    );

    // Update quotation with recalculated values
    quotation.items = calc.items;
    quotation.totalAluminiumCost = calc.totalAluminiumCost;
    quotation.totalGlassCost = calc.totalGlassCost;
    quotation.totalAccessoriesCost = calc.totalAccessoriesCost;
    quotation.totalGasketCost = calc.totalGasketCost || 0;
    quotation.totalLabourCost = calc.totalLabourCost;
    quotation.subtotal = calc.subtotal;
    quotation.calculatedSellingPrice = calc.calculatedSellingPrice;
    quotation.cuttingOptimizationResults = calc.cuttingOptimizationResults;
    quotation.glassOptimizationResults = calc.glassOptimizationResults;
    quotation.rateSnapshot = rates;

    // Recalculate final price with discount and manual adjustment
    const finalPrice = calc.calculatedSellingPrice - quotation.discount + quotation.manualAdjustment;
    quotation.finalSellingPrice = parseFloat(finalPrice.toFixed(2));

    // Recalculate VAT if enabled
    if (quotation.includeVat) {
        quotation.vatAmount = parseFloat((quotation.finalSellingPrice * 0.18).toFixed(2));
        quotation.finalPriceWithVat = parseFloat((quotation.finalSellingPrice + quotation.vatAmount).toFixed(2));
    } else {
        quotation.vatAmount = 0;
        quotation.finalPriceWithVat = quotation.finalSellingPrice;
    }

    await quotation.save();

    await createAuditLog({
        action: 'UPDATE',
        module: 'CRM',
        documentId: quotation._id,
        documentCode: quotation.quoteNumber,
        description: `Recalculated quotation ${quotation.quoteNumber} with latest rates and logic`,
        req
    });

    res.json({ success: true, data: quotation });
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
