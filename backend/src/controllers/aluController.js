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
