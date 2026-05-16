const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.route('/').get(ctrl.getPayments).post(ctrl.createPayment);
module.exports = router;