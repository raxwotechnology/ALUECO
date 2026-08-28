import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function seedAluApplications() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    const AluApplication = (await import('./src/models/AluApplication.js')).default;

    // Check if applications already exist
    const existingCount = await AluApplication.countDocuments();
    if (existingCount > 0) {
      console.log(`✓ ${existingCount} AluApplication records already exist, skipping seed`);
      process.exit(0);
    }

    const applications = [
      // Casement Doors
      {
        type: 'Casement Door',
        configuration: 'Single Sash (1 Panel)',
        description: 'Single panel casement door with side hung opening',
        profileBOM: [
          { profileCode: 'CFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'CFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'W' },
          { profileCode: 'CSASH', description: 'Sash Profile', quantityFormula: '2', lengthFormula: 'H - 50' },
          { profileCode: 'CSASH', description: 'Sash Profile', quantityFormula: '2', lengthFormula: 'W - 50' },
          { profileCode: 'CMULL', description: 'Mullion', quantityFormula: '0', lengthFormula: '0' }
        ],
        glassBOM: [
          { glassType: '6mm Clear', quantityFormula: '1', widthFormula: 'W - 100', heightFormula: 'H - 100' }
        ],
        accessoryBOM: [
          { accessoryCode: 'HINGE', quantityFormula: '3' },
          { accessoryCode: 'HANDLE', quantityFormula: '1' },
          { accessoryCode: 'LOCK', quantityFormula: '1' },
          { accessoryCode: 'GASKET', quantityFormula: '4' }
        ],
        labourMethod: 'opening',
        labourRate: 2500,
        brand: 'Standard',
        isActive: true
      },
      {
        type: 'Casement Door',
        configuration: 'Double Sash (2 Panel)',
        description: 'Double panel casement door with French opening',
        profileBOM: [
          { profileCode: 'CFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'CFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'W' },
          { profileCode: 'CSASH', description: 'Sash Profile', quantityFormula: '4', lengthFormula: 'H - 50' },
          { profileCode: 'CSASH', description: 'Sash Profile', quantityFormula: '4', lengthFormula: '(W - 50) / 2' },
          { profileCode: 'CMULL', description: 'Mullion', quantityFormula: '1', lengthFormula: 'H - 50' }
        ],
        glassBOM: [
          { glassType: '6mm Clear', quantityFormula: '2', widthFormula: '(W - 150) / 2', heightFormula: 'H - 100' }
        ],
        accessoryBOM: [
          { accessoryCode: 'HINGE', quantityFormula: '6' },
          { accessoryCode: 'HANDLE', quantityFormula: '2' },
          { accessoryCode: 'LOCK', quantityFormula: '1' },
          { accessoryCode: 'GASKET', quantityFormula: '8' },
          { accessoryCode: 'ASTRAGAL', quantityFormula: '1' }
        ],
        labourMethod: 'opening',
        labourRate: 3500,
        brand: 'Standard',
        isActive: true
      },

      // Casement Windows
      {
        type: 'Casement Window',
        configuration: 'Single Sash (1 Panel)',
        description: 'Single panel casement window with side hung opening',
        profileBOM: [
          { profileCode: 'WFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'WFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'W' },
          { profileCode: 'WSASH', description: 'Sash Profile', quantityFormula: '2', lengthFormula: 'H - 40' },
          { profileCode: 'WSASH', description: 'Sash Profile', quantityFormula: '2', lengthFormula: 'W - 40' }
        ],
        glassBOM: [
          { glassType: '6mm Clear', quantityFormula: '1', widthFormula: 'W - 80', heightFormula: 'H - 80' }
        ],
        accessoryBOM: [
          { accessoryCode: 'HINGE', quantityFormula: '2' },
          { accessoryCode: 'HANDLE', quantityFormula: '1' },
          { accessoryCode: 'LOCK', quantityFormula: '1' },
          { accessoryCode: 'GASKET', quantityFormula: '4' }
        ],
        labourMethod: 'opening',
        labourRate: 1500,
        brand: 'Standard',
        isActive: true
      },
      {
        type: 'Casement Window',
        configuration: 'Double Sash (2 Panel)',
        description: 'Double panel casement window with French opening',
        profileBOM: [
          { profileCode: 'WFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'WFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'W' },
          { profileCode: 'WSASH', description: 'Sash Profile', quantityFormula: '4', lengthFormula: 'H - 40' },
          { profileCode: 'WSASH', description: 'Sash Profile', quantityFormula: '4', lengthFormula: '(W - 40) / 2' },
          { profileCode: 'WMULL', description: 'Mullion', quantityFormula: '1', lengthFormula: 'H - 40' }
        ],
        glassBOM: [
          { glassType: '6mm Clear', quantityFormula: '2', widthFormula: '(W - 120) / 2', heightFormula: 'H - 80' }
        ],
        accessoryBOM: [
          { accessoryCode: 'HINGE', quantityFormula: '4' },
          { accessoryCode: 'HANDLE', quantityFormula: '2' },
          { accessoryCode: 'LOCK', quantityFormula: '1' },
          { accessoryCode: 'GASKET', quantityFormula: '8' },
          { accessoryCode: 'ASTRAGAL', quantityFormula: '1' }
        ],
        labourMethod: 'opening',
        labourRate: 2000,
        brand: 'Standard',
        isActive: true
      },
      {
        type: 'Casement Window',
        configuration: '3 Panel',
        description: 'Three panel casement window with center fixed',
        profileBOM: [
          { profileCode: 'WFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'WFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'W' },
          { profileCode: 'WSASH', description: 'Sash Profile', quantityFormula: '4', lengthFormula: 'H - 40' },
          { profileCode: 'WSASH', description: 'Sash Profile', quantityFormula: '4', lengthFormula: '(W - 40) / 3' },
          { profileCode: 'WMULL', description: 'Mullion', quantityFormula: '2', lengthFormula: 'H - 40' }
        ],
        glassBOM: [
          { glassType: '6mm Clear', quantityFormula: '3', widthFormula: '(W - 120) / 3', heightFormula: 'H - 80' }
        ],
        accessoryBOM: [
          { accessoryCode: 'HINGE', quantityFormula: '4' },
          { accessoryCode: 'HANDLE', quantityFormula: '2' },
          { accessoryCode: 'LOCK', quantityFormula: '1' },
          { accessoryCode: 'GASKET', quantityFormula: '12' }
        ],
        labourMethod: 'opening',
        labourRate: 2500,
        brand: 'Standard',
        isActive: true
      },

      // Sliding Doors
      {
        type: 'Sliding Door',
        configuration: '2 Panel (1 Track)',
        description: 'Two panel sliding door with single track',
        profileBOM: [
          { profileCode: 'SDFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'SDFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'W' },
          { profileCode: 'SDSASH', description: 'Sash Profile', quantityFormula: '4', lengthFormula: 'H - 60' },
          { profileCode: 'SDSASH', description: 'Sash Profile', quantityFormula: '4', lengthFormula: '(W + 50) / 2' },
          { profileCode: 'SDTRACK', description: 'Track', quantityFormula: '1', lengthFormula: 'W' }
        ],
        glassBOM: [
          { glassType: '6mm Clear', quantityFormula: '2', widthFormula: '(W + 20) / 2', heightFormula: 'H - 100' }
        ],
        accessoryBOM: [
          { accessoryCode: 'ROLLER', quantityFormula: '4' },
          { accessoryCode: 'HANDLE', quantityFormula: '2' },
          { accessoryCode: 'LOCK', quantityFormula: '1' },
          { accessoryCode: 'GASKET', quantityFormula: '8' }
        ],
        labourMethod: 'opening',
        labourRate: 2000,
        brand: 'Standard',
        isActive: true
      },
      {
        type: 'Sliding Door',
        configuration: '3 Panel (2 Track)',
        description: 'Three panel sliding door with two tracks',
        profileBOM: [
          { profileCode: 'SDFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'SDFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'W' },
          { profileCode: 'SDSASH', description: 'Sash Profile', quantityFormula: '6', lengthFormula: 'H - 60' },
          { profileCode: 'SDSASH', description: 'Sash Profile', quantityFormula: '6', lengthFormula: '(W + 50) / 3' },
          { profileCode: 'SDTRACK', description: 'Track', quantityFormula: '2', lengthFormula: 'W' }
        ],
        glassBOM: [
          { glassType: '6mm Clear', quantityFormula: '3', widthFormula: '(W + 20) / 3', heightFormula: 'H - 100' }
        ],
        accessoryBOM: [
          { accessoryCode: 'ROLLER', quantityFormula: '6' },
          { accessoryCode: 'HANDLE', quantityFormula: '2' },
          { accessoryCode: 'LOCK', quantityFormula: '1' },
          { accessoryCode: 'GASKET', quantityFormula: '12' }
        ],
        labourMethod: 'opening',
        labourRate: 2800,
        brand: 'Standard',
        isActive: true
      },
      {
        type: 'Sliding Door',
        configuration: '4 Panel (2 Track)',
        description: 'Four panel sliding door with two tracks',
        profileBOM: [
          { profileCode: 'SDFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'SDFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'W' },
          { profileCode: 'SDSASH', description: 'Sash Profile', quantityFormula: '8', lengthFormula: 'H - 60' },
          { profileCode: 'SDSASH', description: 'Sash Profile', quantityFormula: '8', lengthFormula: '(W + 50) / 4' },
          { profileCode: 'SDTRACK', description: 'Track', quantityFormula: '2', lengthFormula: 'W' }
        ],
        glassBOM: [
          { glassType: '6mm Clear', quantityFormula: '4', widthFormula: '(W + 20) / 4', heightFormula: 'H - 100' }
        ],
        accessoryBOM: [
          { accessoryCode: 'ROLLER', quantityFormula: '8' },
          { accessoryCode: 'HANDLE', quantityFormula: '2' },
          { accessoryCode: 'LOCK', quantityFormula: '1' },
          { accessoryCode: 'GASKET', quantityFormula: '16' }
        ],
        labourMethod: 'opening',
        labourRate: 3500,
        brand: 'Standard',
        isActive: true
      },

      // Sliding Windows
      {
        type: 'Sliding Window',
        configuration: '2 Panel (1 Track)',
        description: 'Two panel sliding window with single track',
        profileBOM: [
          { profileCode: 'SWFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'SWFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'W' },
          { profileCode: 'SWSASH', description: 'Sash Profile', quantityFormula: '4', lengthFormula: 'H - 50' },
          { profileCode: 'SWSASH', description: 'Sash Profile', quantityFormula: '4', lengthFormula: '(W + 40) / 2' },
          { profileCode: 'SWTRACK', description: 'Track', quantityFormula: '1', lengthFormula: 'W' }
        ],
        glassBOM: [
          { glassType: '6mm Clear', quantityFormula: '2', widthFormula: '(W + 15) / 2', heightFormula: 'H - 80' }
        ],
        accessoryBOM: [
          { accessoryCode: 'ROLLER', quantityFormula: '4' },
          { accessoryCode: 'HANDLE', quantityFormula: '2' },
          { accessoryCode: 'LOCK', quantityFormula: '1' },
          { accessoryCode: 'GASKET', quantityFormula: '8' }
        ],
        labourMethod: 'opening',
        labourRate: 1200,
        brand: 'Standard',
        isActive: true
      },
      {
        type: 'Sliding Window',
        configuration: '3 Panel (2 Track)',
        description: 'Three panel sliding window with two tracks',
        profileBOM: [
          { profileCode: 'SWFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'SWFRAME', description: 'Outer Frame', quantityFormula: '2', lengthFormula: 'W' },
          { profileCode: 'SWSASH', description: 'Sash Profile', quantityFormula: '6', lengthFormula: 'H - 50' },
          { profileCode: 'SWSASH', description: 'Sash Profile', quantityFormula: '6', lengthFormula: '(W + 40) / 3' },
          { profileCode: 'SWTRACK', description: 'Track', quantityFormula: '2', lengthFormula: 'W' }
        ],
        glassBOM: [
          { glassType: '6mm Clear', quantityFormula: '3', widthFormula: '(W + 15) / 3', heightFormula: 'H - 80' }
        ],
        accessoryBOM: [
          { accessoryCode: 'ROLLER', quantityFormula: '6' },
          { accessoryCode: 'HANDLE', quantityFormula: '2' },
          { accessoryCode: 'LOCK', quantityFormula: '1' },
          { accessoryCode: 'GASKET', quantityFormula: '12' }
        ],
        labourMethod: 'opening',
        labourRate: 1800,
        brand: 'Standard',
        isActive: true
      },

      // Fixed Glass
      {
        type: 'Fixed Glass',
        configuration: '1 Panel',
        description: 'Single fixed glass panel without opening',
        profileBOM: [
          { profileCode: 'FGFRAME', description: 'Frame', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'FGFRAME', description: 'Frame', quantityFormula: '2', lengthFormula: 'W' }
        ],
        glassBOM: [
          { glassType: '6mm Clear', quantityFormula: '1', widthFormula: 'W - 40', heightFormula: 'H - 40' }
        ],
        accessoryBOM: [
          { accessoryCode: 'GASKET', quantityFormula: '4' },
          { accessoryCode: 'GLAZING', quantityFormula: '4' }
        ],
        labourMethod: 'sqft',
        labourRate: 150,
        brand: 'Standard',
        isActive: true
      },

      // Louver Windows
      {
        type: 'Louver Window',
        configuration: '3 Blade',
        description: 'Three blade louver window for ventilation',
        profileBOM: [
          { profileCode: 'LWFRAME', description: 'Frame', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'LWFRAME', description: 'Frame', quantityFormula: '2', lengthFormula: 'W' },
          { profileCode: 'LWBLADE', description: 'Blade', quantityFormula: '3', lengthFormula: 'W - 20' }
        ],
        glassBOM: [],
        accessoryBOM: [
          { accessoryCode: 'GASKET', quantityFormula: '6' },
          { accessoryCode: 'PINS', quantityFormula: '6' }
        ],
        labourMethod: 'opening',
        labourRate: 800,
        brand: 'Standard',
        isActive: true
      },

      // Curtain Wall
      {
        type: 'Curtain Wall',
        configuration: 'Structural Glazing',
        description: 'Structural glazing curtain wall system',
        profileBOM: [
          { profileCode: 'CWVERT', description: 'Vertical Mullion', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'CWVERT', description: 'Vertical Mullion', quantityFormula: 'W / 1500', lengthFormula: 'H' },
          { profileCode: 'CWHORZ', description: 'Horizontal Transom', quantityFormula: 'H / 1200', lengthFormula: 'W' },
          { profileCode: 'CWFRAME', description: 'Pressure Plate', quantityFormula: '2', lengthFormula: 'H' },
          { profileCode: 'CWFRAME', description: 'Pressure Plate', quantityFormula: '2', lengthFormula: 'W' }
        ],
        glassBOM: [
          { glassType: '10mm Tempered', quantityFormula: '(W * H) / 92903', widthFormula: 'W - 50', heightFormula: 'H - 50' }
        ],
        accessoryBOM: [
          { accessoryCode: 'BOLT', quantityFormula: '10' },
          { accessoryCode: 'GASKET', quantityFormula: '20' },
          { accessoryCode: 'BRACKET', quantityFormula: '5' }
        ],
        labourMethod: 'sqft',
        labourRate: 300,
        brand: 'Standard',
        isActive: true
      }
    ];

    await AluApplication.insertMany(applications);
    console.log(`✅ Seeded ${applications.length} AluApplication templates successfully!`);

    // Display seeded applications
    const seededApps = await AluApplication.find({}).sort({ type: 1, configuration: 1 });
    console.log('\n📋 Seeded Application Templates:');
    seededApps.forEach(app => {
      console.log(`  - ${app.type} - ${app.configuration}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding AluApplication templates:', err);
    process.exit(1);
  }
}

seedAluApplications();
