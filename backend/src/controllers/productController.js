import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import PartCounter from '../models/PartCounter.js';
import ProductionBatch from '../models/ProductionBatch.js';
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
        productType,
        canBeSold,
        canBePurchased,
        canBeManufactured,
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
    if (status && status !== 'all') {
        filter.status = status;
    } else if (status !== 'all') {
        filter.status = 'active';
    }
    if (type) filter.type = type;
    if (productType) filter.productType = productType;
    if (canBeSold !== undefined) filter.canBeSold = canBeSold === 'true' || canBeSold === true;
    if (canBePurchased !== undefined) filter.canBePurchased = canBePurchased === 'true' || canBePurchased === true;
    if (canBeManufactured !== undefined) filter.canBeManufactured = canBeManufactured === 'true' || canBeManufactured === true;

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

export const getNextProductCode = asyncHandler(async (req, res) => {
    const { categoryId, productShortCode } = req.query;

    if (!categoryId) {
        res.status(400);
        throw new Error('Category ID is required');
    }

    const category = await Category.findById(categoryId);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    // Resolve Category Short Code (3-letter uppercase based on name/code, e.g. Mechanical -> MAC)
    const codeBase = category.code || category.name;
    const shortCode = codeBase
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 3)
        .toUpperCase();

    // Date computation (Timezone-agnostic UTC day of year)
    const today = new Date();
    
    // We use UTC calculation to avoid Daylight Saving Time (DST) offsets
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const utcJan1 = Date.UTC(today.getFullYear(), 0, 1);
    
    const dayOfYear = Math.floor((utcToday - utcJan1) / (24 * 60 * 60 * 1000)) + 1;
    
    const yearShort = today.getFullYear().toString().slice(-2);
    const julianDay = dayOfYear.toString().padStart(3, '0');

    const pShort = productShortCode ? String(productShortCode).trim().substring(0, 3).toUpperCase() : '';

    // Build the atomic lock key format: parts:[CategoryShortCode]:[ProductShortCode]:[YY][JulianDay]
    const counterKey = pShort
        ? `parts:${shortCode}:${pShort}:${yearShort}${julianDay}`
        : `parts:${shortCode}:${yearShort}${julianDay}`;

    // Atomically increment the sequence counter
    const counter = await PartCounter.findOneAndUpdate(
        { _id: counterKey },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const sequenceNo = counter.sequence.toString().padStart(2, '0');
    const productCode = pShort
        ? `P-${shortCode}-${pShort}-${yearShort}${julianDay}-${sequenceNo}`
        : `P-${shortCode}-${yearShort}${julianDay}-${sequenceNo}`;

    res.json({ success: true, productCode });
});

export const getProductForecasting = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Fetch all completed production batches for this product
    const batches = await ProductionBatch.find({
        productId: id,
        deletedAt: null,
        status: 'completed'
    }).sort({ date: 1 });

    if (!batches || batches.length === 0) {
        return res.json({
            success: true,
            data: { history: [], hasEnoughData: false }
        });
    }

    // Map historical batches to forecast input metrics
    const history = batches.map(b => {
        const inputWeight = b.inputWeight_total || 0;
        const outputWeight = b.outputWeight_total || 0;
        const efficiency = b.efficiencyPercentage || 
            (inputWeight > 0 ? +((outputWeight / inputWeight) * 100).toFixed(2) : 0);
        
        const firewood = (b.firewoodKg_day || 0) + (b.firewoodKg_night || 0);
        const electricity = b.electricityUnits || 0;

        return {
            date: b.date,
            batchNo: b.batchNo,
            inputWeight,
            outputWeight,
            efficiency,
            firewood,
            electricity
        };
    });

    const count = history.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    let totalInputWeight = 0, totalFirewood = 0, totalElectricity = 0;

    history.forEach((h, index) => {
        sumX += index;
        sumY += h.efficiency;
        sumXY += index * h.efficiency;
        sumXX += index * index;
        totalInputWeight += h.inputWeight;
        totalFirewood += h.firewood;
        totalElectricity += h.electricity;
    });

    // Simple Linear Regression calculation
    let slope = 0;
    let intercept = sumY / count; // default to average if count < 2
    
    if (count >= 2) {
        const denominator = (count * sumXX) - (sumX * sumX);
        if (denominator !== 0) {
            slope = ((count * sumXY) - (sumX * sumY)) / denominator;
            intercept = (sumY - (slope * sumX)) / count;
        }
    }

    // Moving average of last 5 batches
    const last5 = history.slice(-5);
    const movingAverageRatio = last5.reduce((sum, h) => sum + h.efficiency, 0) / Math.min(5, count);

    // Resource rates (units consumed per Kg of input material)
    const avgFirewoodRate = totalInputWeight > 0 ? (totalFirewood / totalInputWeight) : 0;
    const avgElectricityRate = totalInputWeight > 0 ? (totalElectricity / totalInputWeight) : 0;

    res.json({
        success: true,
        data: {
            hasEnoughData: count >= 3,
            history,
            statistics: {
                count,
                averageEfficiency: +(sumY / count).toFixed(2),
                movingAverageRatio: +movingAverageRatio.toFixed(2),
                avgFirewoodRate: +avgFirewoodRate.toFixed(4),
                avgElectricityRate: +avgElectricityRate.toFixed(4),
                slope: +slope.toFixed(4),
                intercept: +intercept.toFixed(2)
            }
        }
    });
});