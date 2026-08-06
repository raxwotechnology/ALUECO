import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('==================================================================');
            console.error('✗ CRITICAL ERROR: MONGO_URI environment variable is NOT set!');
            console.error('✗ Please add MONGO_URI in your Render Dashboard Environment Variables.');
            console.error('==================================================================');
            process.exit(1);
        }

        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
        
        try {
            await mongoose.connection.db.collection('products').dropIndex('sku_1');
            console.log('✓ Successfully dropped old non-sparse sku_1 index');
        } catch (e) {
            // Index doesn't exist or already dropped
        }

        return conn;
    } catch (error) {
        console.error(`✗ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;