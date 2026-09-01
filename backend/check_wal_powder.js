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

        const product = await Product.findOne({ name: /WAL POWDER/i });
        if (!product) {
            console.log('Product WAL POWDER not found');
            return;
        }

        console.log('\n--- PRODUCT INFO ---');
        console.log({
            _id: product._id,
            name: product.name,
            productCode: product.productCode,
            productType: product.productType,
            status: product.status
        });

        const stockItems = await StockItem.find({ productId: product._id });
        console.log('\n--- STOCK ITEMS ---');
        console.log(JSON.stringify(stockItems, null, 2));

        const stockMovements = await StockMovement.find({ productId: product._id }).sort({ createdAt: -1 });
        console.log('\n--- STOCK MOVEMENTS ---');
        console.log(JSON.stringify(stockMovements.map(m => ({
            id: m._id,
            movementType: m.movementType,
            quantity: m.quantity,
            batchNumber: m.batchNumber,
            warehouseId: m.warehouseId,
            referenceType: m.referenceType,
            referenceId: m.referenceId,
            createdAt: m.createdAt,
            notes: m.notes
        })), null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.connection.close();
    }
}

run();
