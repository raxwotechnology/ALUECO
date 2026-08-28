import mongoose from 'mongoose';
import dns from 'dns';

// Some local networks / mobile hotspot routers (e.g. the default gateway's DNS
// resolver) do not support SRV/TXT DNS record lookups, which are required to
// resolve "mongodb+srv://" connection strings. This causes:
//   ✗ MongoDB Connection Error: querySrv ENOTFOUND _mongodb._tcp.<cluster>.mongodb.net
// Prepending reliable public DNS resolvers (Google & Cloudflare) fixes SRV
// lookups without requiring any Windows network configuration changes.
dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);

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