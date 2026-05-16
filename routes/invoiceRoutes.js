const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/invoiceController');
const { protect, requireRole: authorize } = require('../middleware/auth');

router.use(protect);

// ── Customer-scoped routes ────────────────────────────────────────────────
router.get('/my', authorize('customer'), ctrl.getMyInvoices);

// ── Staff / Admin routes ──────────────────────────────────────────────────
router.route('/')
  .get(authorize('admin', 'technician', 'supervisor'),  ctrl.getInvoices)
  .post(authorize('admin', 'technician', 'supervisor'), ctrl.createInvoice);

// ── Must be before /:id to avoid being matched as an ID ──────────────────
router.get('/export', authorize('admin', 'supervisor'), ctrl.exportInvoices);

router.route('/:id')
  .get(ctrl.getInvoice)
  .put(authorize('admin', 'technician', 'supervisor'),  ctrl.updateInvoice)
  .delete(authorize('admin', 'supervisor'),             ctrl.deleteInvoice);

router.get('/:id/pdf',   ctrl.downloadPdf);
router.post('/:id/send', authorize('admin', 'technician', 'supervisor'), ctrl.sendInvoice);

module.exports = router;