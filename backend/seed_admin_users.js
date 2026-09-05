import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';

dotenv.config();

const usersToCreate = [
    {
        firstName: 'Chamara',
        lastName: 'Luxo',
        email: 'chamaraluxo@gmail.com',
        password: 'Luxo5858#',
        role: 'admin'
    },
    {
        firstName: 'Udari',
        lastName: 'Luxo',
        email: 'udariluxo@gmail.com',
        password: 'Udari2026',
        role: 'admin'
    },
    {
        firstName: 'Thaksala',
        lastName: 'Luxo',
        email: 'thaksalaluxo@gmail.com',
        password: 'Thaksala2026',
        role: 'admin'
    }
];

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        console.log('\n--- Adding Admin Users ---');
        
        for (const userData of usersToCreate) {
            // Check if user already exists
            const existingUser = await User.findOne({ email: userData.email });
            if (existingUser) {
                console.log(`⚠️  User ${userData.email} already exists. Skipping...`);
                continue;
            }

            // Create user (password will be automatically hashed by User model)
            const user = await User.create(userData);
            
            console.log(`✓ Admin user created: ${userData.email}`);
            console.log(`  → Name: ${user.firstName} ${user.lastName}`);
            console.log(`  → Role: ${user.role}`);
        }

        console.log('\n======================================================');
        console.log('✓ ADMIN USERS SUCCESSFULLY ADDED!');
        console.log('Use the credentials below to log in:');
        for (const u of usersToCreate) {
            console.log(`- Email: ${u.email} | Password: ${u.password}`);
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
