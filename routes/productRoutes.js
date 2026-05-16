const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/productController');
const { protect, requireRole: authorize } = require('../middleware/auth');

// Public/Staff access - View products
router.get('/', protect, ctrl.getProducts);
router.get('/:id', protect, ctrl.getProduct);

// Admin/Supervisor only - Manage inventory
router.post('/', protect, authorize('admin', 'supervisor'), ctrl.createProduct);
router.put('/:id', protect, authorize('admin', 'supervisor'), ctrl.updateProduct);
router.delete('/:id', protect, authorize('admin'), ctrl.deleteProduct);

module.exports = router;
