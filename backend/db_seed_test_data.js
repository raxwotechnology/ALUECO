import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from './src/models/Product.js';
import Customer from './src/models/Customer.js';
import Inquiry from './src/models/Inquiry.js';
import Invoice from './src/models/Invoice.js';
import Bill from './src/models/Bill.js';
import PettyCash from './src/models/PettyCash.js';
import User from './src/models/User.js';
import Supplier from './src/models/Supplier.js';

dotenv.config();

async function run() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Find or create admin user
        let admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log('No admin found, creating test admin...');
            admin = new User({
                username: 'admin_test',
                email: 'admin_test@exportlanka.com',
                passwordHash: 'dummyhash',
                role: 'admin',
                fullName: 'Test Admin User',
                status: 'active'
            });
            await admin.save();
        }
        const adminId = admin._id;
        console.log('✓ Admin User:', admin.email);

        // Find or create Customer
        let customer = await Customer.findOne({ displayName: 'Lanka Organic Foods' });
        if (!customer) {
            console.log('Creating Lanka Organic Foods customer...');
            customer = new Customer({
                displayName: 'Lanka Organic Foods',
                companyName: 'Lanka Organic Foods Pvt Ltd',
                customerType: 'company',
                businessType: 'distributor',
                primaryContact: {
                    name: 'Asela Perera',
                    email: 'asela@lankaorganic.com',
                    phone: '+94 77 123 4567',
                    mobile: '+94 77 123 4567'
                },
                billingAddress: {
                    label: 'Head Office',
                    attentionTo: 'Finance Dept',
                    line1: '123 Galle Road',
                    line2: 'Colombo 03',
                    city: 'Colombo',
                    state: 'Western',
                    country: 'Sri Lanka',
                    postalCode: '00300',
                    phone: '+94 11 222 3333',
                    isDefault: true
                },
                status: 'active',
                createdBy: adminId
            });
            await customer.save();
        }
        console.log('✓ Customer:', customer.displayName, `(ID: ${customer._id})`);

        // Find or create Supplier
        let supplier = await Supplier.findOne({ name: 'Ceylon Agritech' });
        if (!supplier) {
            console.log('Creating Ceylon Agritech supplier...');
            supplier = new Supplier({
                name: 'Ceylon Agritech',
                supplierCode: 'SUP-AGRITECH',
                contactPerson: 'Sunil Silva',
                email: 'sunil@ceylonagri.com',
                phone: '+94 71 999 8888',
                status: 'active',
                createdBy: adminId
            });
            await supplier.save();
        }
        console.log('✓ Supplier:', supplier.name, `(ID: ${supplier._id})`);

        // Create two products if they don't exist
        let prod1 = await Product.findOne({ productCode: 'PROD-MOR-001' });
        if (!prod1) {
            console.log('Creating Moringa product...');
            prod1 = new Product({
                productCode: 'PROD-MOR-001',
                productShortCode: 'MOR',
                name: 'Ceylon Moringa Powder',
                shortName: 'Moringa Powder',
                description: 'Premium quality dehydrated Ceylon Moringa Leaf Powder',
                productType: 'finished_good',
                unitOfMeasure: 'kg',
                basePrice: 1500,
                mrp: 1800,
                currency: 'LKR',
                status: 'active',
                createdBy: adminId
            });
            await prod1.save();
        }
        console.log('✓ Product 1:', prod1.name, `Price: Rs. ${prod1.basePrice}`);

        let prod2 = await Product.findOne({ productCode: 'PROD-SOU-002' });
        if (!prod2) {
            console.log('Creating Soursop Tea product...');
            prod2 = new Product({
                productCode: 'PROD-SOU-002',
                productShortCode: 'SOU',
                name: 'Organic Soursop Tea',
                shortName: 'Soursop Tea',
                description: 'Rich organic Soursop leaf tea bags',
                productType: 'finished_good',
                unitOfMeasure: 'pack',
                basePrice: 2500,
                mrp: 3000,
                currency: 'LKR',
                status: 'active',
                createdBy: adminId
            });
            await prod2.save();
        }
        console.log('✓ Product 2:', prod2.name, `Price: Rs. ${prod2.basePrice}`);

        // Create Inquiry for client autocomplete search check
        let inquiry = await Inquiry.findOne({ prospectEmail: 'inquiry@lankaorganic.com' });
        if (!inquiry) {
            console.log('Creating test Inquiry...');
            inquiry = new Inquiry({
                companyName: 'Lanka Organic Foods (Lead)',
                contactPerson: 'Lead Manager',
                email: 'inquiry@lankaorganic.com',
                phone: '+94 76 543 2109',
                prospectName: 'Lead Manager',
                prospectEmail: 'inquiry@lankaorganic.com',
                prospectCountry: 'Sri Lanka',
                source: 'website',
                status: 'new',
                createdBy: adminId
            });
            await inquiry.save();
        }
        console.log('✓ Inquiry/Lead:', inquiry.companyName, `(ID: ${inquiry._id})`);

        // Clean previous test invoices/bills/pettycash for June 2026 to avoid duplication
        const juneStart = new Date('2026-06-01T00:00:00.000Z');
        const juneEnd = new Date('2026-06-30T23:59:59.999Z');

        await Invoice.deleteMany({ invoiceDate: { $gte: juneStart, $lte: juneEnd }, notes: 'Test Seeder Data' });
        await Bill.deleteMany({ billDate: { $gte: juneStart, $lte: juneEnd }, notes: 'Test Seeder Data' });
        await PettyCash.deleteMany({ date: { $gte: juneStart, $lte: juneEnd }, refNo: 'PC-TEST-JUNE' });

        // Seed 1 Commercial Invoice (Revenue) in June 2026
        const invoice = new Invoice({
            customerId: customer._id,
            customerSnapshot: {
                name: customer.displayName,
                code: customer.customerCode,
                taxRegistrationNumber: customer.taxRegistrationNumber,
                contactName: customer.primaryContact?.name,
            },
            billingAddress: customer.billingAddress,
            shippingAddress: customer.billingAddress,
            invoiceType: 'commercial',
            invoiceDate: new Date('2026-06-15T10:00:00Z'),
            dueDate: new Date('2026-06-30T10:00:00Z'),
            items: [
                {
                    productName: prod1.name,
                    productCode: prod1.productCode,
                    quantity: 100,
                    unitPrice: prod1.basePrice, // 1500
                    lineTotal: 100 * prod1.basePrice, // 150000
                    taxable: false
                },
                {
                    productName: prod2.name,
                    productCode: prod2.productCode,
                    quantity: 20,
                    unitPrice: prod2.basePrice, // 2500
                    lineTotal: 20 * prod2.basePrice, // 50000
                    taxable: false
                }
            ],
            subtotal: 200000,
            grandTotal: 200000,
            balanceDue: 200000,
            amountPaid: 0,
            paymentStatus: 'unpaid',
            status: 'approved',
            notes: 'Test Seeder Data',
            createdBy: adminId
        });
        await invoice.save();
        console.log('✓ Seeded June 2026 Commercial Invoice. Total Revenue:', invoice.grandTotal, 'LKR');

        // Seed 1 Supplier Bill (Expense) in June 2026
        const bill = new Bill({
            supplierId: supplier._id,
            supplierSnapshot: {
                name: supplier.name,
                code: supplier.supplierCode,
                taxRegistrationNumber: ''
            },
            billDate: new Date('2026-06-10T12:00:00Z'),
            dueDate: new Date('2026-06-25T12:00:00Z'),
            items: [
                {
                    lineNumber: 1,
                    productCode: prod1.productCode,
                    productName: prod1.name,
                    quantity: 50,
                    unitPrice: 1000,
                    lineSubtotal: 50000,
                    lineTotal: 50000
                }
            ],
            subtotal: 50000,
            grandTotal: 50000,
            balanceDue: 50000,
            amountPaid: 0,
            paymentStatus: 'unpaid',
            status: 'approved',
            notes: 'Test Seeder Data',
            createdBy: adminId
        });
        await bill.save();
        console.log('✓ Seeded June 2026 Supplier Bill. Total Bill Expense:', bill.grandTotal, 'LKR');

        // Seed 1 Petty Cash expense (Operating Expense) in June 2026
        const pettyCash = new PettyCash({
            date: new Date('2026-06-12T09:00:00Z'),
            refNo: 'PC-TEST-JUNE',
            item: 'June Test Fuel and Welfare Expense',
            supplier: 'Various Vendors',
            amount: 25000,
            category: 'fuel',
            transactionType: 'expense',
            poolId: 'MAIN',
            fuel: 15000,
            welfare: 10000,
            status: 'approved',
            createdBy: adminId
        });
        await pettyCash.save();
        console.log('✓ Seeded June 2026 Petty Cash transaction. Total Petty Cash Expense:', pettyCash.amount, 'LKR');

        console.log('\n--- JUNE 2026 EXPECTED DYNAMIC P&L VALUES ---');
        const expectedRevenue = 200000;
        const expectedExpenses = 50000 + 25000; // Bill + PettyCash
        const expectedProfit = expectedRevenue - expectedExpenses;
        const expectedMargin = (expectedProfit / expectedRevenue) * 100;
        console.log(`Expected Revenue: ${expectedRevenue} LKR`);
        console.log(`Expected Expenses: ${expectedExpenses} LKR (Bill: 50k, Petty Cash: 25k)`);
        console.log(`Expected Net Profit: ${expectedProfit} LKR`);
        console.log(`Expected Margin: ${expectedMargin}%`);
        console.log('---------------------------------------------\n');

    } catch (err) {
        console.error('❌ Error seeding data:', err);
    } finally {
        await mongoose.connection.close();
        console.log('DB connection closed');
    }
}

run();
