const User             = require('../models/User');
const Customer         = require('../models/Customer');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Helper: consistent user payload sent to the frontend ─────────────────────
const userPayload = (u) => ({
  id:        u._id,
  name:      u.name,
  email:     u.email,
  role:      u.role,
  avatarUrl: u.avatarUrl || null,
});

// @route  POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({
        success: false,
        message: 'Please provide first name, last name, email and password',
      });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({
        success: false,
        message: 'An account with that email already exists',
      });

    // Only allow 'customer' role from public registration.
    // Staff roles (admin, supervisor, technician, etc.) must be assigned via Admin Panel.
    const assignedRole = role === 'customer' ? 'customer' : 'customer';

    const user = await User.create({
      name:     `${firstName} ${lastName}`,
      email,
      password,
      role:     assignedRole,
    });

    // ── Auto-create Customer record for customer registrations ────────────
    // Links the Customer profile to this User login so the portal can
    // filter jobs/invoices by req.user._id → customerDoc._id.
    await Customer.create({
      userId:       user._id,
      name:         `${firstName} ${lastName}`,
      email:        user.email,
      customerType: 'homeowner',  // default; customer can update in their profile
      plan:         'None',       // no subscription yet; upgrades via Pricing page
      currency:     'PHP',
    });

    const token = user.getSignedToken();
    res.status(201).json({ success: true, token, user: userPayload(user) });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Please provide email and password' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account is deactivated' });

    await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    const token = user.getSignedToken();
    res.json({ success: true, token, user: userPayload(user) });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: userPayload(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  PUT /api/auth/password
exports.changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select('+password');
    const { currentPassword, newPassword } = req.body;

    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  POST /api/auth/google
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential)
      return res.status(400).json({ success: false, message: 'No Google credential provided' });

    const ticket = await client.verifyIdToken({
      idToken:  credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (user) {
      if (!user.isActive)
        return res.status(403).json({ success: false, message: 'Account is deactivated' });
    } else {
      // New Google user → create User + Customer record
      user = await User.create({
        name,
        email,
        password: `Google_${googleId}_${Math.random().toString(36).slice(-8)}`,
        role:     'customer',
      });

      // Auto-create Customer profile for Google sign-ups
      const alreadyExists = await Customer.findOne({ email });
      if (!alreadyExists) {
        await Customer.create({
          userId:       user._id,
          name:         user.name,
          email:        user.email,
          customerType: 'homeowner',
          plan:         'None',
          currency:     'PHP',
        });
      } else {
        // Link existing Customer record to the new User
        alreadyExists.userId = user._id;
        await alreadyExists.save();
      }
    }

    await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    const token = user.getSignedToken();
    res.json({ success: true, token, user: userPayload(user) });
  } catch (err) {
    console.error('GOOGLE LOGIN ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};