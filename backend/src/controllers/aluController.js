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
    let profiles = await AluProfile.find({}).sort({ profileCode: 1 });
    if (profiles.length === 0) {
        profiles = await AluProfile.insertMany([
            { profileCode: 'SD1001', description: 'Outer Frame (Track/Frame)', supplier: 'Swisstek', standardLengths: [{ lengthMm: 2134, price: 1500 }, { lengthMm: 3658, price: 2500 }, { lengthMm: 4877, price: 3300 }, { lengthMm: 5800, price: 3950 }] },
            { profileCode: 'SD1002', description: 'Sash Profile', supplier: 'Swisstek', standardLengths: [{ lengthMm: 3048, price: 2200 }, { lengthMm: 3658, price: 2600 }, { lengthMm: 4877, price: 3400 }, { lengthMm: 5800, price: 4100 }] },
            { profileCode: 'SD1003', description: 'Interlock Profile', supplier: 'Swisstek', standardLengths: [{ lengthMm: 2134, price: 1600 }, { lengthMm: 3658, price: 2700 }, { lengthMm: 5800, price: 4200 }] },
            { profileCode: 'SD1004', description: 'Bottom Track', supplier: 'Swisstek', standardLengths: [{ lengthMm: 3048, price: 2100 }, { lengthMm: 4877, price: 3200 }, { lengthMm: 5800, price: 3800 }] },
            { profileCode: 'SD1005', description: 'Top Track', supplier: 'Swisstek', standardLengths: [{ lengthMm: 3048, price: 2100 }, { lengthMm: 4877, price: 3200 }, { lengthMm: 5800, price: 3800 }] },
            { profileCode: 'CA5401', description: 'Outer Frame - Casement', supplier: 'Swisstek', standardLengths: [{ lengthMm: 3658, price: 2800 }, { lengthMm: 4877, price: 3700 }, { lengthMm: 5800, price: 4400 }] },
            { profileCode: 'CA5402', description: 'Sash Frame - Casement', supplier: 'Swisstek', standardLengths: [{ lengthMm: 3658, price: 2900 }, { lengthMm: 4877, price: 3800 }, { lengthMm: 5800, price: 4500 }] },
            { profileCode: 'FD6011', description: 'Glass Clip (Beading)', supplier: 'Swisstek', standardLengths: [{ lengthMm: 3658, price: 800 }, { lengthMm: 5800, price: 1250 }] }
        ]);
    }
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
    let glass = await AluGlass.find({}).sort({ typeName: 1 });
    if (glass.length === 0) {
        glass = await AluGlass.insertMany([
            { typeName: '5mm Tempered Clear', thickness: '5mm', ratePerSqFt: 350, ratePerSqM: 3767, temperingCharge: 100, processingCharge: 50 },
            { typeName: '5mm Clear Float', thickness: '5mm', ratePerSqFt: 220, ratePerSqM: 2368, temperingCharge: 0, processingCharge: 30 },
            { typeName: '6mm Tempered Clear', thickness: '6mm', ratePerSqFt: 450, ratePerSqM: 4843, temperingCharge: 120, processingCharge: 60 },
            { typeName: '5mm Tinted Dark Grey', thickness: '5mm', ratePerSqFt: 280, ratePerSqM: 3013, temperingCharge: 0, processingCharge: 40 },
            { typeName: '8mm Tempered Clear', thickness: '8mm', ratePerSqFt: 580, ratePerSqM: 6243, temperingCharge: 150, processingCharge: 80 }
        ]);
    }
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
    let accessories = await AluAccessory.find({}).sort({ code: 1 });
    if (accessories.length === 0) {
        accessories = await AluAccessory.insertMany([
            { code: 'ACC001', name: 'Roller Heavy Duty Double', brand: 'Kinlong', unit: 'Nos', purchaseRate: 350, sellingRate: 450 },
            { code: 'ACC002', name: 'Handle C-Groove Flush Lock', brand: 'Kinlong', unit: 'Nos', purchaseRate: 600, sellingRate: 850 },
            { code: 'ACC003', name: 'Multi-Point Security Lock', brand: 'Kinlong', unit: 'Nos', purchaseRate: 550, sellingRate: 750 },
            { code: 'ACC004', name: 'Wool Pile Weatherstrip (per m)', brand: 'BP', unit: 'm', purchaseRate: 60, sellingRate: 100 },
            { code: 'ACC005', name: 'DOWSIL Weatherproof Silicone Tube', brand: 'DOWSIL', unit: 'Nos', purchaseRate: 800, sellingRate: 1200 },
            { code: 'ACC006', name: 'Friction Stay / Hinge 12"', brand: '3H', unit: 'Nos', purchaseRate: 150, sellingRate: 220 },
            { code: 'ACC007', name: 'Die-cast Corner Bracket', brand: 'General', unit: 'Nos', purchaseRate: 80, sellingRate: 120 }
        ]);
    }
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
    let applications = await AluApplication.find({}).sort({ type: 1, configuration: 1 });
    if (applications.length === 0) {
        applications = await AluApplication.insertMany([
            {
                type: 'Sliding Door',
                configuration: '3 Panel - 2 Track',
                description: 'Swisstek C-Groove Sliding Door (3 Panel, 2 Track)',
                profileBOM: [
                    { profileCode: 'SD1001', description: 'Outer Frame Left/Right', quantityFormula: '2', lengthFormula: 'H' },
                    { profileCode: 'SD1001', description: 'Outer Frame Top/Bottom', quantityFormula: '2', lengthFormula: 'W' },
                    { profileCode: 'SD1002', description: 'Sash Vertical', quantityFormula: '6', lengthFormula: 'H - 50' },
                    { profileCode: 'SD1002', description: 'Sash Horizontal', quantityFormula: '6', lengthFormula: 'W / 3' },
                    { profileCode: 'SD1003', description: 'Interlock Vertical', quantityFormula: '2', lengthFormula: 'H - 50' },
                    { profileCode: 'SD1004', description: 'Bottom Track', quantityFormula: '1', lengthFormula: 'W' },
                    { profileCode: 'SD1005', description: 'Top Track', quantityFormula: '1', lengthFormula: 'W' }
                ],
                glassBOM: [
                    { glassType: '5mm Tempered Clear', quantityFormula: '3', widthFormula: 'W / 3 - 100', heightFormula: 'H - 180' }
                ],
                accessoryBOM: [
                    { accessoryCode: 'ACC001', quantityFormula: '6' },
                    { accessoryCode: 'ACC002', quantityFormula: '2' },
                    { accessoryCode: 'ACC003', quantityFormula: '2' },
                    { accessoryCode: 'ACC004', quantityFormula: '6 * H / 1000 + 6 * (W / 3) / 1000' },
                    { accessoryCode: 'ACC005', quantityFormula: '2' }
                ],
                labourMethod: 'opening',
                labourRate: 25000
            },
            {
                type: 'Casement Window',
                configuration: '2 Panel',
                description: 'Swisstek Casement Window (2 Panel with Friction Hinges)',
                profileBOM: [
                    { profileCode: 'CA5401', description: 'Outer Frame Left/Right', quantityFormula: '2', lengthFormula: 'H' },
                    { profileCode: 'CA5401', description: 'Outer Frame Top/Bottom', quantityFormula: '2', lengthFormula: 'W' },
                    { profileCode: 'CA5402', description: 'Sash Vertical', quantityFormula: '4', lengthFormula: 'H - 30' },
                    { profileCode: 'CA5402', description: 'Sash Horizontal', quantityFormula: '4', lengthFormula: 'W / 2 - 20' }
                ],
                glassBOM: [
                    { glassType: '5mm Tempered Clear', quantityFormula: '2', widthFormula: 'W / 2 - 80', heightFormula: 'H - 90' }
                ],
                accessoryBOM: [
                    { accessoryCode: 'ACC006', quantityFormula: '4' },
                    { accessoryCode: 'ACC002', quantityFormula: '2' },
                    { accessoryCode: 'ACC007', quantityFormula: '8' }
                ],
                labourMethod: 'opening',
                labourRate: 8000
            },
            {
                type: 'Fixed Glass',
                configuration: '1 Panel',
                description: 'Standard Fixed Glass View Panel',
                profileBOM: [
                    { profileCode: 'SD1001', description: 'Outer Frame Left/Right', quantityFormula: '2', lengthFormula: 'H' },
                    { profileCode: 'SD1001', description: 'Outer Frame Top/Bottom', quantityFormula: '2', lengthFormula: 'W' },
                    { profileCode: 'FD6011', description: 'Glass Beading Left/Right', quantityFormula: '2', lengthFormula: 'H - 40' },
                    { profileCode: 'FD6011', description: 'Glass Beading Top/Bottom', quantityFormula: '2', lengthFormula: 'W - 40' }
                ],
                glassBOM: [
                    { glassType: '5mm Tempered Clear', quantityFormula: '1', widthFormula: 'W - 40', heightFormula: 'H - 40' }
                ],
                accessoryBOM: [
                    { accessoryCode: 'ACC005', quantityFormula: '1' }
                ],
                labourMethod: 'sqft',
                labourRate: 350
            },
            {
                type: 'Sliding Window',
                configuration: '2 Panel - 2 Track',
                description: 'Standard 2-Track Sliding Window',
                profileBOM: [
                    { profileCode: 'SD1001', description: 'Outer Frame Left/Right', quantityFormula: '2', lengthFormula: 'H' },
                    { profileCode: 'SD1001', description: 'Outer Frame Top/Bottom', quantityFormula: '2', lengthFormula: 'W' },
                    { profileCode: 'SD1002', description: 'Sash Vertical', quantityFormula: '4', lengthFormula: 'H - 40' },
                    { profileCode: 'SD1002', description: 'Sash Horizontal', quantityFormula: '4', lengthFormula: 'W / 2' },
                    { profileCode: 'SD1003', description: 'Interlock Vertical', quantityFormula: '2', lengthFormula: 'H - 40' }
                ],
                glassBOM: [
                    { glassType: '5mm Clear Float', quantityFormula: '2', widthFormula: 'W / 2 - 60', heightFormula: 'H - 120' }
                ],
                accessoryBOM: [
                    { accessoryCode: 'ACC001', quantityFormula: '4' },
                    { accessoryCode: 'ACC002', quantityFormula: '2' },
                    { accessoryCode: 'ACC004', quantityFormula: '4 * H / 1000 + 4 * (W / 2) / 1000' }
                ],
                labourMethod: 'opening',
                labourRate: 12000
            }
        ]);
    }
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
    res.json({ success: true, data: jobCards });
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
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            result = await reserveStockForProject(id, warehouseId, req.user._id, session);
        });
        res.json({ success: true, data: result });
    } finally {
        session.endSession();
    }
});

export const issueProjectMaterials = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { warehouseId } = req.body;
    
    if (!warehouseId) {
        res.status(400);
        throw new Error('warehouseId is required');
    }
    
    const { issueMaterialsToProduction } = await import('../services/bomExplosionService.js');
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            result = await issueMaterialsToProduction(id, warehouseId, req.user._id, session);
        });
        res.json({ success: true, data: result });
    } finally {
        session.endSession();
    }
});
