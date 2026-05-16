const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  job:           { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  customer:      { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
    default: 'draft',
  },
  issueDate:          { type: Date, default: Date.now },
  dueDate:            { type: Date, required: true },
  subtotal:           { type: Number, required: true },
  taxTotal:           { type: Number, required: true },
  grandTotal:         { type: Number, required: true },
  amountPaid:         { type: Number, default: 0 },
  balance:            { type: Number },
  paymentTerms:       { type: String, default: '' },  // ← ADDED
  notes:              { type: String },
  termsAndConditions: { type: String },
  createdBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

InvoiceSchema.pre('save', async function () {
  if (!this.invoiceNumber) {
    const last = await mongoose.model('Invoice')
      .findOne({}, { invoiceNumber: 1 })
      .sort({ createdAt: -1 });
    const lastNum = last?.invoiceNumber
      ? parseInt(last.invoiceNumber.split('-')[2])
      : 0;
    this.invoiceNumber = `INV-${new Date().getFullYear()}-${String(lastNum + 1).padStart(5, '0')}`;
  }
  this.balance = parseFloat((this.grandTotal - this.amountPaid).toFixed(2));
});

module.exports = mongoose.model('Invoice', InvoiceSchema);