import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';

dotenv.config();

const usersToDelete = [
    'chamaraluxo@gmail.com',
    'udariluxo@gmail.com', 
    'thaksalaluxo@gmail.com'
];

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        console.log('\n--- Removing Admin Users ---');
        
        for (const email of usersToDelete) {
            const result = await User.deleteOne({ email });
            if (result.deletedCount > 0) {
                console.log(`✓ Deleted user: ${email}`);
            } else {
                console.log(`⚠️  User not found: ${email}`);
            }
        }

        console.log('\n======================================================');
        console.log('✓ ADMIN USERS REMOVED SUCCESSFULLY!');
        console.log('======================================================\n');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('✓ DB Disconnected');
    }
}

run();