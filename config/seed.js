const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const User     = require('../models/User');
const Service  = require('../models/Service');
const Customer = require('../models/Customer');

const connectDB = require('./db');

const seed = async () => {
  await connectDB();

  await Promise.all([User.deleteMany(), Service.deleteMany(), Customer.deleteMany()]);

  // Admin user
  const password = await bcrypt.hash('admin123', 10);
  await User.create({
    name: 'Admin User',
    email: 'admin@shipyard.com',
    password,
    role: 'admin',
  });

  // Sample services
  await Service.insertMany([
    { name: 'Hull Cleaning',          category: 'Maintenance', unitPrice: 5000,  unit: 'vessel',  taxRate: 10 },
    { name: 'Engine Overhaul',        category: 'Repair',      unitPrice: 25000, unit: 'job',     taxRate: 10 },
    { name: 'Welding',                category: 'Repair',      unitPrice: 800,   unit: 'hour',    taxRate: 10 },
    { name: 'Painting (Anti-Foul)',   category: 'Coating',     unitPrice: 1200,  unit: 'sqm',     taxRate: 10 },
    { name: 'Electrical Inspection',  category: 'Inspection',  unitPrice: 3500,  unit: 'job',     taxRate: 10 },
    { name: 'Propeller Balancing',    category: 'Maintenance', unitPrice: 4500,  unit: 'job',     taxRate: 10 },
    { name: 'Dry Dock Labor',         category: 'Labor',       unitPrice: 600,   unit: 'hour',    taxRate: 10 },
    { name: 'Sandblasting',           category: 'Coating',     unitPrice: 900,   unit: 'sqm',     taxRate: 10 },
  ]);

  // Sample customers
  await Customer.insertMany([
    { name: 'Pacific Shipping Co.',  email: 'ops@pacificship.com',   phone: '+81-6-1234-5678', company: 'Pacific Shipping Co.',  address: { city: 'Osaka', country: 'Japan' } },
    { name: 'Tanaka Marine Ltd.',    email: 'billing@tanakamarine.jp', phone: '+81-6-9876-5432', company: 'Tanaka Marine Ltd.',    address: { city: 'Kobe',  country: 'Japan' } },
    { name: 'Blue Ocean Freight',    email: 'finance@blueocean.com', phone: '+81-78-555-0100', company: 'Blue Ocean Freight',    address: { city: 'Kobe',  country: 'Japan' } },
  ]);

  console.log('✅ Database seeded successfully');
  console.log('   Admin login: admin@shipyard.com / admin123');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });