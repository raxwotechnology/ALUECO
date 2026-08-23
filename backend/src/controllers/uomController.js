import asyncHandler from 'express-async-handler';
import UnitOfMeasure from '../models/UnitOfMeasure.js';

export const createUom = asyncHandler(async (req, res) => {
    const uom = await UnitOfMeasure.create(req.body);
    res.status(201).json({ success: true, data: uom });
});

const DEFAULT_UOMS_DATA = [
    { name: 'Piece', symbol: 'pc', type: 'count' },
    { name: 'Pieces', symbol: 'pcs', type: 'count' },
    { name: 'Bar (Extrusion)', symbol: 'bar', type: 'length' },
    { name: 'Meter', symbol: 'm', type: 'length' },
    { name: 'Foot', symbol: 'ft', type: 'length' },
    { name: 'Square Meter', symbol: 'sqm', type: 'area' },
    { name: 'Square Feet', symbol: 'sqft', type: 'area' },
    { name: 'Kilogram', symbol: 'kg', type: 'weight' },
    { name: 'Gram', symbol: 'g', type: 'weight' },
    { name: 'Box', symbol: 'box', type: 'count' },
    { name: 'Carton', symbol: 'ctn', type: 'count' },
    { name: 'Bundle', symbol: 'bundle', type: 'count' },
    { name: 'Roll', symbol: 'roll', type: 'count' },
    { name: 'Set', symbol: 'set', type: 'count' },
    { name: 'Pair', symbol: 'pr', type: 'count' },
    { name: 'Pack', symbol: 'pack', type: 'count' },
    { name: 'Sheet', symbol: 'sheet', type: 'count' },
    { name: 'Liter', symbol: 'L', type: 'volume' },
    { name: 'Milliliter', symbol: 'ml', type: 'volume' },
    { name: 'Hour', symbol: 'hr', type: 'time' },
];

export const getUoms = asyncHandler(async (req, res) => {
    const { type, isActive } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const count = await UnitOfMeasure.countDocuments();
    if (count === 0) {
        try {
            await UnitOfMeasure.insertMany(DEFAULT_UOMS_DATA, { ordered: false });
        } catch (e) {
            // Ignore duplicate key errors if race condition
        }
    }

    const uoms = await UnitOfMeasure.find(filter).sort({ type: 1, name: 1 });
    res.json({ success: true, count: uoms.length, data: uoms });
});

export const updateUom = asyncHandler(async (req, res) => {
    const uom = await UnitOfMeasure.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!uom) {
        res.status(404);
        throw new Error('UOM not found');
    }
    res.json({ success: true, data: uom });
});

export const deleteUom = asyncHandler(async (req, res) => {
    const uom = await UnitOfMeasure.findByIdAndDelete(req.params.id);
    if (!uom) {
        res.status(404);
        throw new Error('UOM not found');
    }
    res.json({ success: true, message: 'UOM deleted' });
});