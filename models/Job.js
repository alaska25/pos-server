const mongoose = require('mongoose');

const JobLineSchema = new mongoose.Schema({
  service:     { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  serviceName: { type: String, required: true },
  description: { type: String },
  quantity:    { type: Number, required: true, min: 0.01 },
  unit:        { type: String },
  unitPrice:   { type: Number, required: true },
  taxRate:     { type: Number, default: 10 },
  discount:    { type: Number, default: 0 },
  lineTotal:   { type: Number },
}, { _id: true });

const JobSchema = new mongoose.Schema({
  jobNumber:   { type: String, unique: true },
  customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  location:    { type: String },
  description: { type: String },
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'completed', 'cancelled'],
    default: 'draft',
  },
  priority:    { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  lines:       [JobLineSchema],
  startDate:   { type: Date },
  dueDate:     { type: Date },
  completedAt: { type: Date },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  invoice:     { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null }, // 👈 added
  notes:       { type: String },
  subtotal:    { type: Number, default: 0 },
  taxTotal:    { type: Number, default: 0 },
  grandTotal:  { type: Number, default: 0 },
}, { timestamps: true });

JobSchema.pre('save', async function () {
  if (!this.jobNumber) {
    const count = await mongoose.model('Job').countDocuments();
    this.jobNumber = `JOB-${String(count + 1).padStart(5, '0')}`;
  }
  let subtotal = 0, taxTotal = 0;
  this.lines.forEach(line => {
  const base     = line.quantity * line.unitPrice * (1 - (line.discount || 0) / 100);
  const tax      = base * (line.taxRate / 100);
  line.lineTotal = parseFloat(base.toFixed(2));  // ← pre-tax line total
  subtotal      += base;
  taxTotal      += tax;
});
  this.subtotal   = parseFloat(subtotal.toFixed(2));
  this.taxTotal   = parseFloat(taxTotal.toFixed(2));
  this.grandTotal = parseFloat((subtotal + taxTotal).toFixed(2));
});

module.exports = mongoose.model('Job', JobSchema);