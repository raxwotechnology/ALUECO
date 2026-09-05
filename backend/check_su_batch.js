import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ProductionBatch from './src/models/ProductionBatch.js';
import StockMovement from './src/models/StockMovement.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB');

        const batches = await ProductionBatch.find({ product: /SU Powder/i });
        console.log('\n--- PRODUCTION BATCHES ---');
        console.log(JSON.stringify(batches, null, 2));

        const movements = await StockMovement.find({ productId: '6a3421c080ddb5a3f76b4bf4' }).sort({ createdAt: 1 });
        console.log('\n--- STOCK MOVEMENTS ---');
        console.log(JSON.stringify(movements, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

run();
