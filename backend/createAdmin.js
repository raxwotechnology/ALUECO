import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log('Usage: node createAdmin.js <email> <password>');
    console.log('Example: node createAdmin.js testadmin@example.com Admin123!');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to Database');

    // Import the User model
    const User = (await import('./src/models/User.js')).default;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`Error: User with email ${email} already exists!`);
      process.exit(1);
    }

    // Create the admin user
    const newAdmin = await User.create({
      firstName: 'New',
      lastName: 'Admin',
      email: email,
      phone: '+94770000001',
      password: password,
      role: 'admin'
    });

    console.log(`\n======================================`);
    console.log(`✓ Admin User Successfully Created!`);
    console.log(`  Email: ${newAdmin.email}`);
    console.log(`  Role: ${newAdmin.role}`);
    console.log(`======================================\n`);

  } catch (error) {
    console.error('Failed to create admin:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createAdmin();
