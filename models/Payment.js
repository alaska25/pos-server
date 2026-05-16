const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  invoice:    { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  customer:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount:     { type: Number, required: true, min: 0.01 },
  method: {
    type: String,
    enum: ['cash', 'bank_transfer', 'check', 'credit_card', 'other'],
    required: true,
  },
  reference:    { type: String }, // bank ref, check #, etc.
  paidAt:       { type: Date, default: Date.now },
  remarks:        { type: String },
  receivedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);