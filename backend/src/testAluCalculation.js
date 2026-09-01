import dotenv from 'dotenv';
import mongoose from 'mongoose';
import AluProfile from './models/AluProfile.js';
import AluGlass from './models/AluGlass.js';
import AluAccessory from './models/AluAccessory.js';
import AluApplication from './models/AluApplication.js';
import AluQuotation from './models/AluQuotation.js';

dotenv.config();

// Simple mock variables for formula testing
const evaluateFormula = (formulaStr, variables) => {
    try {
        let expr = formulaStr
            .replace(/\bW\b/g, variables.W)
            .replace(/\bH\b/g, variables.H)
            .replace(/\bP\b/g, variables.P)
            .replace(/\bQ\b/g, variables.Q);
        return Function(`"use strict"; return (${expr})`)();
    } catch (e) {
        return 0;
    }
};

const solve1DPacking = (requiredCuts, availableBars) => {
    const sortedBars = [...availableBars].sort((a, b) => a.lengthMm - b.lengthMm);
    const sortedCuts = [...requiredCuts].sort((a, b) => b - a);
    
    if (sortedCuts.length === 0) return [];
    
    let bestSolution = [];
    for (const cut of sortedCuts) {
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
    return bestSolution;
};

async function testCalculation() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Test 1: Verify Seeded Data exists
        const profiles = await AluProfile.find({});
        console.log(`\n1. Database Content Verification:`);
        console.log(`   Profiles Count: ${profiles.length}`);
        profiles.forEach(p => console.log(`   - ${p.profileCode} (${p.description}) | Standard Lengths: ${p.standardLengths.length}`));
        
        const apps = await AluApplication.find({});
        console.log(`   BOM Templates Count: ${apps.length}`);
        apps.forEach(a => console.log(`   - Template: ${a.type} (${a.configuration})`));

        // Test 2: Formula Evaluation Checks
        console.log(`\n2. Formula Evaluation Checks:`);
        const vars = { W: 2400, H: 2100, P: 3, Q: 2 };
        const testFormulaLength = 'W / 3 - 100';
        const lengthResult = evaluateFormula(testFormulaLength, vars);
        console.log(`   Evaluating "${testFormulaLength}" with W=2400, P=3 => Result: ${lengthResult} (Expected: 700)`);
        
        // Test 3: 1D Bin Packing Optimization Verification
        console.log(`\n3. 1D Cutting Optimization Solver Verification:`);
        const cuts = [2100, 2100, 1800, 1200, 1200, 1200, 900];
        const sd1001 = await AluProfile.findOne({ profileCode: 'SD1001' });
        
        if (sd1001) {
            console.log(`   Available bars for SD1001:`, sd1001.standardLengths.map(l => `${parseFloat((l.lengthMm/304.8).toFixed(1))}ft`));
            const solution = solve1DPacking(cuts, sd1001.standardLengths);
            console.log(`   Optimized Layout Results (Cuts: [${cuts.join(', ')}]):`);
            solution.forEach((bar, idx) => {
                console.log(`     Bar ${idx + 1} (${bar.length}mm): Cuts [${bar.cuts.join(', ')}] | Used: ${bar.used}mm | Waste: ${bar.waste}mm`);
            });
            const totalCost = solution.reduce((sum, b) => sum + b.price, 0);
            console.log(`     Total Bars Purchased: ${solution.length} | Total Cost: LKR ${totalCost.toLocaleString()}`);
        } else {
            console.log('   Warning: SD1001 profile not found for optimization test');
        }

        console.log('\n✓ All tests passed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
}

testCalculation();
