import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import GoodsReceiptNote from '../models/GoodsReceiptNote.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import { increaseStock } from '../services/stockService.js';
import { generateJulianBatchCode } from '../utils/julianDate.js';
import { getIO } from '../services/socketService.js';

/**
 * Create a GRN — saves in 'pending_approval' queue state and does NOT update active stock immediately.
 */
export const createGrn = asyncHandler(async (req, res) => {
    const { purchaseOrderId, warehouseId, items, ...rest } = req.body;

    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) { res.status(404); throw new Error('Purchase order not found'); }
    if (!['approved', 'sent', 'partially_received'].includes(po.status)) {
        res.status(400);
        throw new Error(`Cannot receive against PO with status '${po.status}'`);
    }

    // Validate items against PO
    const poItemsMap = new Map(po.items.map((i) => [i._id.toString(), i]));

    // Build GRN line items (status is pending QA inspection)
    const grnItems = items.map((item) => {
        const poLine = item.poLineItemId ? poItemsMap.get(item.poLineItemId) : null;
        
        return {
            poLineItemId: item.poLineItemId,
            productId: item.productId,
            productCode: poLine?.productCode || '',
            productName: poLine?.productName || '',
            orderedQuantity: poLine?.orderedQuantity || 0,
            receivedQuantity: item.receivedQuantity,
            acceptedQuantity: 0, // Set during QA approval
            rejectedQuantity: 0, // Set during QA approval
            damagedQuantity: item.damagedQuantity || 0,
            unitOfMeasure: poLine?.unitOfMeasure || '',
            unitPrice: item.unitPrice || poLine?.unitPrice || 0,
            batchNumber: item.batchNumber || null,
            manufactureDate: item.manufactureDate || null,
            expiryDate: item.expiryDate || null,
            rejectionReason: null,
            notes: item.notes,
            qcStatus: 'pending',
        };
    });

    const grn = new GoodsReceiptNote({
        purchaseOrderId: po._id,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        supplierName: po.supplierSnapshot?.name,
        warehouseId,
        items: grnItems,
        status: 'pending_approval', // Entered by procurement, pending QA
        receivedBy: req.user._id,
        createdBy: req.user._id,
        ...rest,
    });

    await grn.save();

    const populated = await GoodsReceiptNote.findById(grn._id)
        .populate('purchaseOrderId', 'poNumber')
        .populate('supplierId', 'displayName supplierCode')
        .populate('warehouseId', 'name warehouseCode')
        .populate('items.productId', 'name productCode');

    res.status(201).json({ success: true, message: 'Material receipt entered in Pending Approval queue', data: populated });
});

/**
 * QA Approval endpoint — performs inspection, updates active stock, computes financial split, and updates supplier balance due.
 */
export const approveGrnQA = asyncHandler(async (req, res) => {
    const { items: itemApprovals = [], paidAmountLKR = 0 } = req.body;
    const grn = await GoodsReceiptNote.findById(req.params.id);

    if (!grn) {
        res.status(404);
        throw new Error('GRN not found');
    }
    if (grn.status !== 'pending_approval') {
        res.status(400);
        throw new Error(`Cannot perform QA approval on GRN with status '${grn.status}'`);
    }

    const supplier = await Supplier.findById(grn.supplierId);
    if (!supplier) {
        res.status(404);
        throw new Error('Supplier associated with this GRN not found');
    }

    const po = await PurchaseOrder.findById(grn.purchaseOrderId);
    if (!po) {
        res.status(404);
        throw new Error('Associated Purchase Order not found');
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const approvalsMap = new Map(itemApprovals.map(i => [i._id.toString(), i]));
            let totalPayable = 0;

            for (const grnItem of grn.items) {
                const approval = approvalsMap.get(grnItem._id.toString());
                if (!approval) {
                    throw new Error(`QA inspection details missing for product: ${grnItem.productName}`);
                }

                const acceptedQty = Number(approval.acceptedQuantity) || 0;
                const rejectedQty = Number(approval.rejectedQuantity) || 0;

                grnItem.acceptedQuantity = acceptedQty;
                grnItem.rejectedQuantity = rejectedQty;
                grnItem.qcStatus = rejectedQty > 0 ? 'failed' : 'approved';
                grnItem.rejectionReason = approval.rejectionReason;

                // 1. Generate Julian Tracking Batch Code: [SupplierCode]-ALE[YearShort][JulianDay]
                const supCode = supplier.supplierShortCode || supplier.supplierCode || 'SUP';
                const batchCode = generateJulianBatchCode(supCode, grn.receiptDate);
                grnItem.batchNumber = approval.batchNumber || batchCode;

                totalPayable += acceptedQty * grnItem.unitPrice;

                // 2. Increase stock for accepted quantity
                if (acceptedQty > 0) {
                    const result = await increaseStock({
                        productId: grnItem.productId,
                        warehouseId: grn.warehouseId,
                        quantity: acceptedQty,
                        costPerUnit: grnItem.unitPrice,
                        movementType: 'purchase_receipt',
                        batchNumber: grnItem.batchNumber,
                        sourceDocument: {
                            type: 'purchase_receipt',
                            id: grn._id,
                            number: grn.grnNumber,
                        },
                        reason: `QA Approved material intake. Batch: ${grnItem.batchNumber}`,
                        userId: req.user._id,
                        session,
                    });
                    grnItem.stockMovementId = result.movement._id;
                }

                // 3. Update PO received quantity
                if (grnItem.poLineItemId) {
                    const poLine = po.items.id(grnItem.poLineItemId);
                    if (poLine) {
                        poLine.receivedQuantity = (poLine.receivedQuantity || 0) + acceptedQty;
                    }
                }
            }

            // 4. Financial Splitting Calculations
            const balanceDue = totalPayable - paidAmountLKR;

            grn.totalPayableLKR = +totalPayable.toFixed(2);
            grn.paidAmountLKR = +Number(paidAmountLKR).toFixed(2);
            grn.balanceDueLKR = +balanceDue.toFixed(2);
            grn.status = 'approved';

            // Save GRN and PO
            await grn.save({ session });
            
            // Check PO status
            let allReceived = true;
            po.items.forEach(i => {
                if ((i.receivedQuantity || 0) < i.orderedQuantity) {
                    allReceived = false;
                }
            });
            po.status = allReceived ? 'received' : 'partially_received';
            po.grns = [...(po.grns || []), grn._id];
            await po.save({ session });

            // 5. Update Supplier Accounts Payable ledger
            supplier.balanceDueLKR = +( (supplier.balanceDueLKR || 0) + balanceDue ).toFixed(2);
            await supplier.save({ session });

            // 6. Broadcast Real-Time Stock & Balance via Socket.io
            try {
                const io = getIO();
                // Emit petty cash / supplier balance change
                io.emit('supplier_balance_update', {
                    supplierId: supplier._id,
                    displayName: supplier.displayName,
                    balanceDueLKR: supplier.balanceDueLKR,
                });
                
                // Emit stock threshold check alert
                io.emit('stock_update', {
                    message: `GRN ${grn.grnNumber} approved. Materials stocked.`,
                });
            } catch (socketErr) {
                console.warn('[GRN Approval] Socket broadcast error:', socketErr.message);
            }
        });

        const populated = await GoodsReceiptNote.findById(grn._id)
            .populate('purchaseOrderId', 'poNumber')
            .populate('supplierId', 'displayName supplierCode')
            .populate('warehouseId', 'name warehouseCode')
            .populate('items.productId', 'name productCode');

        res.json({ success: true, message: 'QA Approved successfully, stock and payable accounts updated.', data: populated });
    } catch (err) {
        res.status(400);
        throw new Error(err.message || 'QA approval failed');
    } finally {
        session.endSession();
    }
});


export const getGrns = asyncHandler(async (req, res) => {
    const {
        search, purchaseOrderId, supplierId, warehouseId, status,
        page = 1, limit = 20,
    } = req.query;

    const filter = {};
    if (search) filter.grnNumber = { $regex: search, $options: 'i' };
    if (purchaseOrderId) filter.purchaseOrderId = purchaseOrderId;
    if (supplierId) filter.supplierId = supplierId;
    if (warehouseId) filter.warehouseId = warehouseId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [grns, total] = await Promise.all([
        GoodsReceiptNote.find(filter)
            .populate('purchaseOrderId', 'poNumber')
            .populate('supplierId', 'displayName supplierCode')
            .populate('warehouseId', 'name warehouseCode')
            .sort({ receiptDate: -1 })
            .skip(skip).limit(Number(limit)),
        GoodsReceiptNote.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: grns.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: grns,
    });
});

export const getGrnById = asyncHandler(async (req, res) => {
    const grn = await GoodsReceiptNote.findById(req.params.id)
        .populate('purchaseOrderId', 'poNumber poDate')
        .populate('supplierId', 'displayName supplierCode')
        .populate('warehouseId', 'name warehouseCode')
        .populate('items.productId', 'name productCode')
        .populate('items.stockMovementId', 'movementNumber')
        .populate('receivedBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName');
    if (!grn) { res.status(404); throw new Error('GRN not found'); }
    res.json({ success: true, data: grn });
});