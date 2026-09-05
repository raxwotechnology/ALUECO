import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PettyCash from './src/models/PettyCash.js';
import ProductionBatch from './src/models/ProductionBatch.js';
import Product from './src/models/Product.js';
import Supplier from './src/models/Supplier.js';
import Customer from './src/models/Customer.js';
import Warehouse from './src/models/Warehouse.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB');

        console.log('\n--- SAMPLE PETTY CASH ---');
        const pCash = await PettyCash.find({}).limit(5);
        console.log(pCash.map(p => ({ date: p.date, refNo: p.refNo, item: p.item, amount: p.amount, category: p.category })));

        console.log('\n--- SAMPLE PRODUCTION BATCHES ---');
        const prodBatches = await ProductionBatch.find({}).limit(5);
        console.log(prodBatches.map(b => ({ date: b.date, batchNo: b.batchNo, product: b.product, input: b.inputWeight_total, output: b.outputWeight_total })));

        console.log('\n--- ALL WAREHOUSES ---');
        const warehouses = await Warehouse.find({});
        console.log(warehouses.map(w => ({ id: w._id, code: w.warehouseCode, name: w.name })));

        console.log('\n--- ALL SUPPLIERS ---');
        const suppliers = await Supplier.find({});
        console.log(suppliers.map(s => ({ code: s.supplierCode, name: s.name, type: s.supplierType })));

        console.log('\n--- ALL CUSTOMERS ---');
        const customers = await Customer.find({});
        console.log(customers.map(c => ({ code: c.customerCode, name: c.name, type: c.customerType })));

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('DB connection closed');
    }
}

run();
