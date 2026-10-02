import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function checkAccessoryCodes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    const AluApplication = (await import('./src/models/AluApplication.js')).default;

    // Get all applications
    const applications = await AluApplication.find({});
    console.log(`\n📋 Found ${applications.length} application templates:\n`);

    for (const app of applications) {
      console.log(`\n${app.type} - ${app.configuration}`);
      if (app.accessoryBOM && app.accessoryBOM.length > 0) {
        app.accessoryBOM.forEach(acc => {
          console.log(`  - ${acc.accessoryCode} (qty: ${acc.quantityFormula})`);
        });
      } else {
        console.log('  (no accessories)');
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking accessory codes:', err);
    process.exit(1);
  }
}

checkAccessoryCodes();
