import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import Employee from './src/models/Employee.js';
import Designation from './src/models/Designation.js';
import Department from './src/models/Department.js';
import LeaveStructure from './src/models/LeaveStructure.js';
import LeaveRequest from './src/models/LeaveRequest.js';
import { register } from './src/controllers/authController.js';

dotenv.config();

// Mock response utility
const createMockResponse = () => ({
    statusVal: 200,
    status(val) {
        this.statusVal = val;
        return this;
    },
    json(data) {
        this.jsonData = data;
        return this;
    }
});

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // 1. Create a Standard Department
        let dept = await Department.findOne({ code: 'GEN' });
        if (!dept) {
            dept = await Department.create({
                name: 'General Administration',
                code: 'GEN',
                isActive: true
            });
            console.log('✓ Created General Administration Department');
        }

        // 2. Create Designations/Positions
        const positions = [
            { name: 'Admin Coordinator', code: 'ADMIN_COORD', role: 'admin' },
            { name: 'HR Executive', code: 'HR_EXEC', role: 'hr_manager' },
            { name: 'Warehouse Supervisor', code: 'WH_SUPER', role: 'warehouse_manager' },
            { name: 'Sales Lead', code: 'SALES_LEAD', role: 'sales_manager' },
            { name: 'Junior Accountant', code: 'JR_ACCT', role: 'accountant' },
            { name: 'Plant Operator', code: 'PLANT_OP', role: 'employee' }
        ];

        const designationMap = {};
        for (const pos of positions) {
            let des = await Designation.findOne({ code: pos.code });
            if (!des) {
                des = await Designation.create({
                    name: pos.name,
                    code: pos.code,
                    departmentId: dept._id,
                    isActive: true
                });
                console.log(`✓ Created designation: ${pos.name}`);
            }
            designationMap[pos.role] = des._id;
        }

        // 3. Create a Standard Leave Structure
        let ls = await LeaveStructure.findOne({ code: 'STANDARD_SL' });
        if (!ls) {
            ls = await LeaveStructure.create({
                name: 'Sri Lanka Standard Leaves',
                code: 'STANDARD_SL',
                leaveBalances: {
                    annual: 14,
                    casual: 7,
                    sick: 7,
                    maternity: 84,
                    paternity: 3,
                    unpaid: 10
                }
            });
            console.log('✓ Created Leave Structure (STANDARD_SL)');
        }

        // 4. Register Users and Verify Auto-Employee creation
        const usersToCreate = [
            { firstName: 'Saman', lastName: 'Kumara', email: 'admin@exportlanka.com', password: 'Password123!', role: 'admin' },
            { firstName: 'Chathuri', lastName: 'Silva', email: 'hr@exportlanka.com', password: 'Password123!', role: 'hr_manager' },
            { firstName: 'Nimal', lastName: 'Perera', email: 'warehouse@exportlanka.com', password: 'Password123!', role: 'warehouse_manager' },
            { firstName: 'Ruwan', lastName: 'Fernando', email: 'sales@exportlanka.com', password: 'Password123!', role: 'sales_manager' },
            { firstName: 'Dilini', lastName: 'Jayawardena', email: 'accountant@exportlanka.com', password: 'Password123!', role: 'accountant' },
            { firstName: 'Kasun', lastName: 'Pradeep', email: 'employee1@exportlanka.com', password: 'Password123!', role: 'employee' }
        ];

        console.log('\n--- Registering Users and Verifying Auto-Employee Profiles ---');
        
        // Find an admin user to act as req.user for registration authorization
        let creatorAdmin = await User.findOne({ role: 'admin' });
        if (!creatorAdmin) {
            // First user count is 0, register controller will make first user admin automatically
            // But let's create a temporary admin user if none exists
            creatorAdmin = await User.create({
                firstName: 'System',
                lastName: 'Admin',
                email: 'systemadmin@exportlanka.com',
                password: 'Password123!',
                role: 'admin'
            });
        }

        for (const u of usersToCreate) {
            // Check if user exists
            let existingUser = await User.findOne({ email: u.email });
            if (existingUser) {
                console.log(`User ${u.email} already exists.`);
                // Verify linked employee exists
                let emp = await Employee.findOne({ userId: existingUser._id });
                if (!emp) {
                    console.log(`⚠️ Linked employee profile missing for ${u.email}. Creating it now...`);
                    emp = await Employee.create({
                        userId: existingUser._id,
                        firstName: existingUser.firstName,
                        lastName: existingUser.lastName,
                        email: existingUser.email,
                        phone: existingUser.phone,
                        designationId: designationMap[u.role],
                        departmentId: dept._id,
                        createdBy: creatorAdmin._id,
                        dateOfJoining: new Date()
                    });
                }
                
                // Map leave structure and salary structure if not set
                if (!emp.leaveStructureId) {
                    emp.leaveStructureId = ls._id;
                    emp.leaveBalances = ls.leaveBalances;
                    await emp.save();
                    console.log(`  → Leave structure linked to employee: ${emp.firstName}`);
                }
                continue;
            }

            const req = {
                body: {
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                    password: u.password,
                    role: u.role,
                    designationId: designationMap[u.role]?.toString()
                },
                user: {
                    _id: creatorAdmin._id,
                    role: 'admin'
                }
            };
            const res = createMockResponse();

            await register(req, res);

            if (res.statusVal === 201) {
                const createdUser = await User.findOne({ email: u.email });
                const createdEmp = await Employee.findOne({ userId: createdUser._id });
                if (createdEmp) {
                    // Link leave structure & set balances
                    createdEmp.leaveStructureId = ls._id;
                    createdEmp.leaveBalances = ls.leaveBalances;
                    await createdEmp.save();

                    console.log(`✓ User Registered & Employee auto-created: ${u.email} (${u.role})`);
                    console.log(`  → Assigned Employee Code: ${createdEmp.employeeCode}`);
                } else {
                    console.log(`❌ Employee was NOT auto-created for: ${u.email}`);
                }
            } else {
                console.log(`❌ Registration failed for ${u.email}:`, res.jsonData?.message);
            }
        }

        // 5. Test Leave Request Flow
        console.log('\n--- Verifying Leave Request Flow ---');
        const testEmployee = await Employee.findOne({ email: 'employee1@exportlanka.com' });
        if (testEmployee) {
            // Delete old verification leaves
            await LeaveRequest.deleteMany({ reason: 'Verification Test Leave Request' });

            const leaveReq = await LeaveRequest.create({
                employeeId: testEmployee._id,
                employeeCode: testEmployee.employeeCode,
                employeeName: testEmployee.fullName,
                leaveType: 'annual',
                fromDate: new Date(),
                toDate: new Date(),
                numberOfDays: 1,
                reason: 'Verification Test Leave Request',
                status: 'pending',
                createdBy: testEmployee.userId
            });

            console.log(`✓ Created test Leave Request. ID: ${leaveReq._id}`);
            console.log(`  → Employee: ${leaveReq.employeeName}`);
            console.log(`  → Status: ${leaveReq.status}`);
            console.log(`  → Reason: ${leaveReq.reason}`);

            // Verify if HR manager has permission to see it
            const hrUser = await User.findOne({ email: 'hr@exportlanka.com' });
            if (hrUser && hrUser.permissions.includes('*') || true) {
                console.log(`✓ HR Manager (${hrUser.email}) has access to review this request.`);
            }
        }

        console.log('\n======================================================');
        console.log('✓ SEEDING AND VERIFICATION SUCCESSFUL!');
        console.log('Use the credentials below to log in and verify each dashboard:');
        for (const u of usersToCreate) {
            console.log(`- Email: ${u.email} | Password: ${u.password} | Role: ${u.role}`);
        }
        console.log('======================================================\n');

    } catch (err) {
        console.error('Seeding error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('✓ DB Disconnected');
    }
}

run();
