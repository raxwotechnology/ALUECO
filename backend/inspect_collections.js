import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const db = mongoose.connection.db;
        const collections = await db.collections();
        
        console.log('All collections in database:');
        for (const col of collections) {
            const count = await col.countDocuments({});
            console.log(`- ${col.collectionName}: ${count} docs`);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.connection.close();
    }
}

run();
