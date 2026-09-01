import dotenv from 'dotenv';
import mongoose from 'mongoose';
import AluQuotation from './src/models/AluQuotation.js';
import Invoice from './src/models/Invoice.js';
import Settings from './src/models/Settings.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB');

        // Update settings with default logos and terms if needed
        await Settings.findOneAndUpdate(
            {},
            {
                companyName: 'ALUECO ALUMINIUM SYSTEMS',
                companyAddress: 'No. 123, Negoda Road, Weliweriya, Sri Lanka.',
                companyPhone: '0777 140 680',
                companyEmail: 'info@alueco.lk',
                defaultTermsAndConditions: '1. Quotation valid for 30 days.\n2. 60% advance payment required.\n3. Balance 40% upon completion.\n4. Swisstek 10 year powder coating warranty applies.'
            },
            { upsert: true, new: true }
        );
        console.log('✓ Settings updated');

        // Seed Sample Quotation
        await AluQuotation.deleteMany({ quoteNumber: 'QOT-2026-SAMPLE' });
        const quote = await AluQuotation.create({
            quoteNumber: 'QOT-2026-SAMPLE',
            version: 0,
            revisionGroupCode: 'QOT-2026-SAMPLE',
            isLatestRevision: true,
            customerName: 'Mr. Chaminda Perera',
            projectName: 'Green Villa Luxury Residence',
            location: 'Nugegoda, Colombo',
            date: new Date(),
            validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            preparedBy: 'ALUECO Design Team',
            status: 'sent',
            includeVat: true,
            distributeTransportCost: true,
            transportCost: 15000,
            termsAndConditions: '1. Valid for 30 days from date of issue.\n2. 60% advance payment required to commence fabrication.\n3. Balance 40% due upon installation.\n4. Includes Swisstek 10-year powder coating warranty.',
            items: [
                {
                    applicationType: 'Sliding Door',
                    configuration: '3 Panel - 2 Track Swisstek C-Groove',
                    width: 2400,
                    height: 2100,
                    quantity: 2,
                    unitPrice: 145000,
                    totalPrice: 290000
                },
                {
                    applicationType: 'Casement Window',
                    configuration: '2 Panel Swisstek C-Groove',
                    width: 1500,
                    height: 1200,
                    quantity: 4,
                    unitPrice: 65000,
                    totalPrice: 260000
                },
                {
                    applicationType: 'Fixed Glass Panel',
                    configuration: '5mm Tempered Clear Glass',
                    width: 1800,
                    height: 1200,
                    quantity: 2,
                    unitPrice: 45000,
                    totalPrice: 90000
                }
            ],
            totalAluminiumCost: 350000,
            totalGlassCost: 180000,
            totalAccessoriesCost: 40000,
            totalLabourCost: 70000,
            profitMarginPercent: 20,
            calculatedSellingPrice: 640000,
            discount: 0,
            finalSellingPrice: 640000
        });
        console.log('✓ Sample Quotation Created: ID =', quote._id);

        // Seed Sample Invoice
        await Invoice.deleteMany({ invoiceNumber: 'INV-2026-SAMPLE' });
        const invoice = await Invoice.create({
            invoiceNumber: 'INV-2026-SAMPLE',
            invoiceType: 'standard',
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            customerSnapshot: {
                name: 'Mr. Chaminda Perera',
                code: 'CUST-001',
                taxRegistrationNumber: 'VAT-987654321',
            },
            billingAddress: {
                line1: 'No. 45, Temple Road',
                city: 'Nugegoda',
                country: 'Sri Lanka'
            },
            salesOrderNumbers: ['ORD-2026-0042'],
            includeVat: true,
            distributeTransportCost: true,
            shippingCost: 15000,
            termsAndConditions: '1. Payment due within 14 days of invoice date.\n2. Please mention INV-2026-SAMPLE in bank transfer reference.\n3. Goods remain ALUECO property until full payment.',
            items: [
                {
                    productName: 'Sliding Door System (2400x2100mm)',
                    productCode: 'ALU-SLD-2421',
                    quantity: 2,
                    unitPrice: 145000,
                    lineSubtotal: 290000,
                    lineTotal: 290000,
                    taxable: true
                },
                {
                    productName: 'Casement Window System (1500x1200mm)',
                    productCode: 'ALU-CSW-1512',
                    quantity: 4,
                    unitPrice: 65000,
                    lineSubtotal: 260000,
                    lineTotal: 260000,
                    taxable: true
                }
            ],
            subtotal: 550000,
            totalTax: 99000,
            grandTotal: 649000,
            balanceDue: 649000,
            amountPaid: 0,
            paymentStatus: 'unpaid',
            status: 'approved'
        });
        console.log('✓ Sample Invoice Created: ID =', invoice._id);

    } catch (err) {
        console.error('❌ Error seeding sample:', err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

run();
