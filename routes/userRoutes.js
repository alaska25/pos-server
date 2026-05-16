const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/userController');
const { protect, requireRole: authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.route('/').get(ctrl.getUsers).post(ctrl.createUser);
router.route('/:id').put(ctrl.updateUser).delete(ctrl.deleteUser);

module.exports = router;