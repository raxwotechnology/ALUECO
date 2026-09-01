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
    const profile = await AluProfile.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
    const glass = await AluGlass.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
    const accessory = await AluAccessory.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
    const scrap = await AluScrap.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
        { new: true }
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
    const survey = await AluSurvey.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
    const { warehouseId } = req.body;
    
    if (!warehouseId) {
        res.status(400);
        throw new Error('warehouseId is required');
    }
    
    const { issueMaterialsToProduction } = await import('../services/bomExplosionService.js');
    const result = await issueMaterialsToProduction(id, warehouseId, req.user._id);
    res.json({ success: true, data: result });
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
        .populate('productId', 'name productCode unitOfMeasure stockLevels aluCategory aluSpecs businessType');

    res.json({
        success: true,
        data: {
            products,
            stockItems
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
                side: specs.side || '',
                description: specs.description || '',
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

    const product = await Product.findByIdAndUpdate(id, req.body, { new: true });
    if (!product) {
        res.status(404);
        throw new Error('Raw material not found');
    }
    res.json({ success: true, data: product });
});

export const deleteAluRawMaterial = asyncHandler(async (req, res) => {
    const Product = (await import('../models/Product.js')).default;
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
    if (!product) {
        res.status(404);
        throw new Error('Raw material not found');
    }
    res.json({ success: true, message: 'Raw material deleted successfully' });
});

export const processAluGrn = asyncHandler(async (req, res) => {
    const {
        warehouseId,
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

    const grnNumber = `ALU-GRN-${Date.now().toString().slice(-6)}`;
    const results = [];

    for (const item of items) {
        const targetCode = (item.itemCode || item.productCode || '').toUpperCase();
        let pId = item.productId;

        if (!pId && targetCode) {
            let found = await Product.findOne({
                $or: [{ productCode: targetCode }, { sku: targetCode }]
            });

            if (!found) {
                // Auto-create raw material product entry if it doesn't exist
                found = new Product({
                    productCode: targetCode,
                    name: item.productName || item.description || `AluEco Raw Material (${targetCode})`,
                    productType: 'raw_material',
                    businessType: 'alueco',
                    unitOfMeasure: item.unitOfMeasure || 'pcs',
                    costPrice: Number(item.unitCost) || 0,
                    status: 'active'
                });
                await found.save();
            }
            pId = found._id;
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
            reason: `AluEco GRN from ${supplierName || 'Supplier'}`,
            notes: invoiceNumber ? `Supplier Invoice #${invoiceNumber}` : notes,
            userId: req.user?._id,
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

    res.status(201).json({
        success: true,
        message: `AluEco GRN processed successfully. Recorded ${results.length} materials into stock.`,
        data: {
            grnNumber,
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

        // 1. Process cutting optimization results for profiles
        if (q.cuttingOptimizationResults) {
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
        }

        // 2. Process quotation items for glass & accessories
        (q.items || []).forEach(item => {
            // Glass items
            (item.glassItems || []).forEach(g => {
                const type = g.glassType || 'Standard Glass';
                if (!glassMap[type]) {
                    glassMap[type] = {
                        type,
                        totalAreaSqFt: 0,
                        quantity: 0,
                        totalCost: 0
                    };
                }
                glassMap[type].totalAreaSqFt += (g.areaSqFt || 0);
                glassMap[type].quantity += (g.qty || 1);
                glassMap[type].totalCost += (g.cost || 0);
            });

            // Accessory items
            (item.accessories || []).forEach(a => {
                const code = (a.code || '').toUpperCase();
                if (!code) return;
                if (!accessoryMap[code]) {
                    accessoryMap[code] = {
                        code,
                        name: a.name || code,
                        requiredQty: 0,
                        availableStockQty: stockMap[code] || 0,
                        unit: a.unit || 'pcs',
                        totalCost: 0
                    };
                }
                accessoryMap[code].requiredQty += (a.qty || 0);
                accessoryMap[code].totalCost += (a.cost || 0);
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
                    status: poItem.status || po.status
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


