import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import Employee from './src/models/Employee.js';
import Designation from './src/models/Designation.js';
import LeaveStructure from './src/models/LeaveStructure.js';
import { register } from './src/controllers/authController.js';

dotenv.config();

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Clean up legacy test data
        await User.deleteMany({ email: 'testemp@exportlanka.com' });
        await Employee.deleteMany({ email: 'testemp@exportlanka.com' });
        await LeaveStructure.deleteMany({ code: 'TEST_LS' });

        // Get or create a designation
        let des = await Designation.findOne({});
        if (!des) {
            des = await Designation.create({
                name: 'Test Executive',
                code: 'TEST_EXEC',
            });
        }
        console.log(`Using designation: ${des.name} (${des.code})`);

        // Create a Leave Structure
        const ls = await LeaveStructure.create({
            name: 'Test Leave Structure',
            code: 'TEST_LS',
            leaveBalances: {
                annual: 15,
                sick: 8,
                casual: 8,
                maternity: 84,
                paternity: 3,
                unpaid: 0
            }
        });
        console.log('✓ Leave Structure created');

        // Mock req and res for user registration
        const req = {
            body: {
                firstName: 'Test',
                lastName: 'Employee',
                email: 'testemp@exportlanka.com',
                password: 'Password123!',
                role: 'employee',
                designationId: des._id.toString()
            },
            user: {
                _id: new mongoose.Types.ObjectId(), // admin user ID
                role: 'admin'
            }
        };

        const res = {
            statusVal: 200,
            status(val) {
                this.statusVal = val;
                return this;
            },
            json(data) {
                this.jsonData = data;
                return this;
            }
        };

        // Call register controller
        console.log('Registering user...');
        await register(req, res);
        console.log('Register response status:', res.statusVal);

        // Check if employee record was auto-created
        const emp = await Employee.findOne({ email: 'testemp@exportlanka.com' });
        if (emp) {
            console.log('✓ Employee auto-created successfully!');
            console.log('Employee Code:', emp.employeeCode);
            console.log('Linked User ID:', emp.userId);
            console.log('Designation ID:', emp.designationId);
            console.log('Department ID:', emp.departmentId);

            // Apply leave structure and copy balances
            emp.leaveStructureId = ls._id;
            const leaveStruct = await LeaveStructure.findById(ls._id);
            if (leaveStruct) {
                emp.leaveBalances = leaveStruct.leaveBalances;
            }
            await emp.save();

            console.log('✓ Leave structure applied successfully!');
            console.log('Updated Leave Balances (Annual/Sick/Casual):', 
                emp.leaveBalances.annual, '/', emp.leaveBalances.sick, '/', emp.leaveBalances.casual);

            if (emp.leaveBalances.annual === 15 && emp.leaveBalances.sick === 8 && emp.leaveBalances.casual === 8) {
                console.log('✓ Balances match Leave Structure definitions perfectly!');
            } else {
                console.log('❌ Balances do not match');
            }
        } else {
            console.log('❌ Employee record was not auto-created');
        }

        // Clean up
        await User.deleteMany({ email: 'testemp@exportlanka.com' });
        await Employee.deleteMany({ email: 'testemp@exportlanka.com' });
        await LeaveStructure.deleteMany({ code: 'TEST_LS' });
        console.log('✓ Cleaned up test data');

    } catch (err) {
        console.error('Test error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('✓ DB Disconnected');
    }
}

test();
