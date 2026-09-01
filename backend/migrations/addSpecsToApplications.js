/**
 * Migration script to add profileSpec, glassSpec, hardwareSpec, scopeSpec fields to existing AluApplication records
 * Run this script after updating the model to ensure existing records have default values
 * Usage: node migrations/addSpecsToApplications.js
 */

import mongoose from 'mongoose';
import AluApplication from '../src/models/AluApplication.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const migrateApplications = async () => {
  try {
    // Connect to MongoDB using the same URI as the backend
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/wholesale_system';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

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
      console.log('No applications need updating. All records already have the required fields.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Update each application with default values
    for (const app of applications) {
      app.profileSpec = app.profileSpec || 'Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)';
      app.glassSpec = app.glassSpec || '5mm Single Tempered Clear Glass';
      app.hardwareSpec = app.hardwareSpec || 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals';
      app.scopeSpec = app.scopeSpec || 'Fabrication, Delivery & Installation Inclusive';
      
      await app.save();
      console.log(`Updated: ${app.type} - ${app.configuration} (${app.brand || 'Standard'})`);
    }

    console.log('Migration completed successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

migrateApplications();
