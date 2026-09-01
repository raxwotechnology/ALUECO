import asyncHandler from 'express-async-handler';
import Quotation from '../models/Quotation.js';
import Inquiry from '../models/Inquiry.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * @desc    Create a quotation from an inquiry
 * @route   POST /api/quotations
 * @access  Private
 */
export const createQuotation = asyncHandler(async (req, res) => {
    if (req.body.customerId === '') delete req.body.customerId;
    if (req.body.inquiryId === '') delete req.body.inquiryId;
    if (req.body.inquiry === '') delete req.body.inquiry;

    // Clean up items array - remove empty product IDs
    if (req.body.items && Array.isArray(req.body.items)) {
        req.body.items = req.body.items.map(item => ({
            ...item,
            product: item.product && item.product !== '' ? item.product : undefined
        }));
    }

    // Map frontend field names to backend schema
    if (req.body.expiryDate) {
        req.body.terms = {
            ...req.body.terms,
            validUntil: req.body.expiryDate
        };
        delete req.body.expiryDate;
    }

    if (req.body.incoterms) {
        req.body.terms = {
            ...req.body.terms,
            incoterm: req.body.incoterms
        };
        delete req.body.incoterms;
    }

    if (req.body.portOfLoading) {
        req.body.terms = {
            ...req.body.terms,
            notes: req.body.portOfLoading
        };
        delete req.body.portOfLoading;
    }

    // Auto-register unregistered customer if customerName is provided but customerId is not
    if (!req.body.customerId && req.body.customerName) {
        const { default: Customer } = await import('../models/Customer.js');
        let customer = await Customer.findOne({
            displayName: { $regex: new RegExp('^' + req.body.customerName.trim() + '$', 'i') }
        });
        if (!customer) {
            customer = new Customer({
                displayName: req.body.customerName.trim(),
                companyName: req.body.customerName.trim(),
                primaryContact: {
                    email: req.body.customerEmail || undefined,
                    phone: req.body.customerPhone || undefined
                },
                billingAddress: req.body.customerAddress ? {
                    line1: req.body.customerAddress,
                    city: '',
                    country: 'Sri Lanka'
                } : undefined,
                status: 'active',
                createdBy: req.user._id
            });
            await customer.save();
        }
        req.body.customerId = customer._id;
    }

    const quotation = await Quotation.create({
        ...req.body,
        createdBy: req.user._id,
        version: 1
    });

    const quoteVal = quotation.grandTotal || quotation.totalAmount || 0;
    const officerName = req.user ? (req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()) : 'Sales Officer';
    const followDate = quotation.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // If linked to an existing inquiry, update that inquiry's details
    if (quotation.inquiryId) {
        await Inquiry.findByIdAndUpdate(quotation.inquiryId, {
            quotationNo: quotation.quoteNumber,
            quotationValue: quoteVal,
            status: 'Quotation Sent',
            $push: {
                quotations: quotation._id,
                followUpHistory: {
                    date: new Date(),
                    salesOfficer: officerName,
                    user: req.user?._id,
                    note: `Quotation #${quotation.quoteNumber} issued (Amount: Rs. ${quoteVal.toLocaleString()})`,
                    nextFollowUpDate: followDate
                }
            }
        });
    } else {
        // Direct quotation creation -> auto-create new Inquiry/Lead on Inquiry Dashboard
        try {
            const reqSummary = quotation.items?.map(i => i.productName || 'Item').filter(Boolean).join(', ') || 'Custom Quotation Items';
            const newInq = await Inquiry.create({
                customerName: quotation.customerName || 'Customer',
                companyName: quotation.customerName || 'Customer',
                contactPerson: quotation.customerName || 'Customer',
                contactNo: quotation.customerPhone,
                phone: quotation.customerPhone,
                email: quotation.customerEmail,
                projectLocation: quotation.customerAddress || 'Colombo',
                requirement: reqSummary,
                inquirySource: 'Direct',
                source: 'Direct',
                quotationNo: quotation.quoteNumber,
                quotationValue: quoteVal,
                quotations: [quotation._id],
                status: 'Quotation Sent',
                result: 'Pending',
                nextFollowUpDate: followDate,
                followUpDate: followDate,
                notes: `Direct quotation #${quotation.quoteNumber}`,
                followUpHistory: [{
                    date: new Date(),
                    salesOfficer: officerName,
                    user: req.user?._id,
                    note: `Quotation #${quotation.quoteNumber} generated directly (Quoted Value: Rs. ${quoteVal.toLocaleString()})`,
                    nextFollowUpDate: followDate
                }],
                createdBy: req.user?._id
            });

            quotation.inquiryId = newInq._id;
            await quotation.save();
        } catch (inqErr) {
            console.warn('Failed to auto-create lead from quotation:', inqErr.message);
        }
    }

    createAuditLog({
        action: 'create',
        module: 'crm',
        documentId: quotation._id,
        documentCode: quotation.quoteNumber,
        description: `Generated quotation ${quotation.quoteNumber} for inquiry ${quotation.inquiryId || 'manual'}`,
        req
    });

    // Transform data to match frontend field names
    const transformedQuotation = {
        ...quotation.toObject(),
        expiryDate: quotation.terms?.validUntil || null,
        incoterms: quotation.terms?.incoterm || 'FOB',
        portOfLoading: quotation.terms?.notes || ''
    };

    res.status(201).json({ success: true, data: transformedQuotation });
});

/**
 * @desc    Get quotations
 * @route   GET /api/quotations
 * @access  Private
 */
export const getQuotations = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { deletedAt: null };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [quotations, total] = await Promise.all([
        Quotation.find(filter)
            .populate('customerId', 'displayName companyName')
            .populate('items.product', 'name productCode')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Quotation.countDocuments(filter)
    ]);

    // Transform data to match frontend field names
    const transformedQuotations = quotations.map(q => ({
        ...q.toObject(),
        expiryDate: q.terms?.validUntil || null,
        incoterms: q.terms?.incoterm || 'FOB'
    }));

    res.json({
        success: true,
        data: transformedQuotations,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
    });
});

/**
 * @desc    Get quotation by ID
 * @route   GET /api/quotations/:id
 * @access  Private
 */
export const getQuotationById = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id)
        .populate('customerId', 'displayName companyName primaryContact billingAddress')
        .populate('items.product', 'name productCode uom basePrice sku')
        .populate('createdBy', 'firstName lastName');

    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    // Transform data to match frontend field names
    const transformedQuotation = {
        ...quotation.toObject(),
        expiryDate: quotation.terms?.validUntil || null,
        incoterms: quotation.terms?.incoterm || 'FOB'
    };

    res.json({ success: true, data: transformedQuotation });
});

/**
 * @desc    Update a quotation
 * @route   PUT /api/crm/quotations/:id
 * @access  Private
 */
export const updateQuotation = asyncHandler(async (req, res) => {
    if (req.body.customerId === '') delete req.body.customerId;
    if (req.body.inquiryId === '') delete req.body.inquiryId;
    if (req.body.inquiry === '') delete req.body.inquiry;

    // Clean up items array - remove empty product IDs
    if (req.body.items && Array.isArray(req.body.items)) {
        req.body.items = req.body.items.map(item => ({
            ...item,
            product: item.product && item.product !== '' ? item.product : undefined
        }));
    }

    // Map frontend field names to backend schema
    if (req.body.expiryDate) {
        req.body.terms = {
            ...req.body.terms,
            validUntil: req.body.expiryDate
        };
        delete req.body.expiryDate;
    }

    if (req.body.incoterms) {
        req.body.terms = {
            ...req.body.terms,
            incoterm: req.body.incoterms
        };
        delete req.body.incoterms;
    }

    if (req.body.portOfLoading) {
        req.body.terms = {
            ...req.body.terms,
            notes: req.body.portOfLoading
        };
        delete req.body.portOfLoading;
    }

    // Auto-register unregistered customer if customerName is provided but customerId is not
    if (!req.body.customerId && req.body.customerName) {
        const { default: Customer } = await import('../models/Customer.js');
        let customer = await Customer.findOne({
            displayName: { $regex: new RegExp('^' + req.body.customerName.trim() + '$', 'i') }
        });
        if (!customer) {
            customer = new Customer({
                displayName: req.body.customerName.trim(),
                companyName: req.body.customerName.trim(),
                primaryContact: {
                    email: req.body.customerEmail || undefined,
                    phone: req.body.customerPhone || undefined
                },
                billingAddress: req.body.customerAddress ? {
                    line1: req.body.customerAddress,
                    city: '',
                    country: 'Sri Lanka'
                } : undefined,
                status: 'active',
                createdBy: req.user._id
            });
            await customer.save();
        }
        req.body.customerId = customer._id;
    }

    const quotation = await Quotation.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user._id },
        { new: true, runValidators: true }
    );

    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    createAuditLog({
        action: 'update',
        module: 'crm',
        documentId: quotation._id,
        description: `Updated quotation ${quotation.quoteNumber}`,
        req
    });

    res.json({ success: true, data: quotation });
});

/**
 * @desc    Delete a quotation (soft)
 * @route   DELETE /api/crm/quotations/:id
 * @access  Private
 */
export const deleteQuotation = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }
    quotation.deletedAt = new Date();
    await quotation.save();

    createAuditLog({
        action: 'delete',
        module: 'crm',
        documentId: quotation._id,
        description: `Deleted quotation ${quotation.quoteNumber}`,
        req
    });

    res.json({ success: true, message: 'Quotation deleted' });
});

/**
 * @desc    Convert quotation to sales order & invoice with auto stock deduction & shortage PO
 * @route   POST /api/crm/quotations/:id/convert
 * @access  Private
 */
export const convertQuotationToOrder = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id).populate('items.product');
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    const { default: Customer } = await import('../models/Customer.js');
    const { default: SalesOrder } = await import('../models/SalesOrder.js');
    const { default: Invoice } = await import('../models/Invoice.js');
    const { default: Warehouse } = await import('../models/Warehouse.js');
    const { default: Product } = await import('../models/Product.js');
    const { default: StockItem } = await import('../models/StockItem.js');
    const { default: BillOfMaterials } = await import('../models/BillOfMaterials.js');
    const { default: PurchaseOrder } = await import('../models/PurchaseOrder.js');
    const { decreaseStock } = await import('../services/stockService.js');

    // Customer
    let customer = null;
    if (quotation.customerId) {
        customer = await Customer.findById(quotation.customerId);
    }
    if (!customer && quotation.customerName) {
        customer = await Customer.findOne({ displayName: quotation.customerName });
        if (!customer) {
            customer = await Customer.create({
                displayName: quotation.customerName,
                companyName: quotation.customerName,
                primaryContact: {
                    email: quotation.customerEmail || undefined,
                    phone: quotation.customerPhone || undefined
                },
                billingAddress: quotation.customerAddress ? { line1: quotation.customerAddress, country: 'Sri Lanka' } : undefined,
                status: 'active',
                createdBy: req.user._id
            });
        }
    }

    const date = new Date();
    const prefix = `SO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await SalesOrder.countDocuments({ orderNumber: { $regex: `^${prefix}` } });
    const orderNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;

    const orderItems = (quotation.items || []).map((item, idx) => ({
        lineNumber: idx + 1,
        productId: item.product?._id || item.product,
        productName: item.productName || item.product?.name || `Item ${idx + 1}`,
        description: item.description || '',
        orderedQuantity: item.quantity || 1,
        unitOfMeasure: item.product?.unitOfMeasure || 'pcs',
        unitPrice: item.unitPrice || 0,
        lineSubtotal: item.subtotal || (item.quantity * item.unitPrice) || 0,
        lineTotal: item.subtotal || (item.quantity * item.unitPrice) || 0
    }));

    const salesOrder = await SalesOrder.create({
        orderNumber,
        customerId: customer?._id,
        customerName: quotation.customerName || customer?.displayName,
        orderDate: date,
        deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        items: orderItems,
        totalAmount: quotation.totalAmount || quotation.grandTotal || 0,
        discount: quotation.discount || 0,
        tax: quotation.tax || 0,
        grandTotal: quotation.grandTotal || quotation.totalAmount || 0,
        status: 'pending',
        notes: `Converted from Quotation #${quotation.quoteNumber}`,
        createdBy: req.user._id
    });

    const invoiceItems = orderItems.map((item, idx) => ({
        lineNumber: idx + 1,
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: item.orderedQuantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: item.unitPrice,
        discountPercent: 0,
        taxRate: 0,
        taxable: false,
        lineSubtotal: item.lineSubtotal,
        lineTotal: item.lineTotal
    }));

    const invoice = await Invoice.create({
        customerId: customer?._id,
        customerSnapshot: {
            name: customer?.displayName || quotation.customerName,
            code: customer?.customerCode,
            taxRegistrationNumber: customer?.taxRegistrationNumber,
            contactName: customer?.primaryContact?.name,
        },
        billingAddress: customer?.billingAddress,
        salesOrderIds: [salesOrder._id],
        salesOrderNumbers: [salesOrder.orderNumber],
        invoiceType: 'standard',
        invoiceDate: date,
        items: invoiceItems,
        subtotal: quotation.totalAmount || quotation.grandTotal || 0,
        totalDiscount: quotation.discount || 0,
        totalTax: quotation.tax || 0,
        grandTotal: quotation.grandTotal || quotation.totalAmount || 0,
        amountPaid: 0,
        balanceDue: quotation.grandTotal || quotation.totalAmount || 0,
        paymentStatus: 'unpaid',
        status: 'approved',
        notes: `Auto-generated Commercial Invoice for Quotation #${quotation.quoteNumber}`,
        createdBy: req.user._id
    });

    salesOrder.invoiceId = invoice._id;
    salesOrder.status = 'invoiced';
    await salesOrder.save();

    // Resolve warehouse
    const warehouse = await Warehouse.findOne({ isDefault: true, deletedAt: null }) || await Warehouse.findOne({ deletedAt: null });
    const whId = warehouse?._id;

    // Check & Deduct raw materials or finished products, and create PO for shortages
    const shortagePoItems = [];
    const deductedItems = [];

    for (const it of quotation.items || []) {
        const pId = it.product?._id || it.product;
        if (!pId) continue;

        const prod = await Product.findById(pId);
        if (!prod) continue;

        // Check if product has an active BOM
        const bom = await BillOfMaterials.findOne({ finishedProductId: prod._id, status: 'active' });

        if (bom && bom.components?.length > 0) {
            // Deduct BOM components
            for (const comp of bom.components) {
                const compProduct = await Product.findById(comp.productId);
                if (!compProduct) continue;

                const neededCompQty = +(comp.quantity * (it.quantity || 1) * (1 + (comp.wastagePercent || 0) / 100)).toFixed(2);
                const stockItems = await StockItem.find({ productId: compProduct._id });
                const availableQty = stockItems.reduce((s, st) => s + Math.max(0, (st.quantities?.openStock !== undefined ? st.quantities.openStock : (st.quantities?.available || 0))), 0);
                const qtyToDeduct = Math.min(availableQty, neededCompQty);
                const shortage = +(Math.max(0, neededCompQty - availableQty)).toFixed(2);

                if (qtyToDeduct > 0 && whId) {
                    try {
                        await decreaseStock({
                            productId: compProduct._id,
                            warehouseId: whId,
                            quantity: qtyToDeduct,
                            movementType: 'production_consume',
                            sourceDocument: { type: 'invoice', id: invoice._id, number: invoice.invoiceNumber },
                            reason: `BOM Raw Material auto-deducted for Quotation #${quotation.quoteNumber}`,
                            userId: req.user._id
                        });
                        deductedItems.push({ productName: compProduct.name, quantity: qtyToDeduct, unitOfMeasure: compProduct.unitOfMeasure });
                    } catch (err) {
                        console.warn(`[Quotation Stock Deduct Error] ${compProduct.name}:`, err.message);
                    }
                }

                if (shortage > 0) {
                    const cost = comp.standardCost || compProduct.basePrice || compProduct.costs?.lastPurchaseCost || 0;
                    shortagePoItems.push({
                        productId: compProduct._id,
                        productCode: compProduct.productCode,
                        productName: compProduct.name,
                        description: `Material shortage for Order ${salesOrder.orderNumber}`,
                        orderedQuantity: shortage,
                        pendingQuantity: shortage,
                        receivedQuantity: 0,
                        unitOfMeasure: compProduct.unitOfMeasure,
                        unitPrice: cost,
                        lineSubtotal: +(shortage * cost).toFixed(2),
                        lineTotal: +(shortage * cost).toFixed(2),
                        notes: `Needed ${neededCompQty}, in stock ${availableQty}`
                    });
                }
            }
        } else {
            // Direct Product deduction
            const neededQty = it.quantity || 1;
            const stockItems = await StockItem.find({ productId: prod._id });
            const availableQty = stockItems.reduce((s, st) => s + Math.max(0, (st.quantities?.openStock !== undefined ? st.quantities.openStock : (st.quantities?.available || 0))), 0);
            const qtyToDeduct = Math.min(availableQty, neededQty);
            const shortage = +(Math.max(0, neededQty - availableQty)).toFixed(2);

            if (qtyToDeduct > 0 && whId) {
                try {
                    await decreaseStock({
                        productId: prod._id,
                        warehouseId: whId,
                        quantity: qtyToDeduct,
                        movementType: 'sale_dispatch',
                        sourceDocument: { type: 'invoice', id: invoice._id, number: invoice.invoiceNumber },
                        reason: `Product dispatched for Invoice #${invoice.invoiceNumber}`,
                        userId: req.user._id
                    });
                    deductedItems.push({ productName: prod.name, quantity: qtyToDeduct, unitOfMeasure: prod.unitOfMeasure });
                } catch (err) {
                    console.warn(`[Quotation Stock Deduct Error] ${prod.name}:`, err.message);
                }
            }

            if (shortage > 0) {
                const cost = prod.basePrice || prod.costs?.lastPurchaseCost || 0;
                shortagePoItems.push({
                    productId: prod._id,
                    productCode: prod.productCode,
                    productName: prod.name,
                    description: `Stock shortage for Order ${salesOrder.orderNumber}`,
                    orderedQuantity: shortage,
                    pendingQuantity: shortage,
                    receivedQuantity: 0,
                    unitOfMeasure: prod.unitOfMeasure,
                    unitPrice: cost,
                    lineSubtotal: +(shortage * cost).toFixed(2),
                    lineTotal: +(shortage * cost).toFixed(2),
                    notes: `Needed ${neededQty}, in stock ${availableQty}`
                });
            }
        }
    }

    let purchaseOrder = null;
    if (shortagePoItems.length > 0) {
        const poSubtotal = shortagePoItems.reduce((s, i) => s + (i.lineTotal || 0), 0);
        purchaseOrder = await PurchaseOrder.create({
            items: shortagePoItems,
            subtotal: poSubtotal,
            grandTotal: poSubtotal,
            status: 'draft',
            notes: `Auto-generated shortage Purchase Order for Quotation #${quotation.quoteNumber} (Sales Order ${salesOrder.orderNumber})`,
            createdBy: req.user._id
        });
    }

    quotation.status = 'converted';
    await quotation.save();

    createAuditLog({
        action: 'update',
        module: 'crm',
        documentId: quotation._id,
        documentCode: quotation.quoteNumber,
        description: `Converted quotation ${quotation.quoteNumber} to Sales Order ${salesOrder.orderNumber} & Invoice ${invoice.invoiceNumber}. Deducted ${deductedItems.length} items from stock.`,
        req
    });

    res.json({
        success: true,
        message: 'Quotation converted successfully',
        data: {
            quotation,
            salesOrder,
            invoice,
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            deductedItems,
            purchaseOrder: purchaseOrder ? {
                _id: purchaseOrder._id,
                poNumber: purchaseOrder.poNumber,
                shortageItemCount: shortagePoItems.length
            } : null
        }
    });
});
