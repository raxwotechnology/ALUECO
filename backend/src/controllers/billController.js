import asyncHandler from 'express-async-handler';
import Bill from '../models/Bill.js';
import Supplier from '../models/Supplier.js';
import GoodsReceiptNote from '../models/GoodsReceiptNote.js';

export const createBill = asyncHandler(async (req, res) => {
    const { supplierId, items, dueDate, ...rest } = req.body;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) { res.status(404); throw new Error('Supplier not found'); }

    let finalDueDate = dueDate;
    if (!finalDueDate && supplier.paymentTerms?.type === 'credit') {
        const d = new Date(rest.billDate || Date.now());
        d.setDate(d.getDate() + (supplier.paymentTerms.creditDays || 0));
        finalDueDate = d;
    }

    const bill = new Bill({
        supplierId: supplier._id,
        supplierSnapshot: {
            name: supplier.displayName,
            code: supplier.supplierCode,
            taxRegistrationNumber: supplier.taxRegistrationNumber,
        },
        paymentTerms: {
            type: supplier.paymentTerms?.type || 'credit',
            creditDays: supplier.paymentTerms?.creditDays || 0,
        },
        dueDate: finalDueDate,
        items,
        ...rest,
        approvedBy: req.user._id,
        approvedAt: new Date(),
        createdBy: req.user._id,
    });

    await bill.save();

    const populated = await Bill.findById(bill._id).populate('supplierId', 'displayName supplierCode');
    res.status(201).json({ success: true, data: populated });
});

/**
 * POST /api/bills/from-grn
 * Generate a bill from one or more GRNs
 */
export const createFromGrn = asyncHandler(async (req, res) => {
    const { grnIds, supplierInvoiceNumber, billDate, notes } = req.body;

    const grns = await GoodsReceiptNote.find({ _id: { $in: grnIds } })
        .populate('supplierId')
        .populate('purchaseOrderId');

    if (grns.length === 0) { res.status(400); throw new Error('No GRNs found'); }

    // Check all GRNs have a valid supplier and belong to the same supplier
    const validGrns = grns.filter(g => g.supplierId);
    if (validGrns.length !== grns.length) {
        res.status(400); throw new Error('Some selected GRNs have missing or invalid supplier references');
    }

    const supplierIds = [...new Set(validGrns.map((g) => g.supplierId._id.toString()))];
    if (supplierIds.length > 1) {
        res.status(400); throw new Error('All GRNs must belong to the same supplier');
    }

    const supplier = validGrns[0].supplierId;

    // Merge items
    const billItems = [];
    grns.forEach((grn) => {
        grn.items.forEach((gi) => {
            if (gi.acceptedQuantity <= 0) return;
            billItems.push({
                productId: gi.productId,
                productCode: gi.productCode,
                productName: gi.productName,
                quantity: gi.acceptedQuantity,
                unitOfMeasure: gi.unitOfMeasure,
                unitPrice: gi.unitPrice,
                taxRate: 18, // default; adjust as needed
                taxable: true,
                grnLineItemId: gi._id,
            });
        });
    });

    const d = new Date(billDate || Date.now());
    if (supplier.paymentTerms?.type === 'credit') {
        d.setDate(d.getDate() + (supplier.paymentTerms.creditDays || 0));
    }

    const bill = new Bill({
        supplierId: supplier._id,
        supplierSnapshot: {
            name: supplier.displayName,
            code: supplier.supplierCode,
            taxRegistrationNumber: supplier.taxRegistrationNumber,
        },
        supplierInvoiceNumber,
        purchaseOrderIds: [...new Set(grns.map((g) => g.purchaseOrderId?._id).filter(Boolean))],
        purchaseOrderNumbers: [...new Set(grns.map((g) => g.poNumber).filter(Boolean))],
        grnIds: grns.map((g) => g._id),
        grnNumbers: grns.map((g) => g.grnNumber),
        billDate: billDate || new Date(),
        dueDate: supplier.paymentTerms?.type === 'credit' ? d : undefined,
        paymentTerms: {
            type: supplier.paymentTerms?.type || 'credit',
            creditDays: supplier.paymentTerms?.creditDays || 0,
        },
        items: billItems,
        notes,
        approvedBy: req.user._id,
        approvedAt: new Date(),
        createdBy: req.user._id,
    });

    await bill.save();

    const populated = await Bill.findById(bill._id).populate('supplierId', 'displayName supplierCode');
    res.status(201).json({ success: true, data: populated });
});

export const getBills = asyncHandler(async (req, res) => {
    const {
        search, supplierId, paymentStatus, agingBucket,
        startDate, endDate,
        page = 1, limit = 20,
        sortBy = 'billDate', sortOrder = 'desc',
    } = req.query;

    const filter = {};
    if (search) {
        filter.$or = [
            { billNumber: { $regex: search, $options: 'i' } },
            { supplierInvoiceNumber: { $regex: search, $options: 'i' } },
            { 'supplierSnapshot.name': { $regex: search, $options: 'i' } },
        ];
    }
    if (supplierId) filter.supplierId = supplierId;
    if (paymentStatus) {
        // Support comma-separated values: "unpaid,partially_paid,overdue"
        const statuses = paymentStatus.split(',').map((s) => s.trim()).filter(Boolean);
        filter.paymentStatus = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
    if (agingBucket) filter.agingBucket = agingBucket;
    if (startDate || endDate) {
        filter.billDate = {};
        if (startDate) filter.billDate.$gte = new Date(startDate);
        if (endDate) filter.billDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [bills, total] = await Promise.all([
        Bill.find(filter)
            .populate('supplierId', 'displayName supplierCode')
            .sort(sortObj).skip(skip).limit(Number(limit)),
        Bill.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: bills.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: bills,
    });
});

export const getBillById = asyncHandler(async (req, res) => {
    const bill = await Bill.findById(req.params.id)
        .populate('supplierId', 'displayName supplierCode taxRegistrationNumber paymentTerms bankDetails')
        .populate('purchaseOrderIds', 'poNumber')
        .populate('grnIds', 'grnNumber receiptDate')
        .populate('approvedBy', 'firstName lastName')
        .populate('cancelledBy', 'firstName lastName');
    if (!bill) { res.status(404); throw new Error('Bill not found'); }
    res.json({ success: true, data: bill });
});

export const getPayablesAging = asyncHandler(async (req, res) => {
    const match = { paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue', 'Unpaid', 'Partially Paid', 'Overdue', 'partially paid'] }, deletedAt: null };

    const aggregation = await Bill.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$agingBucket',
                count: { $sum: 1 },
                total: { $sum: '$balanceDue' },
            },
        },
    ]);

    const buckets = { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '91_plus': 0 };
    const counts = { ...buckets };
    aggregation.forEach((r) => {
        if (r._id in buckets) {
            buckets[r._id] = r.total;
            counts[r._id] = r.count;
        }
    });

    const totalPayable = Object.values(buckets).reduce((s, v) => s + v, 0);

    res.json({ success: true, data: { buckets, counts, totalPayable } });
});

export const changeBillStatus = asyncHandler(async (req, res) => {
    const { status, reason } = req.body;
    const bill = await Bill.findById(req.params.id);
    if (!bill) { res.status(404); throw new Error('Bill not found'); }

    bill.status = status;
    if (status === 'cancelled') {
        bill.cancelledBy = req.user._id;
        bill.cancelledAt = new Date();
        bill.cancellationReason = reason;
        bill.paymentStatus = 'cancelled';
    }
    if (status === 'disputed') {
        bill.paymentStatus = 'disputed';
        bill.disputeReason = reason;
    }
    await bill.save();

    res.json({ success: true, data: bill });
});