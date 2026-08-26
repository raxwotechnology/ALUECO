/**
 * Safe and versatile formula evaluator for Aluminium Profile, Glass, and Accessory calculations.
 * Supports:
 * - Standard parentheses ( ) and square brackets [ ] (e.g. [W - (70 x 4)] / 2)
 * - Multiplication with *, x, or X (e.g. 70 x 4, 2xW, 4*P)
 * - Case-insensitive variables W (width), H (height), P (panels), Q (quantity)
 * - Implicit multiplication (e.g. 2W, 4P, 2(W+H))
 */
export const evaluateFormula = (formulaStr, variables = {}) => {
    if (!formulaStr || typeof formulaStr !== 'string') return 0;

    try {
        const W = Number(variables.W ?? variables.w ?? 0);
        const H = Number(variables.H ?? variables.h ?? 0);
        const P = Number(variables.P ?? variables.p ?? 1);
        const Q = Number(variables.Q ?? variables.q ?? 1);

        let expr = formulaStr.trim();

        // 1. Replace square brackets [ ] with standard parentheses ( )
        expr = expr.replace(/\[/g, '(').replace(/\]/g, ')');

        // 2. Replace 'x' or 'X' multiplication when between numbers, variables, or brackets
        // e.g. "70 x 4" -> "70 * 4", ") x (" -> ") * (", "2 x W" -> "2 * W"
        expr = expr.replace(/(\d+|\b[whpqWHPQ]\b|\))\s*[xX]\s*(\d+|\b[whpqWHPQ]\b|\()/g, '$1 * $2');

        // 3. Handle implicit multiplication like "2W", "4P", "2(W+H)", "(W)(H)"
        expr = expr.replace(/(\d+)\s*([whpqWHPQ])/gi, '$1 * $2');
        expr = expr.replace(/(\d+)\s*\(/g, '$1 * (');
        expr = expr.replace(/\)\s*\(/g, ') * (');
        expr = expr.replace(/\)\s*(\d+|[whpqWHPQ])/gi, ') * $1');

        // 4. Substitute variables (case-insensitive word boundary check)
        expr = expr.replace(/\bW\b/gi, W);
        expr = expr.replace(/\bH\b/gi, H);
        expr = expr.replace(/\bP\b/gi, P);
        expr = expr.replace(/\bQ\b/gi, Q);

        // 5. Check if remaining string contains only valid math characters: numbers, decimals, +, -, *, /, %, (, ), spaces
        const safeMathRegex = /^[0-9+\-*/().\s%]+$/;
        if (!safeMathRegex.test(expr)) {
            console.warn(`[evaluateFormula] Invalid characters in expression: "${expr}" (original: "${formulaStr}")`);
            return 0;
        }

        // 6. Safe evaluate
        const val = Function(`"use strict"; return (${expr})`)();
        if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
            return 0;
        }
        return Number(val);
    } catch (err) {
        console.error(`[evaluateFormula] Error evaluating formula "${formulaStr}":`, err.message);
        return 0;
    }
};
