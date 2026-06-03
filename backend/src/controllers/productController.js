import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import backupEmitter, { BACKUP_EVENTS } from '../utils/backupEventEmitter.js';
import { createAuditLog } from '../utils/auditLogger.js';

export const createProduct = asyncHandler(async (req, res) => {
    const product = await Product.create({
        ...req.body,
        createdBy: req.user._id,
    });

    const populated = await Product.findById(product._id)
        .populate('categoryId', 'name code')
        .populate('brandId', 'name');

    res.status(201).json({ success: true, data: populated });
    
    createAuditLog({
        action: 'create',
        module: 'products',
        documentId: product._id,
        documentCode: product.productCode,
        description: `Created new product: ${product.name}`,
        req
    });
    
    backupEmitter.emit(BACKUP_EVENTS.PRODUCT_CHANGED);
});

export const getProducts = asyncHandler(async (req, res) => {
    const {
        search,
        categoryId,
        brandId,
        status,
        type,
        minPrice,
        maxPrice,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
    } = req.query;

    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { shortName: { $regex: search, $options: 'i' } },
            { productCode: { $regex: search, $options: 'i' } },
            { sku: { $regex: search, $options: 'i' } },
            { barcode: { $regex: search, $options: 'i' } },
        ];
    }

    if (categoryId) filter.categoryId = categoryId;
    if (brandId) filter.brandId = brandId;
    if (status) filter.status = status;
    if (type) filter.type = type;

    if (minPrice || maxPrice) {
        filter.basePrice = {};
        if (minPrice) filter.basePrice.$gte = Number(minPrice);
        if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [products, total] = await Promise.all([
        Product.find(filter)
            .populate('categoryId', 'name code')
            .populate('brandId', 'name')
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit)),
        Product.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: products.length,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        data: products,
    });
});

export const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id)
        .populate('categoryId', 'name code')
        .populate('brandId', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName');

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }
    res.json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req, res) => {
    const oldData = await Product.findById(req.params.id);
    const product = await Product.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user._id },
        { new: true, runValidators: true }
    )
        .populate('categoryId', 'name code')
        .populate('brandId', 'name');

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }
    res.json({ success: true, data: product });

    createAuditLog({
        action: 'update',
        module: 'products',
        documentId: product._id,
        documentCode: product.productCode,
        description: `Updated product: ${product.name}`,
        changes: req.body,
        previousData: oldData,
        req
    });

    backupEmitter.emit(BACKUP_EVENTS.PRODUCT_CHANGED);
});

export const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }
    product.deletedAt = new Date();
    product.status = 'inactive';
    await product.save();

    res.json({ success: true, message: 'Product deleted' });

    createAuditLog({
        action: 'delete',
        module: 'products',
        documentId: product._id,
        documentCode: product.productCode,
        description: `Soft-deleted product: ${product.name}`,
        req
    });

    backupEmitter.emit(BACKUP_EVENTS.PRODUCT_CHANGED);
});

export const predictYield = asyncHandler(async (req, res) => {
    const { productId, inputWeight } = req.query;

    if (!productId || !inputWeight) {
        res.status(400);
        throw new Error('productId and inputWeight are required');
    }

    const weight = Number(inputWeight);
    if (isNaN(weight) || weight <= 0) {
        res.status(400);
        throw new Error('inputWeight must be a valid positive number');
    }

    const { default: ConversionRule } = await import('../models/ConversionRule.js');
    
    // Find active conversion rule for this raw material
    const rule = await ConversionRule.findOne({ sourceProduct: productId, isActive: true })
        .populate('outputProduct', 'name productCode unitOfMeasure');

    if (!rule) {
        return res.json({
            success: false,
            message: 'No active yield formula or conversion factor configured for this raw material.',
            prediction: null
        });
    }

    const predictedWeight = +(weight * rule.expectedRatio).toFixed(3);

    res.json({
        success: true,
        data: {
            sourceProductId: productId,
            inputWeight: weight,
            ratio: rule.expectedRatio,
            predictedWeight,
            outputProduct: {
                _id: rule.outputProduct?._id,
                name: rule.outputProduct?.name,
                productCode: rule.outputProduct?.productCode,
                unitOfMeasure: rule.outputProduct?.unitOfMeasure
            }
        }
    });
});