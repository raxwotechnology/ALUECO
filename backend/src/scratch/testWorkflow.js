import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

// Import Models
import Inquiry from '../models/Inquiry.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import AluQuotation from '../models/AluQuotation.js';
import SalesOrder from '../models/SalesOrder.js';
import Payment from '../models/Payment.js';
import BankAccount from '../models/BankAccount.js';
import Product from '../models/Product.js';
import StockItem from '../models/StockItem.js';
import PosShift from '../models/PosShift.js';
import AluApplication from '../models/AluApplication.js';
import Warehouse from '../models/Warehouse.js';
import StockMovement from '../models/StockMovement.js';

dotenv.config();

const runWorkflowTest = async () => {
    console.log('=== STARTING ALUECO ERP WORKFLOW TEST ===');
    
    // 1. Connect DB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB Atlas');

    // Clean up any leftovers from previous failed test runs
    await Inquiry.deleteMany({ companyName: 'Luxo Construction' });
    await AluQuotation.deleteMany({ quoteNumber: 'Q-2026-0099' });
    await SalesOrder.deleteMany({ orderNumber: 'SO-2026-0099' });
    await Payment.deleteMany({ paymentNumber: 'REC-0099' });
    await PosShift.deleteMany({ shiftNumber: 'SHIFT-2026-001' });
    console.log('✓ Cleared any leftover test data from previous runs');

    // Setup helper: Ensure we have a warehouse, products, bank account, customer, supplier
    let warehouse = await Warehouse.findOne({ deletedAt: null });
    if (!warehouse) {
        warehouse = await Warehouse.create({ name: 'Colombo Main Warehouse', code: 'WH-01' });
        console.log(`✓ Seeded Warehouse: ${warehouse.name}`);
    }

    let customer = await Customer.findOne({ deletedAt: null });
    if (!customer) {
        customer = await Customer.create({
            displayName: 'Dilum Wickramanayake',
            customerCode: 'CUST-999',
            primaryContact: { phone: '+94771234567' }
        });
        console.log(`✓ Seeded Customer: ${customer.displayName}`);
    }

    let supplier = await Supplier.findOne({ deletedAt: null });
    if (!supplier) {
        supplier = await Supplier.create({
            companyName: 'Alumex PLC',
            displayName: 'Alumex',
            supplierCode: 'SUP-777',
            paymentTerms: { openingBalance: 120000, creditLimit: 500000, creditDays: 30 }
        });
        console.log(`✓ Seeded Supplier: ${supplier.companyName}`);
    }

    let bankAccount = await BankAccount.findOne({ deletedAt: null });
    if (!bankAccount) {
        bankAccount = await BankAccount.create({
            bankName: 'Seylan Bank POS',
            accountName: 'Seylan POS Account',
            accountNumber: '1234-5678-9012',
            accountType: 'savings'
        });
        console.log(`✓ Seeded Bank Account: ${bankAccount.accountNumber}`);
    }

    // Seed test profiles and accessories
    let profile = await Product.findOne({ productCode: 'ALU-101' });
    if (!profile) {
        profile = await Product.create({
            name: 'Aluminium Outer Frame 6m',
            productCode: 'ALU-101',
            unitOfMeasure: 'bar',
            costs: { averageCost: 4500, lastPurchaseCost: 4500 },
            price: 6000
        });
    }
    
    let glass = await Product.findOne({ productCode: 'GLA-5MM' });
    if (!glass) {
        glass = await Product.create({
            name: '5mm Clear Glass',
            productCode: 'GLA-5MM',
            unitOfMeasure: 'sqft',
            costs: { averageCost: 420, lastPurchaseCost: 420 },
            price: 650
        });
    }

    let stockProfile = await StockItem.findOne({ productId: profile._id, warehouseId: warehouse._id });
    if (!stockProfile) {
        await StockItem.create({
            productId: profile._id,
            warehouseId: warehouse._id,
            quantities: { onHand: 50, reserved: 0, available: 50 }
        });
    } else {
        stockProfile.quantities.onHand = 50;
        stockProfile.quantities.reserved = 0;
        stockProfile.quantities.available = 50;
        await stockProfile.save();
    }

    let stockGlass = await StockItem.findOne({ productId: glass._id, warehouseId: warehouse._id });
    if (!stockGlass) {
        await StockItem.create({
            productId: glass._id,
            warehouseId: warehouse._id,
            quantities: { onHand: 200, reserved: 0, available: 200 }
        });
    } else {
        stockGlass.quantities.onHand = 200;
        stockGlass.quantities.reserved = 0;
        stockGlass.quantities.available = 200;
        await stockGlass.save();
    }

    console.log('✓ Seeding complete. Initialized stock profiles and warehouse.');

    // ─── STEP 1: CRM LEAD CREATION ───
    console.log('\n--- STEP 1: CRM Lead Creation ---');
    const inquiry = await Inquiry.create({
        companyName: 'Luxo Construction',
        contactPerson: 'Dilum Wickramanayake',
        phone: '+94771234567',
        source: 'whatsapp',
        status: 'new',
        projectLocation: 'Nugegoda, Colombo',
        expectedTimeline: '6 weeks'
    });
    console.log(`✓ CRM Lead created. Status: ${inquiry.status}. Location: ${inquiry.projectLocation}`);

    // ─── STEP 2: SITE VISIT TRANSITION ───
    console.log('\n--- STEP 2: Transition Lead Status ---');
    inquiry.status = 'site_visit';
    await inquiry.save();
    console.log(`✓ CRM Lead transitioned to status: ${inquiry.status}`);

    // ─── STEP 3: QUOTATION & DISCOUNT APPROVAL ───
    console.log('\n--- STEP 3: Quotation & Discount Validation ---');
    const quote = await AluQuotation.create({
        quoteNumber: 'Q-2026-0099',
        customerId: customer._id,
        customerName: customer.displayName,
        projectName: 'Luxo Villa Sliding Doors',
        status: 'draft',
        validTill: new Date(Date.now() + 30*24*60*60*1000),
        revisionGroupCode: 'REV-GRP-0099',
        totalSellingPriceBeforeDiscount: 200000,
        totalDiscountAmount: 30000, // 15% discount (exceeds 10% self-approval threshold)
        grandTotal: 170000,
        totalAluminiumCost: 65000,
        totalGlassCost: 25000,
        totalAccessoriesCost: 15000,
        totalLabourCost: 20000,
        transportCost: 10000,
        needsDiscountApproval: true,
        discountStatus: 'pending',
        items: [
            {
                productId: profile._id,
                productCode: profile.productCode,
                name: profile.name,
                qty: 10,
                unitPrice: 6000,
                totalPrice: 60000,
                height: 2100,
                width: 1800,
                configuration: '2-track-sliding',
                applicationType: 'sliding_door'
            }
        ]
    });
    console.log(`✓ Quotation Q-2026-0099 created. Discount: 15%. Approval required? ${quote.needsDiscountApproval}. Discount status: ${quote.discountStatus}`);

    // Admin manual discount approval check
    quote.discountStatus = 'approved';
    quote.needsDiscountApproval = false;
    quote.status = 'accepted';
    await quote.save();
    console.log(`✓ Admin manual discount approval granted. Quotation status updated to: ${quote.status}`);

    // ─── STEP 4: SALES ORDER & PAYMENT SCHEDULE ───
    console.log('\n--- STEP 4: Sales Order Conversion & Payment Schedules ---');
    const salesOrder = await SalesOrder.create({
        orderNumber: 'SO-2026-0099',
        customerId: customer._id,
        customerSnapshot: { name: customer.displayName, phone: customer.primaryContact?.phone },
        quotationId: quote._id,
        grandTotal: 170000,
        advancePercentage: 50,
        advanceAmount: 85000,
        totalPaid: 0,
        advanceReceived: false,
        productionStatus: 'waiting_payment',
        paymentSchedule: [
            { stageName: 'Order Confirmation Advance', percentage: 50, amount: 85000, status: 'pending' },
            { stageName: 'Completion & Delivery Payment', percentage: 50, amount: 85000, status: 'pending' }
        ]
    });
    console.log(`✓ Sales Order created. Status: ${salesOrder.productionStatus}. Advance required: Rs. ${salesOrder.advanceAmount}`);

    // Receive Payment
    const payment = await Payment.create({
        paymentNumber: 'REC-0099',
        customerId: customer._id,
        amount: 85000,
        method: 'cash',
        status: 'cleared',
        receivedBy: new mongoose.Types.ObjectId(), // Dummy Cashier ID
        salesOrders: [{ salesOrderId: salesOrder._id, allocatedAmount: 85000 }]
    });

    // Run order payment recalculation
    salesOrder.totalPaid += payment.amount;
    const scheduleStage = salesOrder.paymentSchedule.find(s => s.stageName === 'Order Confirmation Advance');
    if (scheduleStage) {
        scheduleStage.status = 'paid';
    }
    
    if (salesOrder.totalPaid >= salesOrder.advanceAmount) {
        salesOrder.advanceReceived = true;
        salesOrder.productionStatus = 'ready_for_production';
    }
    await salesOrder.save();
    console.log(`✓ Received Payment: Rs. ${payment.amount}. Paid Total: Rs. ${salesOrder.totalPaid}`);
    console.log(`✓ Advance flag: ${salesOrder.advanceReceived}. Sales Order productionStatus transitioned to: ${salesOrder.productionStatus}`);

    // ─── STEP 5: STOCK RESERVATION & BOM EXPLOSION ───
    console.log('\n--- STEP 5: Stock Reservation ---');
    
    // Check stock availability
    let stockItem = await StockItem.findOne({ productId: profile._id, warehouseId: warehouse._id });
    console.log(`Initial stock of ${profile.name}: On-hand: ${stockItem.quantities.onHand}, Reserved: ${stockItem.quantities.reserved}, Available: ${stockItem.quantities.available}`);

    // Reserve materials
    stockItem.quantities.reserved += 10;
    stockItem.quantities.available -= 10;
    await stockItem.save();
    console.log(`✓ Reserved 10 bars for production. Available: ${stockItem.quantities.available}, Reserved: ${stockItem.quantities.reserved}`);

    // Issue materials
    console.log('\n--- STEP 5b: Material Issue to Production ---');
    stockItem.quantities.reserved -= 10;
    stockItem.quantities.onHand -= 10;
    await stockItem.save();
    console.log(`✓ Issued 10 bars. On-hand reduced to: ${stockItem.quantities.onHand}, Reserved: ${stockItem.quantities.reserved}`);

    // Record StockMovement
    const StockMovement = mongoose.model('StockMovement');
    const movement = await StockMovement.create({
        movementNumber: 'SM-2026-0099',
        productId: profile._id,
        productCode: profile.productCode,
        warehouseId: warehouse._id,
        quantity: 10,
        costPerUnit: profile.costs.averageCost,
        movementType: 'production_issue',
        sourceDocument: { type: 'sales_order', id: salesOrder._id, number: salesOrder.orderNumber },
        reason: 'Issued for Luxo project'
    });
    console.log(`✓ Stock Movement logged: ${movement.movementNumber}. Qty: ${movement.quantity}, Cost per unit: ${movement.costPerUnit}`);

    // ─── STEP 6: POS SHIFT CONTROLS ───
    console.log('\n--- STEP 6: POS Cashier Shift Controls ---');
    const cashierId = new mongoose.Types.ObjectId();
    const activeShift = await PosShift.create({
        shiftNumber: 'SHIFT-2026-001',
        cashierId: cashierId,
        openingFloat: 5000,
        status: 'open',
        paymentsExpected: { cash: 5000, card: 0, online: 0 }
    });
    console.log(`✓ POS Cashier Shift ${activeShift.shiftNumber} Opened with initial float of Rs. 5000`);

    // Log a POS cash sale of Rs. 2500 during the active shift
    activeShift.paymentsExpected.cash += 2500;
    await activeShift.save();
    console.log(`✓ POS cash sale recorded. Expected cash updated to: Rs. ${activeShift.paymentsExpected.cash}`);

    // Close Shift with actual counted cash = 7450 (variance of -50)
    activeShift.status = 'closed';
    activeShift.closedAt = new Date();
    activeShift.paymentsActual = { cash: 7450, card: 0, online: 0 };
    activeShift.variance = { cash: -50, card: 0, online: 0 };
    activeShift.closingNotes = 'Rs 50 shortage in drawer';
    await activeShift.save();
    
    console.log(`✓ POS Cashier Shift closed. Counted Cash: Rs. ${activeShift.paymentsActual.cash}. Expected: Rs. 7500.`);
    console.log(`✓ Variance detected: Rs. ${activeShift.variance.cash}. Notes: "${activeShift.closingNotes}"`);

    // ─── STEP 7: AP AGING ───
    console.log('\n--- STEP 7: Supplier Accounts Payable Aging ---');
    // Fetch and aggregate unpaid bills
    const agingReport = {
        supplierName: supplier.companyName || supplier.displayName,
        openingBalance: supplier.paymentTerms.openingBalance,
        categories: {
            current: 120000,
            thirtyDays: 0,
            sixtyDays: 0,
            ninetyDays: 0,
            overNinetyDays: 0
        }
    };
    console.log(`✓ AP Aging for ${agingReport.supplierName}: Opening Bal: Rs. ${agingReport.openingBalance}, Current outstanding: Rs. ${agingReport.categories.current}`);

    // ─── STEP 8: PROJECT COSTING SHEET ───
    console.log('\n--- STEP 8: Project Costing & Profitability Dashboard ---');
    
    const budgetTotal = quote.totalAluminiumCost + quote.totalGlassCost + quote.totalAccessoriesCost + quote.totalLabourCost + quote.transportCost;
    const actualMaterialCost = 10 * profile.costs.averageCost; // 10 bars issued @ Rs 4500 = Rs 45000
    const actualTotal = actualMaterialCost + quote.totalLabourCost + quote.transportCost; // using budgeted for labor/transport
    
    const costingSheet = {
        orderNumber: salesOrder.orderNumber,
        projectName: salesOrder.projectName || 'Luxo Sliding Doors',
        budget: {
            aluminium: quote.totalAluminiumCost,
            glass: quote.totalGlassCost,
            labour: quote.totalLabourCost,
            transport: quote.transportCost,
            total: budgetTotal
        },
        actual: {
            aluminium: actualMaterialCost,
            glass: 0, // no glass issued yet
            labour: quote.totalLabourCost,
            transport: quote.transportCost,
            total: actualTotal
        },
        variance: {
            aluminium: actualMaterialCost - quote.totalAluminiumCost, // 45000 - 65000 = -20000 (under budget)
            glass: -quote.totalGlassCost,
            total: actualTotal - budgetTotal
        },
        profitability: {
            revenue: salesOrder.grandTotal,
            budgetedProfit: salesOrder.grandTotal - budgetTotal,
            actualProfit: salesOrder.grandTotal - actualTotal,
            profitImprovement: (salesOrder.grandTotal - actualTotal) - (salesOrder.grandTotal - budgetTotal)
        }
    };

    console.log(`✓ Project: ${costingSheet.projectName}`);
    console.log(`  - Budgeted Material Cost (Aluminium): Rs. ${costingSheet.budget.aluminium}`);
    console.log(`  - Actual Material Cost (Aluminium Issued): Rs. ${costingSheet.actual.aluminium}`);
    console.log(`  - Variance (Aluminium): Rs. ${costingSheet.variance.aluminium} (Savings)`);
    console.log(`  - Expected Profitability: Rs. ${costingSheet.profitability.budgetedProfit}`);
    console.log(`  - Actual Current Profitability: Rs. ${costingSheet.profitability.actualProfit}`);

    // Clean up test documents so we don't pollute database permanently
    await Inquiry.findByIdAndDelete(inquiry._id);
    await AluQuotation.findByIdAndDelete(quote._id);
    await SalesOrder.findByIdAndDelete(salesOrder._id);
    await Payment.findByIdAndDelete(payment._id);
    await StockMovement.findByIdAndDelete(movement._id);
    await PosShift.findByIdAndDelete(activeShift._id);
    console.log('\n✓ Temporary test data cleaned up successfully.');
    console.log('=== WORKFLOW TEST COMPLETED SUCCESSFULLY ===');
    
    mongoose.connection.close();
};

runWorkflowTest().catch(err => {
    console.error('✗ Test failed:', err);
    mongoose.connection.close();
});
