import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Bill from '../models/Bill.js';
import Customer from '../models/Customer.js';
import BankAccount from '../models/BankAccount.js';
import { broadcast } from '../services/socketService.js';
import { updateCustomerBalance } from './invoiceController.js';

/**
 * POST /api/payments
 * Record a payment (received from customer or paid to supplier)
 */
export const createPayment = asyncHandler(async (req, res) => {
    const { direction, customerId, supplierId, bankAccountId, amount, allocations = [], method, chequeStatus, ...rest } = req.body;

    if (direction === 'received' && !customerId) {
        res.status(400); throw new Error('customerId required for received payments');
    }
    if (direction === 'paid' && !supplierId) {
        res.status(400); throw new Error('supplierId required for paid payments');
    }

    const session = await mongoose.startSession();
    let payment;
    const isChequePending = method === 'cheque' && chequeStatus !== 'cleared';

    try {
        await session.withTransaction(async () => {
            // Validate & adjust allocations
            for (const alloc of allocations) {
                if (alloc.documentType === 'invoice') {
                    const inv = await Invoice.findById(alloc.documentId).session(session);
                    if (!inv) throw new Error(`Invoice ${alloc.documentId} not found`);
                    if (alloc.amount > inv.balanceDue) {
                        throw new Error(`Cannot allocate ${alloc.amount} to invoice ${inv.invoiceNumber}, balance is ${inv.balanceDue}`);
                    }
                    alloc.documentNumber = inv.invoiceNumber;
                } else if (alloc.documentType === 'bill') {
                    const bill = await Bill.findById(alloc.documentId).session(session);
                    if (!bill) throw new Error(`Bill ${alloc.documentId} not found`);
                    if (alloc.amount > bill.balanceDue) {
                        throw new Error(`Cannot allocate ${alloc.amount} to bill ${bill.billNumber}, balance is ${bill.balanceDue}`);
                    }
                    alloc.documentNumber = bill.billNumber;
                } else if (alloc.documentType === 'sales_order') {
                    const SalesOrder = (await import('../models/SalesOrder.js')).default;
                    const so = await SalesOrder.findById(alloc.documentId).session(session);
                    if (!so) throw new Error(`Sales Order ${alloc.documentId} not found`);
                    const balanceDue = so.grandTotal - so.totalPaid;
                    if (alloc.amount > balanceDue + 0.01) { // allowance for small floats
                        throw new Error(`Cannot allocate ${alloc.amount} to sales order ${so.orderNumber}, balance is ${balanceDue}`);
                    }
                    alloc.documentNumber = so.orderNumber;
                }
            }

            // Get party name
            let partyName = '';
            if (direction === 'received') {
                const c = await Customer.findById(customerId).session(session);
                partyName = c?.displayName;
            } else {
                const Supplier = (await import('../models/Supplier.js')).default;
                const s = await Supplier.findById(supplierId).session(session);
                partyName = s?.displayName;
            }

            // Update bank account balance if bankAccountId is provided and not a pending cheque
            if (bankAccountId && !isChequePending) {
                const bankAccount = await BankAccount.findById(bankAccountId).session(session);
                if (!bankAccount) throw new Error('Company bank account not found');
                
                const payAmount = Number(amount || 0);
                if (direction === 'received') {
                    bankAccount.balance = +(bankAccount.balance + payAmount).toFixed(2);
                } else if (direction === 'paid') {
                    bankAccount.balance = +(bankAccount.balance - payAmount).toFixed(2);
                }
                await bankAccount.save({ session });
            }

            payment = new Payment({
                direction,
                customerId: direction === 'received' ? customerId : undefined,
                supplierId: direction === 'paid' ? supplierId : undefined,
                bankAccountId,
                amount,
                method,
                chequeStatus: method === 'cheque' ? (chequeStatus || 'pending') : undefined,
                partyName,
                allocations,
                receivedBy: req.user._id,
                createdBy: req.user._id,
                ...rest,
            });

            await payment.save({ session });

            // Apply allocations to invoices/bills/sales_orders
            for (const alloc of allocations) {
                if (alloc.documentType === 'invoice') {
                    const inv = await Invoice.findById(alloc.documentId).session(session);
                    inv.amountPaid = +(inv.amountPaid + alloc.amount).toFixed(2);
                    inv.lastPaymentDate = payment.paymentDate;
                    await inv.save({ session });
                } else if (alloc.documentType === 'bill') {
                    const bill = await Bill.findById(alloc.documentId).session(session);
                    bill.amountPaid = +(bill.amountPaid + alloc.amount).toFixed(2);
                    bill.lastPaymentDate = payment.paymentDate;
                    await bill.save({ session });
                } else if (alloc.documentType === 'sales_order') {
                    const SalesOrder = (await import('../models/SalesOrder.js')).default;
                    const so = await SalesOrder.findById(alloc.documentId).session(session);
                    so.totalPaid = +(so.totalPaid + alloc.amount).toFixed(2);
                    
                    let remainingAlloc = alloc.amount;
                    for (const stage of so.paymentSchedule) {
                        if (stage.status === 'pending' && remainingAlloc > 0) {
                            if (remainingAlloc >= stage.amount) {
                                stage.status = 'paid';
                                stage.paidAt = payment.paymentDate;
                                remainingAlloc -= stage.amount;
                            } else {
                                remainingAlloc = 0;
                            }
                        }
                    }
                    
                    if (so.totalPaid >= so.advanceAmount && !so.advanceReceived) {
                        so.advanceReceived = true;
                        so.productionStatus = 'ready_for_production';
                    }
                    
                    await so.save({ session });
                }
            }

            // Update customer balance if received
            if (direction === 'received') {
                await updateCustomerBalance(customerId, session);
            }
            try {
                broadcast('financial_update', {
                    message: 'Financial accounts updated via new payment log',
                });
            } catch (_) {}
        });

        // Broadcast bank account balance change after successful transaction commit
        if (bankAccountId && !isChequePending) {
            const updatedAccount = await BankAccount.findById(bankAccountId);
            if (updatedAccount) {
                broadcast('bank_balance_update', { 
                    bankAccountId, 
                    balance: updatedAccount.balance 
                });
            }
        }

        const populated = await Payment.findById(payment._id)
            .populate('customerId', 'displayName customerCode')
            .populate('supplierId', 'displayName supplierCode')
            .populate('bankAccountId', 'bankName accountNumber accountName');

        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(400);
        throw new Error(err.message || 'Failed to create payment');
    } finally {
        session.endSession();
    }
});

/**
 * PUT /api/payments/:id/clear
 * Clear a pending cheque payment, adjusting the linked bank account balance.
 */
export const clearPaymentCheque = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
        res.status(404);
        throw new Error('Payment not found');
    }
    if (payment.method !== 'cheque') {
        res.status(400);
        throw new Error('Only cheque payments can be cleared');
    }
    if (payment.chequeStatus === 'cleared') {
        res.status(400);
        throw new Error('Cheque is already cleared');
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            payment.chequeStatus = 'cleared';
            await payment.save({ session });

            if (payment.bankAccountId) {
                const bankAccount = await BankAccount.findById(payment.bankAccountId).session(session);
                if (!bankAccount) throw new Error('Associated company bank account not found');

                const payAmount = Number(payment.amount || 0);
                if (payment.direction === 'received') {
                    bankAccount.balance = +(bankAccount.balance + payAmount).toFixed(2);
                } else if (payment.direction === 'paid') {
                    bankAccount.balance = +(bankAccount.balance - payAmount).toFixed(2);
                }
                await bankAccount.save({ session });
            }
        });

        // Broadcast bank balance update
        if (payment.bankAccountId) {
            const updatedAccount = await BankAccount.findById(payment.bankAccountId);
            if (updatedAccount) {
                broadcast('bank_balance_update', {
                    bankAccountId: payment.bankAccountId,
                    balance: updatedAccount.balance,
                });
            }
        }

        // Broadcast cheque clearance event
        try {
            broadcast('cheque_cleared', {
                paymentId: payment._id,
                paymentNumber: payment.paymentNumber,
                amount: payment.amount,
                chequeNumber: payment.chequeNumber,
            });
            broadcast('financial_update', {
                message: 'Financial accounts updated via cheque clearance',
            });
        } catch (_) {}

        const populated = await Payment.findById(payment._id)
            .populate('customerId', 'displayName customerCode')
            .populate('supplierId', 'displayName supplierCode')
            .populate('bankAccountId', 'bankName accountNumber accountName');

        res.json({ success: true, message: 'Cheque cleared successfully', data: populated });
    } catch (err) {
        res.status(400);
        throw new Error(err.message || 'Failed to clear cheque');
    } finally {
        session.endSession();
    }
});

/**
 * PUT /api/payments/:id/status
 * Update the chequeStatus of a payment, adjusting bank account balance based on status transition.
 */
export const updatePaymentChequeStatus = asyncHandler(async (req, res) => {
    const { chequeStatus } = req.body;
    if (!['pending', 'cleared', 'bounced'].includes(chequeStatus)) {
        res.status(400);
        throw new Error('Invalid cheque status');
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
        res.status(404);
        throw new Error('Payment not found');
    }
    if (payment.method !== 'cheque') {
        res.status(400);
        throw new Error('Only cheque payments can have their status updated');
    }

    const oldStatus = payment.chequeStatus || 'pending';
    const newStatus = chequeStatus;

    if (oldStatus === newStatus) {
        return res.json({ success: true, message: 'Status is already set to ' + newStatus, data: payment });
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            payment.chequeStatus = newStatus;
            await payment.save({ session });

            if (payment.bankAccountId) {
                const bankAccount = await BankAccount.findById(payment.bankAccountId).session(session);
                if (!bankAccount) throw new Error('Associated company bank account not found');

                const payAmount = Number(payment.amount || 0);

                // If transitioning from cleared -> non-cleared, reverse the bank balance adjustment
                if (oldStatus === 'cleared' && newStatus !== 'cleared') {
                    if (payment.direction === 'received') {
                        bankAccount.balance = +(bankAccount.balance - payAmount).toFixed(2);
                    } else if (payment.direction === 'paid') {
                        bankAccount.balance = +(bankAccount.balance + payAmount).toFixed(2);
                    }
                    await bankAccount.save({ session });
                }
                // If transitioning from non-cleared -> cleared, apply the bank balance adjustment
                else if (oldStatus !== 'cleared' && newStatus === 'cleared') {
                    if (payment.direction === 'received') {
                        bankAccount.balance = +(bankAccount.balance + payAmount).toFixed(2);
                    } else if (payment.direction === 'paid') {
                        bankAccount.balance = +(bankAccount.balance - payAmount).toFixed(2);
                    }
                    await bankAccount.save({ session });
                }
            }
        });

        // Broadcast bank balance update if bankAccountId was adjusted
        if (payment.bankAccountId && (oldStatus === 'cleared' || newStatus === 'cleared')) {
            const updatedAccount = await BankAccount.findById(payment.bankAccountId);
            if (updatedAccount) {
                broadcast('bank_balance_update', {
                    bankAccountId: payment.bankAccountId,
                    balance: updatedAccount.balance,
                });
            }
        }

        // Broadcast cheque status update event
        try {
            broadcast('cheque_cleared', {
                paymentId: payment._id,
                paymentNumber: payment.paymentNumber,
                amount: payment.amount,
                chequeNumber: payment.chequeNumber,
                status: newStatus,
            });
            broadcast('financial_update', {
                message: `Financial accounts updated via cheque status change to ${newStatus}`,
            });
        } catch (_) {}

        const populated = await Payment.findById(payment._id)
            .populate('customerId', 'displayName customerCode')
            .populate('supplierId', 'displayName supplierCode')
            .populate('bankAccountId', 'bankName accountNumber accountName');

        res.json({ success: true, message: `Cheque status updated to ${newStatus} successfully`, data: populated });
    } catch (err) {
        res.status(400);
        throw new Error(err.message || 'Failed to update cheque status');
    } finally {
        session.endSession();
    }
});


export const getPayments = asyncHandler(async (req, res) => {
    const {
        direction, customerId, supplierId, method, status,
        startDate, endDate,
        page = 1, limit = 20,
    } = req.query;

    const { documentId } = req.query;

    const filter = {};
    if (direction) filter.direction = direction;
    if (customerId) filter.customerId = customerId;
    if (documentId) {
        filter['allocations.documentId'] = documentId;
    }
    if (supplierId) filter.supplierId = supplierId;
    if (method) filter.method = method;
    if (status) filter.status = status;
    if (startDate || endDate) {
        filter.paymentDate = {};
        if (startDate) filter.paymentDate.$gte = new Date(startDate);
        if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
        Payment.find(filter)
            .populate('customerId', 'displayName customerCode')
            .populate('supplierId', 'displayName supplierCode')
            .populate('receivedBy', 'firstName lastName')
            .sort({ paymentDate: -1 }).skip(skip).limit(Number(limit)),
        Payment.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: payments.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: payments,
    });
});

export const getPaymentById = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id)
        .populate('customerId', 'displayName customerCode')
        .populate('supplierId', 'displayName supplierCode')
        .populate('receivedBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName');
    if (!payment) { res.status(404); throw new Error('Payment not found'); }
    res.json({ success: true, data: payment });
});