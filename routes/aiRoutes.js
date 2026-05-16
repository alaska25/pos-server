const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  chat,
  insights,
  smartSearch,
  summary,
  getSessions,
  getSession,
  deleteSession,
} = require('../controllers/aiController');

router.post('/chat',            protect, chat);
router.post('/insights',        protect, insights);
router.post('/search',          protect, smartSearch);
router.get('/summary',          protect, summary);
router.get('/sessions',         protect, getSessions);
router.get('/sessions/:id',     protect, getSession);
router.delete('/sessions/:id',  protect, deleteSession);

module.exports = router;