import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function checkAccessories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const AluAccessory = (await import('./src/models/AluAccessory.js')).default;

    const accs = await AluAccessory.find({ code: { $in: ['ACC-50-DB-W125', 'AC123', 'AC234'] } });
    console.log('Found accessories:');
    accs.forEach(a => {
      console.log('Code:', a.code, 'Name:', a.name, 'Selling Rate:', a.sellingRate, 'Purchase Rate:', a.purchaseRate);
    });

    if (accs.length === 0) {
      console.log('Accessories not found. Adding them...');
      const newAccessories = [
        { code: 'ACC-50-DB-W125', name: 'Corner Bracket W125', brand: 'General', unit: 'Nos', purchaseRate: 80, sellingRate: 120 },
        { code: 'AC123', name: 'Locking Handle', brand: 'Kinlong', unit: 'Nos', purchaseRate: 550, sellingRate: 750 },
        { code: 'AC234', name: 'Weather Seal Strip', brand: 'BP', unit: 'm', purchaseRate: 60, sellingRate: 100 }
      ];
      await AluAccessory.insertMany(newAccessories);
      console.log('Added accessories successfully');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkAccessories();
