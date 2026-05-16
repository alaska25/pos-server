const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, trim: true },
  phone:   { type: String, required: true, trim: true },
  service: { type: String, required: true },
  message: { type: String, default: '' },
  status:  { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);