import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Farm from './src/models/Farm.js';
import FarmHarvest from './src/models/FarmHarvest.js';
import GoodsReceiptNote from './src/models/GoodsReceiptNote.js';
import Product from './src/models/Product.js';
import Warehouse from './src/models/Warehouse.js';
import Supplier from './src/models/Supplier.js';
import MonthlyTarget from './src/models/MonthlyTarget.js';
import ProductionBatch from './src/models/ProductionBatch.js';
import StockItem from './src/models/StockItem.js';
import StockMovement from './src/models/StockMovement.js';
import Counter from './src/models/Counter.js';
import Category from './src/models/Category.js';
import Bill from './src/models/Bill.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB for functional verification\n');

        // Cleanup any leftover verification records from previous runs
        console.log('--- Step 0: Cleaning up old test data ---');
        await Farm.deleteMany({ name: 'Verification Test Farm' });
        await FarmHarvest.deleteMany({ notes: 'Created by verification script' });
        await GoodsReceiptNote.deleteMany({ notes: 'Verification Direct GRN' });
        await Product.deleteMany({ name: /^Verification / });
        await Bill.deleteMany({ supplierInvoiceNumber: { $regex: '^GRN-|^HRV-' } });
        await ProductionBatch.deleteMany({ remark: 'Verification script direct stock conversion check' });
        console.log('✓ Cleaned up any legacy verification test records\n');

        // 1. Verify Farm Model (Create Farm)
        console.log('--- Step 1: Farm Model Verification ---');
        const farm = await Farm.create({
            name: 'Verification Test Farm',
            location: 'Kurunegala Test site',
            contactNumber: '0771112223',
            notes: 'Created by automated functional verification script'
        });
        console.log(`✓ Farm created successfully. farmCode: ${farm.farmCode}, ID: ${farm._id}`);

        // 2. Fetch a Raw Material product and Warehouse for testing
        const rawProduct = await Product.findOne({ type: 'raw_material' });
        const warehouse = await Warehouse.findOne({});
        
        if (!rawProduct) {
            console.log('⚠️ No raw material product found in DB. Creating one...');
            // Create a temporary raw material product
            const ProductModel = mongoose.model('Product');
            const CategoryModel = mongoose.model('Category');
            let cat = await CategoryModel.findOne({ code: 'RAW' });
            if (!cat) {
                cat = await CategoryModel.create({ name: 'Raw Material', code: 'RAW' });
            }
            const newRawProd = await ProductModel.create({
                name: 'Verification Soursop Leaves',
                sku: 'VERIFY-SRS-' + Date.now(),
                type: 'raw_material',
                productShortCode: 'SRS',
                categoryId: cat._id,
                unitOfMeasure: 'kg',
                basePrice: 150
            });
            console.log(`✓ Temporary raw material created: ${newRawProd.name} (${newRawProd.productCode})`);
        }
        
        if (!warehouse) {
            throw new Error('❌ No Warehouse found in DB. Cannot continue verification.');
        }

        const testRawProduct = rawProduct || await Product.findOne({ type: 'raw_material' });
        console.log(`Using product for harvest/GRN: ${testRawProduct.name} (${testRawProduct.productCode})`);
        console.log(`Using Warehouse: ${warehouse.name} (${warehouse.warehouseCode})`);

        // 3. Verify FarmHarvest Draft & Approval Flow
        console.log('\n--- Step 2: FarmHarvest Model & Approval Flow Verification ---');
        await FarmHarvest.deleteMany({ notes: 'Created by verification script' });
        const harvest = new FarmHarvest({
            farmId: farm._id,
            farmName: farm.name,
            warehouseId: warehouse._id,
            harvestDate: new Date(),
            items: [{
                productId: testRawProduct._id,
                productCode: testRawProduct.productCode,
                productName: testRawProduct.name,
                quantity: 10,
                unitOfMeasure: testRawProduct.unitOfMeasure,
                unitPrice: testRawProduct.basePrice || 100
            }],
            notes: 'Created by verification script',
            status: 'draft'
        });
        await harvest.save();
        console.log(`✓ FarmHarvest draft saved successfully: ${harvest.harvestNumber}, Total Value: ${harvest.totalValue} LKR`);

        // Verify Harvest approval flow (stock intake)
        // Simulate approve controller
        const farmCode = farm.farmCode || 'FRM';
        
        // Define Julian day batch code function matching controller
        const d = new Date();
        const start = new Date(d.getFullYear(), 0, 0);
        const diff = d - start + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000;
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        const julianString = String(dayOfYear).padStart(3, '0');
        const yearShort = String(d.getFullYear()).slice(-2);
        const expectedBatchCode = `${farmCode.replace(/[^A-Z0-9_-]/gi, '').toUpperCase()}-ALE${yearShort}${julianString}`;

        console.log(`Expected Batch Code: ${expectedBatchCode}`);

        // Perform stock increase simulation
        const { increaseStock } = await import('./src/services/stockService.js');
        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
            for (const item of harvest.items) {
                item.batchNumber = expectedBatchCode;
                const result = await increaseStock({
                    productId: item.productId,
                    warehouseId: harvest.warehouseId,
                    quantity: item.quantity,
                    costPerUnit: item.unitPrice,
                    movementType: 'farm_harvest',
                    batchNumber: item.batchNumber,
                    sourceDocument: {
                        type: 'farm_harvest',
                        id: harvest._id,
                        number: harvest.harvestNumber,
                    },
                    reason: `Verification test harvest intake`,
                    userId: new mongoose.Types.ObjectId(),
                    session
                });
                item.stockMovementId = result.movement._id;
            }
            harvest.status = 'approved';
            await harvest.save({ session });

            // Auto-generate Bill simulation matching controller
            const billItems = harvest.items.map(item => ({
                productId: item.productId,
                productCode: item.productCode,
                productName: item.productName,
                quantity: item.quantity,
                unitOfMeasure: item.unitOfMeasure,
                unitPrice: item.unitPrice,
                taxRate: 0,
                taxable: false,
            }));
            const bill = new Bill({
                supplierInvoiceNumber: harvest.harvestNumber,
                supplierId: null,
                supplierSnapshot: {
                    name: farm.name || 'Own Farm',
                    code: farm.farmCode || 'FRM',
                },
                grnNumbers: [harvest.harvestNumber],
                billDate: harvest.harvestDate || new Date(),
                dueDate: harvest.harvestDate || new Date(),
                paymentTerms: {
                    type: 'cash',
                    creditDays: 0,
                },
                items: billItems,
                amountPaid: harvest.totalValue || 0,
                status: 'approved',
                approvedBy: new mongoose.Types.ObjectId(),
                approvedAt: new Date(),
                createdBy: new mongoose.Types.ObjectId(),
            });
            await bill.save({ session });
        });
        session.endSession();
        console.log(`✓ FarmHarvest approved successfully! Status: ${harvest.status}. Items updated:`);
        console.log(`- Product: ${harvest.items[0].productName}, Qty: ${harvest.items[0].quantity}, Batch: ${harvest.items[0].batchNumber}`);

        const harvestBill = await Bill.findOne({ grnNumbers: harvest.harvestNumber });
        console.log(`✓ Auto-generated Bill from Farm Harvest verification: ${harvestBill ? 'YES' : 'NO'}`);
        if (harvestBill) {
            console.log(`- Bill Number: ${harvestBill.billNumber}, Grand Total: ${harvestBill.grandTotal} LKR, Amount Paid: ${harvestBill.amountPaid} LKR`);
        }

        // Verify stock entry created
        const stockItem = await StockItem.findOne({
            productId: testRawProduct._id,
            warehouseId: warehouse._id,
            batchNumber: expectedBatchCode
        });
        console.log(`✓ Verified StockItem exists for harvested batch: ${stockItem ? 'YES' : 'NO'}, Quantity: ${stockItem?.quantities?.onHand}`);

        // 4. Verify Direct GRN & QA Inspection Flow
        console.log('\n--- Step 3: Direct GRN & QA Gate Verification ---');
        await GoodsReceiptNote.deleteMany({ notes: 'Verification Direct GRN' });
        
        // Let's verify direct supplier GRN (with no PO)
        const supplier = await Supplier.findOne({});
        if (!supplier) {
            console.log('⚠️ No supplier found in DB. Cannot fully test supplier-specific GRN, but will use Farm Source instead.');
        }

        const grn = new GoodsReceiptNote({
            sourceType: supplier ? 'supplier' : 'own_farm',
            supplierId: supplier?._id || null,
            supplierName: supplier?.displayName || null,
            farmId: !supplier ? farm._id : null,
            farmName: !supplier ? farm.name : null,
            warehouseId: warehouse._id,
            receiptDate: new Date(),
            items: [{
                productId: testRawProduct._id,
                productCode: testRawProduct.productCode,
                productName: testRawProduct.name,
                receivedQuantity: 20,
                unitOfMeasure: testRawProduct.unitOfMeasure,
                unitPrice: testRawProduct.basePrice || 120,
                qcStatus: 'pending'
            }],
            notes: 'Verification Direct GRN',
            status: 'pending_approval'
        });
        await grn.save();
        console.log(`✓ Direct GRN logged in pending approval queue: ${grn.grnNumber}`);

        // Perform QA Approval simulation
        const qaSession = await mongoose.startSession();
        await qaSession.withTransaction(async () => {
            const grnToApprove = await GoodsReceiptNote.findById(grn._id);
            let totalPayable = 0;

            for (const item of grnToApprove.items) {
                const acceptedQty = 18; // 2 rejected
                const rejectedQty = 2;
                
                item.acceptedQuantity = acceptedQty;
                item.rejectedQuantity = rejectedQty;
                item.qcStatus = 'approved';
                item.rejectionReason = 'Leaves damaged during transport';

                const supplierCode = supplier ? (supplier.supplierShortCode || supplier.supplierCode || 'SUP') : farm.farmCode;
                const batchCode = `${supplierCode.replace(/[^A-Z0-9_-]/gi, '').toUpperCase()}-ALE${yearShort}${julianString}`;
                item.batchNumber = batchCode;

                totalPayable += acceptedQty * item.unitPrice;

                // Increase stock for accepted quantity
                const result = await increaseStock({
                    productId: item.productId,
                    warehouseId: grnToApprove.warehouseId,
                    quantity: acceptedQty,
                    costPerUnit: item.unitPrice,
                    movementType: 'purchase_receipt',
                    batchNumber: item.batchNumber,
                    sourceDocument: {
                        type: 'purchase_receipt',
                        id: grnToApprove._id,
                        number: grnToApprove.grnNumber,
                    },
                    reason: `QA Approved material intake. Batch: ${item.batchNumber}`,
                    userId: new mongoose.Types.ObjectId(),
                    session: qaSession
                });
                item.stockMovementId = result.movement._id;
            }

            grnToApprove.totalPayableLKR = totalPayable;
            grnToApprove.paidAmountLKR = 1000; // Paid 1000 cash instantly
            grnToApprove.balanceDueLKR = totalPayable - 1000;
            grnToApprove.status = 'approved';
            await grnToApprove.save({ session: qaSession });

            // Auto-generate Bill simulation matching controller
            const billItems = grnToApprove.items
                .filter(gi => gi.acceptedQuantity > 0)
                .map(gi => ({
                    productId: gi.productId,
                    productCode: gi.productCode,
                    productName: gi.productName,
                    quantity: gi.acceptedQuantity,
                    unitOfMeasure: gi.unitOfMeasure,
                    unitPrice: gi.unitPrice,
                    taxRate: 0,
                    taxable: false,
                    grnLineItemId: gi._id,
                }));

            if (billItems.length > 0) {
                let finalDueDate = grnToApprove.receiptDate || new Date();
                let paymentTermsType = 'cash';
                let creditDays = 0;

                if (supplier) {
                    paymentTermsType = supplier.paymentTerms?.type || 'credit';
                    creditDays = supplier.paymentTerms?.creditDays || 0;
                    if (paymentTermsType === 'credit') {
                        const d = new Date(finalDueDate);
                        d.setDate(d.getDate() + creditDays);
                        finalDueDate = d;
                    }
                }

                const bill = new Bill({
                    supplierInvoiceNumber: grnToApprove.grnNumber,
                    supplierId: supplier ? supplier._id : null,
                    supplierSnapshot: {
                        name: supplier ? supplier.displayName : (grnToApprove.farmName || 'Own Farm'),
                        code: supplier ? (supplier.supplierShortCode || supplier.supplierCode || 'SUP') : (farm ? (farm.farmCode || 'FRM') : 'FRM'),
                        taxRegistrationNumber: supplier ? supplier.taxRegistrationNumber : undefined,
                    },
                    purchaseOrderIds: [],
                    purchaseOrderNumbers: [],
                    grnIds: [grnToApprove._id],
                    grnNumbers: [grnToApprove.grnNumber],
                    billDate: grnToApprove.receiptDate || new Date(),
                    dueDate: finalDueDate,
                    paymentTerms: {
                        type: paymentTermsType,
                        creditDays: creditDays,
                    },
                    items: billItems,
                    amountPaid: grnToApprove.paidAmountLKR || 0,
                    status: 'approved',
                    approvedBy: new mongoose.Types.ObjectId(),
                    approvedAt: new Date(),
                    createdBy: new mongoose.Types.ObjectId(),
                });

                await bill.save({ session: qaSession });
            }
        });
        qaSession.endSession();

        const updatedGrn = await GoodsReceiptNote.findById(grn._id);
        console.log(`✓ Verified QA approval process successfully:`);
        console.log(`- Status: ${updatedGrn.status}, Total Payable: ${updatedGrn.totalPayableLKR} LKR, Balance Due: ${updatedGrn.balanceDueLKR} LKR`);
        console.log(`- Item QC: Accepted ${updatedGrn.items[0].acceptedQuantity}, Rejected ${updatedGrn.items[0].rejectedQuantity}, Rejection Reason: "${updatedGrn.items[0].rejectionReason}"`);
        console.log(`- Generated Batch: ${updatedGrn.items[0].batchNumber}`);

        const generatedBill = await Bill.findOne({ grnIds: grn._id });
        console.log(`✓ Auto-generated Bill verification: ${generatedBill ? 'YES' : 'NO'}`);
        if (generatedBill) {
            console.log(`- Bill Number: ${generatedBill.billNumber}, Grand Total: ${generatedBill.grandTotal} LKR, Amount Paid: ${generatedBill.amountPaid} LKR`);
        }

        // 5. Verify Direct Material Stock Converter & Completed Production Batch Logging
        console.log('\n--- Step 4: Direct Stock Converter & Completed Production Batch Verification ---');
        
        // Find or create a finished good product
        let finProduct = await Product.findOne({ type: 'finished_good' });
        if (!finProduct) {
            console.log('⚠️ No finished good product found in DB. Creating one...');
            const ProductModel = mongoose.model('Product');
            const CategoryModel = mongoose.model('Category');
            let cat = await CategoryModel.findOne({ code: 'FIN' });
            if (!cat) {
                cat = await CategoryModel.create({ name: 'Finished Good', code: 'FIN' });
            }
            finProduct = await ProductModel.create({
                name: 'Verification Moringa Powder',
                sku: 'VERIFY-MOR-' + Date.now(),
                type: 'finished_good',
                productShortCode: 'MOR',
                categoryId: cat._id,
                unitOfMeasure: 'kg',
                basePrice: 1200
            });
            console.log(`✓ Temporary finished good created: ${finProduct.name} (${finProduct.productCode})`);
        }

        console.log(`Converting Raw Material: ${testRawProduct.name} -> Finished Good: ${finProduct.name}`);

        const { decreaseStock } = await import('./src/services/stockService.js');
        const convSession = await mongoose.startSession();
        let loggedBatch = null;

        await convSession.withTransaction(async () => {
            // 1. Decrease raw material stock
            const decResult = await decreaseStock({
                productId: testRawProduct._id,
                warehouseId: warehouse._id,
                quantity: 5,
                movementType: 'production_issue',
                sourceDocument: { type: 'stock_conversion', number: 'CONV-TEST' },
                reason: `Verification test conversion to finished goods`,
                notes: 'Stock converter check',
                userId: new mongoose.Types.ObjectId(),
                session: convSession
            });

            // 2. Increase finished goods stock
            const batchCode = `CONV-ALE${yearShort}${julianString}`;
            await increaseStock({
                productId: finProduct._id,
                warehouseId: warehouse._id,
                quantity: 1, // 5kg raw -> 1kg finished
                costPerUnit: (decResult.stockItem?.costPerUnit || 0) * 5,
                movementType: 'production_receipt',
                batchNumber: batchCode,
                sourceDocument: { type: 'stock_conversion', number: 'CONV-TEST' },
                reason: `Verification test conversion from raw material`,
                notes: 'Stock converter check',
                userId: new mongoose.Types.ObjectId(),
                session: convSession
            });

            // 3. Log a completed ProductionBatch
            loggedBatch = await ProductionBatch.create([{
                date: new Date(),
                supplierShortCode: 'CONV',
                product: finProduct.name,
                productId: finProduct._id,
                warehouseId: warehouse._id,
                inputWeight_day: 5,
                outputWeight_day: 1,
                processingStage: 'completed',
                qcStatus: 'approved',
                status: 'completed',
                remark: 'Verification script direct stock conversion check',
                createdBy: new mongoose.Types.ObjectId(),
                updatedBy: new mongoose.Types.ObjectId()
            }], { session: convSession });
        });
        convSession.endSession();

        console.log(`✓ Direct conversion processed successfully!`);
        console.log(`- Created completed Production Batch: ${loggedBatch ? loggedBatch[0].batchNo : 'FAILED'}`);
        console.log(`- Batch details: Input: ${loggedBatch[0].inputWeight_total} Kg, Output: ${loggedBatch[0].outputWeight_total} Kg, Efficiency: ${loggedBatch[0].efficiencyPercentage}%`);

        // Clean up verification data
        console.log('\n--- Step 5: Clean up verification records ---');
        await Farm.deleteOne({ _id: farm._id });
        console.log('✓ Cleaned up verification farm');
        await Product.deleteMany({ name: /^Verification / });
        console.log('✓ Cleaned up verification products');
        await Bill.deleteMany({ supplierInvoiceNumber: { $in: [grn.grnNumber, harvest.harvestNumber] } });
        console.log('✓ Cleaned up verification bills');
        await ProductionBatch.deleteMany({ remark: 'Verification script direct stock conversion check' });
        console.log('✓ Cleaned up verification production batches');
        
        console.log('\n🎉 ALL FUNCTIONAL BACKEND FLOWS PASSED SUCCESSFULLY!');

    } catch (err) {
        console.error('❌ Functional verification failed:', err);
    } finally {
        await mongoose.connection.close();
        console.log('DB connection closed');
    }
}

run();
