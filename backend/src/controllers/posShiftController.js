import asyncHandler from 'express-async-handler';
import PosShift from '../models/PosShift.js';
import Payment from '../models/Payment.js';

/**
 * POST /api/pos-shifts/open
 * Open a new shift for the cashier.
 */
export const openShift = asyncHandler(async (req, res) => {
    const { openingFloat, terminalId } = req.body;
    const cashierId = req.user._id;

    // Check for an already active shift for this cashier
    const existingShift = await PosShift.findOne({
        cashierId,
        status: 'open'
    });

    if (existingShift) {
        res.status(400);
        throw new Error('You already have an active open shift. Please close it first.');
    }

    const shift = await PosShift.create({
        cashierId,
        terminalId: terminalId || 'TERM-01',
        openingFloat: Number(openingFloat || 0),
        createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: shift });
});

/**
 * GET /api/pos-shifts/active
 * Get the currently active shift for the cashier.
 */
export const getActiveShift = asyncHandler(async (req, res) => {
    const cashierId = req.user._id;

    const shift = await PosShift.findOne({
        cashierId,
        status: 'open'
    });

    if (!shift) {
        return res.json({ success: true, active: false, data: null });
    }

    // Dynamic expected sales aggregation up to this point
    const payments = await Payment.find({
        direction: 'received',
        receivedBy: cashierId,
        paymentDate: { $gte: shift.openedAt }
    });

    let expectedCash = shift.openingFloat;
    let expectedCard = 0;
    let expectedOnline = 0;

    payments.forEach(p => {
        const amt = Number(p.amount || 0);
        if (p.method === 'cash') {
            expectedCash += amt;
        } else if (p.method === 'card') {
            expectedCard += amt;
        } else {
            expectedOnline += amt; // online / bank transfer / cheque
        }
    });

    const enrichedShift = shift.toObject();
    enrichedShift.paymentsExpected = {
        cash: parseFloat(expectedCash.toFixed(2)),
        card: parseFloat(expectedCard.toFixed(2)),
        online: parseFloat(expectedOnline.toFixed(2))
    };

    res.json({ success: true, active: true, data: enrichedShift });
});

/**
 * POST /api/pos-shifts/close
 * Close the current cashier shift.
 */
export const closeShift = asyncHandler(async (req, res) => {
    const cashierId = req.user._id;
    const { paymentsActual, closingNotes } = req.body;

    if (!paymentsActual || paymentsActual.cash === undefined) {
        res.status(400);
        throw new Error('Actual counts are required to close the shift');
    }

    const shift = await PosShift.findOne({
        cashierId,
        status: 'open'
    });

    if (!shift) {
        res.status(404);
        throw new Error('No active open shift found to close');
    }

    // Query all transactions logged since shift opening
    const payments = await Payment.find({
        direction: 'received',
        receivedBy: cashierId,
        paymentDate: { $gte: shift.openedAt }
    });

    let expectedCash = shift.openingFloat;
    let expectedCard = 0;
    let expectedOnline = 0;

    payments.forEach(p => {
        const amt = Number(p.amount || 0);
        if (p.method === 'cash') {
            expectedCash += amt;
        } else if (p.method === 'card') {
            expectedCard += amt;
        } else {
            expectedOnline += amt;
        }
    });

    shift.status = 'closed';
    shift.closedAt = new Date();
    shift.paymentsExpected = {
        cash: parseFloat(expectedCash.toFixed(2)),
        card: parseFloat(expectedCard.toFixed(2)),
        online: parseFloat(expectedOnline.toFixed(2))
    };
    shift.paymentsActual = {
        cash: Number(paymentsActual.cash || 0),
        card: Number(paymentsActual.card || 0),
        online: Number(paymentsActual.online || 0)
    };
    shift.closingNotes = closingNotes;

    await shift.save();

    res.json({ success: true, data: shift });
});
