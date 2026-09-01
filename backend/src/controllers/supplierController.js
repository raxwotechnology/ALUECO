import asyncHandler from 'express-async-handler';
import Supplier from '../models/Supplier.js';

export const createSupplier = asyncHandler(async (req, res) => {
    const payload = { ...req.body, createdBy: req.user._id };
    const supplier = await Supplier.create(payload);
    res.status(201).json({ success: true, data: supplier });
});

export const getSuppliers = asyncHandler(async (req, res) => {
    const {
        search, category, status,
        page = 1, limit = 20,
        sortBy = 'createdAt', sortOrder = 'desc',
    } = req.query;

    const filter = {};

    if (search) {
        filter.$or = [
            { displayName: { $regex: search, $options: 'i' } },
            { companyName: { $regex: search, $options: 'i' } },
            { supplierCode: { $regex: search, $options: 'i' } },
            { 'primaryContact.phone': { $regex: search, $options: 'i' } },
        ];
    }
    if (category) filter.category = category;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [suppliers, total] = await Promise.all([
        Supplier.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
        Supplier.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: suppliers.length,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        data: suppliers,
    });
});

export const getSupplierById = asyncHandler(async (req, res) => {
    const supplier = await Supplier.findById(req.params.id)
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName');
    if (!supplier) { res.status(404); throw new Error('Supplier not found'); }
    res.json({ success: true, data: supplier });
});

export const updateSupplier = asyncHandler(async (req, res) => {
    const supplier = await Supplier.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user._id },
        { new: true, runValidators: true }
    );
    if (!supplier) { res.status(404); throw new Error('Supplier not found'); }
    res.json({ success: true, data: supplier });
});

export const deleteSupplier = asyncHandler(async (req, res) => {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) { res.status(404); throw new Error('Supplier not found'); }
    supplier.deletedAt = new Date();
    supplier.status = 'inactive';
    await supplier.save();
    res.json({ success: true, message: 'Supplier deleted' });
});

export const getSupplierAgeingReport = asyncHandler(async (req, res) => {
    const Bill = (await import('../models/Bill.js')).default;
    const suppliers = await Supplier.find({ status: 'active' });
    const bills = await Bill.find({ 
        paymentStatus: { $in: ['unpaid', 'partially_paid'] },
        status: 'approved' 
    });

    const report = suppliers.map(supplier => {
        const supplierBills = bills.filter(b => b.supplierId && b.supplierId.toString() === supplier._id.toString());
        
        let current = 0;
        let aged1to30 = 0;
        let aged31to60 = 0;
        let aged61to90 = 0;
        let agedOver90 = 0;
        let totalOutstanding = 0;

        const now = new Date();

        supplierBills.forEach(bill => {
            const outstanding = bill.balanceDue;
            totalOutstanding += outstanding;

            const dueTime = new Date(bill.dueDate).getTime();
            const nowTime = now.getTime();
            const diffDays = Math.ceil((nowTime - dueTime) / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                current += outstanding;
            } else if (diffDays <= 30) {
                aged1to30 += outstanding;
            } else if (diffDays <= 60) {
                aged31to60 += outstanding;
            } else if (diffDays <= 90) {
                aged61to90 += outstanding;
            } else {
                agedOver90 += outstanding;
            }
        });

        return {
            supplierId: supplier._id,
            supplierCode: supplier.supplierCode,
            companyName: supplier.companyName,
            displayName: supplier.displayName,
            creditDays: supplier.paymentTerms?.creditDays || 30,
            creditLimit: supplier.paymentTerms?.creditLimit || 0,
            current: parseFloat(current.toFixed(2)),
            aged1to30: parseFloat(aged1to30.toFixed(2)),
            aged31to60: parseFloat(aged31to60.toFixed(2)),
            aged61to90: parseFloat(aged61to90.toFixed(2)),
            agedOver90: parseFloat(agedOver90.toFixed(2)),
            totalOutstanding: parseFloat(totalOutstanding.toFixed(2))
        };
    }).filter(r => r.totalOutstanding > 0);

    res.json({ success: true, data: report });
});