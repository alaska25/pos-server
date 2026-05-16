/**
 * routes/admin/users.js — FlowPOS
 *
 * All routes protected by JWT + role hierarchy.
 *
 * GET    /admin/users              — list all users (admin+)
 * POST   /users                    — create user (admin+, role must be below actor)
 * PATCH  /admin/users/:id/role     — change role (canManageTarget)
 * PATCH  /admin/users/:id/toggle   — activate/deactivate (canManageTarget)
 * PATCH  /admin/users/:id/password — reset password (canManageTarget)
 * DELETE /admin/users/:id          — hard delete (canManageTarget)
 */

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const User    = require('../../models/User');
const { ROLE_RANK, ROLES } = require('../../models/User');
const { protect, requireRole, canManageTarget } = require('../../middleware/auth');

/* ── Shared response shape ── */
const ok  = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });
const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

/* ── GET /admin/users ── */
router.get(
  '/admin/users',
  protect,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      // Actors only see users with rank < theirs
      const actorRank = ROLE_RANK[req.user.role] ?? 0;
      const visibleRoles = ROLES.filter(r => (ROLE_RANK[r] ?? 0) < actorRank);

      const users = await User.find({ role: { $in: visibleRoles } })
        .sort({ createdAt: -1 })
        .lean();

      ok(res, users);
    } catch (err) { next(err); }
  }
);

/* ── POST /users  (create staff) ── */
router.post(
  '/users',
  protect,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { name, email, password, role = 'cashier' } = req.body;

      // Validate required fields
      if (!name || !email || !password) {
        return fail(res, 'Name, email, and password are required');
      }

      // Actor cannot create someone at their rank or above
      const actorRank = ROLE_RANK[req.user.role] ?? 0;
      const newRank   = ROLE_RANK[role] ?? 0;
      if (newRank >= actorRank) {
        return fail(res, `You cannot create a user with role "${role}"`, 403);
      }

      // Duplicate email check
      const exists = await User.findOne({ email: email.toLowerCase().trim() });
      if (exists) return fail(res, 'An account with this email already exists');

      const user = await User.create({ name, email, password, role });
      ok(res, user, 'Staff member created', 201);
    } catch (err) {
      if (err.code === 11000) return fail(res, 'Email already in use');
      if (err.name === 'ValidationError') {
        const msg = Object.values(err.errors).map(e => e.message).join(', ');
        return fail(res, msg);
      }
      next(err);
    }
  }
);

/* ── PATCH /admin/users/:id/role ── */
router.patch(
  '/admin/users/:id/role',
  protect,
  requireRole('admin'),
  canManageTarget,
  async (req, res, next) => {
    try {
      const { role } = req.body;

      if (!ROLES.includes(role)) return fail(res, 'Invalid role');

      // Cannot promote target to rank >= actor's rank
      const actorRank  = ROLE_RANK[req.user.role] ?? 0;
      const newRank    = ROLE_RANK[role] ?? 0;
      if (newRank >= actorRank) {
        return fail(res, `You cannot assign the "${role}" role`, 403);
      }

      req.targetUser.role = role;
      await req.targetUser.save();
      ok(res, req.targetUser, 'Role updated');
    } catch (err) { next(err); }
  }
);

/* ── PATCH /admin/users/:id/toggle ── */
router.patch(
  '/admin/users/:id/toggle',
  protect,
  requireRole('admin'),
  canManageTarget,
  async (req, res, next) => {
    try {
      // Prevent deactivating yourself (belt + suspenders — frontend also blocks this)
      if (req.targetUser._id.toString() === req.user._id.toString()) {
        return fail(res, 'You cannot deactivate your own account', 403);
      }

      req.targetUser.isActive = !req.targetUser.isActive;
      await req.targetUser.save();

      const msg = req.targetUser.isActive ? 'Account activated' : 'Account deactivated';
      ok(res, req.targetUser, msg);
    } catch (err) { next(err); }
  }
);

/* ── PATCH /admin/users/:id/password ── */
router.patch(
  '/admin/users/:id/password',
  protect,
  requireRole('admin'),
  canManageTarget,
  async (req, res, next) => {
    try {
      const { password } = req.body;
      if (!password || password.length < 6) {
        return fail(res, 'Password must be at least 6 characters');
      }

      // Use .save() so pre-save bcrypt hook fires
      req.targetUser.password = password;
      await req.targetUser.save();
      ok(res, null, 'Password reset successfully');
    } catch (err) { next(err); }
  }
);

/* ── DELETE /admin/users/:id ── */
router.delete(
  '/admin/users/:id',
  protect,
  requireRole('admin'),
  canManageTarget,
  async (req, res, next) => {
    try {
      // Extra guard: superadmin accounts can only be deleted by superadmins
      if (req.targetUser.role === 'superadmin' && req.user.role !== 'superadmin') {
        return fail(res, 'Only a Super Admin can delete another Super Admin', 403);
      }

      await User.findByIdAndDelete(req.params.id);
      ok(res, null, 'User permanently deleted');
    } catch (err) { next(err); }
  }
);

module.exports = router;