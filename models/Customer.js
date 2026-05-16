const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  // ── Link to User account ───────────────────────────────────────────────
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },

  // ── Identity ───────────────────────────────────────────────────────────
  customerCode: { type: String, trim: true, unique: true, sparse: true },
  customerType: {
    type: String,
    enum: ['homeowner', 'business', 'property_manager'],
    default: 'homeowner',
  },
  name:    { type: String, required: true, trim: true },
  company: { type: String, trim: true }, // for business/property manager types

  // ── Contact ────────────────────────────────────────────────────────────
  email:         { type: String, trim: true, lowercase: true },
  phone:         { type: String, trim: true }, // e.g. +63 9XX XXX XXXX
  mobile:        { type: String, trim: true },
  contactPerson: { type: String, trim: true }, // for business accounts

  // ── Address ────────────────────────────────────────────────────────────
  address: {
    street:  String,
    city:    String,
    state:   String, // province
    zip:     String,
    country: { type: String, default: 'Philippines' },
  },

  // Service area — city/district for dispatch matching
  serviceArea: {
    type: String,
    trim: true,
    // e.g. 'Quezon City', 'BGC', 'Makati', 'Pasig', 'Mandaluyong'
  },

  // ── Service Preferences ────────────────────────────────────────────────
  // Primary service type the customer usually requests
  preferredService: {
    type: String,
    enum: [
      'Electrical Repairs',
      'Plumbing Services',
      'HVAC & Aircon',
      'Appliance Repair',
      'Home Renovation',
      'Security Systems',
      'Maintenance',
    ],
  },

  // ── Subscription Plan ──────────────────────────────────────────────────
  plan: {
    type:    String,
    enum:    ['Basic', 'Standard', 'Premium', 'None'],
    default: 'None',
  },
  planStartDate: { type: Date },
  planEndDate:   { type: Date },

  // ── Financial ──────────────────────────────────────────────────────────
  paymentTerms: {
    type:    String,
    enum:    ['COD', '15 Days', '30 Days', '60 Days', '90 Days'],
    default: 'COD',
  },
  currency:    { type: String, enum: ['PHP', 'USD', 'EUR'], default: 'PHP' },
  creditLimit: { type: Number, default: 0 },

  // ── Status ─────────────────────────────────────────────────────────────
  rating: {
    type:    String,
    enum:    ['VIP', 'Regular', 'Blacklisted'],
    default: 'Regular',
  },
  notes:    { type: String },
  isActive: { type: Boolean, default: true },

}, { timestamps: true });

// ── Auto-generate customer code ────────────────────────────────────────────
CustomerSchema.pre('save', async function () {
  if (!this.customerCode) {
    // Find the highest existing code and increment, instead of using count
    const last = await mongoose.model('Customer')
      .findOne({ customerCode: { $exists: true } })
      .sort({ customerCode: -1 })
      .select('customerCode');
    
    const lastNum = last?.customerCode
      ? parseInt(last.customerCode.replace('CUST-', ''), 10)
      : 0;
    
    this.customerCode = `CUST-${String(lastNum + 1).padStart(4, '0')}`;
  }
});

// ── Virtual: total jobs ────────────────────────────────────────────────────
CustomerSchema.virtual('totalJobs', {
  ref: 'Job', localField: '_id', foreignField: 'customer', count: true,
});

module.exports = mongoose.model('Customer', CustomerSchema);