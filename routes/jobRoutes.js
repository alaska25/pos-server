const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/jobController');
const { protect, requireRole: authorize } = require('../middleware/auth');

router.use(protect);

// ── Customer-scoped routes ────────────────────────────────────────────────
router.get('/my', authorize('customer'), ctrl.getMyJobs);

// ── Staff / Admin routes ──────────────────────────────────────────────────
router.route('/')
  .get(authorize('admin', 'technician', 'manager'), ctrl.getJobs)
  .post(authorize('admin', 'technician', 'manager'), ctrl.createJob);

router.route('/:id')
  .get(ctrl.getJob)
  .put(authorize('admin', 'technician', 'manager'), ctrl.updateJob)
  .delete(authorize('admin', 'manager'), ctrl.deleteJob);

module.exports = router;