// controllers/admin/userManagementController.js — FlowPOS
const User              = require('../../models/User');
const { ROLE_RANK, ROLES } = require('../../models/User');

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 20, search } = req.query;

    const actorRank    = ROLE_RANK[req.user.role] ?? 0;
    const visibleRoles = ROLES.filter(r => (ROLE_RANK[r] ?? 0) < actorRank);

    // Prevent actor from filtering by a role they can't see
    if (role && !visibleRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Cannot filter by that role' });
    }

    const query = {};
    query.role = { $in: role ? [role] : visibleRoles };
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) query.$or = [
      { name:  new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data:    users,
      total,
      page:    Number(page),
      pages:   Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/users
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password and role are required' });
    }

    // Actor cannot create a user at or above their own rank
    const actorRank  = ROLE_RANK[req.user.role] ?? 0;
    const targetRank = ROLE_RANK[role]           ?? 0;
    if (targetRank >= actorRank) {
      return res.status(403).json({ success: false, message: 'Cannot create a user at or above your own role' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already in use' });

    // ✅ Pass plain password — pre-save hook handles hashing
    const user = await User.create({ name, email, password, role });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Email already in use' });
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message: msg });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/users/:id/role
exports.changeRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const actorRank  = ROLE_RANK[req.user.role] ?? 0;
    const targetRank = ROLE_RANK[role]           ?? 0;

    if (targetRank >= actorRank) {
      return res.status(403).json({ success: false, message: 'Cannot assign a role at or above your own' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if ((ROLE_RANK[user.role] ?? 0) >= actorRank) {
      return res.status(403).json({ success: false, message: 'Cannot modify a user at or above your own rank' });
    }

    user.role = role;
    await user.save();
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/users/:id/toggle
exports.toggleActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Prevent deactivating yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot deactivate your own account' });
    }

    const actorRank = ROLE_RANK[req.user.role] ?? 0;
    if ((ROLE_RANK[user.role] ?? 0) >= actorRank) {
      return res.status(403).json({ success: false, message: 'Cannot modify a user at or above your own rank' });
    }

    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, data: { id: user._id, isActive: user.isActive } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/users/:id/password
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const actorRank = ROLE_RANK[req.user.role] ?? 0;
    if ((ROLE_RANK[user.role] ?? 0) >= actorRank) {
      return res.status(403).json({ success: false, message: 'Cannot modify a user at or above your own rank' });
    }

    // ✅ Pass plain password — pre-save hook handles hashing
    user.password = password;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot delete your own account' });
    }

    const actorRank = ROLE_RANK[req.user.role] ?? 0;
    if ((ROLE_RANK[user.role] ?? 0) >= actorRank) {
      return res.status(403).json({ success: false, message: 'Cannot delete a user at or above your own rank' });
    }

    await user.deleteOne();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};