import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB for database cleanup\n');

        const db = mongoose.connection.db;
        const collections = await db.collections();

        console.log('--- Step 1: Clearing Collections Dynamically ---');
        for (const col of collections) {
            const name = col.collectionName;
            if (name === 'users') {
                console.log(`- Skipping ${name} (preserves logins)`);
                continue;
            }
            try {
                const result = await col.deleteMany({});
                console.log(`- Cleared ${name}: deleted ${result.deletedCount} documents`);
            } catch (err) {
                console.log(`- Failed to clear ${name}: ${err.message}`);
            }
        }
        
        console.log('\n--- Step 2: Verification ---');
        const collectionsVerified = await db.collections();
        for (const col of collectionsVerified) {
            const count = await col.countDocuments({});
            console.log(`- ${col.collectionName}: ${count} docs remaining`);
        }

        console.log('\n🎉 DATABASE CLEARED SUCCESSFULLY (Logins preserved!)');
    } catch (err) {
        console.error('❌ Cleanup failed:', err);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

run();
