import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Invoice from './src/models/Invoice.js';
import Bill from './src/models/Bill.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB');

        const invoicesCount = await Invoice.countDocuments({});
        console.log(`Total Invoices: ${invoicesCount}`);

        const invoices = await Invoice.find({});
        console.log('--- Sample Invoices (first 10) ---');
        invoices.slice(0, 10).forEach(inv => {
            console.log({
                id: inv._id,
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: inv.invoiceDate,
                dueDate: inv.dueDate,
                customerId: inv.customerId,
                customerSnapshot: inv.customerSnapshot,
                grandTotal: inv.grandTotal,
                balanceDue: inv.balanceDue,
                paymentStatus: inv.paymentStatus,
                status: inv.status,
                agingBucket: inv.agingBucket,
                daysPastDue: inv.daysPastDue,
                deletedAt: inv.deletedAt
            });
        });

        const billsCount = await Bill.countDocuments({});
        console.log(`Total Bills: ${billsCount}`);

        const bills = await Bill.find({});
        console.log('--- Sample Bills (first 10) ---');
        bills.slice(0, 10).forEach(bill => {
            console.log({
                id: bill._id,
                billNumber: bill.billNumber,
                billDate: bill.billDate,
                dueDate: bill.dueDate,
                supplierId: bill.supplierId,
                grandTotal: bill.grandTotal,
                balanceDue: bill.balanceDue,
                paymentStatus: bill.paymentStatus,
                status: bill.status,
                agingBucket: bill.agingBucket,
                daysPastDue: bill.daysPastDue,
                deletedAt: bill.deletedAt
            });
        });

        console.log('--- Invoice paymentStatus counts ---');
        const invStatusCount = await Invoice.aggregate([
            { $group: { _id: '$paymentStatus', count: { $sum: 1 }, totalBalance: { $sum: '$balanceDue' } } }
        ]);
        console.log(invStatusCount);

        console.log('--- Bill paymentStatus counts ---');
        const billStatusCount = await Bill.aggregate([
            { $group: { _id: '$paymentStatus', count: { $sum: 1 }, totalBalance: { $sum: '$balanceDue' } } }
        ]);
        console.log(billStatusCount);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('DB connection closed');
    }
}

run();
