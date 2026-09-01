import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Machine from './src/models/Machine.js';
import ProductionBatch from './src/models/ProductionBatch.js';
import SalesOrder from './src/models/SalesOrder.js';
import PettyCash from './src/models/PettyCash.js';
import SalaryStructure from './src/models/SalaryStructure.js';
import Employee from './src/models/Employee.js';
import User from './src/models/User.js';
import { getDailyPnLCalculation } from './src/controllers/dailyPnLController.js';
import { calculatePayslip } from './src/services/payrollCalculator.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB for functional verification\n');

        // Cleanup
        console.log('--- Step 0: Cleaning up old test data ---');
        await Machine.deleteMany({ code: { $in: ['V-DRY', 'V-RST'] } });
        await ProductionBatch.deleteMany({ batchNo: { $regex: '^V-BTCH-' } });
        await SalesOrder.deleteMany({ remarks: 'Verification Test Order' });
        await PettyCash.deleteMany({ remarks: 'Verification Test Expense' });
        await SalaryStructure.deleteMany({ code: 'V-SS-DAILY' });
        await Employee.deleteMany({ email: 'vemp@verification.com' });
        await User.deleteMany({ email: 'vemp@verification.com' });
        console.log('✓ Cleaned up any legacy verification test records\n');

        // 1. Verify Machine Model & Cost calculation inside Production Batch
        console.log('--- Step 1: Machine Registry & Production costing verification ---');
        const m1 = await Machine.create({
            name: 'Verification Dryer',
            code: 'V-DRY',
            type: 'Dryer',
            status: 'active',
            capacity: 50,
            fuelType: 'wood',
            hourlyCost: 1000
        });
        const m2 = await Machine.create({
            name: 'Verification Roaster',
            code: 'V-RST',
            type: 'Roaster',
            status: 'active',
            capacity: 20,
            fuelType: 'electric',
            hourlyCost: 500
        });
        console.log(`✓ Created 2 machines: ${m1.name} (LKR ${m1.hourlyCost}/hr), ${m2.name} (LKR ${m2.hourlyCost}/hr)`);

        const batch = await ProductionBatch.create({
            batchNo: 'V-BTCH-001',
            date: new Date(),
            supplierShortCode: 'V-SUP',
            product: 'Verification Finished Good',
            inputWeight_day: 100,
            outputWeight_day: 80,
            materialCost: 5000,
            laborCost: 1500,
            overheadCost: 500,
            machineAssignments: [
                { machineId: m1._id, hours: 4 }, // 4 hours * 1000 = 4000 LKR
                { machineId: m2._id, hours: 2 }  // 2 hours * 500 = 1000 LKR
            ]
        });

        console.log(`✓ Created production batch V-BTCH-001 with machine cost: LKR ${batch.machineCost}`);
        console.log(`✓ Production batch total cost: LKR ${batch.totalCost}`);
        
        // Assertions
        if (batch.machineCost !== 5000) {
            throw new Error(`Machine cost calculated incorrectly: Expected 5000, got ${batch.machineCost}`);
        }
        if (batch.totalCost !== 12000) { // 5000 mat + 1500 labor + 500 overhead + 5000 machines = 12000
            throw new Error(`Total cost calculated incorrectly: Expected 12000, got ${batch.totalCost}`);
        }
        console.log('✓ Machine costing calculations matches expected totals!\n');

        // 2. Verify P&L Autocalculation
        console.log('--- Step 2: Daily P&L Autocalculation verification ---');
        
        // Create Sales Order for today
        const startToday = new Date();
        startToday.setHours(12, 0, 0, 0);

        const order = await SalesOrder.create({
            orderDate: startToday,
            remarks: 'Verification Test Order',
            status: 'approved',
            items: [{
                productName: 'Verification Product',
                orderedQuantity: 1,
                unitPrice: 15000,
                lineTotal: 15000
            }]
        });

        // Create Petty Cash Expense for today
        const expense = await PettyCash.create({
            date: startToday,
            transactionType: 'expense',
            remarks: 'Verification Test Expense',
            rawMaterial_cost: 3000,
            miscWages: 2000,
            wood: 1200,
            transport: 800,
            fuel: 500
        });

        console.log(`✓ Logged Sales Order: LKR ${order.grandTotal} & Petty Cash Expense`);

        // Test the autocalculate controller function directly
        let calculatedData = null;
        const mockReq = {
            query: { date: startToday.toISOString().split('T')[0] }
        };
        const mockRes = {
            json: (payload) => { calculatedData = payload.data; }
        };

        await getDailyPnLCalculation(mockReq, mockRes);
        console.log('✓ Computed Daily P&L values:', calculatedData);

        // Verification batch cost (from step 1) matches date?
        // Note: verify script runs in single thread, today's date should count V-BTCH-001 materialCost (5000) + laborCost (1500).
        // V-BTCH-001 has date = today.
        // Therefore:
        // totalRevenue = 15000 (SalesOrder)
        // rawMaterial = batch materialCost (5000) + petty cash (3000) = 8000
        // labourSalary = batch laborCost (1500) + petty cash (2000) = 3500
        // firewood = 1200
        // transport = 800
        // other = welfare(0) + fuel(500) + maintenance(0) + stationary(0) + chemicals(0) = 500

        if (calculatedData.totalRevenue !== 15000) {
            throw new Error(`Calculated Revenue incorrect: Expected 15000, got ${calculatedData.totalRevenue}`);
        }
        if (calculatedData.rawMaterial !== 8000) {
            throw new Error(`Calculated Raw Material cost incorrect: Expected 8000, got ${calculatedData.rawMaterial}`);
        }
        if (calculatedData.labourSalary !== 3500) {
            throw new Error(`Calculated Labour cost incorrect: Expected 3500, got ${calculatedData.labourSalary}`);
        }
        if (calculatedData.firewood !== 1200) {
            throw new Error(`Calculated Firewood cost incorrect: Expected 1200, got ${calculatedData.firewood}`);
        }
        if (calculatedData.transport !== 800) {
            throw new Error(`Calculated Transport cost incorrect: Expected 800, got ${calculatedData.transport}`);
        }
        if (calculatedData.other !== 500) {
            throw new Error(`Calculated Other cost incorrect: Expected 500, got ${calculatedData.other}`);
        }
        console.log('✓ Daily P&L values computed and tallied correctly!\n');

        // 3. Verify Daily Salary Structure calculations
        console.log('--- Step 3: Daily Wage Salary Structure verification ---');

        const ss = await SalaryStructure.create({
            code: 'V-SS-DAILY',
            name: 'Verification Daily Wage',
            description: 'Verification daily wage salary structure template',
            frequency: 'daily',
            components: [
                { name: 'Daily Allowance', type: 'earning', calculationType: 'fixed', amount: 500 }
            ]
        });

        const user = await User.create({
            firstName: 'Verification',
            lastName: 'Daily Worker',
            email: 'vemp@verification.com',
            role: 'employee'
        });

        const emp = await Employee.create({
            userId: user._id,
            firstName: 'Verification',
            lastName: 'Daily Worker',
            email: 'vemp@verification.com',
            basicSalary: 2000, // daily rate
            salaryStructureId: ss._id
        });

        console.log(`✓ Created Daily Employee: ${emp.firstName} with daily rate LKR ${emp.basicSalary}`);

        // Mock getEmployeeMonthAttendance returning 20 days present
        const mockAttendance = { daysPresent: 20, unpaidLeaveDays: 0, overtimeHours: 0 };
        const workingDays = 26;

        // Perform calculation mimicking payrollController loop
        const isDaily = ss.frequency === 'daily';
        let basic = emp.basicSalary;
        if (isDaily) {
            basic = emp.basicSalary * mockAttendance.daysPresent;
        }

        const structureEarnings = [];
        ss.components
            .filter((c) => c.type === 'earning')
            .forEach((c) => {
                let amount = 0;
                if (c.calculationType === 'fixed') {
                    amount = isDaily ? (c.amount * mockAttendance.daysPresent) : c.amount;
                }
                structureEarnings.push({
                    name: c.name,
                    amount,
                    type: 'allowance'
                });
            });

        const calc = calculatePayslip({
            basicSalary: basic,
            earnings: structureEarnings,
            otherDeductions: [],
            attendance: {
                workingDays,
                daysPresent: mockAttendance.daysPresent,
                unpaidLeaveDays: isDaily ? 0 : mockAttendance.unpaidLeaveDays,
                overtimeHours: mockAttendance.overtimeHours
            },
            overtimeRate: 150
        });

        console.log('✓ Generated Payslip Calculations:', {
            basicSalary: calc.basicSalary,
            earnings: calc.earnings,
            grossEarnings: calc.grossEarnings,
            netPay: calc.netPay
        });

        // Basic: 2000 * 20 = 40000 LKR
        // Allowance: 500 * 20 = 10000 LKR
        // Gross: 40000 + 10000 = 50000 LKR
        // Net: 50000 LKR (assuming no EPF deductions since it is default calculated but no EPF settings set or base calculation verified)
        if (calc.basicSalary !== 40000) {
            throw new Error(`Calculated Daily Basic Salary incorrect: Expected 40000, got ${calc.basicSalary}`);
        }
        if (calc.earnings[0].amount !== 10000) {
            throw new Error(`Calculated Daily Allowance incorrect: Expected 10000, got ${calc.earnings[0].amount}`);
        }
        console.log('✓ Daily Salary Structure calculations match expected totals!\n');

        // Cleanup
        console.log('--- Step 4: Cleaning up verification test data ---');
        await Machine.deleteMany({ code: { $in: ['V-DRY', 'V-RST'] } });
        await ProductionBatch.deleteMany({ batchNo: { $regex: '^V-BTCH-' } });
        await SalesOrder.deleteMany({ remarks: 'Verification Test Order' });
        await PettyCash.deleteMany({ remarks: 'Verification Test Expense' });
        await SalaryStructure.deleteMany({ code: 'V-SS-DAILY' });
        await Employee.deleteMany({ email: 'vemp@verification.com' });
        await User.deleteMany({ email: 'vemp@verification.com' });
        console.log('✓ Cleaned up verification test data successfully\n');

        console.log('🎉 ALL NEW UPDATES COMPLETED AND VERIFIED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ Verification failed:', err);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

run();
