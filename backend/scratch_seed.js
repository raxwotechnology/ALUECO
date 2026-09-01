import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { seedDefaults } from './src/utils/seedDefaults.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        await seedDefaults();
        console.log('Seeding completed successfully');
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

run();
