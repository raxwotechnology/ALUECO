import dotenv from 'dotenv';
import mongoose from 'mongoose';
import StockItem from './src/models/StockItem.js';
import StockMovement from './src/models/StockMovement.js';
import PettyCash from './src/models/PettyCash.js';
import ProductionBatch from './src/models/ProductionBatch.js';
import DailyPnL from './src/models/DailyPnL.js';
import Product from './src/models/Product.js';
import Supplier from './src/models/Supplier.js';
import Customer from './src/models/Customer.js';
import Warehouse from './src/models/Warehouse.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB');

        const collections = [
            { name: 'StockItem', model: StockItem },
            { name: 'StockMovement', model: StockMovement },
            { name: 'PettyCash', model: PettyCash },
            { name: 'ProductionBatch', model: ProductionBatch },
            { name: 'DailyPnL', model: DailyPnL },
            { name: 'Product', model: Product },
            { name: 'Supplier', model: Supplier },
            { name: 'Customer', model: Customer },
            { name: 'Warehouse', model: Warehouse }
        ];

        for (const col of collections) {
            const count = await col.model.countDocuments({});
            console.log(`- ${col.name}: ${count} documents`);
        }

        // Check stock valuation totals
        const stockItems = await StockItem.find({});
        console.log(`Total stock items: ${stockItems.length}`);
        
        let totalVal = 0;
        for (const item of stockItems) {
            const val = (item.quantities?.onHand || 0) * (item.costPerUnit || 0);
            totalVal += val;
        }
        console.log(`Current Total Stock Value in DB: ${totalVal.toFixed(2)} LKR`);

        // Check if there are any specific products
        const products = await Product.find({}).limit(5);
        console.log('Sample Products:', products.map(p => ({ code: p.productCode, name: p.name, type: p.productType, cost: p.costs?.averageCost })));

        // Check if we have records for March/April 2026
        const pnlMarch = await DailyPnL.find({ date: { $gte: new Date('2026-03-01'), $lte: new Date('2026-03-31') } });
        console.log(`March 2026 P&L records: ${pnlMarch.length}`);

        const pnlApril = await DailyPnL.find({ date: { $gte: new Date('2026-04-01'), $lte: new Date('2026-04-30') } });
        console.log(`April 2026 P&L records: ${pnlApril.length}`);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('DB connection closed');
    }
}

run();
