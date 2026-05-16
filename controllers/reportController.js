const Job     = require('../models/Job');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');

exports.getDashboard = async (req, res) => {
  try {
    const now         = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalJobs,
      activeJobs,
      completedThisMonth,
      overdueInvoices,
      totalRevenue,
      monthRevenue,
      topCustomers,
      recentPayments,
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ status: 'in_progress' }),
      Job.countDocuments({ status: 'completed', completedAt: { $gte: startOfMonth } }),
      Invoice.countDocuments({ status: 'overdue' }),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([
        { $match: { paidAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Invoice.aggregate([
        { $group: { _id: '$customer', totalBilled: { $sum: '$grandTotal' } } },
        { $sort: { totalBilled: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
        { $unwind: '$customer' },
        { $project: { name: '$customer.name', totalBilled: 1 } },
      ]),
      Payment.find().sort({ paidAt: -1 }).limit(5)
        .populate('customer', 'name')
        .populate('invoice', 'invoiceNumber'),
    ]);

    // Check & mark overdue
    await Invoice.updateMany(
      { status: { $in: ['sent', 'partial'] }, dueDate: { $lt: now } },
      { status: 'overdue' }
    );

    res.json({
      success: true,
      data: {
        totalJobs,
        activeJobs,
        completedThisMonth,
        overdueInvoices,
        totalRevenue:  totalRevenue[0]?.total  || 0,
        monthRevenue:  monthRevenue[0]?.total  || 0,
        topCustomers,
        recentPayments,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getRevenueReport = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const monthly = await Payment.aggregate([
      {
        $match: {
          paidAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      { $group: { _id: { $month: '$paidAt' }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, data: monthly });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.getInvoiceReport = async (req, res) => {
  try {
    const summary = await Invoice.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$grandTotal' }
      }}
    ]);
    const overdue = await Invoice.find({ status: 'overdue' })
      .populate('customer', 'name')
      .select('invoiceNumber grandTotal dueDate customer')
      .sort({ dueDate: 1 }).limit(10);
    res.json({ success: true, data: { summary, overdue } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getJobReport = async (req, res) => {
  try {
    const summary = await Job.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const recent = await Job.find()
      .populate('customer', 'name')
      .select('title status priority createdAt completedAt customer')
      .sort({ createdAt: -1 }).limit(8);
    res.json({ success: true, data: { summary, recent } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};