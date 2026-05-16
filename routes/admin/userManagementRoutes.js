const express = require('express');
const router  = express.Router();
const { protect, requireRole } = require('../../middleware/auth');
const ctrl = require('../../controllers/adminController');  // 👈 rename to ctrl
router.get('/health', ctrl.getSystemHealth);

router.use(protect, requireRole('admin'));

router.get('/',                 ctrl.getAllUsers);        // matches exports.getAllUsers
router.patch('/:id/role',       ctrl.changeUserRole);    // matches exports.changeUserRole
router.put('/:id/role',         ctrl.changeUserRole);
router.patch('/:id/toggle',     ctrl.toggleUserStatus);  // matches exports.toggleUserStatus
router.patch('/:id/password',   ctrl.forceResetPassword);// matches exports.forceResetPassword
router.delete('/:id',           ctrl.hardDeleteUser);    // matches exports.hardDeleteUser

module.exports = router;