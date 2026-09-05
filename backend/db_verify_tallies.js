import dotenv from 'dotenv';
import mongoose from 'mongoose';
import StockItem from './src/models/StockItem.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB');

        const stockItems = await StockItem.find({});
        console.log(`\nLive Stock Items in Database (${stockItems.length} items):`);
        
        let totalValue = 0;
        stockItems.forEach(item => {
            const val = item.quantities.onHand * item.costPerUnit;
            totalValue += val;
            console.log(`- ${item.productName} (${item.productCode}): Qty = ${item.quantities.onHand}, Cost/Unit = ${item.costPerUnit} LKR, Total Value = ${val.toFixed(2)} LKR`);
        });

        console.log(`\n=========================================`);
        console.log(`LIVE DATABASE STOCK VALUATION TOTAL: ${totalValue.toFixed(2)} LKR`);
        console.log(`TARGET FOR APRIL 30: 714,850.00 LKR`);
        console.log(`=========================================`);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('DB connection closed');
    }
}

run();
