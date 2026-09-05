import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AluScrap from '../models/AluScrap.js';
import AluJobCard from '../models/AluJobCard.js';
import AluSurvey from '../models/AluSurvey.js';
import AluQuotation from '../models/AluQuotation.js';
import SalesOrder from '../models/SalesOrder.js';

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/wholesale-system";

const seedRealTimeData = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(uri);
        console.log('✓ Connected to MongoDB');

        // 1. Seed Alu Scraps
        console.log('Seeding scraps...');
        await AluScrap.deleteMany({});
        await AluScrap.insertMany([
            { profileCode: 'SD1001', lengthMm: 1250, status: 'available', notes: 'Rack A leftover' },
            { profileCode: 'SD1001', lengthMm: 900, status: 'available', notes: 'Rack A leftover' },
            { profileCode: 'SD1002', lengthMm: 1550, status: 'available', notes: 'Floor box leftover' },
            { profileCode: 'SD1003', lengthMm: 600, status: 'available', notes: 'Rack B leftover' }
        ]);
        console.log('✓ Seeded 4 Alu Scrap items');

        // 2. Seed Alu Surveys
        console.log('Seeding site surveys...');
        await AluSurvey.deleteMany({});
        await AluSurvey.insertMany([
            {
                surveyNumber: 'SRV-0001',
                customerName: 'Dilum Weerasinghe',
                projectName: 'Nugegoda Residence',
                status: 'pending',
                surveyorName: 'Kasun Perera',
                notes: 'Double check lintel level flatness',
                measurements: [
                    { label: 'GF-D1', width: 2400, height: 2100, applicationType: 'Sliding Door', configuration: '3 Panel - 2 Track' },
                    { label: 'GF-W1', width: 1200, height: 1200, applicationType: 'Casement Window', configuration: '2 Panel' }
                ]
            },
            {
                surveyNumber: 'SRV-0002',
                customerName: 'Alumex Plaza',
                projectName: 'Showroom Glass partitions',
                status: 'quoted',
                surveyorName: 'Kasun Perera',
                notes: 'Clear glass, tempered required',
                measurements: [
                    { label: 'F1', width: 3000, height: 2400, applicationType: 'Fixed Glass', configuration: '1 Panel' }
                ]
            }
        ]);
        console.log('✓ Seeded 2 On-Site Surveys');

        // 3. Seed Alu Job Cards (Kanban)
        console.log('Seeding Kanban Job Cards...');
        await AluJobCard.deleteMany({});
        
        // Let's find or create a mock Sales Order & Quotation to link
        let mockQuote = await AluQuotation.findOne({});
        let mockSO = await SalesOrder.findOne({});
        
        const quotationId = mockQuote ? mockQuote._id : new mongoose.Types.ObjectId();
        const salesOrderId = mockSO ? mockSO._id : new mongoose.Types.ObjectId();

        await AluJobCard.insertMany([
            {
                jobCardNumber: 'JOB-2026-0001',
                salesOrderId,
                quotationId,
                customerName: 'dilum Vd',
                projectName: 'Luxury Villa Negombo',
                status: 'cutting',
                notes: 'Swisstek profiles powder coating finish',
                items: [
                    { applicationType: 'Sliding Door', configuration: '3 Panel - 2 Track', width: 3600, height: 2200, quantity: 2 }
                ]
            },
            {
                jobCardNumber: 'JOB-2026-0002',
                salesOrderId,
                quotationId,
                customerName: 'Capital Heights',
                projectName: 'Apartment Unit 4B',
                status: 'assembly',
                notes: 'Rollers alignment check is critical',
                items: [
                    { applicationType: 'Casement Window', configuration: '2 Panel', width: 1500, height: 1200, quantity: 4 }
                ]
            },
            {
                jobCardNumber: 'JOB-2026-0003',
                salesOrderId,
                quotationId,
                customerName: 'Dilum Weerasinghe',
                projectName: 'Office glaze partition',
                status: 'ready',
                notes: 'Ready for dispatch. Packing bubble wrap.',
                items: [
                    { applicationType: 'Fixed Glass', configuration: '1 Panel', width: 2400, height: 1800, quantity: 1 }
                ]
            }
        ]);
        console.log('✓ Seeded 3 Kanban Job Cards');

        console.log('All real-time test data seeded successfully!');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedRealTimeData();
