import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Invoice from './src/models/Invoice.js';
import Customer from './src/models/Customer.js';
import User from './src/models/User.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB');

        const customer = await Customer.findOne({});
        if (!customer) {
            console.log('❌ No customer found in DB. Run seed_exports.js first.');
            return;
        }
        console.log('Found Customer:', customer.displayName, customer._id);

        const admin = await User.findOne({ role: 'admin' });
        const adminId = admin ? admin._id : null;

        // Create a standard invoice
        const invoiceDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15); // due in 15 days (current or 1-30 days depending on calculation)

        const invoice = new Invoice({
            customerId: customer._id,
            customerSnapshot: {
                name: customer.displayName,
                code: customer.customerCode,
                taxRegistrationNumber: customer.taxRegistrationNumber,
                contactName: customer.primaryContact?.name,
            },
            billingAddress: customer.billingAddress,
            shippingAddress: customer.shippingAddresses?.[0] || customer.billingAddress,
            invoiceType: 'standard',
            invoiceDate: invoiceDate,
            dueDate: dueDate,
            items: [
                {
                    productName: 'Moringa Powder',
                    productCode: 'PROD-MOR-001',
                    quantity: 10,
                    unitPrice: 1500,
                    lineTotal: 15000,
                    taxable: false
                }
            ],
            subtotal: 15000,
            grandTotal: 15000,
            balanceDue: 15000,
            amountPaid: 0,
            paymentStatus: 'unpaid',
            status: 'approved',
            createdBy: adminId
        });

        await invoice.save();
        console.log('✓ Invoice created successfully:', invoice);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('DB connection closed');
    }
}

run();
