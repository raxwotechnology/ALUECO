import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import ProcessTemplate from '../models/ProcessTemplate.js';
import ConversionRule from '../models/ConversionRule.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

dotenv.config();

const seedManufacturing = async () => {
    await connectDB();

    try {
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.error('No admin found to associate with data');
            process.exit(1);
        }

        // 1. Find some products to use
        const products = await Product.find().limit(5);
        if (products.length < 2) {
            console.error('Need at least 2 products in DB to seed manufacturing data');
            process.exit(1);
        }

        const rawProduct = products[0];
        const driedProduct = products[1];

        // 2. Create Process Templates
        const templates = [
            {
                name: 'Standard Dehydration (Fruit)',
                code: 'PROC-DRY-001',
                type: 'drying',
                estimatedDurationHours: 48,
                checkpoints: [
                    { name: 'Moisture Content', type: 'numeric', required: true, unit: '%', minLimit: 5, maxLimit: 12 },
                    { name: 'Color Check', type: 'select', options: ['Premium', 'Standard', 'Rejected'], required: true },
                    { name: 'Foreign Matter', type: 'boolean', required: true }
                ],
                createdBy: admin._id
            },
            {
                name: 'Fine Powdering',
                code: 'PROC-POW-001',
                type: 'powdering',
                estimatedDurationHours: 8,
                checkpoints: [
                    { name: 'Mesh Size', type: 'numeric', required: true, unit: 'mesh', minLimit: 60, maxLimit: 100 },
                    { name: 'Microbial Count', type: 'boolean', required: true }
                ],
                createdBy: admin._id
            }
        ];

        await ProcessTemplate.deleteMany({ code: { $in: templates.map(t => t.code) } });
        await ProcessTemplate.insertMany(templates);
        console.log('✓ Seeded Process Templates');

        // 3. Create Conversion Rules
        const rules = [
            {
                sourceProduct: rawProduct._id,
                outputProduct: driedProduct._id,
                processType: 'drying',
                expectedRatio: 0.15, // 15% yield from raw to dried
                tolerancePercent: 3,
                createdBy: admin._id
            }
        ];

        await ConversionRule.deleteMany({ sourceProduct: rawProduct._id, outputProduct: driedProduct._id });
        await ConversionRule.insertMany(rules);
        console.log('✓ Seeded Conversion Rules');

        console.log('🚀 Manufacturing seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding manufacturing data:', error);
        process.exit(1);
    }
};

seedManufacturing();
