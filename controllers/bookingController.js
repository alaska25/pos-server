const Booking    = require('../models/Booking');
const transporter = require('../utils/mailer');

exports.createBooking = async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body;

    if (!name || !email || !phone || !service) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    // Save to DB
    const booking = await Booking.create({ name, email, phone, service, message });

    // Email to admin
    await transporter.sendMail({
      from:    `"FlowPOS Bookings" <${process.env.EMAIL_USER}>`,
      to:      process.env.EMAIL_USER,
      subject: `New Booking Request — ${service}`,
      html: `
        <h2>New Booking Request</h2>
        <table cellpadding="8" style="border-collapse:collapse;width:100%;font-family:sans-serif;">
          <tr><td><strong>Name</strong></td><td>${name}</td></tr>
          <tr><td><strong>Email</strong></td><td>${email}</td></tr>
          <tr><td><strong>Phone</strong></td><td>${phone}</td></tr>
          <tr><td><strong>Service</strong></td><td>${service}</td></tr>
          <tr><td><strong>Message</strong></td><td>${message || '—'}</td></tr>
          <tr><td><strong>Submitted</strong></td><td>${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td></tr>
        </table>
      `,
    });

    // Confirmation email to customer
    await transporter.sendMail({
      from:    `"FlowPOS" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `We received your booking — ${service}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
          <h2 style="color:#6366f1;">Booking Received! ✅</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>Thanks for reaching out. We've received your request for <strong>${service}</strong> and a technician will contact you within <strong>2 hours</strong>.</p>
          <table cellpadding="8" style="border-collapse:collapse;width:100%;margin:16px 0;">
            <tr><td><strong>Service</strong></td><td>${service}</td></tr>
            <tr><td><strong>Phone</strong></td><td>${phone}</td></tr>
            <tr><td><strong>Message</strong></td><td>${message || '—'}</td></tr>
          </table>
          <p style="color:#888;font-size:13px;">— The FlowPOS Team</p>
        </div>
      `,
    });

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    console.error('Booking error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};