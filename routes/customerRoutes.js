const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/customerController');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);

// Customer self-service — must be before /:id
router.get('/my', requireRole('customer'), ctrl.getMyProfile);

// Staff routes
router.route('/')
  .get(ctrl.getCustomers)
  .post(ctrl.createCustomer);

router.route('/:id')
  .get(ctrl.getCustomer)
  .put(ctrl.updateCustomer)
  .delete(ctrl.deleteCustomer);

module.exports = router;