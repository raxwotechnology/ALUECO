import ConversionRule from '../models/ConversionRule.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Calculate expected yield for a batch and validate against tolerance
 */
export const validateYield = async (batch) => {
    try {
        // Find rule for this transformation
        const rule = await ConversionRule.findOne({
            sourceProduct: batch.rawMaterialId,
            outputProduct: batch.outputProductId,
            isActive: true
        });

        if (!rule) return null;

        const expectedYield = batch.inputWeight * rule.expectedRatio;
        const actualRatio = batch.actualYieldWeight / batch.inputWeight;
        
        // Check for significant deviation
        const deviationPercent = Math.abs((actualRatio - rule.expectedRatio) / rule.expectedRatio) * 100;
        
        const result = {
            expectedYield,
            actualYield: batch.actualYieldWeight,
            deviationPercent,
            withinTolerance: deviationPercent <= rule.tolerancePercent
        };

        // Alert managers if yield is outside tolerance
        if (!result.withinTolerance) {
            createNotification({
                recipient: batch.createdBy,
                type: 'notification:low_yield',
                title: 'Low Production Yield',
                message: `Batch ${batch.batchNumber} has a yield deviation of ${deviationPercent.toFixed(1)}%, which exceeds tolerance.`,
                link: `/manufacturing/batches/${batch._id}`
            });
        }

        // Update historical tracking in rule
        rule.historicalRatios.push({
            batchId: batch._id,
            actualRatio
        });
        
        // Simple moving average update (last 10 batches)
        const last10 = rule.historicalRatios.slice(-10);
        rule.movingAverage = last10.reduce((acc, r) => acc + r.actualRatio, 0) / last10.length;
        
        await rule.save();

        return result;
    } catch (error) {
        console.error('Yield validation failed:', error);
        return null;
    }
};
