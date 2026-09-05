import asyncHandler from 'express-async-handler';
import CustomerGroup from '../models/CustomerGroup.js';

export const createCustomerGroup = asyncHandler(async (req, res) => {
    const group = await CustomerGroup.create(req.body);
    res.status(201).json({ success: true, data: group });
});

export const getCustomerGroups = asyncHandler(async (req, res) => {
    const { search, isActive } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const groups = await CustomerGroup.find(filter).sort({ priority: -1, name: 1 });
    res.json({ success: true, count: groups.length, data: groups });
});

export const getCustomerGroupById = asyncHandler(async (req, res) => {
    const group = await CustomerGroup.findById(req.params.id);
    if (!group) { res.status(404); throw new Error('Customer group not found'); }
    res.json({ success: true, data: group });
});

export const updateCustomerGroup = asyncHandler(async (req, res) => {
    const group = await CustomerGroup.findByIdAndUpdate(req.params.id, req.body, {
        new: true, runValidators: true,
    });
    if (!group) { res.status(404); throw new Error('Customer group not found'); }
    res.json({ success: true, data: group });
});

export const deleteCustomerGroup = asyncHandler(async (req, res) => {
    const group = await CustomerGroup.findById(req.params.id);
    if (!group) { res.status(404); throw new Error('Customer group not found'); }
    group.deletedAt = new Date();
    group.isActive = false;
    await group.save();
    res.json({ success: true, message: 'Customer group deleted' });
});