/**
 * middleware/auth.js — FlowPOS
 *
 * Exports:
 *  protect          — verifies JWT, attaches req.user
 *  requireRole(...) — checks actor rank >= required rank
 *  requireSelf      — allows only the account owner OR a higher-rank user
 *  canManageTarget  — actor rank must be strictly > target rank
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { ROLE_RANK } = require('../models/User');

/* ── Attach user from JWT ── */
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const token   = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(payload.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Account not found or inactive' });
    }
    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid token';
    res.status(401).json({ success: false, message: msg });
  }
};

/* ── Require minimum role rank ── */
const requireRole = (...roles) => (req, res, next) => {
  const actorRank    = ROLE_RANK[req.user?.role] ?? 0;
  const requiredRank = Math.max(...roles.map(r => ROLE_RANK[r] ?? 0));
  if (actorRank < requiredRank) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  next();
};

/* ── Actor rank must be strictly higher than target's rank ── */
const canManageTarget = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    const actorRank  = ROLE_RANK[req.user.role]  ?? 0;
    const targetRank = ROLE_RANK[target.role]     ?? 0;

    if (actorRank <= targetRank) {
      return res.status(403).json({ success: false, message: 'You cannot manage a user at your own rank or above' });
    }

    req.targetUser = target;  // available in controller
    next();
  } catch (err) {
    next(err);
  }
};

/* ── Self or higher-rank ── */
const requireSelfOrHigher = async (req, res, next) => {
  if (req.user._id.toString() === req.params.id) return next();
  return canManageTarget(req, res, next);
};

module.exports = { protect, requireRole, canManageTarget, requireSelfOrHigher };