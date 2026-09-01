import dotenv from 'dotenv';
import mongoose from 'mongoose';
import AluQuotation from './src/models/AluQuotation.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB for seeding sample official quotation');

        // Delete existing QOT-2024-0058 if any
        await AluQuotation.deleteMany({ quoteNumber: 'QOT-2024-0058' });

        const quote = await AluQuotation.create({
            quoteNumber: 'QOT-2024-0058',
            version: 0,
            revisionGroupCode: 'QOT-2024-0058',
            isLatestRevision: true,
            customerName: 'Mr. Chaminda Perera',
            projectName: 'Green Villa Residence',
            location: 'Nugegoda, Sri Lanka.',
            date: new Date('2024-05-20'),
            validTill: new Date('2024-06-19'),
            preparedBy: 'ALUECO Team',
            status: 'sent',
            items: [
                {
                    applicationType: 'Sliding Door',
                    configuration: '3 Panel - 2 Track Swisstek C-Groove',
                    width: 2400,
                    height: 2100,
                    quantity: 2,
                    unitPrice: 185000,
                    totalPrice: 370000,
                    glassItems: [
                        { glassType: '5mm Tempered Clear', thickness: 5, width: 750, height: 1900, qty: 6, areaSqFt: 92, unitRate: 350, cost: 180000 }
                    ],
                    accessories: [
                        { code: 'ACC001', name: 'Roller Double Kinlong', qty: 12, unitRate: 450, cost: 5400 }
                    ]
                },
                {
                    applicationType: 'Casement Window',
                    configuration: '2 Panel Swisstek C-Groove',
                    width: 1200,
                    height: 1200,
                    quantity: 4,
                    unitPrice: 65000,
                    totalPrice: 260000,
                    glassItems: [
                        { glassType: '5mm Tempered Clear', thickness: 5, width: 520, height: 1100, qty: 8, areaSqFt: 50, unitRate: 350, cost: 90000 }
                    ],
                    accessories: [
                        { code: 'ACC006', name: 'Friction Hinge 12"', qty: 8, unitRate: 200, cost: 1600 }
                    ]
                },
                {
                    applicationType: 'Fixed Glass',
                    configuration: '5mm Tempered Clear Panel',
                    width: 1800,
                    height: 1200,
                    quantity: 2,
                    unitPrice: 45000,
                    totalPrice: 90000,
                    glassItems: [
                        { glassType: '5mm Tempered Clear', thickness: 5, width: 1760, height: 1160, qty: 2, areaSqFt: 44, unitRate: 350, cost: 45000 }
                    ],
                    accessories: []
                }
            ],
            totalAluminiumCost: 380000,
            totalGlassCost: 215000,
            totalAccessoriesCost: 45000,
            totalLabourCost: 80000,
            transportCost: 0, // Absorbed into unit rates
            additionalCosts: [],
            profitMarginPercent: 20,
            calculatedSellingPrice: 720000,
            discount: 0,
            finalSellingPrice: 720000, // Total Excluding Tax
            checklist: [
                'Aluminium profiles (Swisstek Powder Coated)',
                '5mm Tempered Glass',
                'Standard Accessories (Kinlong / 3H / BP)',
                'Silicone - DOWSIL / FINOTECH Weatherproof',
                'Labour & Installation',
                'Transport to Site (Within Colombo & Suburbs)'
            ],
            terms: [
                'This quotation is valid for the period mentioned above.',
                '60% advance payment is required to proceed.',
                'Balance payment 40% after completion.',
                'Any additional works not mentioned in this quotation will be charged separately.',
                'Delivery period will be confirmed after order confirmation.'
            ]
        });

        console.log(`🎉 Sample Quotation ${quote.quoteNumber} created successfully! (ID: ${quote._id})`);
    } catch (err) {
        console.error('❌ Failed to seed sample quotation:', err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

run();
