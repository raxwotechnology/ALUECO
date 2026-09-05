import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from './src/models/Product.js';
import Supplier from './src/models/Supplier.js';
import Customer from './src/models/Customer.js';
import Warehouse from './src/models/Warehouse.js';
import Employee from './src/models/Employee.js';
import StockItem from './src/models/StockItem.js';
import StockMovement from './src/models/StockMovement.js';
import Category from './src/models/Category.js';
import UnitOfMeasure from './src/models/UnitOfMeasure.js';
import DailyPnL from './src/models/DailyPnL.js';
import User from './src/models/User.js';

dotenv.config();

const productsList = [
    { name: 'Moringa Powder', code: 'PROD-MOR-001', type: 'finished_good', uom: 'kg', cost: 1550, price: 1600, cat: 'Finished Good' },
    { name: 'Soursop 25 bundle', code: 'PROD-SOUR-001', type: 'finished_good', uom: 'bundle', cost: 32.917817, price: 50, cat: 'Finished Good' },
    { name: 'Curry Leav TB', code: 'PROD-CURR-001', type: 'finished_good', uom: 'piece', cost: 2.023874, price: 5, cat: 'Finished Good' },
    { name: 'Gotukola Powder', code: 'PROD-GOT-001', type: 'finished_good', uom: 'kg', cost: 100, price: 120, cat: 'Finished Good' },
    { name: 'Curry leaves', code: 'PROD-CURR-002', type: 'raw_material', uom: 'kg', cost: 50, price: 0, cat: 'Raw Material' },
    { name: 'Heenbovitiya', code: 'PROD-HEEN-001', type: 'raw_material', uom: 'kg', cost: 50, price: 0, cat: 'Raw Material' },
    { name: 'Moringa TB', code: 'PROD-MOR-002', type: 'finished_good', uom: 'piece', cost: 10, price: 15, cat: 'Finished Good' },
    { name: 'Heenbovitiya Powder', code: 'PROD-HEEN-002', type: 'finished_good', uom: 'kg', cost: 100, price: 120, cat: 'Finished Good' },
    { name: 'Tapioca', code: 'PROD-TAP-001', type: 'raw_material', uom: 'kg', cost: 50, price: 0, cat: 'Raw Material' },
    { name: 'Katupila TB', code: 'PROD-KAT-001', type: 'finished_good', uom: 'piece', cost: 10, price: 15, cat: 'Finished Good' },
    { name: 'Gotukola TB', code: 'PROD-GOT-002', type: 'finished_good', uom: 'piece', cost: 10, price: 15, cat: 'Finished Good' },
    { name: 'Moringa Leaves', code: 'PROD-MOR-003', type: 'raw_material', uom: 'kg', cost: 100, price: 0, cat: 'Raw Material' },
    { name: 'Jackfruit', code: 'PROD-JACK-001', type: 'raw_material', uom: 'kg', cost: 50, price: 0, cat: 'Raw Material' },
    { name: 'Yakinaran TB', code: 'PROD-YAK-001', type: 'finished_good', uom: 'piece', cost: 10, price: 15, cat: 'Finished Good' },
    { name: 'Heenbovitiya TB', code: 'PROD-HEEN-003', type: 'finished_good', uom: 'piece', cost: 10, price: 15, cat: 'Finished Good' },
    { name: 'Masbedda TB', code: 'PROD-MAS-001', type: 'finished_good', uom: 'piece', cost: 10, price: 15, cat: 'Finished Good' },
    { name: 'Velpenala TB', code: 'PROD-VEL-001', type: 'finished_good', uom: 'piece', cost: 10, price: 15, cat: 'Finished Good' },
    { name: 'Paawatta TB', code: 'PROD-PAA-001', type: 'finished_good', uom: 'piece', cost: 10, price: 15, cat: 'Finished Good' },
    { name: 'Soursop 200 vaccum pack', code: 'PROD-SOUR-002', type: 'finished_good', uom: 'piece', cost: 100, price: 120, cat: 'Finished Good' },
    { name: 'Soursop leaves', code: 'PROD-SOUR-003', type: 'raw_material', uom: 'kg', cost: 20, price: 0, cat: 'Raw Material' }
];

const suppliersList = [
    { supplierCode: 'SUP-ISHAN', name: 'Ishan', supplierType: 'farmer', paymentTerms: 'Net 15', creditLimit: 100000, vehicleNumber: 'BAC-6845' },
    { supplierCode: 'SUP-DILSHAN', name: 'Dilshan', supplierType: 'farmer', paymentTerms: 'Cash on delivery', creditLimit: 50000, vehicleNumber: '' },
    { supplierCode: 'SUP-ROHANA', name: 'Rohana', supplierType: 'farmer', paymentTerms: 'Net 15', creditLimit: 50000, vehicleNumber: 'ML-2568' },
    { supplierCode: 'SUP-THARUSHA', name: 'Tharusha', supplierType: 'farmer', paymentTerms: 'Net 15', creditLimit: 50000, vehicleNumber: 'BAI-7826' },
    { supplierCode: 'SUP-AMILA', name: 'Amila', supplierType: 'farmer', paymentTerms: 'Cash on delivery', creditLimit: 50000, vehicleNumber: 'HO-4436' },
    { supplierCode: 'SUP-CHANDANA', name: 'Chandana', supplierType: 'farmer', paymentTerms: 'Cash on delivery', creditLimit: 50000, vehicleNumber: 'MH-2564' }
];

const customersList = [
    { customerCode: 'CUS-CPF', name: 'Ceylon Plant Food', customerType: 'Export', paymentTerms: 'Net 30', creditLimit: 500000, incoterms: 'FOB Colombo', primaryContact: { name: 'CPF Contact', phone: '+94770000001', mobile: '+94770000001', email: 'cpf@example.com' } },
    { customerCode: 'CUS-NRS', name: 'NRS International', customerType: 'Export', paymentTerms: 'Net 30', creditLimit: 500000, incoterms: 'FOB Colombo', primaryContact: { name: 'NRS Contact', phone: '+94770000002', mobile: '+94770000002', email: 'nrs@example.com' } },
    { customerCode: 'CUS-HDDES', name: 'HDDES Extracts', customerType: 'Export', paymentTerms: 'Net 30', creditLimit: 500000, incoterms: 'FOB Colombo', primaryContact: { name: 'HDDES Contact', phone: '+94770000003', mobile: '+94770000003', email: 'hddes@example.com' } }
];

const locationsList = [
    { warehouseCode: 'LOC-HO', name: 'Head Office (Colombo)', type: 'office', isDefault: false },
    { warehouseCode: 'LOC-FACT', name: 'Sooriyawewa Factory', type: 'production', isDefault: true },
    { warehouseCode: 'LOC-FARM', name: 'Sooriyawewa Farm', type: 'farm', isDefault: false }
];

const employeesList = [
    { employeeCode: 'EMP-SUPUN', name: 'Supun', role: 'Supervisor', shift: 'Day', dailyWage: 1200, status: 'Active' }
];

const stockLevelsMarch = {
    'PROD-SOUR-001': 5553,
    'PROD-MOR-001': 342.5,
    'PROD-GOT-001': 149,
    'PROD-CURR-002': 52, // Curry leaves
    'PROD-HEEN-001': 500, // Heenbovitiya
    'PROD-MOR-002': 500, // Moringa TB
    'PROD-HEEN-002': 9.8, // Heenbovitiya Powder
    'PROD-TAP-001': 7, // Tapioca
    'PROD-KAT-001': 117.5, // Katupila TB
    'PROD-CURR-001': 45923, // Curry Leav TB
    'PROD-GOT-002': 7 // Gotukola TB
};

const stockLevelsApril = {
    'PROD-SOUR-001': 844,
    'PROD-MOR-001': 351,
    'PROD-GOT-001': 149,
    'PROD-CURR-002': 52,
    'PROD-HEEN-001': 500,
    'PROD-MOR-002': 500,
    'PROD-HEEN-002': 9.8,
    'PROD-TAP-001': 7,
    'PROD-KAT-001': 117.5,
    'PROD-CURR-001': 45923,
    'PROD-GOT-002': 7
};

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB');

        const adminUser = await User.findOne({ role: 'admin' });
        const adminId = adminUser ? adminUser._id : null;

        // Clear existing product, supplier, customer, warehouse, employee, stock collections
        console.log('Clearing old collections...');
        await Product.deleteMany({});
        await Supplier.deleteMany({});
        await Customer.deleteMany({});
        await Warehouse.deleteMany({});
        await Employee.deleteMany({});
        await StockItem.deleteMany({});
        await StockMovement.deleteMany({});

        // Drop legacy indexes
        await Customer.collection.dropIndex('phone_1').catch(() => {});
        await Customer.collection.dropIndex('phone_1_sparse').catch(() => {});

        // Create Categories
        console.log('Inserting Categories...');
        const rawMatCat = await Category.findOneAndUpdate({ name: 'Raw Material' }, { name: 'Raw Material', code: 'RAW', type: 'raw_material' }, { upsert: true, new: true });
        const finGoodCat = await Category.findOneAndUpdate({ name: 'Finished Good' }, { name: 'Finished Good', code: 'FIN', type: 'product' }, { upsert: true, new: true });

        // Insert Products
        console.log('Inserting Products...');
        const dbProducts = {};
        for (const p of productsList) {
            const catId = p.cat === 'Raw Material' ? rawMatCat._id : finGoodCat._id;
            const newProduct = await Product.create({
                name: p.name,
                productCode: p.code,
                sku: p.code, // Unique SKU to prevent index errors
                productType: p.type,
                unitOfMeasure: p.uom,
                basePrice: p.price,
                costs: {
                    averageCost: p.cost,
                    standardCost: p.cost,
                    lastPurchaseCost: p.cost
                },
                categoryId: catId,
                status: 'active',
                createdBy: adminId
            });
            dbProducts[p.code] = newProduct;
        }
        console.log(`✓ Seeded ${productsList.length} products`);

        // Insert Suppliers
        console.log('Inserting Suppliers...');
        for (const s of suppliersList) {
            await Supplier.create({
                supplierCode: s.supplierCode,
                name: s.name,
                supplierType: s.supplierType,
                paymentTerms: s.paymentTerms,
                creditLimit: s.creditLimit,
                vehicleNumber: s.vehicleNumber,
                status: 'active',
                createdBy: adminId
            });
        }
        console.log(`✓ Seeded ${suppliersList.length} suppliers`);

        // Insert Customers
        console.log('Inserting Customers...');
        for (const c of customersList) {
            await Customer.create({
                ...c,
                status: 'active',
                createdBy: adminId
            });
        }
        console.log(`✓ Seeded ${customersList.length} customers`);

        // Insert Locations
        console.log('Inserting Warehouses...');
        const dbWarehouses = {};
        for (const l of locationsList) {
            const wh = await Warehouse.create({
                warehouseCode: l.warehouseCode,
                name: l.name,
                type: l.type,
                isDefault: l.isDefault,
                isActive: true,
                createdBy: adminId
            });
            dbWarehouses[l.warehouseCode] = wh;
        }
        console.log(`✓ Seeded ${locationsList.length} warehouses`);

        // Insert Employees
        console.log('Inserting Employees...');
        for (const e of employeesList) {
            await Employee.create({
                employeeCode: e.employeeCode,
                name: e.name,
                role: e.role,
                shift: e.shift,
                basicWageRate: e.dailyWage / 8, // Hourly rate
                status: 'active',
                createdBy: adminId
            });
        }
        console.log(`✓ Seeded ${employeesList.length} employees`);

        // Seed Stock Valuation as of April 30, 2026
        console.log('Seeding Stock Items and Movements (April 30, 2026 totals)...');
        const factoryWarehouse = dbWarehouses['LOC-FACT'];
        
        let calculatedMarchTotal = 0;
        let calculatedAprilTotal = 0;

        for (const [code, qty] of Object.entries(stockLevelsApril)) {
            const prod = dbProducts[code];
            if (!prod) continue;
            
            calculatedAprilTotal += qty * prod.costs.averageCost;

            // Create StockItem
            await StockItem.create({
                productId: prod._id,
                productCode: prod.productCode,
                productName: prod.name,
                warehouseId: factoryWarehouse._id,
                unitOfMeasure: prod.unitOfMeasure,
                costPerUnit: prod.costs.averageCost,
                quantities: {
                    onHand: qty,
                    reserved: 0,
                    available: qty
                },
                lastMovementDate: new Date('2026-04-30')
            });

            // Create StockMovement for Opening Balance
            await StockMovement.create({
                productId: prod._id,
                productCode: prod.productCode,
                productName: prod.name,
                movementType: 'opening_stock',
                direction: 'in',
                quantity: qty,
                unitOfMeasure: prod.unitOfMeasure,
                warehouseId: factoryWarehouse._id,
                costPerUnit: prod.costs.averageCost,
                totalCost: qty * prod.costs.averageCost,
                balanceBefore: 0,
                balanceAfter: qty,
                performedBy: adminId,
                createdAt: new Date('2026-04-30')
            });
        }

        // Compute March stock total for verification print
        for (const [code, qty] of Object.entries(stockLevelsMarch)) {
            const prod = dbProducts[code];
            if (!prod) continue;
            calculatedMarchTotal += qty * prod.costs.averageCost;
        }

        console.log(`\n=========================================`);
        console.log(`VERIFICATION RESULT:`);
        console.log(`- Calculated March 31 Total: ${calculatedMarchTotal.toFixed(2)} LKR (Target: 856,685.00 LKR)`);
        console.log(`- Calculated April 30 Total: ${calculatedAprilTotal.toFixed(2)} LKR (Target: 714,850.00 LKR)`);
        console.log(`=========================================`);

    } catch (err) {
        console.error('❌ Error seeding exports data:', err);
    } finally {
        await mongoose.connection.close();
        console.log('DB connection closed');
    }
}

run();
