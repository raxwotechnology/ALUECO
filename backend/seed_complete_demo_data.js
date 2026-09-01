import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from './src/models/User.js';
import AluProfile from './src/models/AluProfile.js';
import AluGlass from './src/models/AluGlass.js';
import AluAccessory from './src/models/AluAccessory.js';
import AluApplication from './src/models/AluApplication.js';
import Customer from './src/models/Customer.js';
import CustomerGroup from './src/models/CustomerGroup.js';
import Warehouse from './src/models/Warehouse.js';
import Product from './src/models/Product.js';
import Category from './src/models/Category.js';
import UnitOfMeasure from './src/models/UnitOfMeasure.js';
import Inquiry from './src/models/Inquiry.js';
import AluJobCard from './src/models/AluJobCard.js';
import AluSurvey from './src/models/AluSurvey.js';
import AluScrap from './src/models/AluScrap.js';
import Settings from './src/models/Settings.js';

dotenv.config();

const runSeed = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // 1. Settings
        await Settings.findOneAndUpdate(
            {},
            {
                companyName: 'ALUECO ALUMINIUM SYSTEMS',
                companyAddress: 'No. 145B, Wallawatta, Weliweriya, Sri Lanka.',
                companyPhone: '0777 140 680',
                companyEmail: 'info@alueco.lk',
                defaultTermsAndConditions: '1. Quotation valid for 30 days.\n2. 60% advance payment required.\n3. Balance 40% upon completion.\n4. Swisstek 10-year powder coating warranty applies.'
            },
            { upsert: true, new: true }
        );
        console.log('✓ Settings initialized');

        // 2. Admin User
        const adminExists = await User.findOne({ email: 'admin@example.com' });
        if (!adminExists) {
            await User.create({
                firstName: 'Admin',
                lastName: 'Manager',
                email: 'admin@example.com',
                phone: '0777140680',
                password: 'Admin123!',
                role: 'admin'
            });
            console.log('✓ Admin user created: admin@example.com / Admin123!');
        }

        // 3. Units of Measure
        const uomCount = await UnitOfMeasure.countDocuments();
        let pcUom, mUom, sqftUom;
        if (uomCount === 0) {
            const uoms = await UnitOfMeasure.insertMany([
                { name: 'Piece', symbol: 'pc', type: 'count' },
                { name: 'Meter', symbol: 'm', type: 'length' },
                { name: 'Square Foot', symbol: 'sqft', type: 'area' },
                { name: 'Kilogram', symbol: 'kg', type: 'weight' }
            ]);
            pcUom = uoms[0]._id;
            mUom = uoms[1]._id;
            sqftUom = uoms[2]._id;
            console.log('✓ Seeded Units of Measure');
        } else {
            const allU = await UnitOfMeasure.find();
            pcUom = allU[0]?._id;
            mUom = allU[1]?._id;
            sqftUom = allU[2]?._id;
        }

        // 4. Categories
        const catCount = await Category.countDocuments();
        let aluCat, glassCat, accCat;
        if (catCount === 0) {
            const cats = await Category.insertMany([
                { name: 'Aluminium Profiles', code: 'ALU', type: 'raw_material', displayOrder: 1 },
                { name: 'Glass Sheets', code: 'GLS', type: 'raw_material', displayOrder: 2 },
                { name: 'Accessories & Hardware', code: 'ACC', type: 'raw_material', displayOrder: 3 },
                { name: 'Finished Windows & Doors', code: 'FIN', type: 'finished_good', displayOrder: 4 }
            ]);
            aluCat = cats[0]._id;
            glassCat = cats[1]._id;
            accCat = cats[2]._id;
            console.log('✓ Seeded Categories');
        } else {
            const allC = await Category.find();
            aluCat = allC[0]?._id;
            glassCat = allC[1]?._id;
            accCat = allC[2]?._id;
        }

        // 5. Customer Groups & Customers
        const groupCount = await CustomerGroup.countDocuments();
        let platGroup;
        if (groupCount === 0) {
            const groups = await CustomerGroup.insertMany([
                { name: 'Platinum Contractors', code: 'PLAT', defaultDiscountPercent: 10, priority: 100 },
                { name: 'Direct Retail Clients', code: 'RET', defaultDiscountPercent: 0, priority: 10 }
            ]);
            platGroup = groups[0]._id;
            console.log('✓ Seeded Customer Groups');
        } else {
            platGroup = (await CustomerGroup.findOne())?._id;
        }

        const custCount = await Customer.countDocuments();
        if (custCount === 0) {
            await Customer.insertMany([
                {
                    displayName: 'Mr. Chaminda Perera',
                    companyName: 'Perera Residencies',
                    customerGroup: platGroup,
                    primaryContact: { name: 'Chaminda Perera', phone: '0771234567', email: 'chaminda@example.com' },
                    billingAddress: { line1: 'No 45, Flower Road', city: 'Colombo 07', country: 'Sri Lanka' },
                    status: 'active'
                },
                {
                    displayName: 'Luxo Construction Pvt Ltd',
                    companyName: 'Luxo Construction Pvt Ltd',
                    customerGroup: platGroup,
                    primaryContact: { name: 'Eng. Bandara', phone: '0742899977', email: 'projects@luxo.lk' },
                    billingAddress: { line1: '145B Wallawatta', city: 'Weliweriya', country: 'Sri Lanka' },
                    status: 'active'
                }
            ]);
            console.log('✓ Seeded Sample Customers');
        }

        // 6. Warehouses
        const whCount = await Warehouse.countDocuments();
        if (whCount === 0) {
            await Warehouse.insertMany([
                { warehouseCode: 'MAIN', name: 'Weliweriya Main Factory & Store', isDefault: true, isActive: true },
                { warehouseCode: 'NWL', name: 'Nawala Experience Center Store', isDefault: false, isActive: true }
            ]);
            console.log('✓ Seeded Warehouses');
        }

        // 7. Master Aluminium Profiles
        await AluProfile.deleteMany({});
        await AluProfile.insertMany([
            {
                profileCode: 'SD1001',
                description: 'Outer Frame (Track/Frame)',
                supplier: 'Swisstek',
                standardLengths: [
                    { lengthMm: 2134, price: 1500 },
                    { lengthMm: 3658, price: 2500 },
                    { lengthMm: 4877, price: 3300 },
                    { lengthMm: 5800, price: 3950 }
                ]
            },
            {
                profileCode: 'SD1002',
                description: 'Sash Profile',
                supplier: 'Swisstek',
                standardLengths: [
                    { lengthMm: 3048, price: 2200 },
                    { lengthMm: 3658, price: 2600 },
                    { lengthMm: 4877, price: 3400 },
                    { lengthMm: 5800, price: 4100 }
                ]
            },
            {
                profileCode: 'SD1003',
                description: 'Interlock Profile',
                supplier: 'Swisstek',
                standardLengths: [
                    { lengthMm: 2134, price: 1600 },
                    { lengthMm: 3658, price: 2700 },
                    { lengthMm: 5800, price: 4200 }
                ]
            },
            {
                profileCode: 'SD1004',
                description: 'Bottom Track Profile',
                supplier: 'Swisstek',
                standardLengths: [
                    { lengthMm: 3048, price: 2100 },
                    { lengthMm: 4877, price: 3200 },
                    { lengthMm: 5800, price: 3800 }
                ]
            },
            {
                profileCode: 'SD1005',
                description: 'Top Track Profile',
                supplier: 'Swisstek',
                standardLengths: [
                    { lengthMm: 3048, price: 2100 },
                    { lengthMm: 4877, price: 3200 },
                    { lengthMm: 5800, price: 3800 }
                ]
            },
            {
                profileCode: 'CA5401',
                description: 'Outer Frame - Casement',
                supplier: 'Swisstek',
                standardLengths: [
                    { lengthMm: 3658, price: 2800 },
                    { lengthMm: 4877, price: 3700 },
                    { lengthMm: 5800, price: 4400 }
                ]
            },
            {
                profileCode: 'CA5402',
                description: 'Sash Frame - Casement',
                supplier: 'Swisstek',
                standardLengths: [
                    { lengthMm: 3658, price: 2900 },
                    { lengthMm: 4877, price: 3800 },
                    { lengthMm: 5800, price: 4500 }
                ]
            },
            {
                profileCode: 'FD6011',
                description: 'Glass Clip (Beading)',
                supplier: 'Swisstek',
                standardLengths: [
                    { lengthMm: 3658, price: 800 },
                    { lengthMm: 5800, price: 1250 }
                ]
            }
        ]);
        console.log('✓ Seeded Master Aluminium Profiles');

        // 8. Master Glass Rates
        await AluGlass.deleteMany({});
        await AluGlass.insertMany([
            { typeName: '5mm Tempered Clear', thickness: '5mm', ratePerSqFt: 350, ratePerSqM: 3767, temperingCharge: 100, processingCharge: 50, cuttingServiceCharge: 150 },
            { typeName: '5mm Clear Float', thickness: '5mm', ratePerSqFt: 220, ratePerSqM: 2368, temperingCharge: 0, processingCharge: 30, cuttingServiceCharge: 100 },
            { typeName: '6mm Tempered Clear', thickness: '6mm', ratePerSqFt: 450, ratePerSqM: 4843, temperingCharge: 120, processingCharge: 60, cuttingServiceCharge: 200 },
            { typeName: '5mm Tinted Dark Grey', thickness: '5mm', ratePerSqFt: 280, ratePerSqM: 3013, temperingCharge: 0, processingCharge: 40, cuttingServiceCharge: 120 },
            { typeName: '8mm Tempered Clear', thickness: '8mm', ratePerSqFt: 580, ratePerSqM: 6243, temperingCharge: 150, processingCharge: 80, cuttingServiceCharge: 250 }
        ]);
        console.log('✓ Seeded Master Glass Rates');

        // 9. Master Accessories
        await AluAccessory.deleteMany({});
        await AluAccessory.insertMany([
            { code: 'ACC001', name: 'Roller Heavy Duty Double', brand: 'Kinlong', unit: 'Nos', purchaseRate: 350, sellingRate: 450 },
            { code: 'ACC002', name: 'Handle C-Groove Flush Lock', brand: 'Kinlong', unit: 'Nos', purchaseRate: 600, sellingRate: 850 },
            { code: 'ACC003', name: 'Multi-Point Security Lock', brand: 'Kinlong', unit: 'Nos', purchaseRate: 550, sellingRate: 750 },
            { code: 'ACC004', name: 'Wool Pile Weatherstrip (per m)', brand: 'BP', unit: 'm', purchaseRate: 60, sellingRate: 100 },
            { code: 'ACC005', name: 'DOWSIL Weatherproof Silicone Tube', brand: 'DOWSIL', unit: 'Nos', purchaseRate: 800, sellingRate: 1200 },
            { code: 'ACC006', name: 'Friction Stay / Hinge 12"', brand: '3H', unit: 'Nos', purchaseRate: 150, sellingRate: 220 },
            { code: 'ACC007', name: 'Die-cast Corner Bracket', brand: 'General', unit: 'Nos', purchaseRate: 80, sellingRate: 120 }
        ]);
        console.log('✓ Seeded Master Accessories');

        // 10. Master Application Templates (Door & Window Formulas)
        await AluApplication.deleteMany({});
        await AluApplication.insertMany([
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
        console.log('✓ Seeded Master Application Templates');

        // 11. Sample Leads for Lead Follow-Up System
        await Inquiry.deleteMany({});
        await Inquiry.insertMany([
            {
                leadNo: 'L-0001',
                inquiryDate: new Date('2026-08-14'),
                customerName: 'Mr. Chaminda Perera',
                companyName: 'Perera Residencies',
                contactNo: '0771234567',
                phone: '0771234567',
                email: 'chaminda@example.com',
                inquirySource: 'Facebook',
                source: 'Facebook',
                projectLocation: 'Colombo',
                requirement: 'Aluminium Doors & Windows (Swisstek Black)',
                siteVisitDate: new Date('2026-08-16'),
                quotationNo: 'QOT-001',
                quotationValue: 1500000,
                status: 'Follow-Up',
                nextFollowUpDate: new Date('2026-08-20'),
                finalValue: 1400000,
                result: 'Pending',
                notes: 'Client requested 5% discount on bulk glass order',
                followUpHistory: [
                    {
                        date: new Date('2026-08-14'),
                        salesOfficer: 'Kasun Perera',
                        note: 'Received inquiry via Facebook. Discussed 3-track sliding door requirements.',
                        nextFollowUpDate: new Date('2026-08-16')
                    },
                    {
                        date: new Date('2026-08-16'),
                        salesOfficer: 'Kasun Perera',
                        note: 'Conducted site measurements in Colombo 07. Ground floor lintels verified.',
                        nextFollowUpDate: new Date('2026-08-18')
                    },
                    {
                        date: new Date('2026-08-18'),
                        salesOfficer: 'Admin',
                        note: 'Sent formal quotation QOT-001 for Rs. 1,500,000.',
                        nextFollowUpDate: new Date('2026-08-20')
                    }
                ]
            },
            {
                leadNo: 'L-0002',
                inquiryDate: new Date('2026-08-12'),
                customerName: 'Luxo Construction Pvt Ltd',
                companyName: 'Luxo Construction Pvt Ltd',
                contactNo: '0742899977',
                phone: '0742899977',
                email: 'projects@luxo.lk',
                inquirySource: 'Referral',
                source: 'Referral',
                projectLocation: 'Nugegoda Luxury Villa',
                requirement: 'Curtain Wall & 6 Casement Windows',
                siteVisitDate: new Date('2026-08-13'),
                quotationNo: 'QOT-002',
                quotationValue: 2400000,
                status: 'Won',
                nextFollowUpDate: new Date('2026-08-22'),
                finalValue: 2300000,
                result: 'Won',
                advanceAmount: 1380000,
                advanceDate: new Date('2026-08-15'),
                projectStatus: 'Created',
                notes: 'Deal closed with 60% advance paid by HNB transfer.',
                followUpHistory: [
                    {
                        date: new Date('2026-08-12'),
                        salesOfficer: 'Eng. Bandara',
                        note: 'Referred by Swisstek. Architect sent CAD drawings.',
                        nextFollowUpDate: new Date('2026-08-13')
                    },
                    {
                        date: new Date('2026-08-15'),
                        salesOfficer: 'Admin',
                        note: 'Signed Project Agreement PA-2026-001. 60% advance verified in HNB account.',
                        nextFollowUpDate: null
                    }
                ]
            },
            {
                leadNo: 'L-0003',
                inquiryDate: new Date('2026-08-15'),
                customerName: 'Green View Hotel & Spa',
                companyName: 'Green View Hotel',
                contactNo: '0715554321',
                phone: '0715554321',
                email: 'manager@greenview.lk',
                inquirySource: 'WhatsApp',
                source: 'WhatsApp',
                projectLocation: 'Kandy',
                requirement: '8 Top-hung Windows & Double Entrance Door',
                status: 'New Inquiry',
                nextFollowUpDate: new Date('2026-08-17'),
                result: 'Pending',
                notes: 'Needs acoustic soundproof double glazing.'
            }
        ]);
        console.log('✓ Seeded Sample Leads in Lead Follow-Up System');

        // 12. Sample Kanban Cards & Surveys
        await AluJobCard.deleteMany({});
        await AluJobCard.insertMany([
            {
                jobCardNumber: 'JC-2026-001',
                quotationNumber: 'QOT-002',
                customerName: 'Luxo Construction Pvt Ltd',
                projectName: 'Nugegoda Luxury Villa',
                currentStage: 'cutting',
                priority: 'high',
                targetCompletionDate: new Date('2026-08-28'),
                openings: [
                    { tag: 'D1', applicationType: 'Sliding Door', width: 2400, height: 2100, quantity: 2, status: 'in_progress' },
                    { tag: 'W1', applicationType: 'Casement Window', width: 1200, height: 1200, quantity: 4, status: 'pending' }
                ]
            },
            {
                jobCardNumber: 'JC-2026-002',
                quotationNumber: 'QOT-001',
                customerName: 'Mr. Chaminda Perera',
                projectName: 'Perera Residencies',
                currentStage: 'glazing',
                priority: 'normal',
                targetCompletionDate: new Date('2026-08-30'),
                openings: [
                    { tag: 'W2', applicationType: 'Fixed Glass', width: 1800, height: 1500, quantity: 3, status: 'in_progress' }
                ]
            }
        ]);
        console.log('✓ Seeded Production Kanban Job Cards');

        console.log('\n======================================================');
        console.log('🎉 ALL MASTER & SAMPLE DEMO DATA SEEDED SUCCESSFULLY!');
        console.log('======================================================\n');
        process.exit(0);

    } catch (err) {
        console.error('❌ Error during seeding:', err);
        process.exit(1);
    }
};

runSeed();
