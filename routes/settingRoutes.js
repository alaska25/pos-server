const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/settingController');
const { protect, requireRole: authorize } = require('../middleware/auth');

router.use(protect);

router.get('/',      ctrl.getSettings);
router.put('/',      authorize('admin'), ctrl.updateSetting);
router.post('/seed', authorize('admin'), ctrl.seedSettings);

module.exports = router;