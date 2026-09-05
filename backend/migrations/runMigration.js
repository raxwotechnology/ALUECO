/**
 * Simple migration runner that can be called via API endpoint
 * This script updates existing AluApplication records with the new spec fields
 */

import AluApplication from '../src/models/AluApplication.js';

export const runSpecsMigration = async (req, res) => {
  try {
    console.log('Starting specs migration...');
    
    // Find all applications that don't have the new fields
    const applications = await AluApplication.find({
      $or: [
        { profileSpec: { $exists: false } },
        { glassSpec: { $exists: false } },
        { hardwareSpec: { $exists: false } },
        { scopeSpec: { $exists: false } }
      ]
    });

    console.log(`Found ${applications.length} applications to update`);

    if (applications.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No applications need updating. All records already have the required fields.',
        updated: 0
      });
    }

    // Update each application with default values
    let updatedCount = 0;
    for (const app of applications) {
      app.profileSpec = app.profileSpec || 'Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)';
      app.glassSpec = app.glassSpec || '5mm Single Tempered Clear Glass';
      app.hardwareSpec = app.hardwareSpec || 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals';
      app.scopeSpec = app.scopeSpec || 'Fabrication, Delivery & Installation Inclusive';
      
      await app.save();
      updatedCount++;
      console.log(`Updated: ${app.type} - ${app.configuration} (${app.brand || 'Standard'})`);
    }

    console.log('Migration completed successfully');
    res.json({ 
      success: true, 
      message: `Migration completed successfully. Updated ${updatedCount} applications.`,
      updated: updatedCount
    });
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Migration failed: ' + error.message 
    });
  }
};
