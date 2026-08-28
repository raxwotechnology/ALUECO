import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function checkApps() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');
    
    const AluApplication = (await import('./src/models/AluApplication.js')).default;
    
    const count = await AluApplication.countDocuments();
    console.log('AluApplication count:', count);
    
    if (count > 0) {
      const apps = await AluApplication.find({}).limit(10);
      console.log('Sample applications:');
      apps.forEach(app => {
        console.log(`- ${app.type} - ${app.configuration}`);
      });
    } else {
      console.log('No AluApplication records found in database');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkApps();
