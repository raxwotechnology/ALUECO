import asyncHandler from 'express-async-handler';
import AluProfile from '../models/AluProfile.js';
import AluGlass from '../models/AluGlass.js';
import AluAccessory from '../models/AluAccessory.js';
import AluApplication from '../models/AluApplication.js';
import AluScrap from '../models/AluScrap.js';
import AluJobCard from '../models/AluJobCard.js';
import AluSurvey from '../models/AluSurvey.js';

// === ALU PROFILES ===
export const getProfiles = asyncHandler(async (req, res) => {
    const profiles = await AluProfile.find({}).sort({ profileCode: 1 });
    res.json({ success: true, data: profiles });
});

export const createProfile = asyncHandler(async (req, res) => {
    const profile = await AluProfile.create(req.body);
    res.status(201).json({ success: true, data: profile });
});

export const updateProfile = asyncHandler(async (req, res) => {
    const profile = await AluProfile.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!profile) {
        res.status(404);
        throw new Error('Profile not found');
    }
    res.json({ success: true, data: profile });
});

export const deleteProfile = asyncHandler(async (req, res) => {
    const profile = await AluProfile.findByIdAndDelete(req.params.id);
    if (!profile) {
        res.status(404);
        throw new Error('Profile not found');
    }
    res.json({ success: true, message: 'Profile deleted successfully' });
});

// === ALU GLASS ===
export const getGlass = asyncHandler(async (req, res) => {
    const glass = await AluGlass.find({}).sort({ typeName: 1 });
    res.json({ success: true, data: glass });
});

export const createGlass = asyncHandler(async (req, res) => {
    const glass = await AluGlass.create(req.body);
    res.status(201).json({ success: true, data: glass });
});

export const updateGlass = asyncHandler(async (req, res) => {
    const glass = await AluGlass.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!glass) {
        res.status(404);
        throw new Error('Glass type not found');
    }
    res.json({ success: true, data: glass });
});

export const deleteGlass = asyncHandler(async (req, res) => {
    const glass = await AluGlass.findByIdAndDelete(req.params.id);
    if (!glass) {
        res.status(404);
        throw new Error('Glass type not found');
    }
    res.json({ success: true, message: 'Glass type deleted successfully' });
});

// === ALU ACCESSORIES ===
export const getAccessories = asyncHandler(async (req, res) => {
    const accessories = await AluAccessory.find({}).sort({ code: 1 });
    res.json({ success: true, data: accessories });
});

export const createAccessory = asyncHandler(async (req, res) => {
    const accessory = await AluAccessory.create(req.body);
    res.status(201).json({ success: true, data: accessory });
});

export const updateAccessory = asyncHandler(async (req, res) => {
    const accessory = await AluAccessory.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!accessory) {
        res.status(404);
        throw new Error('Accessory not found');
    }
    res.json({ success: true, data: accessory });
});

export const deleteAccessory = asyncHandler(async (req, res) => {
    const accessory = await AluAccessory.findByIdAndDelete(req.params.id);
    if (!accessory) {
        res.status(404);
        throw new Error('Accessory not found');
    }
    res.json({ success: true, message: 'Accessory deleted successfully' });
});

// === ALU APPLICATIONS ===
export const getApplications = asyncHandler(async (req, res) => {
    const applications = await AluApplication.find({}).sort({ type: 1, configuration: 1 });
    res.json({ success: true, data: applications });
});

export const createApplication = asyncHandler(async (req, res) => {
    const application = await AluApplication.create(req.body);
    res.status(201).json({ success: true, data: application });
});

export const updateApplication = asyncHandler(async (req, res) => {
    const application = await AluApplication.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!application) {
        res.status(404);
        throw new Error('Application template not found');
    }
    res.json({ success: true, data: application });
});

export const deleteApplication = asyncHandler(async (req, res) => {
    const application = await AluApplication.findByIdAndDelete(req.params.id);
    if (!application) {
        res.status(404);
        throw new Error('Application template not found');
    }
    res.json({ success: true, message: 'Application template deleted successfully' });
});

// === ALU SCRAP ===
export const getScraps = asyncHandler(async (req, res) => {
    const { status, profileCode } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (profileCode) filter.profileCode = profileCode.toUpperCase();
    
    const scraps = await AluScrap.find(filter).sort({ profileCode: 1, lengthMm: -1 });
    res.json({ success: true, data: scraps });
});

export const createScrap = asyncHandler(async (req, res) => {
    const scrap = await AluScrap.create(req.body);
    res.status(201).json({ success: true, data: scrap });
});

export const updateScrap = asyncHandler(async (req, res) => {
    const scrap = await AluScrap.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!scrap) {
        res.status(404);
        throw new Error('Scrap record not found');
    }
    res.json({ success: true, data: scrap });
});

export const deleteScrap = asyncHandler(async (req, res) => {
    const scrap = await AluScrap.findByIdAndDelete(req.params.id);
    if (!scrap) {
        res.status(404);
        throw new Error('Scrap record not found');
    }
    res.json({ success: true, message: 'Scrap record deleted successfully' });
});

// === ALU JOB CARDS (KANBAN) ===
export const getJobCards = asyncHandler(async (req, res) => {
    const jobCards = await AluJobCard.find({}).sort({ createdAt: -1 });
    
    // Transform data for project-wise product kanban
    const kanbanData = jobCards.map(jobCard => {
        return {
            _id: jobCard._id, // Include MongoDB _id
            jobCardNumber: jobCard.jobCardNumber,
            projectName: jobCard.projectName,
            customerName: jobCard.customerName,
            quotationId: jobCard.quotationId,
            items: jobCard.items.map(item => ({
                applicationType: item.applicationType,
                configuration: item.configuration,
                width: item.width,
                height: item.height,
                totalQuantity: item.quantity,
                cuttingQty: item.cuttingQty || 0,
                assemblyQty: item.assemblyQty || 0,
                glazingQty: item.glazingQty || 0,
                qaQty: item.qaQty || 0,
                readyQty: item.readyQty || 0
            }))
        };
    });
    
    res.json({ success: true, data: kanbanData });
});

export const updateJobCardStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const jobCard = await AluJobCard.findByIdAndUpdate(
        req.params.id,
        { status },
        { returnDocument: 'after' }
    );
    if (!jobCard) {
        res.status(404);
        throw new Error('Job Card not found');
    }
    res.json({ success: true, data: jobCard });
});

export const updateItemQuantityByStage = asyncHandler(async (req, res) => {
    const { jobCardId, itemIndex, stage, quantity } = req.body;
    
    const jobCard = await AluJobCard.findById(jobCardId);
    if (!jobCard) {
        res.status(404);
        throw new Error('Job Card not found');
    }
    
    if (!jobCard.items[itemIndex]) {
        res.status(404);
        throw new Error('Item not found');
    }
    
    // Update the specific stage quantity
    const stageField = `${stage}Qty`;
    jobCard.items[itemIndex][stageField] = quantity;
    
    await jobCard.save();
    res.json({ success: true, data: jobCard });
});

// === ALU ON-SITE SURVEYS ===
export const getSurveys = asyncHandler(async (req, res) => {
    const surveys = await AluSurvey.find({})
        .populate('customerId', 'displayName phone')
        .populate('inquiryId', 'inquiryCode status')
        .sort({ createdAt: -1 });
    res.json({ success: true, data: surveys });
});

export const createSurvey = asyncHandler(async (req, res) => {
    const count = await AluSurvey.countDocuments({});
    const surveyNumber = `SRV-${String(count + 1).padStart(4, '0')}`;
    
    const survey = await AluSurvey.create({
        ...req.body,
        surveyNumber
    });
    res.status(201).json({ success: true, data: survey });
});

export const updateSurvey = asyncHandler(async (req, res) => {
    const survey = await AluSurvey.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!survey) {
        res.status(404);
        throw new Error('Survey record not found');
    }
    res.json({ success: true, data: survey });
});

export const deleteSurvey = asyncHandler(async (req, res) => {
    const survey = await AluSurvey.findByIdAndDelete(req.params.id);
    if (!survey) {
        res.status(404);
        throw new Error('Survey record not found');
    }
    res.json({ success: true, message: 'Survey record deleted successfully' });
});

// === ALU PROJECT STOCK CHECKS & RESERVATIONS ===
export const checkProjectStockAndShortages = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { warehouseId } = req.query;
    
    if (!warehouseId) {
        res.status(400);
        throw new Error('warehouseId query parameter is required');
    }
    
    const { checkStockAndShortages: checkS } = await import('../services/bomExplosionService.js');
    const result = await checkS(id, warehouseId);
    res.json({ success: true, data: result });
});

export const reserveProjectMaterials = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { warehouseId } = req.body;
    
    if (!warehouseId) {
        res.status(400);
        throw new Error('warehouseId is required');
    }
    
    const { reserveStockForProject } = await import('../services/bomExplosionService.js');
    const result = await reserveStockForProject(id, warehouseId, req.user._id);
    res.json({ success: true, data: result });
});

export const issueProjectMaterials = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const body = req.body || {};
    const { warehouseId } = body;

    // If warehouseId not provided, use default warehouse
    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
        const Warehouse = (await import('../models/Warehouse.js')).default;
        const defaultWarehouse = await Warehouse.findOne({ isDefault: true, deletedAt: null }) || await Warehouse.findOne({ deletedAt: null });
        if (!defaultWarehouse) {
            res.status(400);
            throw new Error('No warehouse found. Please specify a warehouseId.');
        }
        targetWarehouseId = defaultWarehouse._id;
    }

    const { issueMaterialsToProduction } = await import('../services/bomExplosionService.js');
    const result = await issueMaterialsToProduction(id, targetWarehouseId, req.user._id);
    res.json({ success: true, data: result });
});

export const issueMaterialsToProject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const body = req.body || {};
    const { warehouseId } = body;

    // If warehouseId not provided, use default warehouse
    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
        const Warehouse = (await import('../models/Warehouse.js')).default;
        const defaultWarehouse = await Warehouse.findOne({ isDefault: true, deletedAt: null }) || await Warehouse.findOne({ deletedAt: null });
        if (!defaultWarehouse) {
            res.status(400);
            throw new Error('No warehouse found. Please specify a warehouseId.');
        }
        targetWarehouseId = defaultWarehouse._id;
    }

    const { decreaseStock } = await import('../services/stockService.js');
    const AluQuotation = (await import('../models/AluQuotation.js')).default;
    const StockItem = (await import('../models/StockItem.js')).default;
    const Product = (await import('../models/Product.js')).default;

    // Find the quotation/project
    const quotation = await AluQuotation.findById(id);
    if (!quotation) {
        res.status(404);
        throw new Error('Project/Quotation not found');
    }

    let issuedCount = 0;
    const skippedItems = [];

    // Issue profiles from cuttingOptimizationResults
    if (quotation.cuttingOptimizationResults && Object.keys(quotation.cuttingOptimizationResults).length > 0) {
        for (const [key, profile] of Object.entries(quotation.cuttingOptimizationResults)) {
            const code = (profile.profileCode || '').toUpperCase();
            if (!code) continue;

            const product = await Product.findOne({ productCode: code, deletedAt: null });
            if (product) {
                const stockItem = await StockItem.findOne({
                    productId: product._id,
                    warehouseId: targetWarehouseId
                });

                const totalBars = profile.totalBarsPurchased || (profile.bars ? profile.bars.length : 0);
                if (stockItem && stockItem.quantities.onHand >= totalBars) {
                    await decreaseStock({
                        productId: product._id,
                        warehouseId: targetWarehouseId,
                        quantity: totalBars,
                        movementType: 'production_issue',
                        sourceDocument: {
                            type: 'quotation',
                            id: quotation._id,
                            number: quotation.quoteNumber,
                            projectName: quotation.projectName
                        },
                        reason: `Issued ${totalBars} bars of ${code} to project ${quotation.projectName}`,
                        userId: req.user._id,
                    });
                    issuedCount++;
                } else {
                    skippedItems.push({ code, reason: 'Insufficient stock' });
                }
            }
        }
    }

    // Issue glass, accessories, and gaskets from items
    if (quotation.items && quotation.items.length > 0) {
        for (const item of quotation.items) {
            // Glass items
            if (item.glassItems && item.glassItems.length > 0) {
                for (const glass of item.glassItems) {
                    const code = (glass.glassCode || '').toUpperCase();
                    if (!code) continue;

                    const product = await Product.findOne({ productCode: code, deletedAt: null });
                    if (product) {
                        const stockItem = await StockItem.findOne({
                            productId: product._id,
                            warehouseId: targetWarehouseId
                        });

                        const qty = glass.qty || 1;
                        if (stockItem && stockItem.quantities.onHand >= qty) {
                            await decreaseStock({
                                productId: product._id,
                                warehouseId: targetWarehouseId,
                                quantity: qty,
                                movementType: 'production_issue',
                                sourceDocument: {
                                    type: 'quotation',
                                    id: quotation._id,
                                    number: quotation.quoteNumber,
                                    projectName: quotation.projectName
                                },
                                reason: `Issued ${qty} panes of ${code} to project ${quotation.projectName}`,
                                userId: req.user._id,
                            });
                            issuedCount++;
                        } else {
                            skippedItems.push({ code, reason: 'Insufficient stock' });
                        }
                    }
                }
            }

            // Accessory items
            if (item.accessories && item.accessories.length > 0) {
                for (const accessory of item.accessories) {
                    const code = (accessory.code || '').toUpperCase();
                    if (!code) continue;

                    const product = await Product.findOne({ productCode: code, deletedAt: null });
                    if (product) {
                        const stockItem = await StockItem.findOne({
                            productId: product._id,
                            warehouseId: targetWarehouseId
                        });

                        const qty = accessory.qty || 0;
                        const unit = accessory.unit || 'pcs';
                        if (stockItem && stockItem.quantities.onHand >= qty) {
                            await decreaseStock({
                                productId: product._id,
                                warehouseId: targetWarehouseId,
                                quantity: qty,
                                movementType: 'production_issue',
                                sourceDocument: {
                                    type: 'quotation',
                                    id: quotation._id,
                                    number: quotation.quoteNumber,
                                    projectName: quotation.projectName
                                },
                                reason: `Issued ${qty} ${unit} of ${code} to project ${quotation.projectName}`,
                                userId: req.user._id,
                            });
                            issuedCount++;
                        } else {
                            skippedItems.push({ code, reason: 'Insufficient stock' });
                        }
                    }
                }
            }

            // Gasket items
            if (item.gasketItems && item.gasketItems.length > 0) {
                for (const gasket of item.gasketItems) {
                    const code = (gasket.code || '').toUpperCase();
                    if (!code) continue;

                    const product = await Product.findOne({ productCode: code, deletedAt: null });
                    if (product) {
                        const stockItem = await StockItem.findOne({
                            productId: product._id,
                            warehouseId: targetWarehouseId
                        });

                        const qty = gasket.qty || 0;
                        const unit = gasket.unit || 'm';
                        if (stockItem && stockItem.quantities.onHand >= qty) {
                            await decreaseStock({
                                productId: product._id,
                                warehouseId: targetWarehouseId,
                                quantity: qty,
                                movementType: 'production_issue',
                                sourceDocument: {
                                    type: 'quotation',
                                    id: quotation._id,
                                    number: quotation.quoteNumber,
                                    projectName: quotation.projectName
                                },
                                reason: `Issued ${qty} ${unit} of ${code} to project ${quotation.projectName}`,
                                userId: req.user._id,
                            });
                            issuedCount++;
                        } else {
                            skippedItems.push({ code, reason: 'Insufficient stock' });
                        }
                    }
                }
            }
        }
    }

    if (skippedItems.length > 0) {
        console.log('[issueMaterialsToProject] Skipped items due to insufficient stock:', skippedItems);
    }

    res.json({ 
        success: true, 
        data: { 
            issuedItemCount: issuedCount,
            skippedItems: skippedItems.length > 0 ? skippedItems : undefined
        } 
    });
});

// === DEDICATED ALUECO RAW MATERIALS & GRN ===

export const getAluRawMaterials = asyncHandler(async (req, res) => {
    const { category, warehouseId, search } = req.query;
    const Product = (await import('../models/Product.js')).default;
    const StockItem = (await import('../models/StockItem.js')).default;

    const filter = {
        $or: [
            { businessType: 'alueco' },
            { productType: 'raw_material' },
            { category: 'Aluminium Stock' }
        ],
        deletedAt: null
    };

    if (category && category !== 'all') {
        filter.aluCategory = category;
    }

    if (search) {
        filter.$and = [
            {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { productCode: { $regex: search, $options: 'i' } },
                    { 'aluSpecs.series': { $regex: search, $options: 'i' } }
                ]
            }
        ];
    }

    const products = await Product.find(filter).sort({ name: 1 });
    const productIds = products.map(p => p._id);

    const stockFilter = { productId: { $in: productIds } };
    if (warehouseId) {
        stockFilter.warehouseId = warehouseId;
    }

    const stockItems = await StockItem.find(stockFilter)
        .populate('warehouseId', 'name warehouseCode')
        .populate('productId', 'name productCode unitOfMeasure stockLevels aluCategory aluSpecs businessType costs basePrice');

    const sanitizedStockItems = stockItems.map(item => {
        const itemObj = item.toObject ? item.toObject() : { ...item };
        if (itemObj.productId?.unitOfMeasure) {
            itemObj.unitOfMeasure = itemObj.productId.unitOfMeasure;
        }
        return itemObj;
    });

    res.json({
        success: true,
        data: {
            products,
            stockItems: sanitizedStockItems
        }
    });
});

export const createAluRawMaterial = asyncHandler(async (req, res) => {
    let items = req.body.items;

    console.log('=== createAluRawMaterial called ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Support single product payload as fallback
    if (!items || !Array.isArray(items)) {
        items = [req.body];
    }

    if (items.length === 0) {
        res.status(400);
        throw new Error('At least one raw material item is required.');
    }

    const Product = (await import('../models/Product.js')).default;
    const { increaseStock } = await import('../services/stockService.js');
    const mongoose = (await import('mongoose')).default;

    // Validate codes
    for (const it of items) {
        console.log('Validating item:', it);
        if (!it.name || !it.name.trim()) {
            console.log('ERROR: Material name is missing');
            res.status(400);
            throw new Error('Material name is required for all items.');
        }
        const cleanCode = (it.productCode || '').trim().toUpperCase();
        console.log('Clean code:', cleanCode);
        if (cleanCode) {
            const existing = await Product.findOne({ productCode: cleanCode, deletedAt: null });
            console.log('Existing product with this code:', existing);
            if (existing) {
                res.status(400);
                throw new Error(`Item Code "${cleanCode}" already exists. Please provide a unique code.`);
            }
        }
    }

    const createdProducts = [];
    const Warehouse = (await import('../models/Warehouse.js')).default;

    // Ensure a valid warehouse exists
    let targetWhId = req.body.warehouseId;
    if (!targetWhId) {
        const firstWh = await Warehouse.findOne({ isActive: { $ne: false } });
        if (firstWh) {
            targetWhId = firstWh._id;
        } else {
            const newWh = await Warehouse.create({
                name: 'Fabrication Main Warehouse',
                warehouseCode: 'WH-MAIN',
                type: 'raw_materials',
                isDefault: true,
                isActive: true
            });
            targetWhId = newWh._id;
        }
    }

    for (const it of items) {
        const cleanCode = (it.productCode || '').trim().toUpperCase();
        const defaultWarehouseId = it.warehouseId || targetWhId;
        const specs = it.specs || {};

        const [product] = await Product.create([{
            productCode: cleanCode || undefined,
            name: it.name.trim(),
            businessType: 'alueco',
            aluCategory: it.aluCategory || 'profiles',
            aluSpecs: {
                series: specs.series || it.series || '',
                thickness: specs.thickness || it.thickness || '',
                finish: specs.finish || it.finish || '',
                lengthMm: Number(specs.lengthMm || it.lengthMm) || 0,
                brand: it.supplierName || specs.brand || '',
                type: specs.type || '',
                profile: specs.profile || '',
                colour: specs.colour || '',
                length: specs.length || '',
                width: specs.width || '',
                height: specs.height || '',
                side: specs.side || '',
                description: specs.description || '',
                // Add profile pricing fields
                standardLength: specs.standardLength || '',
                cutLength: specs.cutLength || '',
                fullBarPrice: Number(specs.fullBarPrice) || 0,
            },
            productType: 'raw_material',
            type: 'raw_material',
            canBeManufactured: false,
            canBePurchased: true,
            canBeSold: false,
            unitOfMeasure: it.unitOfMeasure || 'Lengths',
            basePrice: Number(it.purchaseCost) || 0,
            costs: {
                lastPurchaseCost: Number(it.purchaseCost) || 0,
                standardCost: Number(it.purchaseCost) || 0,
                averageCost: Number(it.purchaseCost) || 0,
            },
            stockLevels: {
                reorderLevel: Number(it.reorderLevel) || 5,
                minimumLevel: Number(it.minimumLevel) || 2,
            },
            notes: it.notes || '',
            createdBy: req.user?._id
        }]);

        // If opening stock is specified and warehouse provided, create stock
        const qty = Number(it.openingStockQuantity || it.quantity || 0);
        if (qty > 0 && defaultWarehouseId) {
            await increaseStock({
                productId: product._id,
                warehouseId: defaultWarehouseId,
                quantity: qty,
                costPerUnit: Number(it.purchaseCost) || 0,
                movementType: 'opening_stock',
                sourceDocument: { type: 'opening_stock', number: 'ALU-BATCH-OPEN' },
                reason: 'AluEco Initial Opening Raw Material Stock',
                notes: `Opening balance for ${product.name} (${product.productCode})`,
                userId: req.user?._id,
            });
        }

        createdProducts.push(product);
    }

    res.status(201).json({
        success: true,
        message: `Successfully created ${createdProducts.length} AluEco Raw Material(s) with initial stock!`,
        data: createdProducts
    });
});

export const updateAluRawMaterial = asyncHandler(async (req, res) => {
    const Product = (await import('../models/Product.js')).default;
    const { id } = req.params;

    console.log('=== updateAluRawMaterial called ===');
    console.log('Product ID:', id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const existing = await Product.findById(id);
    if (!existing) {
        console.log('ERROR: Product not found');
        res.status(404);
        throw new Error('Raw material not found');
    }

    const update = { ...req.body };
    const oldProductCode = (existing.productCode || '').trim().toUpperCase();
    const newProductCode = (update.productCode || oldProductCode).trim().toUpperCase();
    const isProductCodeChanged = Boolean(newProductCode && oldProductCode && newProductCode !== oldProductCode);

    // If productCode changed, check for duplicate unique codes
    if (isProductCodeChanged) {
        const duplicate = await Product.findOne({
            _id: { $ne: id },
            productCode: newProductCode,
            deletedAt: null
        });
        if (duplicate) {
            res.status(400);
            throw new Error(`Item Code "${newProductCode}" is already in use by another material ("${duplicate.name}"). Please use a unique code.`);
        }
        update.productCode = newProductCode;
    } else {
        update.productCode = oldProductCode;
    }

    // Merge costs and aluSpecs properly to preserve existing data
    if (update.costs) {
        update.costs = { ...(existing.costs?.toObject?.() || existing.costs || {}), ...update.costs };
    }
    if (update.aluSpecs) {
        update.aluSpecs = { ...(existing.aluSpecs?.toObject?.() || existing.aluSpecs || {}), ...update.aluSpecs };
    }

    console.log('Final update object:', update);

    // Update the product directly
    const product = await Product.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true });
    
    console.log('Updated product:', product);

    const StockItem = (await import('../models/StockItem.js')).default;

    // Synchronize denormalized productCode, productName, unitOfMeasure to all StockItem records
    const newCost = (update.costs && update.costs.lastPurchaseCost !== undefined)
        ? Number(update.costs.lastPurchaseCost)
        : (update.basePrice !== undefined ? Number(update.basePrice) : (product.costs?.lastPurchaseCost || product.basePrice || 0));

    await StockItem.updateMany(
        { productId: id },
        { 
            productCode: product.productCode,
            productName: product.name,
            unitOfMeasure: product.unitOfMeasure,
            ...(newCost >= 0 ? { costPerUnit: newCost } : {})
        }
    );

    if (newCost >= 0) {
        const stockItems = await StockItem.find({ productId: id });
        for (const stockItem of stockItems) {
            stockItem.totalValue = +(stockItem.quantities.onHand * newCost).toFixed(2);
            await stockItem.save();
        }
    }

    // CASCADE ITEM CODE & NAME CHANGES TO BOMs, APPLICATIONS, QUOTATIONS, POs, etc.
    const effectiveCode = product.productCode;
    const effectiveOldCode = oldProductCode;

    // 1. BillOfMaterials (Standard BOM Components)
    try {
        const BillOfMaterials = (await import('../models/BillOfMaterials.js')).default;
        await BillOfMaterials.updateMany(
            { 
                $or: [
                    { 'components.productId': id },
                    ...(effectiveOldCode ? [{ 'components.productCode': effectiveOldCode }] : [])
                ]
            },
            { 
                'components.$[elem].productCode': effectiveCode,
                'components.$[elem].productName': product.name,
                'components.$[elem].unitOfMeasure': product.unitOfMeasure,
                ...(newCost >= 0 ? { 'components.$[elem].standardCost': newCost } : {})
            },
            { 
                arrayFilters: [
                    { 
                        $or: [
                            { 'elem.productId': id },
                            ...(effectiveOldCode ? [{ 'elem.productCode': effectiveOldCode }] : [])
                        ]
                    }
                ] 
            }
        );
    } catch (err) {
        console.error('Failed to cascade to BillOfMaterials:', err);
    }

    // 2. AluApplication (Alu System BOM Formulas / Configurator Templates)
    if (effectiveOldCode && isProductCodeChanged) {
        try {
            const AluApplication = (await import('../models/AluApplication.js')).default;
            
            // Profile BOM cuts
            await AluApplication.updateMany(
                { 
                    $or: [
                        { 'profileBOM.profileCode': effectiveOldCode },
                        { 'profileBOM.actualCode': effectiveOldCode }
                    ]
                },
                { 
                    'profileBOM.$[elem].profileCode': effectiveCode,
                    'profileBOM.$[elem].actualCode': effectiveCode,
                    'profileBOM.$[elem].description': product.name
                },
                { 
                    arrayFilters: [
                        { 
                            $or: [
                                { 'elem.profileCode': effectiveOldCode },
                                { 'elem.actualCode': effectiveOldCode }
                            ]
                        }
                    ] 
                }
            );

            // Glass BOM
            await AluApplication.updateMany(
                { 'glassBOM.glassCode': effectiveOldCode },
                { 'glassBOM.$[elem].glassCode': effectiveCode },
                { arrayFilters: [{ 'elem.glassCode': effectiveOldCode }] }
            );

            // Accessory BOM
            await AluApplication.updateMany(
                { 
                    $or: [
                        { 'accessoryBOM.accessoryCode': effectiveOldCode },
                        { 'accessoryBOM.actualCode': effectiveOldCode }
                    ]
                },
                { 
                    'accessoryBOM.$[elem].accessoryCode': effectiveCode,
                    'accessoryBOM.$[elem].actualCode': effectiveCode
                },
                { 
                    arrayFilters: [
                        { 
                            $or: [
                                { 'elem.accessoryCode': effectiveOldCode },
                                { 'elem.actualCode': effectiveOldCode }
                            ]
                        }
                    ] 
                }
            );

            // Gasket BOM
            await AluApplication.updateMany(
                { 
                    $or: [
                        { 'gasketBOM.gasketCode': effectiveOldCode },
                        { 'gasketBOM.actualCode': effectiveOldCode }
                    ]
                },
                { 
                    'gasketBOM.$[elem].gasketCode': effectiveCode,
                    'gasketBOM.$[elem].actualCode': effectiveCode,
                    'gasketBOM.$[elem].name': product.name
                },
                { 
                    arrayFilters: [
                        { 
                            $or: [
                                { 'elem.gasketCode': effectiveOldCode },
                                { 'elem.actualCode': effectiveOldCode }
                            ]
                        }
                    ] 
                }
            );
        } catch (err) {
            console.error('Failed to cascade to AluApplication:', err);
        }
    }

    // 3. AluQuotation (Quotations with BOM snapshots)
    if (effectiveOldCode && isProductCodeChanged) {
        try {
            const AluQuotation = (await import('../models/AluQuotation.js')).default;
            await AluQuotation.updateMany(
                { 'items.profileCuts.profileCode': effectiveOldCode },
                { 
                    'items.$[itemElem].profileCuts.$[cutElem].profileCode': effectiveCode,
                    'items.$[itemElem].profileCuts.$[cutElem].description': product.name
                },
                { 
                    arrayFilters: [
                        { 'itemElem.profileCuts.profileCode': effectiveOldCode },
                        { 'cutElem.profileCode': effectiveOldCode }
                    ] 
                }
            );

            await AluQuotation.updateMany(
                { 'items.glassItems.glassCode': effectiveOldCode },
                { 'items.$[itemElem].glassItems.$[glassElem].glassCode': effectiveCode },
                { 
                    arrayFilters: [
                        { 'itemElem.glassItems.glassCode': effectiveOldCode },
                        { 'glassElem.glassCode': effectiveOldCode }
                    ] 
                }
            );

            await AluQuotation.updateMany(
                { 'items.accessories.code': effectiveOldCode },
                { 
                    'items.$[itemElem].accessories.$[accElem].code': effectiveCode,
                    'items.$[itemElem].accessories.$[accElem].name': product.name
                },
                { 
                    arrayFilters: [
                        { 'itemElem.accessories.code': effectiveOldCode },
                        { 'accElem.code': effectiveOldCode }
                    ] 
                }
            );
        } catch (err) {
            console.error('Failed to cascade to AluQuotation:', err);
        }
    }

    // 4. AluPurchaseOrder (Aluminium PO Items)
    try {
        const AluPurchaseOrder = (await import('../models/AluPurchaseOrder.js')).default;
        await AluPurchaseOrder.updateMany(
            { 
                $or: [
                    { 'items.productId': id },
                    ...(effectiveOldCode ? [{ 'items.itemCode': effectiveOldCode }] : [])
                ]
            },
            { 
                'items.$[elem].itemCode': effectiveCode,
                'items.$[elem].productName': product.name,
                'items.$[elem].unitOfMeasure': product.unitOfMeasure
            },
            { 
                arrayFilters: [
                    { 
                        $or: [
                            { 'elem.productId': id },
                            ...(effectiveOldCode ? [{ 'elem.itemCode': effectiveOldCode }] : [])
                        ]
                    }
                ] 
            }
        );
    } catch (err) {
        console.error('Failed to cascade to AluPurchaseOrder:', err);
    }

    // 5. General PurchaseOrder & GoodsReceiptNote
    try {
        const PurchaseOrder = (await import('../models/PurchaseOrder.js')).default;
        await PurchaseOrder.updateMany(
            { 
                $or: [
                    { 'items.productId': id },
                    ...(effectiveOldCode ? [{ 'items.productCode': effectiveOldCode }, { 'items.itemCode': effectiveOldCode }] : [])
                ]
            },
            { 
                'items.$[elem].productCode': effectiveCode,
                'items.$[elem].itemCode': effectiveCode,
                'items.$[elem].productName': product.name
            },
            { 
                arrayFilters: [
                    { 
                        $or: [
                            { 'elem.productId': id },
                            ...(effectiveOldCode ? [{ 'elem.productCode': effectiveOldCode }, { 'elem.itemCode': effectiveOldCode }] : [])
                        ]
                    }
                ] 
            }
        );

        const GoodsReceiptNote = (await import('../models/GoodsReceiptNote.js')).default;
        await GoodsReceiptNote.updateMany(
            { 
                $or: [
                    { 'items.productId': id },
                    ...(effectiveOldCode ? [{ 'items.productCode': effectiveOldCode }, { 'items.itemCode': effectiveOldCode }] : [])
                ]
            },
            { 
                'items.$[elem].productCode': effectiveCode,
                'items.$[elem].itemCode': effectiveCode,
                'items.$[elem].productName': product.name
            },
            { 
                arrayFilters: [
                    { 
                        $or: [
                            { 'elem.productId': id },
                            ...(effectiveOldCode ? [{ 'elem.productCode': effectiveOldCode }, { 'elem.itemCode': effectiveOldCode }] : [])
                        ]
                    }
                ] 
            }
        );
    } catch (err) {
        console.error('Failed to cascade to PO/GRN:', err);
    }

    // 6. StockMovement, ProductionOrder, SalesOrder, Invoice
    try {
        const StockMovement = (await import('../models/StockMovement.js')).default;
        await StockMovement.updateMany(
            { 
                $or: [
                    { productId: id },
                    ...(effectiveOldCode ? [{ productCode: effectiveOldCode }] : [])
                ]
            },
            { productCode: effectiveCode, productName: product.name }
        );

        const ProductionOrder = (await import('../models/ProductionOrder.js')).default;
        await ProductionOrder.updateMany(
            { 
                $or: [
                    { 'items.productId': id },
                    ...(effectiveOldCode ? [{ 'items.productCode': effectiveOldCode }] : [])
                ]
            },
            { 
                'items.$[elem].productCode': effectiveCode,
                'items.$[elem].productName': product.name
            },
            { 
                arrayFilters: [
                    { 
                        $or: [
                            { 'elem.productId': id },
                            ...(effectiveOldCode ? [{ 'elem.productCode': effectiveOldCode }] : [])
                        ]
                    }
                ] 
            }
        );

        const SalesOrder = (await import('../models/SalesOrder.js')).default;
        await SalesOrder.updateMany(
            { 
                $or: [
                    { 'items.productId': id },
                    ...(effectiveOldCode ? [{ 'items.productCode': effectiveOldCode }] : [])
                ]
            },
            { 
                'items.$[elem].productCode': effectiveCode,
                'items.$[elem].productName': product.name
            },
            { 
                arrayFilters: [
                    { 
                        $or: [
                            { 'elem.productId': id },
                            ...(effectiveOldCode ? [{ 'elem.productCode': effectiveOldCode }] : [])
                        ]
                    }
                ] 
            }
        );

        const Invoice = (await import('../models/Invoice.js')).default;
        await Invoice.updateMany(
            { 
                $or: [
                    { 'items.productId': id },
                    ...(effectiveOldCode ? [{ 'items.productCode': effectiveOldCode }] : [])
                ]
            },
            { 
                'items.$[elem].productCode': effectiveCode,
                'items.$[elem].productName': product.name
            },
            { 
                arrayFilters: [
                    { 
                        $or: [
                            { 'elem.productId': id },
                            ...(effectiveOldCode ? [{ 'elem.productCode': effectiveOldCode }] : [])
                        ]
                    }
                ] 
            }
        );
    } catch (err) {
        console.error('Failed to cascade to StockMovement/Production/Sales/Invoice:', err);
    }

    // 7. AluProfile, AluGlass, AluAccessory
    if (effectiveOldCode && isProductCodeChanged) {
        try {
            const AluProfile = (await import('../models/AluProfile.js')).default;
            await AluProfile.updateMany(
                { profileCode: effectiveOldCode },
                { profileCode: effectiveCode, description: product.name }
            );

            const AluGlass = (await import('../models/AluGlass.js')).default;
            await AluGlass.updateMany(
                { glassCode: effectiveOldCode },
                { glassCode: effectiveCode }
            );

            const AluAccessory = (await import('../models/AluAccessory.js')).default;
            await AluAccessory.updateMany(
                { code: effectiveOldCode },
                { code: effectiveCode, name: product.name }
            );
        } catch (err) {
            console.error('Failed to cascade to AluProfile/Glass/Accessory:', err);
        }
    }

    console.log(`Cascade update completed for product ${id} (code: ${effectiveCode})`);

    res.json({ success: true, message: 'Raw material and all related records updated successfully', data: product });
});

export const deleteAluRawMaterial = asyncHandler(async (req, res) => {
    const Product = (await import('../models/Product.js')).default;
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(id, { deletedAt: new Date() }, { returnDocument: 'after' });
    if (!product) {
        res.status(404);
        throw new Error('Raw material not found');
    }
    res.json({ success: true, message: 'Raw material deleted successfully' });
});

export const processAluGrn = asyncHandler(async (req, res) => {
    const {
        warehouseId,
        supplierId,
        supplierName,
        invoiceNumber,
        notes,
        items = []
    } = req.body;

    if (!warehouseId || !items.length) {
        res.status(400);
        throw new Error('Warehouse and at least one material item are required for GRN.');
    }

    const { increaseStock } = await import('../services/stockService.js');
    const AluPurchaseOrder = (await import('../models/AluPurchaseOrder.js')).default;
    const Product = (await import('../models/Product.js')).default;
    const GoodsReceiptNote = (await import('../models/GoodsReceiptNote.js')).default;
    const Bill = (await import('../models/Bill.js')).default;
    const Supplier = (await import('../models/Supplier.js')).default;

    let supplier = null;
    if (supplierId) {
        supplier = await Supplier.findById(supplierId);
    }
    if (!supplier && supplierName) {
        supplier = await Supplier.findOne({
            $or: [{ displayName: supplierName }, { name: supplierName }, { companyName: supplierName }]
        });
    }

    const grnNumber = `ALU-GRN-${Date.now().toString().slice(-6)}`;
    const results = [];
    const grnLineItems = [];
    const billLineItems = [];

    for (const item of items) {
        const targetCode = (item.itemCode || item.productCode || '').toUpperCase();
        let pId = item.productId;
        let pName = item.productName || item.description || `AluEco Raw Material (${targetCode})`;

        if (!pId && targetCode) {
            let found = await Product.findOne({
                $or: [{ productCode: targetCode }, { sku: targetCode }]
            });

            if (!found) {
                // Auto-create raw material product entry if it doesn't exist
                found = new Product({
                    productCode: targetCode,
                    name: pName,
                    productType: 'raw_material',
                    businessType: 'alueco',
                    unitOfMeasure: item.unitOfMeasure || 'pcs',
                    costPrice: Number(item.unitCost) || 0,
                    status: 'active'
                });
                await found.save();
            }
            pId = found._id;
            pName = found.name;
        }

        if (!pId || !item.quantityReceived) continue;

        const qty = Number(item.quantityReceived);
        const cost = Number(item.unitCost) || 0;

        const stockResult = await increaseStock({
            productId: pId,
            warehouseId,
            quantity: qty,
            costPerUnit: cost,
            movementType: 'grn',
            sourceDocument: { type: 'grn', number: grnNumber },
            reason: `AluEco GRN from ${supplier?.displayName || supplierName || 'Supplier'}`,
            notes: invoiceNumber ? `Supplier Invoice #${invoiceNumber}` : notes,
            userId: req.user?._id,
        });

        // Check if this item is linked to a project via PO and auto-allocate to production
        if (targetCode && item.poId) {
            const po = await AluPurchaseOrder.findById(item.poId);
            if (po && po.quotationId) {
                // This PO is linked to a quotation/project - auto-issue to production
                const { decreaseStock } = await import('../services/stockService.js');
                const AluQuotation = (await import('../models/AluQuotation.js')).default;
                const quotation = await AluQuotation.findById(po.quotationId);
                
                if (quotation) {
                    await decreaseStock({
                        productId: pId,
                        warehouseId,
                        quantity: qty,
                        movementType: 'production_issue',
                        sourceDocument: {
                            type: 'sales_order',
                            id: quotation._id,
                            number: quotation.quoteNumber,
                            projectName: quotation.projectName
                        },
                        reason: `Auto-allocated to project ${quotation.projectName || quotation.quoteNumber} from PO ${po.poNumber}`,
                        userId: req.user?._id,
                    });
                    console.log(`[GRN Auto-Allocation] ${qty} ${item.unitOfMeasure || 'pcs'} of ${targetCode} allocated to project ${quotation.projectName}`);
                    
                    // Update quotation status to in_production
                    await AluQuotation.findByIdAndUpdate(quotation._id, { status: 'in_production' });
                }
            }
        }

        grnLineItems.push({
            productId: pId,
            productCode: targetCode,
            productName: pName,
            orderedQuantity: qty,
            receivedQuantity: qty,
            acceptedQuantity: qty,
            rejectedQuantity: 0,
            unitOfMeasure: item.unitOfMeasure || 'pcs',
            unitPrice: cost,
            qcStatus: 'passed',
            stockMovementId: stockResult.movement?._id,
            notes: invoiceNumber ? `Inv #${invoiceNumber}` : notes
        });

        billLineItems.push({
            lineNumber: billLineItems.length + 1,
            productId: pId,
            productCode: targetCode,
            productName: pName,
            description: pName,
            quantity: qty,
            unitOfMeasure: item.unitOfMeasure || 'pcs',
            unitPrice: cost,
            taxable: false,
            taxRate: 0,
            lineSubtotal: +(qty * cost).toFixed(2),
            lineTotal: +(qty * cost).toFixed(2)
        });

        // Auto fulfill any pending AluPurchaseOrder matching this item code
        if (targetCode) {
            const matchingPos = await AluPurchaseOrder.find({
                status: { $in: ['pending', 'partially_received'] },
                $or: [
                    { 'items.itemCode': targetCode },
                    { 'items.productCode': targetCode }
                ]
            });

            let remainingFulfill = qty;
            for (const po of matchingPos) {
                let poModified = false;
                for (const poItem of po.items) {
                    const poCode = (poItem.itemCode || poItem.productCode || '').toUpperCase();
                    const curPending = poItem.pendingQuantity ?? Math.max(0, (poItem.requiredQuantity || 0) - (poItem.receivedQuantity || 0));

                    if (poCode === targetCode && curPending > 0 && remainingFulfill > 0) {
                        const decr = Math.min(curPending, remainingFulfill);
                        poItem.receivedQuantity = (poItem.receivedQuantity || 0) + decr;
                        poItem.pendingQuantity = Math.max(0, (poItem.requiredQuantity || 0) - poItem.receivedQuantity);
                        if (supplier?._id || supplierId) poItem.supplierId = supplier?._id || supplierId;
                        remainingFulfill -= decr;

                        if (poItem.pendingQuantity === 0) {
                            poItem.status = 'fulfilled';
                        } else {
                            poItem.status = 'partially_received';
                        }
                        poModified = true;
                    }
                }

                if (poModified) {
                    const allFulfilled = po.items.every(i => (i.pendingQuantity || 0) === 0 || i.status === 'fulfilled');
                    po.status = allFulfilled ? 'fulfilled' : 'partially_received';
                    if (supplier?.displayName || supplierName) po.supplierName = supplier?.displayName || supplierName;
                    if (supplier?._id || supplierId) po.supplierId = supplier?._id || supplierId;
                    po.markModified('items');
                    await po.save();
                }
            }
        }

        results.push({
            productId: pId,
            quantity: qty,
            stockMovement: stockResult.movement.movementNumber
        });
    }

    // Save formal GoodsReceiptNote entry
    let savedGrn = null;
    if (grnLineItems.length > 0) {
        try {
            const totalValue = grnLineItems.reduce((s, i) => s + (i.receivedQuantity * i.unitPrice), 0);
            savedGrn = new GoodsReceiptNote({
                grnNumber,
                supplierId: supplier?._id || supplierId || null,
                supplierName: supplier?.displayName || supplier?.name || supplierName || 'Supplier',
                warehouseId,
                receiptDate: new Date(),
                supplierDeliveryNoteNumber: invoiceNumber,
                supplierInvoiceNumber: invoiceNumber,
                items: grnLineItems,
                totalReceivedValue: totalValue,
                totalAcceptedValue: totalValue,
                totalPayableLKR: totalValue,
                status: 'approved',
                notes: notes || `AluEco GRN from ${supplier?.displayName || supplierName || 'Supplier'}`,
                receivedBy: req.user?._id,
                createdBy: req.user?._id
            });
            await savedGrn.save();
        } catch (grnErr) {
            console.warn('[AluEco GRN Doc Save Error]:', grnErr.message);
        }
    }

    // Save formal Supplier Bill entry (Accounts Payable)
    let savedBill = null;
    if (billLineItems.length > 0) {
        try {
            const totalValue = billLineItems.reduce((s, i) => s + i.lineTotal, 0);
            savedBill = new Bill({
                supplierInvoiceNumber: invoiceNumber,
                supplierId: supplier?._id || supplierId || null,
                supplierSnapshot: {
                    name: supplier?.displayName || supplier?.name || supplierName || 'Supplier',
                    code: supplier?.supplierCode || ''
                },
                grnIds: savedGrn ? [savedGrn._id] : [],
                grnNumbers: savedGrn ? [savedGrn.grnNumber] : [grnNumber],
                billDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Net 30 default
                items: billLineItems,
                subtotal: totalValue,
                grandTotal: totalValue,
                balanceDue: totalValue,
                amountPaid: 0,
                paymentStatus: 'unpaid',
                status: 'approved',
                notes: `Auto-generated from AluEco GRN ${savedGrn?.grnNumber || grnNumber}${invoiceNumber ? ` (Inv #${invoiceNumber})` : ''}`,
                createdBy: req.user?._id
            });
            await savedBill.save();

            // Update supplier balance
            if (supplier) {
                supplier.outstandingBalance = (supplier.outstandingBalance || 0) + totalValue;
                supplier.totalBilled = (supplier.totalBilled || 0) + totalValue;
                await supplier.save();
            }
        } catch (billErr) {
            console.warn('[AluEco Bill Doc Save Error]:', billErr.message);
        }
    }

    res.status(201).json({
        success: true,
        message: `AluEco GRN processed successfully. Recorded ${results.length} materials into stock, generated GRN intake record, and created Supplier Bill.`,
        data: {
            grnNumber: savedGrn?.grnNumber || grnNumber,
            billNumber: savedBill?.billNumber,
            totalItems: results.length,
            items: results
        }
    });
});

// === PROJECT MATERIALS & SHORTAGE ALLOCATION SUMMARY ===
export const getProjectsMaterialsSummary = asyncHandler(async (req, res) => {
    const AluQuotation = (await import('../models/AluQuotation.js')).default;
    const AluPurchaseOrder = (await import('../models/AluPurchaseOrder.js')).default;
    const StockItem = (await import('../models/StockItem.js')).default;

    // Migrate any quotations missing isLatestRevision field
    try {
        await AluQuotation.updateMany(
            { isLatestRevision: { $exists: false } },
            { $set: { isLatestRevision: true } }
        );
    } catch (e) {
        console.log('Migration error:', e);
    }

    // Fetch active latest-revision or standard quotations (projects)
    const quotations = await AluQuotation.find({ isLatestRevision: { $ne: false } })
        .sort({ updatedAt: -1 })
        .lean();

    // Fetch related purchase orders for shortage matching
    const purchaseOrders = await AluPurchaseOrder.find().sort({ createdAt: -1 }).lean();

    // Fetch all stock items to cross-reference available warehouse stock
    const stockItems = await StockItem.find({ deletedAt: null }).lean();
    const stockMap = {};
    stockItems.forEach(s => {
        const code = (s.productCode || s.sku || '').toUpperCase();
        if (code) {
            stockMap[code] = (stockMap[code] || 0) + (s.openStock || s.currentStock || 0);
        }
    });

    // Fetch all products to lookup descriptions, thickness, specs for glass and accessories
    const Product = (await import('../models/Product.js')).default;
    const allProducts = await Product.find({ businessType: 'alueco', deletedAt: null }).lean();
    const productByCode = {};
    allProducts.forEach(p => {
        if (p.productCode) {
            productByCode[p.productCode.toUpperCase()] = p;
        }
    });

    // Also fetch AluGlass if available
    let allGlassList = [];
    try {
        const AluGlass = (await import('../models/AluGlass.js')).default;
        allGlassList = await AluGlass.find({ isActive: true }).lean();
    } catch (e) {
        // ignore
    }
    const glassByCode = {};
    allGlassList.forEach(gl => {
        if (gl.glassCode) glassByCode[gl.glassCode.toUpperCase()] = gl;
    });

    const mappedQuotationIds = new Set();
    const mappedPONumbers = new Set();

    const projectsSummary = quotations.map(q => {
        mappedQuotationIds.add(q._id.toString());
        if (q.quoteNumber) mappedPONumbers.add(q.quoteNumber);

        // Find linked POs for this quotation/project
        const projectPOs = purchaseOrders.filter(po => {
            const isMatch = (po.quotationId && po.quotationId.toString() === q._id.toString()) ||
                (po.quoteNumber && po.quoteNumber === q.quoteNumber) ||
                (po.projectName && q.projectName && po.projectName.toLowerCase().trim() === q.projectName.toLowerCase().trim());
            if (isMatch) mappedPONumbers.add(po.poNumber);
            return isMatch;
        });

        // Aggregate project required materials from quotation items
        const profileMap = {};
        const glassMap = {};
        const accessoryMap = {};
        const gasketMap = {};

        // 1. Process cutting optimization results for profiles
        if (q.cuttingOptimizationResults && Object.keys(q.cuttingOptimizationResults).length > 0) {
            Object.values(q.cuttingOptimizationResults).forEach(p => {
                const code = (p.profileCode || '').toUpperCase();
                if (!code) return;
                const totalBars = p.totalBarsPurchased || (p.bars ? p.bars.length : 0);
                const reqMm = p.usedLengthMm || 0;
                profileMap[code] = {
                    code,
                    description: p.description || `Profile ${code}`,
                    totalRequiredMm: reqMm,
                    totalRequiredBars: totalBars,
                    availableStockBars: stockMap[code] || 0,
                    wastePercent: p.wastePercent || 0,
                    cost: p.totalCost || 0
                };
            });
        } else {
            // Fallback to profileCuts from items
            (q.items || []).forEach(item => {
                (item.profileCuts || []).forEach(pc => {
                    const code = (pc.code || pc.profileCode || '').toUpperCase();
                    if (!code) return;
                    if (!profileMap[code]) {
                        profileMap[code] = {
                            code,
                            description: pc.description || pc.name || `Profile ${code}`,
                            totalRequiredMm: 0,
                            totalRequiredBars: 0,
                            availableStockBars: stockMap[code] || 0,
                            wastePercent: 0,
                            cost: 0
                        };
                    }
                    const reqMm = (pc.length || 0) * (pc.qty || 1);
                    profileMap[code].totalRequiredMm += reqMm;
                    profileMap[code].cost += (pc.cost || 0);
                });
            });
            // Approximate bars and waste for fallback
            Object.values(profileMap).forEach(p => {
                if (p.totalRequiredBars === 0 && p.totalRequiredMm > 0) {
                     p.totalRequiredBars = Math.ceil(p.totalRequiredMm / 5800); // approx 5.8m per bar
                     
                     // Calculate waste %
                     const totalPurchasedMm = p.totalRequiredBars * 5800;
                     const wasteMm = totalPurchasedMm - p.totalRequiredMm;
                     p.wastePercent = totalPurchasedMm > 0 ? parseFloat(((wasteMm / totalPurchasedMm) * 100).toFixed(1)) : 0;
                     
                     // Re-calculate cost based on full bars instead of just the cuts
                     const prod = productByCode[p.code];
                     const unitCost = prod?.basePrice || prod?.costs?.lastPurchaseCost || 0;
                     if (unitCost > 0) {
                         p.cost = p.totalRequiredBars * unitCost;
                     }
                }
            });
        }

        // 2. Process quotation items for glass & accessories
        (q.items || []).forEach(item => {
            // Glass items
            (item.glassItems || []).forEach(g => {
                const rawCode = g.glassCode || 'STANDARD_GLASS';
                const code = rawCode.toUpperCase();
                const prod = productByCode[code];
                const aluGlass = glassByCode[code];

                let typeName = g.type || g.description || '';
                let thickness = g.thickness || '';

                if (aluGlass) {
                    if (!typeName) typeName = aluGlass.typeName;
                    if (!thickness) thickness = aluGlass.thickness;
                }
                if (prod) {
                    if (!typeName) typeName = prod.name;
                    if (!thickness) thickness = prod.aluSpecs?.thickness || '';
                }
                if (!typeName && item.glassSpec) {
                    typeName = item.glassSpec;
                }
                if (!typeName) {
                    typeName = code !== 'STANDARD_GLASS' ? `Glass ${code}` : 'Standard Glass';
                }

                if (!thickness && typeName) {
                    const match = typeName.match(/(\d+(?:\.\d+)?\s*mm)/i);
                    if (match) thickness = match[1];
                }

                if (!glassMap[code]) {
                    glassMap[code] = {
                        code: rawCode,
                        type: thickness ? `${typeName} (${thickness})` : typeName,
                        typeName,
                        thickness: thickness || '',
                        totalAreaSqFt: 0,
                        quantity: 0,
                        totalCost: 0
                    };
                }
                glassMap[code].totalAreaSqFt += (g.areaSqFt || 0);
                glassMap[code].quantity += (g.qty || 1);
                glassMap[code].totalCost += (g.cost || 0);
            });

            // Accessory & Gasket items
            const allAccessoriesAndGaskets = [...(item.accessories || []), ...(item.gasketItems || [])];
            allAccessoriesAndGaskets.forEach(a => {
                const code = (a.code || '').toUpperCase();
                if (!code) return;

                const prod = productByCode[code];
                const isGasketItem = Boolean(
                    a.isGasket || 
                    code.startsWith('GS') || 
                    prod?.aluCategory === 'gaskets' || 
                    prod?.aluSpecs?.type === 'GS' || 
                    /gasket|rubber|weatherseal|weatherstrip|woolpile|beading|wedge/i.test(a.name || '') ||
                    /gasket|rubber|weatherseal|weatherstrip|woolpile|beading|wedge/i.test(prod?.name || '')
                );

                const targetMap = isGasketItem ? gasketMap : accessoryMap;
                const defaultUnit = isGasketItem ? (prod?.unitOfMeasure || a.unit || 'm') : (prod?.unitOfMeasure || a.unit || 'pcs');

                if (!targetMap[code]) {
                    targetMap[code] = {
                        code,
                        name: a.name || prod?.name || code,
                        requiredQty: 0,
                        availableStockQty: stockMap[code] || 0,
                        unit: defaultUnit,
                        totalCost: 0
                    };
                }
                targetMap[code].requiredQty = +(targetMap[code].requiredQty + (a.qty || 0)).toFixed(2);
                targetMap[code].totalCost = +(targetMap[code].totalCost + (a.cost || 0)).toFixed(2);
            });
        });

        // Collect shortages from linked PO items
        const shortageItems = [];
        let totalPendingPOValue = 0;
        let hasPendingPO = false;

        projectPOs.forEach(po => {
            (po.items || []).forEach(poItem => {
                const isPending = poItem.status === 'pending' || poItem.pendingQuantity > 0;
                if (isPending) hasPendingPO = true;

                // Check if this item has available stock in warehouse
                const itemCodeUpper = (poItem.itemCode || '').toUpperCase();
                const availableStock = stockMap[itemCodeUpper] || 0;
                const hasAvailableStock = availableStock > 0;

                shortageItems.push({
                    poId: po._id,
                    itemId: poItem._id,
                    poNumber: po.poNumber,
                    itemCode: poItem.itemCode,
                    productName: poItem.productName,
                    materialType: poItem.materialType,
                    requiredQuantity: poItem.requiredQuantity,
                    receivedQuantity: poItem.receivedQuantity || 0,
                    pendingQuantity: poItem.pendingQuantity || Math.max(0, (poItem.requiredQuantity || 0) - (poItem.receivedQuantity || 0)),
                    unitOfMeasure: poItem.unitOfMeasure,
                    estimatedTotalCost: poItem.estimatedTotalCost || 0,
                    status: poItem.status || po.status,
                    hasAvailableStock, // Flag to indicate if stock is available in warehouse
                    availableStockQty: availableStock // Actual available quantity
                });
                totalPendingPOValue += (poItem.estimatedTotalCost || 0);
            });
        });

        // Determine material status
        let materialStatus = 'fully_allocated';
        let materialStatusLabel = 'Fully Allocated / Ready';
        let statusBadgeColor = 'emerald';

        if (shortageItems.length > 0 && hasPendingPO) {
            materialStatus = 'pending_po';
            materialStatusLabel = 'Material Shortage / Pending PO';
            statusBadgeColor = 'amber';
        } else if (q.status === 'converted' || q.status === 'in_production') {
            materialStatus = 'in_production';
            materialStatusLabel = 'Materials Issued to Production';
            statusBadgeColor = 'blue';
        } else if (q.status === 'draft') {
            materialStatus = 'quotation_stage';
            materialStatusLabel = 'Quotation Stage';
            statusBadgeColor = 'slate';
        }

        return {
            _id: q._id,
            quoteNumber: q.quoteNumber,
            projectName: q.projectName || 'Untitled Project',
            customerName: q.customerName || 'Standard Client',
            version: q.version || 0,
            date: q.date,
            status: q.status,
            finalSellingPrice: q.finalSellingPrice || 0,
            materialStatus,
            materialStatusLabel,
            statusBadgeColor,
            profiles: Object.values(profileMap),
            glass: Object.values(glassMap),
            accessories: Object.values(accessoryMap),
            gaskets: Object.values(gasketMap),
            shortageItems,
            linkedPOs: projectPOs.map(p => ({ _id: p._id, poNumber: p.poNumber, status: p.status, totalAmount: p.totalEstimatedCost })),
            totalPendingPOValue
        };
    });

    // Also gather standalone POs not linked to any listed quotation
    const unmappedPOs = purchaseOrders.filter(po => !mappedPONumbers.has(po.poNumber) && (!po.quotationId || !mappedQuotationIds.has(po.quotationId.toString())));
    unmappedPOs.forEach(po => {
        const shortageItems = (po.items || []).map(poItem => ({
            poId: po._id,
            itemId: poItem._id,
            poNumber: po.poNumber,
            itemCode: poItem.itemCode,
            productName: poItem.productName,
            materialType: poItem.materialType,
            requiredQuantity: poItem.requiredQuantity,
            receivedQuantity: poItem.receivedQuantity || 0,
            pendingQuantity: poItem.pendingQuantity || Math.max(0, (poItem.requiredQuantity || 0) - (poItem.receivedQuantity || 0)),
            unitOfMeasure: poItem.unitOfMeasure,
            estimatedTotalCost: poItem.estimatedTotalCost || 0,
            status: poItem.status || po.status
        }));

        const totalPendingPOValue = shortageItems.reduce((sum, i) => sum + (i.estimatedTotalCost || 0), 0);

        projectsSummary.push({
            _id: po._id,
            quoteNumber: po.poNumber,
            projectName: po.projectName || `Purchase Order ${po.poNumber}`,
            customerName: po.customerName || 'Direct Order Client',
            version: 0,
            date: po.createdAt || new Date(),
            status: po.status,
            finalSellingPrice: po.totalEstimatedCost || 0,
            materialStatus: po.status === 'fulfilled' ? 'fully_allocated' : 'pending_po',
            materialStatusLabel: po.status === 'fulfilled' ? 'Fully Allocated / Received' : 'Material Shortage / Pending PO',
            statusBadgeColor: po.status === 'fulfilled' ? 'emerald' : 'amber',
            profiles: [],
            glass: [],
            accessories: [],
            gaskets: [],
            shortageItems,
            linkedPOs: [{ _id: po._id, poNumber: po.poNumber, status: po.status, totalAmount: po.totalEstimatedCost }],
            totalPendingPOValue
        });
    });

    res.json({
        success: true,
        data: projectsSummary
    });
});


