import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        console.log('\n--- Verifying Admin Users ---');
        
        const users = await User.find({ role: 'admin' }).select('firstName lastName email role isActive failedLoginAttempts');
        
        console.log(`Found ${users.length} admin users:\n`);
        
        for (const user of users) {
            console.log(`✓ Email: ${user.email}`);
            console.log(`  Name: ${user.firstName} ${user.lastName}`);
            console.log(`  Role: ${user.role}`);
            console.log(`  Active: ${user.isActive}`);
            console.log(`  Failed Attempts: ${user.failedLoginAttempts}`);
            console.log('');
        }

        console.log('======================================================');
        console.log('✓ USER VERIFICATION COMPLETE!');
        console.log('======================================================\n');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('✓ DB Disconnected');
    }
}

run();