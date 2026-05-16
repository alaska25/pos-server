const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/dashboard', ctrl.getDashboard);
router.get('/revenue',   ctrl.getRevenueReport);
router.get('/invoices', ctrl.getInvoiceReport);
router.get('/jobs',     ctrl.getJobReport);
module.exports = router;