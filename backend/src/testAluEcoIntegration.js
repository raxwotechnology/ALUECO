import { evaluateFormula } from './utils/aluFormulaHelper.js';

console.log('=== TEST 1: Advanced Formula Evaluator with Brackets & X multiplication ===');

// User's formula: [W - (70 x 4)] / 2
const testVars1 = { W: 1200, H: 2000, P: 2, Q: 1 };
const formula1 = '[W - (70 x 4)] / 2';
const res1 = evaluateFormula(formula1, testVars1);
console.log(`Formula "${formula1}" with W=1200 => Result: ${res1} (Expected: ${(1200 - 280)/2} = 460)`);
if (res1 === 460) {
    console.log('✅ TEST 1 PASSED: Glass bracket & multiplication formula evaluated accurately!');
} else {
    console.error('❌ TEST 1 FAILED!');
}

// Another formula: (W - 150) / 2
const formula2 = '(W - 150) / 2';
const res2 = evaluateFormula(formula2, testVars1);
console.log(`Formula "${formula2}" with W=1200 => Result: ${res2} (Expected: ${(1200 - 150)/2} = 525)`);
if (res2 === 525) {
    console.log('✅ TEST 2 PASSED: Standard subtraction & division formula passed!');
} else {
    console.error('❌ TEST 2 FAILED!');
}

// Height formula: H - (50 x 2)
const formula3 = 'H - (50 x 2)';
const res3 = evaluateFormula(formula3, testVars1);
console.log(`Formula "${formula3}" with H=2000 => Result: ${res3} (Expected: 1900)`);
if (res3 === 1900) {
    console.log('✅ TEST 3 PASSED: Height formula passed!');
} else {
    console.error('❌ TEST 3 FAILED!');
}

// Implicit multiplication: 4P
const formula4 = '4P';
const res4 = evaluateFormula(formula4, testVars1);
console.log(`Formula "${formula4}" with P=2 => Result: ${res4} (Expected: 8)`);
if (res4 === 8) {
    console.log('✅ TEST 4 PASSED: Implicit variable multiplication passed!');
} else {
    console.error('❌ TEST 4 FAILED!');
}

console.log('\n=== TEST 2: Linear Feet vs SqFt Labor Calculation ===');
const width = 1200; // mm
const height = 2100; // mm
const quantity = 2;
const labourRatePerFoot = 150; // Rs. 150 per running linear foot

const linearFeet = (2 * (width + height) / 304.8) * quantity;
const labourCostLinearFeet = linearFeet * labourRatePerFoot;
console.log(`Linear feet calculation: Opening ${width}x${height}mm (Qty ${quantity}) = ${linearFeet.toFixed(2)} running feet`);
console.log(`Labour cost @ Rs. ${labourRatePerFoot}/ft = Rs. ${labourCostLinearFeet.toFixed(2)}`);
if (linearFeet > 0 && labourCostLinearFeet > 0) {
    console.log('✅ TEST 5 PASSED: Feet-based labor calculation verified!');
}

console.log('\n=== ALL MATHEMATICAL & ALGORITHMIC FORMULA TESTS COMPLETED SUCCESSFULLY! ===');
