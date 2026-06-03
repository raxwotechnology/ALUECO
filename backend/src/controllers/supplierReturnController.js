import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import SupplierReturn from '../models/SupplierReturn.js';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import { decreaseStock } from '../services/stockService.js';

export const createSupplierReturn = asyncHandler(async (req, res) => {
    const { supplierId, warehouseId, items, ...rest } = req.body;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) { res.status(404); throw new Error('Supplier not found'); }

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const pMap = new Map(products.map((p) => [p._id.toString(), p]));

    const enrichedItems = items.map((i) => {
        const p = pMap.get(i.productId);
        if (!p) throw new Error(`Product ${i.productId} not found`);
        return {
            productId: p._id,
            productCode: p.productCode,
            productName: p.name,
            unitOfMeasure: p.unitOfMeasure,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            reason: i.reason,
            reasonDescription: i.reasonDescription,
            grnId: i.grnId,
            poId: i.poId,
        };
    });

    const sr = new SupplierReturn({
        supplierId: supplier._id,
        supplierSnapshot: { name: supplier.displayName, code: supplier.supplierCode },
        warehouseId,
        items: enrichedItems,
        ...rest,
        createdBy: req.user._id,
    });

    await sr.save();

    const populated = await SupplierReturn.findById(sr._id)
        .populate('supplierId', 'displayName supplierCode')
        .populate('warehouseId', 'name warehouseCode')
        .populate('items.productId', 'name productCode');

    res.status(201).json({ success: true, data: populated });
});

export const getSupplierReturns = asyncHandler(async (req, res) => {
    const { supplierId, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (supplierId) filter.supplierId = supplierId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [returns, total] = await Promise.all([
        SupplierReturn.find(filter)
            .populate('supplierId', 'displayName supplierCode')
            .populate('warehouseId', 'name warehouseCode')
            .sort({ returnDate: -1 }).skip(skip).limit(Number(limit)),
        SupplierReturn.countDocuments(filter),
    ]);

    res.json({
        success: true, count: returns.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: returns,
    });
});

export const getSupplierReturnById = asyncHandler(async (req, res) => {
    const sr = await SupplierReturn.findById(req.params.id)
        .populate('supplierId', 'displayName supplierCode')
        .populate('warehouseId', 'name warehouseCode')
        .populate('items.productId', 'name productCode')
        .populate('items.grnId', 'grnNumber')
        .populate('items.poId', 'poNumber')
        .populate('approvedBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName');
    if (!sr) { res.status(404); throw new Error('Supplier return not found'); }
    res.json({ success: true, data: sr });
});

/**
 * PATCH /api/supplier-returns/:id/send
 * Marks as sent — decrements stock atomically
 */
export const sendSupplierReturn = asyncHandler(async (req, res) => {
    const sr = await SupplierReturn.findById(req.params.id);
    if (!sr) { res.status(404); throw new Error('Supplier return not found'); }
    if (!['draft', 'approved'].includes(sr.status)) {
        res.status(400); throw new Error(`Cannot send return with status '${sr.status}'`);
    }

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            for (const item of sr.items) {
                const result = await decreaseStock({
                    productId: item.productId,
                    warehouseId: sr.warehouseId,
                    quantity: item.quantity,
                    movementType: 'supplier_return',
                    sourceDocument: {
                        type: 'supplier_return',
                        id: sr._id,
                        number: sr.returnNumber,
                    },
                    reason: `Returned to supplier ${sr.supplierSnapshot.name}`,
                    userId: req.user._id,
                    session,
                });
                item.stockMovementId = result.movement._id;
            }

            // Deduct from supplier active accounts payable ledger
            const supplier = await Supplier.findById(sr.supplierId).session(session);
            if (supplier) {
                supplier.balanceDueLKR = +(Math.max(0, (supplier.balanceDueLKR || 0) - sr.totalReturnValue)).toFixed(2);
                await supplier.save({ session });
            }

            sr.status = 'sent';
            sr.approvedBy = req.user._id;
            await sr.save({ session });
        });

        res.json({ success: true, message: 'Supplier return sent, stock decreased', data: sr });
    } catch (err) {
        res.status(400); throw new Error(err.message);
    } finally {
        session.endSession();
    }
});

/**
 * PATCH /api/supplier-returns/:id/record-credit
 */
export const recordSupplierCredit = asyncHandler(async (req, res) => {
    const { actualCreditReceived, creditReferenceNumber, creditReceivedDate } = req.body;

    const sr = await SupplierReturn.findById(req.params.id);
    if (!sr) { res.status(404); throw new Error('Supplier return not found'); }
    if (sr.status !== 'sent') {
        res.status(400); throw new Error('Return must be sent first');
    }

    sr.actualCreditReceived = actualCreditReceived;
    sr.creditReferenceNumber = creditReferenceNumber;
    sr.creditReceivedDate = creditReceivedDate ? new Date(creditReceivedDate) : new Date();
    sr.status = 'credit_received';
    await sr.save();

    res.json({ success: true, data: sr });
});