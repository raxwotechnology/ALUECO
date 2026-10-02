import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function updateAccessoryCodes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    const AluApplication = (await import('./src/models/AluApplication.js')).default;

    // Accessory code mapping
    const codeMapping = {
      'HINGE': 'CASEMENT_HINGE',
      'HANDLE': 'CASEMENT_HANDLE',
      'LOCK': 'TOUCH_LOCK',
      'GASKET': 'RUBBER_EPDM',
      'ROLLER': 'ROLLER_HEAVY',
      'ASTRAGAL': 'INTERLOCK_BLOCK',
      'GLAZING': 'CORNER_CLEAT',
      'PINS': 'LOUVER_CLIP',
      'BOLT': 'CORNER_CLEAT',
      'BRACKET': 'CORNER_CLEAT'
    };

    // Get all applications
    const applications = await AluApplication.find({});
    console.log(`Found ${applications.length} application templates`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const app of applications) {
      let modified = false;
      
      // Update accessory codes in accessoryBOM
      if (app.accessoryBOM && app.accessoryBOM.length > 0) {
        for (const acc of app.accessoryBOM) {
          const oldCode = acc.accessoryCode;
          const newCode = codeMapping[oldCode];
          
          if (newCode && oldCode !== newCode) {
            console.log(`  Updating ${app.type} - ${app.configuration}: ${oldCode} -> ${newCode}`);
            acc.accessoryCode = newCode;
            modified = true;
          }
        }
      }

      if (modified) {
        await app.save();
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✅ Updated ${updatedCount} application templates`);
    console.log(`⏭️  Skipped ${skippedCount} templates (no changes needed)`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating accessory codes:', err);
    process.exit(1);
  }
}

updateAccessoryCodes();
