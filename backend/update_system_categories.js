import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Category from './src/models/Category.js';

dotenv.config();

const defaultCategories = [
    { name: 'Aluminium Profiles', code: 'ALU', type: 'raw_material', displayOrder: 1 },
    { name: 'Glass Sheets', code: 'GLS', type: 'raw_material', displayOrder: 2 },
    { name: 'Accessories & Hardware', code: 'ACC', type: 'raw_material', displayOrder: 3 },
    { name: 'Consumables & Seals', code: 'CNS', type: 'raw_material', displayOrder: 4 },
    { name: 'Finished Doors & Windows', code: 'FIN', type: 'finished_good', displayOrder: 5 },
    { name: 'General', code: 'GEN', type: 'both', displayOrder: 6 },
];

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to Database');

        // Delete existing categories
        await Category.deleteMany({});
        console.log('Deleted old product categories');

        // Insert new categories
        await Category.insertMany(defaultCategories);
        console.log('✓ Successfully seeded Aluminium Inventory Categories!');
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

run();
