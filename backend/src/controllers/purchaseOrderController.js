import asyncHandler from 'express-async-handler';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';

export const createPurchaseOrder = asyncHandler(async (req, res) => {
    const { supplierId, deliverTo, items, ...rest } = req.body;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) { res.status(404); throw new Error('Supplier not found'); }
    if (supplier.status === 'blacklisted') {
        res.status(400); throw new Error('Cannot create PO for blacklisted supplier');
    }

    const warehouse = await Warehouse.findById(deliverTo.warehouseId);
    if (!warehouse) { res.status(404); throw new Error('Warehouse not found'); }

    // Enrich items with product info
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const enrichedItems = items.map((item) => {
        const p = productMap.get(item.productId);
        if (!p) throw new Error(`Product ${item.productId} not found`);
        return {
            productId: p._id,
            productCode: p.productCode,
            productName: p.name,
            orderedQuantity: item.orderedQuantity,
            unitOfMeasure: p.unitOfMeasure,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent || 0,
            discountAmount: item.discountAmount || 0,
            taxRate: item.taxRate ?? (p.tax?.taxRate || 0),
            taxable: item.taxable ?? (p.tax?.taxable ?? true),
            notes: item.notes,
        };
    });

    const po = new PurchaseOrder({
        supplierId: supplier._id,
        supplierSnapshot: {
            name: supplier.displayName,
            code: supplier.supplierCode,
            taxRegistrationNumber: supplier.taxRegistrationNumber,
            contactName: supplier.primaryContact?.name,
            phone: supplier.primaryContact?.phone,
        },
        supplierBillingAddress: supplier.billingAddress,
        deliverTo: {
            warehouseId: warehouse._id,
            warehouseName: warehouse.name,
            address: warehouse.address,
        },
        paymentTerms: {
            type: supplier.paymentTerms?.type || 'credit',
            creditDays: supplier.paymentTerms?.creditDays || 0,
        },
        items: enrichedItems,
        ...rest,
        createdBy: req.user._id,
    });

    await po.save();

    const populated = await PurchaseOrder.findById(po._id)
        .populate('supplierId', 'displayName supplierCode')
        .populate('deliverTo.warehouseId', 'name warehouseCode');

    res.status(201).json({ success: true, data: populated });
});

export const getPurchaseOrders = asyncHandler(async (req, res) => {
    const {
        search, supplierId, status, warehouseId,
        startDate, endDate,
        page = 1, limit = 20,
        sortBy = 'poDate', sortOrder = 'desc',
    } = req.query;

    const filter = {};
    if (search) {
        filter.$or = [
            { poNumber: { $regex: search, $options: 'i' } },
            { 'supplierSnapshot.name': { $regex: search, $options: 'i' } },
        ];
    }
    if (supplierId) filter.supplierId = supplierId;
    if (status) filter.status = status;
    if (warehouseId) filter['deliverTo.warehouseId'] = warehouseId;
    if (startDate || endDate) {
        filter.poDate = {};
        if (startDate) filter.poDate.$gte = new Date(startDate);
        if (endDate) filter.poDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [orders, total] = await Promise.all([
        PurchaseOrder.find(filter)
            .populate('supplierId', 'displayName supplierCode')
            .populate('deliverTo.warehouseId', 'name warehouseCode')
            .sort(sortObj).skip(skip).limit(Number(limit)),
        PurchaseOrder.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: orders.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: orders,
    });
});

export const getPurchaseOrderById = asyncHandler(async (req, res) => {
    const po = await PurchaseOrder.findById(req.params.id)
        .populate('supplierId', 'displayName supplierCode taxRegistrationNumber primaryContact')
        .populate('deliverTo.warehouseId', 'name warehouseCode')
        .populate('items.productId', 'name productCode')
        .populate('approvedBy', 'firstName lastName')
        .populate('cancelledBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .populate('grns');

    if (!po) { res.status(404); throw new Error('Purchase order not found'); }
    res.json({ success: true, data: po });
});

export const updatePurchaseOrder = asyncHandler(async (req, res) => {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) { res.status(404); throw new Error('Purchase order not found'); }

    if (!['draft', 'pending_approval'].includes(po.status)) {
        res.status(400);
        throw new Error(`Cannot edit PO with status '${po.status}'`);
    }

    if (req.body.items) {
        const productIds = req.body.items.map((i) => i.productId);
        const products = await Product.find({ _id: { $in: productIds } });
        const map = new Map(products.map((p) => [p._id.toString(), p]));

        req.body.items = req.body.items.map((item) => {
            const p = map.get(item.productId);
            return {
                ...item,
                productCode: p?.productCode,
                productName: p?.name,
                unitOfMeasure: p?.unitOfMeasure,
                taxRate: item.taxRate ?? (p?.tax?.taxRate || 0),
                taxable: item.taxable ?? (p?.tax?.taxable ?? true),
            };
        });
    }

    Object.assign(po, req.body);
    po.updatedBy = req.user._id;
    await po.save();

    res.json({ success: true, data: po });
});

export const changePurchaseOrderStatus = asyncHandler(async (req, res) => {
    const { status, reason } = req.body;
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) { res.status(404); throw new Error('Purchase order not found'); }

    const allowed = {
        draft: ['approved', 'cancelled'],
        pending_approval: ['approved', 'cancelled'],
        approved: ['sent', 'cancelled'],
        sent: ['cancelled'], // received via GRN, not status change
        partially_received: ['closed', 'cancelled'],
        fully_received: ['closed'],
    };

    if (!allowed[po.status]?.includes(status)) {
        res.status(400);
        throw new Error(`Cannot change status from '${po.status}' to '${status}'`);
    }

    po.status = status;
    po.updatedBy = req.user._id;

    if (status === 'approved') {
        po.approvedBy = req.user._id;
        po.approvedAt = new Date();
    }
    if (status === 'sent') {
        po.sentToSupplierAt = new Date();
    }
    if (status === 'cancelled') {
        po.cancelledBy = req.user._id;
        po.cancelledAt = new Date();
        po.cancellationReason = reason;
    }

    await po.save();
    res.json({ success: true, message: `PO status changed to ${status}`, data: po });
});

export const deletePurchaseOrder = asyncHandler(async (req, res) => {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) { res.status(404); throw new Error('Purchase order not found'); }

    // Check if GRN records exist for this PO
    const { default: Grn } = await import('../models/Grn.js');
    const existingGrns = await Grn.countDocuments({ purchaseOrderId: po._id, deletedAt: null });

    if (existingGrns > 0) {
        res.status(400);
        throw new Error('Cannot delete Purchase Order with existing Receiving Notes (GRNs). Please cancel the PO instead to preserve audit logs.');
    }

    if (po.status !== 'draft') {
        res.status(400); throw new Error('Only draft POs without GRNs can be deleted');
    }
    po.deletedAt = new Date();
    await po.save();
    res.json({ success: true, message: 'Draft PO deleted' });
});

export const duplicatePurchaseOrder = asyncHandler(async (req, res) => {
    const sourcePo = await PurchaseOrder.findById(req.params.id);
    if (!sourcePo) { res.status(404); throw new Error('Purchase order not found'); }

    const date = new Date();
    const prefix = `PO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await PurchaseOrder.countDocuments({ poNumber: { $regex: `^${prefix}` } });
    const poNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;

    const newPo = await PurchaseOrder.create({
        poNumber,
        supplierId: sourcePo.supplierId,
        supplierSnapshot: sourcePo.supplierSnapshot,
        warehouseId: sourcePo.warehouseId,
        items: sourcePo.items.map((item, idx) => ({
            lineNumber: idx + 1,
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            orderedQuantity: item.orderedQuantity,
            unitOfMeasure: item.unitOfMeasure,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal
        })),
        grandTotal: sourcePo.grandTotal,
        status: 'draft',
        notes: `Duplicated from ${sourcePo.poNumber}`,
        createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: newPo });
});