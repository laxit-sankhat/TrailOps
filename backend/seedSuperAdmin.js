import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ role: 'SuperAdmin' });
  if (existing) {
    console.log('A Super Admin already exists:', existing.email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash('14laxit06', 10);

  const superAdmin = await User.create({
    fullName: 'Laxit Sankhat',
    email: 'laxitsankhat@gmail.com',
    passwordHash,
    role: 'SuperAdmin'
  });

  console.log('Super Admin created:', superAdmin.email);
  process.exit(0);
};

run();