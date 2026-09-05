import asyncHandler from 'express-async-handler';
import BillOfMaterials from '../models/BillOfMaterials.js';
import Product from '../models/Product.js';

export const createBom = asyncHandler(async (req, res) => {
    const { finishedProductId, components, ...rest } = req.body;

    const finished = await Product.findById(finishedProductId);
    if (!finished) { res.status(404); throw new Error('Finished product not found'); }

    // Ensure finished product is marked as manufacturable
    if (!finished.canBeManufactured) {
        finished.canBeManufactured = true;
        await finished.save();
    }

    // Enrich components
    const productIds = components.map((c) => c.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const pMap = new Map(products.map((p) => [p._id.toString(), p]));

    const enrichedComponents = components.map((c) => {
        const p = pMap.get(c.productId);
        if (!p) throw new Error(`Component product ${c.productId} not found`);
        return {
            productId: p._id,
            productCode: p.productCode,
            productName: p.name,
            productType: p.productType,
            componentType: c.componentType || (p.productType === 'raw_material' ? 'raw_material' : p.productType) || 'raw_material',
            quantity: c.quantity,
            unitOfMeasure: p.unitOfMeasure,
            wastagePercent: c.wastagePercent || 0,
            standardCost: c.standardCost ?? (p.costs?.averageCost || p.costs?.lastPurchaseCost || 0),
            productionStep: c.productionStep || 1,
            isOptional: c.isOptional || false,
            notes: c.notes,
        };
    });

    // If marking as default, unset other BOMs for this product
    if (rest.isDefault !== false) {
        await BillOfMaterials.updateMany(
            { finishedProductId, isDefault: true },
            { $set: { isDefault: false } }
        );
    }

    const bom = new BillOfMaterials({
        finishedProductId: finished._id,
        finishedProductCode: finished.productCode,
        finishedProductName: finished.name,
        outputUnitOfMeasure: rest.outputUnitOfMeasure || finished.unitOfMeasure,
        components: enrichedComponents,
        ...rest,
        createdBy: req.user._id,
    });

    await bom.save();

    const populated = await BillOfMaterials.findById(bom._id)
        .populate('finishedProductId', 'name productCode')
        .populate('components.productId', 'name productCode productType unitOfMeasure costs');

    res.status(201).json({ success: true, data: populated });
});

export const getBoms = asyncHandler(async (req, res) => {
    const {
        search, finishedProductId, status, isDefault,
        page = 1, limit = 20,
    } = req.query;

    const filter = {};
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { bomCode: { $regex: search, $options: 'i' } },
            { finishedProductName: { $regex: search, $options: 'i' } },
        ];
    }
    if (finishedProductId) filter.finishedProductId = finishedProductId;
    if (status) filter.status = status;
    if (isDefault !== undefined) filter.isDefault = isDefault === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const [boms, total] = await Promise.all([
        BillOfMaterials.find(filter)
            .populate('finishedProductId', 'name productCode')
            .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        BillOfMaterials.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: boms.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: boms,
    });
});

export const getBomById = asyncHandler(async (req, res) => {
    const bom = await BillOfMaterials.findById(req.params.id)
        .populate('finishedProductId', 'name productCode unitOfMeasure')
        .populate('components.productId', 'name productCode productType unitOfMeasure costs stockLevels')
        .populate('createdBy', 'firstName lastName');
    if (!bom) { res.status(404); throw new Error('BOM not found'); }
    res.json({ success: true, data: bom });
});

export const updateBom = asyncHandler(async (req, res) => {
    const bom = await BillOfMaterials.findById(req.params.id);
    if (!bom) { res.status(404); throw new Error('BOM not found'); }

    if (req.body.components) {
        const productIds = req.body.components.map((c) => c.productId);
        const products = await Product.find({ _id: { $in: productIds } });
        const pMap = new Map(products.map((p) => [p._id.toString(), p]));

        req.body.components = req.body.components.map((c) => {
            const p = pMap.get(c.productId);
            return {
                ...c,
                productCode: p?.productCode,
                productName: p?.name,
                productType: p?.productType,
                unitOfMeasure: p?.unitOfMeasure,
                standardCost: c.standardCost ?? (p?.costs?.averageCost || 0),
            };
        });
    }

    if (req.body.isDefault === true && req.body.finishedProductId) {
        await BillOfMaterials.updateMany(
            { finishedProductId: req.body.finishedProductId, _id: { $ne: bom._id }, isDefault: true },
            { $set: { isDefault: false } }
        );
    }

    Object.assign(bom, req.body);
    bom.updatedBy = req.user._id;
    await bom.save();

    res.json({ success: true, data: bom });
});

export const deleteBom = asyncHandler(async (req, res) => {
    const bom = await BillOfMaterials.findById(req.params.id);
    if (!bom) { res.status(404); throw new Error('BOM not found'); }
    bom.deletedAt = new Date();
    bom.status = 'archived';
    await bom.save();
    res.json({ success: true, message: 'BOM archived' });
});

/**
 * GET /api/boms/check-availability/:id?quantity=100
 * Check if we have enough raw materials to produce N units
 */
export const checkMaterialAvailability = asyncHandler(async (req, res) => {
    const bom = await BillOfMaterials.findById(req.params.id)
        .populate('components.productId', 'name productCode');
    if (!bom) { res.status(404); throw new Error('BOM not found'); }

    const targetQty = Number(req.query.quantity) || bom.outputQuantity;
    const batchMultiplier = targetQty / bom.outputQuantity;

    // For each component, check stock across all warehouses
    const StockItem = (await import('../models/StockItem.js')).default;

    const availability = [];
    for (const c of bom.components) {
        const needed = c.quantity * batchMultiplier * (1 + (c.wastagePercent || 0) / 100);
        const stockItems = await StockItem.find({ productId: c.productId });
        const totalAvailable = stockItems.reduce(
            (s, si) => s + Math.max(0, si.quantities.onHand - si.quantities.reserved), 0
        );

        availability.push({
            productId: c.productId._id,
            productCode: c.productCode,
            productName: c.productName,
            required: +needed.toFixed(4),
            available: +totalAvailable.toFixed(4),
            shortage: totalAvailable < needed ? +(needed - totalAvailable).toFixed(4) : 0,
            isSufficient: totalAvailable >= needed,
            unitOfMeasure: c.unitOfMeasure,
        });
    }

    const canProduce = availability.every((a) => a.isSufficient);

    res.json({
        success: true,
        data: {
            bomId: bom._id,
            targetQuantity: targetQty,
            batchMultiplier,
            canProduce,
            components: availability,
        },
    });
});