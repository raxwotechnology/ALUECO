import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Settings from './src/models/Settings.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to Database');

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        settings.companyName = 'ALUECO Aluminium Systems';
        settings.companyAddress = 'No. 123, Negoda Road, Weliweriya, Sri Lanka';
        settings.companyPhone = '0777 140 680';
        settings.companyEmail = 'info@alueco.lk';
        
        await settings.save();
        console.log('✓ System branding settings updated to ALUECO Aluminium Systems!');
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

run();
