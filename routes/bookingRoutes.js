const express = require('express');
const router  = express.Router();
const { createBooking, getBookings } = require('../controllers/bookingController');
// Add the alias ': authorize' here
const { protect, requireRole: authorize } = require('../middleware/auth');

router.post('/',           createBooking);
// Now 'authorize' is defined and will work
router.get('/',  protect, authorize('admin'), getBookings);

module.exports = router;
