const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/serviceController');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(ctrl.getServices)
  .post(requireRole('admin', 'supervisor'), ctrl.createService);

router.route('/:id')
  .get(ctrl.getService)
  .put(requireRole('admin', 'supervisor'), ctrl.updateService)
  .delete(requireRole('admin'), ctrl.deleteService);

module.exports = router;