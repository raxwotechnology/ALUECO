import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function seedAluecoDemoData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Import Models
        const User = (await import('./src/models/User.js')).default;
        const Supplier = (await import('./src/models/Supplier.js')).default;
        const Customer = (await import('./src/models/Customer.js')).default;
        const Product = (await import('./src/models/Product.js')).default;
        const StockItem = (await import('./src/models/StockItem.js')).default;
        const Warehouse = (await import('./src/models/Warehouse.js')).default;
        const AluQuotation = (await import('./src/models/AluQuotation.js')).default;
        const SalesOrder = (await import('./src/models/SalesOrder.js')).default;
        const Invoice = (await import('./src/models/Invoice.js')).default;
        const Bill = (await import('./src/models/Bill.js')).default;
        const Payment = (await import('./src/models/Payment.js')).default;
        const PettyCash = (await import('./src/models/PettyCash.js')).default;
        const CustomerReturn = (await import('./src/models/CustomerReturn.js')).default;
        const SupplierReturn = (await import('./src/models/SupplierReturn.js')).default;
        const AluScrap = (await import('./src/models/AluScrap.js')).default;
        const AluJobCard = (await import('./src/models/AluJobCard.js')).default;

        let adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            adminUser = await User.findOne({});
        }

        // 1. Warehouse
        let warehouse = await Warehouse.findOne({});
        if (!warehouse) {
            warehouse = await Warehouse.create({
                name: 'Main Aluminium Factory Yard',
                warehouseCode: 'WH-ALU-01',
                address: { line1: 'Weliweriya', city: 'Gampaha' },
                createdBy: adminUser?._id
            });
        }

        // 2. Customers
        console.log('🌱 Seeding Customers...');
        let customer1 = await Customer.findOne({ customerCode: 'CUST-ALU-001' });
        if (!customer1) {
            customer1 = await Customer.create({
                customerCode: 'CUST-ALU-001',
                displayName: 'Mr. Chaminda Perera',
                firstName: 'Chaminda',
                lastName: 'Perera',
                primaryContact: { name: 'Chaminda Perera', phone: '0777123456', email: 'chaminda@example.com' },
                billingAddress: { line1: 'No 45, Green Villa', city: 'Nugegoda' },
                createdBy: adminUser?._id
            });
        }

        let customer2 = await Customer.findOne({ customerCode: 'CUST-ALU-002' });
        if (!customer2) {
            customer2 = await Customer.create({
                customerCode: 'CUST-ALU-002',
                displayName: 'Luxury Heights Pvt Ltd',
                companyName: 'Luxury Heights Pvt Ltd',
                primaryContact: { name: 'Saman Kumara', phone: '0714987654', email: 'saman@luxuryheights.lk' },
                billingAddress: { line1: 'No 120, Nawala Road', city: 'Rajagiriya' },
                createdBy: adminUser?._id
            });
        }

        // 3. Suppliers
        console.log('🌱 Seeding Suppliers...');
        let supplier1 = await Supplier.findOne({ supplierCode: 'SUP-ALU-001' });
        if (!supplier1) {
            supplier1 = await Supplier.create({
                supplierCode: 'SUP-ALU-001',
                displayName: 'Swisstek Aluminium PLC',
                companyName: 'Swisstek Aluminium PLC',
                primaryContact: { name: 'Sales Office', email: 'sales@swisstekaluminium.com', phone: '0112456789' },
                address: { line1: 'Dominion Tower', city: 'Colombo 02' },
                createdBy: adminUser?._id
            });
        }

        // 4. Raw Materials / Products
        console.log('🌱 Seeding Raw Materials & Stock...');
        let rawMat1 = await Product.findOne({ productCode: 'ALU-PRF-26236' });
        if (!rawMat1) {
            rawMat1 = await Product.create({
                productCode: 'ALU-PRF-26236',
                name: 'Swisstek C-Groove Outer Frame 6M (White Powder Coated)',
                businessType: 'alueco',
                productType: 'raw_material',
                category: 'Aluminium Stock',
                aluCategory: 'profiles',
                unitOfMeasure: 'bar',
                costPrice: 4200,
                sellingPrice: 5500,
                aluSpecs: { series: 'C-Groove 100mm', lengthMm: 6000, powderCoatingColor: 'Pure White RAL 9010' }
            });
        }

        let rawMat2 = await Product.findOne({ productCode: 'GLS-TMP-006' });
        if (!rawMat2) {
            rawMat2 = await Product.create({
                productCode: 'GLS-TMP-006',
                name: '6mm Clear Tempered Glass Sheet',
                businessType: 'alueco',
                productType: 'raw_material',
                category: 'Aluminium Stock',
                aluCategory: 'glass',
                unitOfMeasure: 'sqft',
                costPrice: 650,
                sellingPrice: 950
            });
        }

        await StockItem.findOneAndUpdate(
            { productId: rawMat1._id, warehouseId: warehouse._id },
            { quantity: 150, averageCost: 4200, reorderLevel: 20 },
            { upsert: true }
        );

        await StockItem.findOneAndUpdate(
            { productId: rawMat2._id, warehouseId: warehouse._id },
            { quantity: 800, averageCost: 650, reorderLevel: 100 },
            { upsert: true }
        );

        // 5. Alu Quotations
        console.log('🌱 Seeding Quotations...');
        let quote1 = await AluQuotation.findOne({ quoteNumber: 'QOT-ALU-2026-001' });
        if (!quote1) {
            quote1 = await AluQuotation.create({
                quoteNumber: 'QOT-ALU-2026-001',
                version: 0,
                revisionGroupCode: 'QOT-ALU-2026-001',
                isLatestRevision: true,
                customerName: 'Mr. Chaminda Perera',
                projectName: 'Shangri-La Luxury Villa',
                location: 'Nugegoda, Colombo',
                date: new Date(),
                validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        applicationType: 'Sliding Door',
                        configuration: '3 Panel Outer Track C-Groove',
                        width: 2400,
                        height: 2100,
                        quantity: 2,
                        unitPrice: 285000,
                        totalPrice: 570000
                    },
                    {
                        applicationType: 'Casement Window',
                        configuration: '2 Panel Side Hung',
                        width: 1500,
                        height: 1200,
                        quantity: 4,
                        unitPrice: 85000,
                        totalPrice: 340000
                    }
                ],
                totalAluminiumCost: 450000,
                totalGlassCost: 220000,
                totalAccessoriesCost: 65000,
                totalLabourCost: 95000,
                transportCost: 20000,
                profitMarginPercent: 20,
                calculatedSellingPrice: 910000,
                finalSellingPrice: 910000,
                status: 'accepted',
                createdBy: adminUser?._id
            });
        }

        let quote2 = await AluQuotation.findOne({ quoteNumber: 'QOT-ALU-2026-002' });
        if (!quote2) {
            quote2 = await AluQuotation.create({
                quoteNumber: 'QOT-ALU-2026-002',
                version: 0,
                revisionGroupCode: 'QOT-ALU-2026-002',
                isLatestRevision: true,
                customerName: 'Luxury Heights Pvt Ltd',
                projectName: 'Nawala Luxury Apartments - Tower A',
                location: 'Nawala Road, Rajagiriya',
                date: new Date(),
                validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        applicationType: 'Curtain Wall',
                        configuration: 'Structural Glazing System 150mm',
                        width: 4500,
                        height: 3000,
                        quantity: 4,
                        unitPrice: 650000,
                        totalPrice: 2600000
                    }
                ],
                totalAluminiumCost: 1400000,
                totalGlassCost: 650000,
                totalAccessoriesCost: 180000,
                totalLabourCost: 250000,
                transportCost: 50000,
                profitMarginPercent: 20,
                calculatedSellingPrice: 2600000,
                finalSellingPrice: 2600000,
                status: 'accepted',
                createdBy: adminUser?._id
            });
        }

        // 6. Project Sales Orders
        console.log('🌱 Seeding Project Sales Orders...');
        let order1 = await SalesOrder.findOne({ orderNumber: 'SO-ALU-2026-001' });
        if (!order1) {
            order1 = await SalesOrder.create({
                orderNumber: 'SO-ALU-2026-001',
                businessType: 'alueco',
                quotationId: quote1._id,
                customerId: customer1._id,
                customerName: customer1.displayName,
                projectName: quote1.projectName,
                grandTotal: quote1.finalSellingPrice,
                status: 'Confirmed',
                deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                createdBy: adminUser?._id
            });
        }

        let order2 = await SalesOrder.findOne({ orderNumber: 'SO-ALU-2026-002' });
        if (!order2) {
            order2 = await SalesOrder.create({
                orderNumber: 'SO-ALU-2026-002',
                businessType: 'alueco',
                quotationId: quote2._id,
                customerId: customer2._id,
                customerName: customer2.displayName,
                projectName: quote2.projectName,
                grandTotal: quote2.finalSellingPrice,
                status: 'In Production',
                deliveryDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
                createdBy: adminUser?._id
            });
        }

        // 7. Project Job Cards (Kanban)
        console.log('🌱 Seeding Production Kanban Job Cards...');
        await AluJobCard.findOneAndUpdate(
            { jobCardNumber: 'JC-ALU-2026-001' },
            {
                jobCardNumber: 'JC-ALU-2026-001',
                salesOrderId: order1._id,
                quotationId: quote1._id,
                customerName: customer1.displayName,
                projectName: quote1.projectName,
                status: 'cutting',
                items: [
                    { applicationType: 'Sliding Door', configuration: '3 Panel C-Groove', width: 2400, height: 2100, quantity: 2, completedQty: 1 }
                ]
            },
            { upsert: true }
        );

        // 8. Finance Payments (Income Tracking)
        console.log('🌱 Seeding Project Payments (Income)...');
        await Payment.findOneAndUpdate(
            { paymentNumber: 'PAY-ALU-001' },
            {
                paymentNumber: 'PAY-ALU-001',
                direction: 'received',
                salesOrderId: order1._id,
                isAlueco: true,
                customerId: customer1._id,
                partyName: customer1.displayName,
                amount: 550000,
                method: 'bank_transfer',
                paymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                allocations: [{
                    documentType: 'sales_order',
                    documentId: order1._id,
                    documentNumber: order1.orderNumber,
                    amount: 550000,
                }],
                createdBy: adminUser?._id
            },
            { upsert: true }
        );

        await Payment.findOneAndUpdate(
            { paymentNumber: 'PAY-ALU-002' },
            {
                paymentNumber: 'PAY-ALU-002',
                direction: 'received',
                salesOrderId: order2._id,
                isAlueco: true,
                customerId: customer2._id,
                partyName: customer2.displayName,
                amount: 1500000,
                method: 'cheque',
                paymentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                allocations: [{
                    documentType: 'sales_order',
                    documentId: order2._id,
                    documentNumber: order2.orderNumber,
                    amount: 1500000,
                }],
                createdBy: adminUser?._id
            },
            { upsert: true }
        );

        await SalesOrder.findByIdAndUpdate(order1._id, { totalPaid: 550000 });
        await SalesOrder.findByIdAndUpdate(order2._id, { totalPaid: 1500000 });

        // 9. Project Expenses
        console.log('🌱 Seeding Operational & Site Expenses...');
        await PettyCash.findOneAndUpdate(
            { refNo: 'ALU-EXP-2026-001' },
            {
                refNo: 'ALU-EXP-2026-001',
                date: new Date(),
                amount: 35000,
                category: 'Site Expense',
                item: 'Site survey transport & scaffolding rental for Shangri-La Villa',
                supplier: 'Lanka Scaffolders',
                transactionType: 'expense',
                department: 'Alueco',
                isAlueco: true,
                status: 'approved',
                createdBy: adminUser?._id
            },
            { upsert: true }
        );

        // 10. Customer Invoices
        console.log('🌱 Seeding Customer Invoices...');
        await Invoice.findOneAndUpdate(
            { invoiceNumber: 'INV-ALU-2026-001' },
            {
                invoiceNumber: 'INV-ALU-2026-001',
                businessType: 'alueco',
                salesOrderIds: [order1._id],
                salesOrderNumbers: [order1.orderNumber],
                customerId: customer1._id,
                customerName: customer1.displayName,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                subtotal: 910000,
                grandTotal: 910000,
                amountPaid: 550000,
                balanceDue: 360000,
                paymentStatus: 'partially_paid',
                status: 'approved',
                createdBy: adminUser?._id
            },
            { upsert: true }
        );

        // 11. Supplier Bills & Aging
        console.log('🌱 Seeding Supplier Bills...');
        await Bill.findOneAndUpdate(
            { billNumber: 'BILL-SWISS-2026-01' },
            {
                billNumber: 'BILL-SWISS-2026-01',
                supplierId: supplier1._id,
                supplierSnapshot: { name: supplier1.displayName },
                billDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                grandTotal: 630000,
                amountPaid: 300000,
                balanceDue: 330000,
                status: 'partially_paid',
                createdBy: adminUser?._id
            },
            { upsert: true }
        );

        // 12. Customer Returns & Supplier Returns
        console.log('🌱 Seeding Returns Records...');
        await CustomerReturn.findOneAndUpdate(
            { rmaNumber: 'RMA-CUST-2026-001' },
            {
                rmaNumber: 'RMA-CUST-2026-001',
                customerId: customer1._id,
                customerSnapshot: { name: customer1.displayName },
                totalRefundAmount: 45000,
                status: 'completed',
                createdBy: adminUser?._id
            },
            { upsert: true }
        );

        await SupplierReturn.findOneAndUpdate(
            { returnNumber: 'RET-SUP-2026-001' },
            {
                returnNumber: 'RET-SUP-2026-001',
                supplierId: supplier1._id,
                supplierSnapshot: { name: supplier1.displayName },
                totalReturnValue: 78000,
                status: 'completed',
                createdBy: adminUser?._id
            },
            { upsert: true }
        );

        // 13. Scrap Inventory
        console.log('🌱 Seeding Alu Scrap Inventory...');
        await AluScrap.create({
            profileCode: '26236',
            lengthMm: 1450,
            status: 'available',
            notes: 'Factory Rack B'
        });

        console.log('✅ ALUECO DEMO DATA SEEDED SUCCESSFULLY!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Error seeding Alueco demo data:', err);
        process.exit(1);
    }
}

seedAluecoDemoData();
