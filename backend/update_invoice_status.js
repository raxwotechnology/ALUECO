import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Invoice from './src/models/Invoice.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB');

        const result = await Invoice.updateOne(
            { invoiceNumber: 'INV-1780649407536' },
            { paymentStatus: 'partially_paid', grandTotal: 50000, balanceDue: 45000 }
        );
        console.log('Update result:', result);

        // Fetch invoice to verify
        const inv = await Invoice.findOne({ invoiceNumber: 'INV-1780649407536' });
        console.log('Updated Invoice:', inv);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('DB connection closed');
    }
}

run();
