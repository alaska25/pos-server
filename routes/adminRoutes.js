const router  = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const ctrl    = require('../controllers/adminController'); // 👈 add this

// ── Dashboard — uses the full controller (revenue, payments, etc.) ──────────
router.get(
  '/dashboard',
  protect,
  requireRole('admin'),
  ctrl.getDashboard,  // 👈 replace the inline handler with this
);

// ── System Health ───────────────────────────────────────────────────────────
router.get(
  '/health',
  protect,
  requireRole('admin'),
  ctrl.getSystemHealth,  // 👈 add this
);

// ── User management ─────────────────────────────────────────────────────────
router.use('/users', require('./admin/userManagementRoutes'));

module.exports = router;