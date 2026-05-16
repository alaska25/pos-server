const User     = require('../models/User');
const Customer = require('../models/Customer');
const Invoice  = require('../models/Invoice');
const Job      = require('../models/Job');
const Payment  = require('../models/Payment');
const Service  = require('../models/Service');

// ─── Dashboard Overview ───────────────────────────────────────────────────────
// GET /api/admin/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      totalCustomers,
      totalJobs,
      totalInvoices,
      totalServices,
      overdueInvoices,
      recentPayments,
      revenue,
      monthRevenue,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Customer.countDocuments(),
      Job.countDocuments(),
      Invoice.countDocuments(),
      Service.countDocuments(),
      Invoice.countDocuments({ status: 'overdue' }),
      Payment.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('customer', 'name')
        .populate('invoice', 'invoiceNumber'),
      Payment.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    // ✅ Fixed — flat structure so frontend can read stats directly from data.*
    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalCustomers,
        totalJobs,
        totalInvoices,
        totalServices,
        overdueInvoices,
        totalRevenue:  revenue[0]?.total      || 0,
        monthRevenue:  monthRevenue[0]?.total  || 0,
        recentPayments,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── All Users (with sensitive fields) ───────────────────────────────────────
// GET /api/admin/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('+password')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Change User Role ─────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/role
exports.changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['superadmin', 'admin', 'supervisor', 'cashier'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── Activate / Deactivate User ───────────────────────────────────────────────
// PATCH /api/admin/users/:id/toggle
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    }

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Force Reset User Password ────────────────────────────────────────────────
// PATCH /api/admin/users/:id/password
// ─── Force Reset User Password ────────────────────────────────────────────────
exports.forceResetPassword = async (req, res) => {
  try {
    console.log('req.body:', req.body);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword;
    await user.save({ validateBeforeSave: false }); // 👈 add this

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Full Revenue Report ──────────────────────────────────────────────────────
// GET /api/admin/reports/revenue
exports.getRevenueReport = async (req, res) => {
  try {
    const monthly = await Payment.aggregate([
      {
        $group: {
          _id: {
            year:  { $year:  '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    const overall = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        overall: overall[0] || { total: 0, count: 0 },
        monthly,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── System Health ────────────────────────────────────────────────────────────
// GET /api/admin/health
exports.getSystemHealth = async (req, res) => {
  try {
    const mongoose = require('mongoose');

    // DB status
    const dbStatus = mongoose.connection.readyState === 1; // 1 = connected

    // Memory
    const mem = process.memoryUsage();
    const heapUsedMB  = Math.round(mem.heapUsed  / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const memPercent  = Math.round((mem.heapUsed / mem.heapTotal) * 100);

    // Uptime
    const uptimeSeconds = Math.floor(process.uptime());
    const hours   = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptime  = `${hours}h ${minutes}m ${seconds}s`;

    // Health score
    let score = 100;
    if (!dbStatus)      score -= 60;  // DB down is critical
    if (memPercent > 90) score -= 30;
    if (memPercent > 75) score -= 10;

    res.json({
      success: true,
      data: {
        score,
        db:     { connected: dbStatus },
        memory: { heapUsedMB, heapTotalMB, memPercent },
        uptime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Hard Delete (admin only) ─────────────────────────────────────────────────
// DELETE /api/admin/users/:id
exports.hardDeleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    await user.deleteOne();
    res.json({ success: true, message: 'User permanently deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};