import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import GoodsReceiptNote from '../models/GoodsReceiptNote.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import Bill from '../models/Bill.js';
import { increaseStock } from '../services/stockService.js';
import { generateJulianBatchCode } from '../utils/julianDate.js';
import { getIO } from '../services/socketService.js';
import { sendGrnConfirmationSms, sendGrnCreationSms } from '../services/smsService.js';

/**
 * Create a GRN — saves in 'pending_approval' queue state and does NOT update active stock immediately.
 */
export const createGrn = asyncHandler(async (req, res) => {
    const { purchaseOrderId, warehouseId, items, sourceType, supplierId, farmId, ...rest } = req.body;

    let po = null;
    let supplierName = '';
    let resolvedSupplierId = supplierId;
    let resolvedFarmId = farmId;
    let farmName = '';

    if (purchaseOrderId) {
        po = await PurchaseOrder.findById(purchaseOrderId);
        if (!po) { res.status(404); throw new Error('Purchase order not found'); }
        if (!['approved', 'sent', 'partially_received'].includes(po.status)) {
            res.status(400);
            throw new Error(`Cannot receive against PO with status '${po.status}'`);
        }
        resolvedSupplierId = po.supplierId;
        supplierName = po.supplierSnapshot?.name || '';
    } else {
        // Direct GRN
        if (sourceType === 'own_farm') {
            const Farm = mongoose.model('Farm');
            const farm = await Farm.findById(farmId);
            if (!farm) { res.status(404); throw new Error('Farm not found'); }
            farmName = farm.name;
        } else {
            const Supplier = mongoose.model('Supplier');
            const supplier = await Supplier.findById(supplierId);
            if (!supplier) { res.status(404); throw new Error('Supplier not found'); }
            supplierName = supplier.displayName || supplier.companyName || '';
        }
    }

    // Build GRN line items (status is pending QA inspection)
    const grnItems = [];
    const Product = mongoose.model('Product');

    for (const item of items) {
        let productCode = '';
        let productName = '';
        let unitOfMeasure = '';
        let orderedQuantity = 0;
        let unitPrice = Number(item.unitPrice) || 0;

        if (po) {
            const poItemsMap = new Map(po.items.map((i) => [i._id.toString(), i]));
            const poLine = item.poLineItemId ? poItemsMap.get(item.poLineItemId) : null;
            if (poLine) {
                productCode = poLine.productCode || '';
                productName = poLine.productName || '';
                unitOfMeasure = poLine.unitOfMeasure || '';
                orderedQuantity = poLine.orderedQuantity || 0;
                unitPrice = unitPrice || poLine.unitPrice || 0;
            }
        } else {
            const product = await Product.findById(item.productId);
            if (!product) { res.status(404); throw new Error(`Product ${item.productId} not found`); }
            productCode = product.productCode || '';
            productName = product.name || '';
            unitOfMeasure = product.unitOfMeasure || '';
            unitPrice = unitPrice || product.basePrice || 0;
        }

        grnItems.push({
            poLineItemId: item.poLineItemId || null,
            productId: item.productId,
            productCode,
            productName,
            orderedQuantity,
            receivedQuantity: Number(item.receivedQuantity) || 0,
            acceptedQuantity: 0, // Set during QA approval
            rejectedQuantity: 0, // Set during QA approval
            damagedQuantity: Number(item.damagedQuantity) || 0,
            unitOfMeasure,
            unitPrice,
            batchNumber: item.batchNumber || null,
            manufactureDate: item.manufactureDate || null,
            expiryDate: item.expiryDate || null,
            rejectionReason: null,
            notes: item.notes,
            qcStatus: 'pending',
        });
    }

    const grn = new GoodsReceiptNote({
        purchaseOrderId: po?._id || null,
        poNumber: po?.poNumber || null,
        sourceType: sourceType || 'supplier',
        supplierId: sourceType === 'own_farm' ? null : resolvedSupplierId || null,
        supplierName: sourceType === 'own_farm' ? null : supplierName || null,
        farmId: sourceType === 'own_farm' ? resolvedFarmId || null : null,
        farmName: sourceType === 'own_farm' ? farmName || null : null,
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

    // Trigger automated supplier confirmation SMS on creation
    sendGrnCreationSms(populated).catch(console.error);

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

    let supplier = null;
    if (grn.sourceType !== 'own_farm' && grn.supplierId) {
        supplier = await Supplier.findById(grn.supplierId);
        if (!supplier) {
            res.status(404);
            throw new Error('Supplier associated with this GRN not found');
        }
    }

    let farm = null;
    if (grn.sourceType === 'own_farm' && grn.farmId) {
        const Farm = mongoose.model('Farm');
        farm = await Farm.findById(grn.farmId);
        if (!farm) {
            res.status(404);
            throw new Error('Farm associated with this GRN not found');
        }
    }

    let po = null;
    if (grn.purchaseOrderId) {
        po = await PurchaseOrder.findById(grn.purchaseOrderId);
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

                // 1. Generate Julian Tracking Batch Code
                let codePrefix = 'SUP';
                if (grn.sourceType === 'own_farm' && farm) {
                    codePrefix = farm.farmCode || farm.name;
                } else if (supplier) {
                    codePrefix = supplier.supplierShortCode || supplier.supplierCode || 'SUP';
                }
                const batchCode = generateJulianBatchCode(codePrefix, grn.receiptDate);
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
                if (po && grnItem.poLineItemId) {
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

            // Auto-generate Bill from GRN
            const billItems = grn.items
                .filter(gi => gi.acceptedQuantity > 0)
                .map(gi => ({
                    productId: gi.productId,
                    productCode: gi.productCode,
                    productName: gi.productName,
                    quantity: gi.acceptedQuantity,
                    unitOfMeasure: gi.unitOfMeasure,
                    unitPrice: gi.unitPrice,
                    taxRate: 0,
                    taxable: false,
                    grnLineItemId: gi._id,
                }));

            if (billItems.length > 0) {
                let finalDueDate = grn.receiptDate || new Date();
                let paymentTermsType = 'cash';
                let creditDays = 0;

                if (supplier) {
                    paymentTermsType = supplier.paymentTerms?.type || 'credit';
                    creditDays = supplier.paymentTerms?.creditDays || 0;
                    if (paymentTermsType === 'credit') {
                        const d = new Date(finalDueDate);
                        d.setDate(d.getDate() + creditDays);
                        finalDueDate = d;
                    }
                }

                const bill = new Bill({
                    supplierInvoiceNumber: grn.grnNumber,
                    supplierId: supplier ? supplier._id : null,
                    supplierSnapshot: {
                        name: supplier ? supplier.displayName : (grn.farmName || 'Own Farm'),
                        code: supplier ? (supplier.supplierShortCode || supplier.supplierCode || 'SUP') : (farm ? (farm.farmCode || 'FRM') : 'FRM'),
                        taxRegistrationNumber: supplier ? supplier.taxRegistrationNumber : undefined,
                    },
                    purchaseOrderIds: po ? [po._id] : [],
                    purchaseOrderNumbers: po && po.poNumber ? [po.poNumber] : [],
                    grnIds: [grn._id],
                    grnNumbers: [grn.grnNumber],
                    billDate: grn.receiptDate || new Date(),
                    dueDate: finalDueDate,
                    paymentTerms: {
                        type: paymentTermsType,
                        creditDays: creditDays,
                    },
                    items: billItems,
                    amountPaid: grn.paidAmountLKR || 0,
                    status: 'approved',
                    approvedBy: req.user._id,
                    approvedAt: new Date(),
                    createdBy: req.user._id,
                });

                await bill.save({ session });
            }
            
            // Check PO status
            if (po) {
                let allReceived = true;
                po.items.forEach(i => {
                    if ((i.receivedQuantity || 0) < i.orderedQuantity) {
                        allReceived = false;
                    }
                });
                po.status = allReceived ? 'received' : 'partially_received';
                po.grns = [...(po.grns || []), grn._id];
                await po.save({ session });
            }

            // 5. Update Supplier Accounts Payable ledger
            if (supplier) {
                supplier.balanceDueLKR = +( (supplier.balanceDueLKR || 0) + balanceDue ).toFixed(2);
                await supplier.save({ session });
            }

            // 6. Broadcast Real-Time Stock & Balance via Socket.io
            try {
                const io = getIO();
                if (supplier) {
                    // Emit petty cash / supplier balance change
                    io.emit('supplier_balance_update', {
                        supplierId: supplier._id,
                        displayName: supplier.displayName,
                        balanceDueLKR: supplier.balanceDueLKR,
                    });
                }
                
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

        // Trigger automated supplier confirmation SMS if requested
        const sendSms = req.body.sendSms !== false;
        if (sendSms) {
            sendGrnConfirmationSms(populated, req.body.customMessage).catch(console.error);
        }

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

/**
 * @desc    Manually dispatch/resend confirmation SMS for an approved GRN
 * @route   POST /api/grns/:id/send-sms
 * @access  Private/Admin
 */
export const sendGrnSmsManually = asyncHandler(async (req, res) => {
    const { customMessage } = req.body;
    const grn = await GoodsReceiptNote.findById(req.params.id)
        .populate('purchaseOrderId', 'poNumber')
        .populate('supplierId', 'displayName supplierCode')
        .populate('warehouseId', 'name warehouseCode')
        .populate('items.productId', 'name productCode');

    if (!grn) {
        res.status(404);
        throw new Error('GRN not found');
    }

    if (grn.status !== 'approved') {
        res.status(400);
        throw new Error('Can only send SMS for approved Goods Receipt Notes');
    }

    const log = await sendGrnConfirmationSms(grn, customMessage);

    res.json({
        success: true,
        message: 'SMS dispatch initiated successfully',
        data: log
    });
});