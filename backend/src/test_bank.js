import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { getBankAccounts } from './controllers/bankAccountController.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const req = {};
        const res = {
            json: (data) => {
                console.log('Controller returned json successfully:', data);
            },
            status: (code) => {
                console.log('Status set to:', code);
                return res;
            }
        };

        await getBankAccounts(req, res, (err) => {
            if (err) {
                console.error('Express errorHandler called with error:', err);
            }
        });
    } catch (err) {
        console.error('❌ Test error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('DB connection closed');
    }
}

run();
