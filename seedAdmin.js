require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const users = db.collection('users');

  const existing = await users.findOne({ email: 'admin@shipyard.com' });
  if (existing) {
    console.log('⚠️  Admin already exists, skipping.');
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  await users.insertOne({
    name:      'Admin',
    email:     'admin@shipyard.com',
    password:  hashedPassword,
    role:      'admin',
    isActive:  true,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('✅ Admin user created: admin@shipyard.com / admin123');
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed error:', err.message);
  process.exit(1);
});