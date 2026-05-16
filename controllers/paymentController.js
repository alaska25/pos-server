const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');

exports.createPayment = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.body.invoice);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Invoice already paid' });

    const payment = await Payment.create({ ...req.body, customer: invoice.customer, receivedBy: req.user._id });

    // Update invoice
    invoice.amountPaid += payment.amount;
    invoice.balance     = invoice.grandTotal - invoice.amountPaid;
    invoice.status      = invoice.balance <= 0 ? 'paid' : 'partial';
    if (invoice.balance < 0) invoice.balance = 0;
    await invoice.save({ validateBeforeSave: false });

    res.status(201).json({ success: true, data: payment, invoice });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find(req.query.invoice ? { invoice: req.query.invoice } : {})
      .populate('customer', 'name')
      .populate('receivedBy', 'name')
      .sort({ paidAt: -1 })
      .limit(100);
    res.json({ success: true, data: payments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};