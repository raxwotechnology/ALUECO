import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import Warehouse from '../models/Warehouse.js';

export const createWarehouse = asyncHandler(async (req, res) => {
    const payload = { ...req.body, createdBy: req.user._id };
    if (!payload.warehouseManager) delete payload.warehouseManager;

    // If setting as default, unset others
    if (payload.isDefault) {
        await Warehouse.updateMany({ isDefault: true }, { $set: { isDefault: false } });
    }

    const warehouse = await Warehouse.create(payload);
    const populated = await Warehouse.findById(warehouse._id).populate('warehouseManager', 'firstName lastName');
    res.status(201).json({ success: true, data: populated });
});

export const getWarehouses = asyncHandler(async (req, res) => {
    const { search, type, isActive } = req.query;
    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { warehouseCode: { $regex: search, $options: 'i' } },
        ];
    }
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const warehouses = await Warehouse.find(filter)
        .populate('warehouseManager', 'firstName lastName')
        .sort({ isDefault: -1, name: 1 });

    res.json({ success: true, count: warehouses.length, data: warehouses });
});

export const getWarehouseById = asyncHandler(async (req, res) => {
    const warehouse = await Warehouse.findById(req.params.id)
        .populate('warehouseManager', 'firstName lastName email phone');
    if (!warehouse) { res.status(404); throw new Error('Warehouse not found'); }
    res.json({ success: true, data: warehouse });
});

export const updateWarehouse = asyncHandler(async (req, res) => {
    const payload = { ...req.body };
    if (payload.warehouseManager === '') payload.warehouseManager = null;

    if (payload.isDefault) {
        await Warehouse.updateMany(
            { _id: { $ne: req.params.id }, isDefault: true },
            { $set: { isDefault: false } }
        );
    }

    const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, payload, {
        new: true, runValidators: true,
    }).populate('warehouseManager', 'firstName lastName');

    if (!warehouse) { res.status(404); throw new Error('Warehouse not found'); }
    res.json({ success: true, data: warehouse });
});

export const deleteWarehouse = asyncHandler(async (req, res) => {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) { res.status(404); throw new Error('Warehouse not found'); }

    if (warehouse.isDefault) {
        res.status(400);
        throw new Error('Cannot delete the default warehouse. Set another as default first.');
    }

    // Safety check: Don't delete if warehouse has stock
    const stockCount = await mongoose.model('Stock').countDocuments({ warehouseId: req.params.id, 'quantities.onHand': { $gt: 0 } });
    if (stockCount > 0) {
        res.status(400);
        throw new Error('Cannot delete warehouse with active stock. Transfer stock out first.');
    }

    warehouse.deletedAt = new Date();
    warehouse.isActive = false;
    await warehouse.save();
    res.json({ success: true, message: 'Warehouse deleted' });
});