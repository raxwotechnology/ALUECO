import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import SalesOrder from '../models/SalesOrder.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import {
    decreaseStock, increaseStock,
} from '../services/stockService.js';
import StockItem from '../models/StockItem.js';
import excelService from '../services/excelService.js';
import Invoice from '../models/Invoice.js';
import { updateCustomerBalance } from './invoiceController.js';
import BankAccount from '../models/BankAccount.js';
import Payment from '../models/Payment.js';
import { broadcast } from '../services/socketService.js';

/**
 * Create Sales Order
 */
export const createSalesOrder = asyncHandler(async (req, res) => {
    const {
        customer, customerId, items, shippingAddressLabel, creditOverride, creditOverrideReason,
        ...rest
    } = req.body;

    const targetCustomerId = customerId || customer;

    if (!targetCustomerId) {
        res.status(400); throw new Error('Customer ID or name is required');
    }

    // Fetch customer
    const foundCustomer = await Customer.findById(targetCustomerId).populate('customerGroupId');
    if (!foundCustomer) {
        res.status(404); throw new Error('Customer not found');
    }

    // const Warehouse = (await import('../models/Warehouse.js')).default;
    let warehouse = null;

    if (req.body.sourceWarehouseId) {
        warehouse = await Warehouse.findById(req.body.sourceWarehouseId);
        if (!warehouse) { res.status(404); throw new Error('Warehouse not found'); }
    } else {
        // Fall back to default warehouse
        warehouse = await Warehouse.findOne({ isDefault: true, isActive: true });
    }

    // Block on credit hold
    if (foundCustomer.creditStatus?.onCreditHold && !creditOverride) {
        res.status(400);
        throw new Error(`Customer is on credit hold: ${foundCustomer.creditStatus.creditHoldReason || 'No reason provided'}`);
    }

    if (foundCustomer.status === 'blacklisted') {
        res.status(400);
        throw new Error('Cannot create order for blacklisted customer');
    }

    // Fetch and snapshot products
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, status: 'active' });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    // Build line items
    const enrichedItems = [];
    for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
            res.status(400);
            throw new Error(`Product ${item.productId} not found or inactive`);
        }

        enrichedItems.push({
            productId: product._id,
            productCode: product.productCode,
            productName: product.name,
            orderedQuantity: item.orderedQuantity,
            unitOfMeasure: product.unitOfMeasure,
            listPrice: product.basePrice,
            unitPrice: item.unitPrice ?? product.basePrice,
            discountPercent: item.discountPercent || 0,
            discountAmount: item.discountAmount || 0,
            taxRate: item.taxRate ?? (product.tax?.taxRate || 0),
            taxable: item.taxable ?? (product.tax?.taxable ?? true),
            notes: item.notes,
        });
    }

    // Snapshot addresses
    const billingAddress = foundCustomer.billingAddress?.toObject?.() || foundCustomer.billingAddress;
    let shippingAddress = billingAddress;
    if (shippingAddressLabel && foundCustomer.shippingAddresses?.length) {
        const match = foundCustomer.shippingAddresses.find((a) => a.label === shippingAddressLabel);
        if (match) shippingAddress = match.toObject?.() || match;
    } else if (foundCustomer.shippingAddresses?.length) {
        const def = foundCustomer.shippingAddresses.find((a) => a.isDefault) || foundCustomer.shippingAddresses[0];
        shippingAddress = def.toObject?.() || def;
    }

    // Build order
    const orderData = {
        ...rest,
        customer: foundCustomer._id,
        customerId: foundCustomer._id,
        sourceWarehouseId: warehouse?._id,
        sourceWarehouseSnapshot: warehouse ? {
            name: warehouse.name,
            warehouseCode: warehouse.warehouseCode,
        } : undefined,
        customerSnapshot: {
            name: foundCustomer.displayName,
            code: foundCustomer.customerCode,
            taxRegistrationNumber: foundCustomer.taxRegistrationNumber,
            contactName: foundCustomer.primaryContact?.name,
            phone: foundCustomer.primaryContact?.phone,
        },
        billingAddress,
        shippingAddress,
        shippingAddressLabel,
        salesRepId: foundCustomer.assignedSalesRep || req.user._id,
        items: enrichedItems,
        paymentTerms: {
            type: foundCustomer.paymentTerms?.type || 'cod',
            creditDays: foundCustomer.paymentTerms?.creditDays || 0,
        },
        createdBy: req.user._id,
    };

    const order = new SalesOrder(orderData);

    // Pre-save calculates totals. We need totals to run credit check.
    // Save first with 'draft' status, then validate credit.
    const tempStatus = orderData.status || 'draft';
    order.status = 'draft';
    await order.save();

    // Sync to Excel (Bookings)
    await excelService.updateExcelRow('sales_order', order);

    if (orderData.source === 'pos' && tempStatus === 'approved') {
        const {
            paymentMethod,
            bankAccountId,
            paymentReference,
            chequeNumber,
            chequeDate,
            bankName,
            chequeStatus,
        } = req.body;

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                let targetWarehouse = null;
                if (order.sourceWarehouseId) {
                    targetWarehouse = await Warehouse.findById(order.sourceWarehouseId).session(session);
                } else if (warehouse?._id) {
                    targetWarehouse = await Warehouse.findById(warehouse._id).session(session);
                }
                
                if (!targetWarehouse) {
                    targetWarehouse = await Warehouse.findOne({ isDefault: true, isActive: true }).session(session);
                }

                if (!targetWarehouse) {
                    throw new Error('Warehouse not found and no default warehouse exists.');
                }

                const warehouseId = targetWarehouse._id;
                const allowNegative = targetWarehouse.settings?.allowNegativeStock || false;

                for (const item of order.items) {
                    const stockItem = await StockItem.findOne({
                        productId: item.productId,
                        warehouseId,
                        batchNumber: null,
                    }).session(session);

                    if (!allowNegative) {
                        if (!stockItem) {
                            throw new Error(
                                `No stock record found for "${item.productName}" in the selected warehouse. Please enter opening stock first.`
                            );
                        }

                        if (stockItem.quantities.openStock < item.orderedQuantity) {
                            throw new Error(
                                `Insufficient stock for "${item.productName}". Open stock: ${stockItem.quantities.openStock}, ordered: ${item.orderedQuantity}`
                            );
                        }
                    }

                    await decreaseStock({
                        productId: item.productId,
                        warehouseId,
                        quantity: item.orderedQuantity,
                        movementType: 'sale_dispatch',
                        sourceDocument: {
                            type: 'sales_order',
                            id: order._id,
                            number: order.orderNumber,
                        },
                        reason: 'POS sale checkout',
                        userId: req.user._id,
                        session,
                        allowNegative,
                    });

                    item.dispatchedQuantity = item.orderedQuantity;
                    item.deliveredQuantity = item.orderedQuantity;
                    item.lineStatus = 'delivered';
                }

                order.status = 'invoiced';
                order.approvedBy = req.user._id;
                order.approvedAt = new Date();
                order.isOnHold = false;
                order.holdReason = null;
                await order.save({ session });

                const invoiceItems = order.items.map((orderItem) => ({
                    productId: orderItem.productId,
                    productCode: orderItem.productCode,
                    productName: orderItem.productName,
                    description: orderItem.description,
                    quantity: orderItem.orderedQuantity,
                    unitOfMeasure: orderItem.unitOfMeasure,
                    unitPrice: orderItem.unitPrice,
                    discountPercent: orderItem.discountPercent,
                    taxRate: orderItem.taxRate,
                    taxable: orderItem.taxable,
                    salesOrderLineId: orderItem._id,
                }));

                const isChequePending = paymentMethod === 'cheque' && chequeStatus !== 'cleared';
                const payAmount = order.grandTotal;

                const invoice = new Invoice({
                    customerId: foundCustomer._id,
                    customerSnapshot: {
                        name: foundCustomer.displayName,
                        code: foundCustomer.customerCode,
                        taxRegistrationNumber: foundCustomer.taxRegistrationNumber,
                        contactName: foundCustomer.primaryContact?.name,
                    },
                    billingAddress,
                    shippingAddress,
                    salesOrderIds: [order._id],
                    salesOrderNumbers: [order.orderNumber],
                    invoiceType: 'commercial',
                    invoiceDate: new Date(),
                    salesRepId: foundCustomer.assignedSalesRep || req.user._id,
                    paymentTerms: {
                        type: foundCustomer.paymentTerms?.type || 'cod',
                        creditDays: foundCustomer.paymentTerms?.creditDays || 0,
                    },
                    items: invoiceItems,
                    status: 'approved',
                    paymentStatus: 'paid',
                    amountPaid: payAmount,
                    balanceDue: 0,
                    stockDeducted: true,
                    warehouseId: warehouseId,
                    createdBy: req.user._id,
                });

                await invoice.save({ session });

                if (paymentMethod) {
                    if (bankAccountId && paymentMethod !== 'cash' && !isChequePending) {
                        const bankAccount = await BankAccount.findById(bankAccountId).session(session);
                        if (!bankAccount) throw new Error('Company bank/cash account not found');
                        bankAccount.balance = +(bankAccount.balance + payAmount).toFixed(2);
                        await bankAccount.save({ session });
                    }

                    const payment = new Payment({
                        direction: 'received',
                        customerId: foundCustomer._id,
                        bankAccountId: paymentMethod !== 'cash' ? (bankAccountId || undefined) : undefined,
                        amount: payAmount,
                        method: paymentMethod,
                        chequeNumber: paymentMethod === 'cheque' ? chequeNumber : undefined,
                        chequeDate: paymentMethod === 'cheque' && chequeDate ? new Date(chequeDate) : undefined,
                        chequeStatus: paymentMethod === 'cheque' ? (chequeStatus || 'pending') : undefined,
                        bankName: paymentMethod === 'cheque' ? bankName : undefined,
                        transactionReference: paymentMethod !== 'cheque' && paymentMethod !== 'cash' ? paymentReference : undefined,
                        partyName: foundCustomer.displayName,
                        allocations: [{
                            documentType: 'invoice',
                            documentId: invoice._id,
                            documentNumber: invoice.invoiceNumber,
                            amount: payAmount,
                        }],
                        receivedBy: req.user._id,
                        createdBy: req.user._id,
                    });
                    await payment.save({ session });
                }

                await updateCustomerBalance(foundCustomer._id, session);
                await excelService.updateExcelRow('sales_order', order);
            });

            const finalIsChequePending = paymentMethod === 'cheque' && chequeStatus !== 'cleared';
            if (paymentMethod && bankAccountId && paymentMethod !== 'cash' && !finalIsChequePending) {
                try {
                    const updatedAccount = await BankAccount.findById(bankAccountId);
                    if (updatedAccount) {
                        broadcast('bank_balance_update', {
                            bankAccountId,
                            balance: updatedAccount.balance,
                        });
                    }
                } catch (_) {}
            }
        } catch (error) {
            await SalesOrder.deleteOne({ _id: order._id });
            res.status(400);
            throw new Error(error.message || 'POS Checkout Transaction Failed');
        } finally {
            session.endSession();
        }
    } else {
        // Credit check for credit-term customers
        if (foundCustomer.paymentTerms?.type === 'credit') {
            const available = foundCustomer.creditStatus?.availableCredit || 0;
            const required = order.grandTotal;
            const passed = required <= available;

            order.creditCheck = {
                performed: true,
                passed,
                creditAvailable: available,
                creditRequired: required,
                overridden: false,
            };

            if (!passed) {
                if (creditOverride && ['admin', 'manager', 'accountant'].includes(req.user.role)) {
                    order.creditCheck.overridden = true;
                    order.creditCheck.overrideReason = creditOverrideReason;
                    order.creditCheck.overrideBy = req.user._id;
                    order.status = tempStatus;
                } else {
                    order.status = 'pending_approval';
                    order.holdReason = `Exceeds credit limit. Required: ${required}, Available: ${available}`;
                    order.isOnHold = true;
                }
            } else {
                order.status = tempStatus;
            }

            await order.save();
        } else {
            order.status = tempStatus;
            await order.save();
        }
    }

    const populated = await SalesOrder.findById(order._id)
        .populate('customerId', 'displayName customerCode')
        .populate('salesRepId', 'firstName lastName')
        .populate('items.productId', 'name productCode');

    res.status(201).json({ success: true, data: populated });
});

/**
 * List Sales Orders
 */
export const getSalesOrders = asyncHandler(async (req, res) => {
    const {
        search, customerId, status, salesRepId,
        startDate, endDate,
        page = 1, limit = 20,
        sortBy = 'orderDate', sortOrder = 'desc',
    } = req.query;

    const filter = {};

    if (search) {
        filter.$or = [
            { orderNumber: { $regex: search, $options: 'i' } },
            { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
            { 'customerSnapshot.code': { $regex: search, $options: 'i' } },
        ];
    }
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;
    if (salesRepId) filter.salesRepId = salesRepId;

    if (startDate || endDate) {
        filter.orderDate = {};
        if (startDate) filter.orderDate.$gte = new Date(startDate);
        if (endDate) filter.orderDate.$lte = new Date(endDate);
    }

    // Sales reps only see their own orders
    if (req.user.role === 'sales_rep') {
        filter.salesRepId = req.user._id;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [orders, total] = await Promise.all([
        SalesOrder.find(filter)
            .populate('customerId', 'displayName customerCode customerGroupId')
            .populate('salesRepId', 'firstName lastName')
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit)),
        SalesOrder.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: orders.length,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        data: orders,
    });
});

/**
 * Get Single Sales Order
 */
export const getSalesOrderById = asyncHandler(async (req, res) => {
    const order = await SalesOrder.findById(req.params.id)
        .populate('customerId', 'displayName customerCode taxRegistrationNumber primaryContact')
        .populate('salesRepId', 'firstName lastName email phone')
        .populate('items.productId', 'name productCode sku basePrice')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .populate('cancelledBy', 'firstName lastName')
        .populate('creditCheck.overrideBy', 'firstName lastName');

    if (!order) {
        res.status(404); throw new Error('Sales order not found');
    }

    // Sales reps only see their own orders
    if (req.user.role === 'sales_rep' && order.salesRepId?._id.toString() !== req.user._id.toString()) {
        res.status(403); throw new Error('Not authorized to view this order');
    }

    res.json({ success: true, data: order });
});

/**
 * Update Sales Order (only if draft or pending)
 */
export const updateSalesOrder = asyncHandler(async (req, res) => {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) { res.status(404); throw new Error('Sales order not found'); }

    if (!['draft', 'pending_approval'].includes(order.status)) {
        res.status(400);
        throw new Error(`Cannot edit order with status '${order.status}'`);
    }

    // If items changed, re-enrich from products
    if (req.body.items) {
        const productIds = req.body.items.map((i) => i.productId);
        const products = await Product.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map((p) => [p._id.toString(), p]));

        req.body.items = req.body.items.map((item) => {
            const product = productMap.get(item.productId);
            return {
                ...item,
                productCode: product?.productCode,
                productName: product?.name,
                unitOfMeasure: product?.unitOfMeasure,
                listPrice: product?.basePrice,
                unitPrice: item.unitPrice ?? product?.basePrice,
                taxRate: item.taxRate ?? (product?.tax?.taxRate || 0),
                taxable: item.taxable ?? (product?.tax?.taxable ?? true),
            };
        });
    }

    Object.assign(order, req.body);
    order.updatedBy = req.user._id;
    await order.save();

    // Sync to Excel (Bookings)
    await excelService.updateExcelRow('sales_order', order);

    const populated = await SalesOrder.findById(order._id)
        .populate('customerId', 'displayName customerCode')
        .populate('salesRepId', 'firstName lastName')
        .populate('items.productId', 'name productCode');

    res.json({ success: true, data: populated });
});

/**
 * Change order status — with direct stock deduction on approval
 */
export const changeSalesOrderStatus = asyncHandler(async (req, res) => {
    const { status, reason } = req.body;
    const order = await SalesOrder.findById(req.params.id);
    if (!order) { res.status(404); throw new Error('Sales order not found'); }

    const allowedTransitions = {
        draft: ['approved', 'cancelled'],
        pending_approval: ['approved', 'cancelled'],
        pending: ['approved', 'cancelled'],
        approved: ['dispatched', 'cancelled', 'on_hold'],
        on_hold: ['approved', 'cancelled'],
        dispatched: ['delivered', 'cancelled'],
        delivered: ['completed'],
    };

    if (!allowedTransitions[order.status]?.includes(status)) {
        res.status(400);
        throw new Error(`Cannot change status from '${order.status}' to '${status}'`);
    }

    // Role checks
    if (status === 'approved' && !['admin', 'manager', 'sales_manager', 'accountant'].includes(req.user.role)) {
        res.status(403); throw new Error('Not authorized to approve orders');
    }

    // Use the order's source warehouse, fall back to default
    let warehouseId = order.sourceWarehouseId;
    if (!warehouseId) {
        const defaultWarehouse = await Warehouse.findOne({ isDefault: true, isActive: true });
        if (!defaultWarehouse && status === 'approved') {
            res.status(400);
            throw new Error('Order has no warehouse set and no default warehouse exists. Please set a warehouse before approving.');
        }
        warehouseId = defaultWarehouse?._id;
    }

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            let targetWarehouse = null;
            if (warehouseId) {
                targetWarehouse = await Warehouse.findById(warehouseId).session(session);
            } else {
                targetWarehouse = await Warehouse.findOne({ isDefault: true, isActive: true }).session(session);
            }
            const allowNegative = targetWarehouse?.settings?.allowNegativeStock || false;
            if (targetWarehouse) {
                warehouseId = targetWarehouse._id;
            }

            // ─── APPROVE: deduct stock immediately from warehouse ───────────────
            if (status === 'approved' && order.status !== 'approved') {
                for (const item of order.items) {
                    // Check that stock exists and is sufficient
                    const stockItem = await StockItem.findOne({
                        productId: item.productId,
                        warehouseId,
                        batchNumber: null,
                    }).session(session);

                    if (!allowNegative) {
                        if (!stockItem) {
                            throw new Error(
                                `No stock record found for "${item.productName}" in the selected warehouse. Please enter opening stock first.`
                            );
                        }

                        if (stockItem.quantities.openStock < item.orderedQuantity) {
                            throw new Error(
                                `Insufficient stock for "${item.productName}". Open stock: ${stockItem.quantities.openStock}, ordered: ${item.orderedQuantity}`
                            );
                        }
                    }

                    // Directly deduct onHand — stock leaves warehouse on approval
                    await decreaseStock({
                        productId: item.productId,
                        warehouseId,
                        quantity: item.orderedQuantity,
                        movementType: 'sale_dispatch',
                        sourceDocument: {
                            type: 'sales_order',
                            id: order._id,
                            number: order.orderNumber,
                        },
                        reason: 'Sales order approved',
                        userId: req.user._id,
                        session,
                        allowNegative,
                    });

                    item.dispatchedQuantity = item.orderedQuantity;
                    item.lineStatus = 'dispatched';
                }

                order.approvedBy = req.user._id;
                order.approvedAt = new Date();
                order.isOnHold = false;
                order.holdReason = null;
            }

            // ─── DISPATCHED: just mark items (stock already deducted on approve) ─
            if (status === 'dispatched' && order.status !== 'dispatched') {
                for (const item of order.items) {
                    if (item.lineStatus !== 'dispatched') {
                        item.dispatchedQuantity = item.orderedQuantity;
                        item.lineStatus = 'dispatched';
                    }
                }
            }

            // ─── DELIVERED ────────────────────────────────────────────────────────
            if (status === 'delivered' && order.status !== 'delivered') {
                for (const item of order.items) {
                    item.deliveredQuantity = item.dispatchedQuantity || item.orderedQuantity;
                    item.lineStatus = 'delivered';
                }
            }

            // ─── CANCELLED: restore stock only if order was already approved ─────
            if (status === 'cancelled' && ['approved', 'dispatched', 'on_hold'].includes(order.status)) {
                for (const item of order.items) {
                    try {
                        await increaseStock({
                            productId: item.productId,
                            warehouseId,
                            quantity: item.orderedQuantity,
                            costPerUnit: 0,
                            movementType: 'sale_return',
                            sourceDocument: {
                                type: 'sales_order',
                                id: order._id,
                                number: order.orderNumber,
                            },
                            reason: reason || 'Order cancelled — stock restored',
                            userId: req.user._id,
                            session,
                        });
                    } catch (stockErr) {
                        // Non-fatal: log but don't block cancellation
                        console.warn(`Stock restore failed for ${item.productName}:`, stockErr.message);
                    }
                }
            }

            order.status = status;
            order.updatedBy = req.user._id;

            if (status === 'cancelled') {
                order.cancelledBy = req.user._id;
                order.cancelledAt = new Date();
                order.cancellationReason = reason;
            }

            if (status === 'on_hold') {
                order.isOnHold = true;
                order.holdReason = reason;
            }

            await order.save({ session });
            
            // Sync to Excel (Bookings) - status update
            await excelService.updateExcelRow('sales_order', order);
        });

        res.json({ success: true, message: `Order status changed to ${status}`, data: order });
    } catch (err) {
        res.status(400);
        throw new Error(err.message || 'Failed to change order status');
    } finally {
        session.endSession();
    }
});

/**
 * Delete (soft) Sales Order — only drafts
 */
export const deleteSalesOrder = asyncHandler(async (req, res) => {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) { res.status(404); throw new Error('Sales order not found'); }

    if (order.status !== 'draft') {
        res.status(400); throw new Error('Only draft orders can be deleted. Cancel non-draft orders instead.');
    }

    order.deletedAt = new Date();
    await order.save();

    // Sync to Excel (Bookings) - logic for delete could be to update status to deleted or remove row
    await excelService.deleteExcelRow('sales_order', order);

    res.json({ success: true, message: 'Draft order deleted' });
});