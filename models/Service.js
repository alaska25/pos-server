const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String },
  category: {
  type: String,
  enum: [
  'Electrical Repairs', 'Plumbing Services', 'HVAC & Aircon',
  'Appliance Repair', 'Home Renovation', 'Security Systems', 'Maintenance'
],
  required: true,
},

  unitPrice:  { type: Number, required: true, min: 0 },
  unit:       { type: String, enum: ['hour', 'day', 'job', 'sqm', 'vessel', 'meter'], default: 'job' },
  taxRate:    { type: Number, default: 10, min: 0, max: 100 }, // %
  isActive:   { type: Boolean, default: true },
  laborRate:  { type: Number, default: 0 }, // separate labor component if needed
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);