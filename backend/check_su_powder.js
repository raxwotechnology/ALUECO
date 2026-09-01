import dotenv from 'dotenv';
import mongoose from 'mongoose';
import StockItem from './src/models/StockItem.js';
import StockMovement from './src/models/StockMovement.js';
import Product from './src/models/Product.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB');

        const product = await Product.findOne({ name: /SU Powder/i });
        if (!product) {
            console.log('Product SU Powder not found');
            return;
        }

        console.log('\n--- PRODUCT INFO ---');
        console.log({
            _id: product._id,
            name: product.name,
            productCode: product.productCode,
            productType: product.productType
        });

        const stockItems = await StockItem.find({ productId: product._id });
        console.log('\n--- STOCK ITEMS ---');
        console.log(JSON.stringify(stockItems, null, 2));

        const stockMovements = await StockMovement.find({ productId: product._id }).sort({ createdAt: 1 });
        console.log('\n--- STOCK MOVEMENTS ---');
        console.log(JSON.stringify(stockMovements.map(m => ({
            movementType: m.movementType,
            quantity: m.quantity,
            batchNumber: m.batchNumber,
            reason: m.reason,
            createdAt: m.createdAt
        })), null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

run();
