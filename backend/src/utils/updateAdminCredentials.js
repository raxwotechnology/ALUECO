import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

const updateAdminCredentials = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Find existing admin user
        const adminUser = await User.findOne({ role: 'admin' });
        
        if (!adminUser) {
            console.log('✗ No admin user found');
            process.exit(1);
        }

        console.log(`Found admin user: ${adminUser.email}`);

        // Update email and password
        adminUser.email = 'admin@example.com';
        adminUser.password = 'Admin123!';
        
        await adminUser.save();
        
        console.log('✓ Admin credentials updated successfully');
        console.log(`New email: admin@example.com`);
        console.log(`New password: Admin123!`);
        
        process.exit(0);
    } catch (error) {
        console.error('✗ Error updating admin credentials:', error.message);
        process.exit(1);
    }
};

updateAdminCredentials();