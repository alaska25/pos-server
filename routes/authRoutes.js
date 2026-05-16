const express   = require('express');
const router    = express.Router();
const User      = require('../models/User');
const crypto    = require('crypto');
const sendEmail = require('../utils/sendEmail');
const admin     = require('../config/firebaseAdmin');
const { register, login, getMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login',    login);
router.get('/me',        protect, getMe);
router.put('/password',  protect, changePassword);

// ─── Update Profile (name) ────────────────────────────────────────────────────
router.put('/profile', protect, async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim())
      return res.status(400).json({ success: false, message: 'Name is required' });

    if (name.trim().length > 60)
      return res.status(400).json({ success: false, message: 'Name too long' });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name: name.trim() },
      { returnDocument: 'after', runValidators: true }
    );

    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// ─── Upload Avatar (base64, stored in MongoDB) ────────────────────────────────
router.post('/avatar', protect, async (req, res, next) => {
  try {
    const { avatar } = req.body;

    if (!avatar)
      return res.status(400).json({ success: false, message: 'No image data provided' });

    if (!avatar.startsWith('data:image/'))
      return res.status(400).json({ success: false, message: 'Invalid image format' });

    // base64 length * 0.75 ≈ actual byte size
    if (avatar.length * 0.75 > 2 * 1024 * 1024)
      return res.status(413).json({ success: false, message: 'Image exceeds 2 MB limit' });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatarUrl: avatar },
      { returnDocument: 'after' }
    );

    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, avatarUrl: user.avatarUrl });
  } catch (err) {
    next(err);
  }
});

// ─── Remove Avatar ────────────────────────────────────────────────────────────
router.delete('/avatar', protect, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $unset: { avatarUrl: '' } });
    res.status(200).json({ success: true, avatarUrl: null });
  } catch (err) {
    next(err);
  }
});

// ─── Google Login ─────────────────────────────────────────────────────────────
router.post('/google', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken)
      return res.status(400).json({ success: false, message: 'ID token is required' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { email, name } = decoded;

    let user = await User.findOne({ email });
    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      user = await User.create({
        name:     name || email.split('@')[0],
        email,
        password: randomPassword,
        role:     'cashier',
        isActive: true,
      });
    }

    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account is deactivated' });

    await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    const token = user.getSignedToken();
    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('GOOGLE LOGIN ERROR:', err);
    if (err.code?.startsWith('auth/'))
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    next(err);
  }
});

// ─── Forgot Password ──────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return res.status(404).json({ success: false, message: 'No user with that email' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken  = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetUrl = `http://localhost:3000/password-reset/${resetToken}`;
    const message  = `Please click: \n\n ${resetUrl}`;

    try {
      await sendEmail({ email: user.email, subject: 'Password Reset Request', message });
      res.status(200).json({ success: true, message: 'Email sent' });
    } catch (err) {
      console.error('Email Error:', err.message);
      user.resetPasswordToken  = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (err) {
    next(err);
  }
});

// ─── Reset Password ───────────────────────────────────────────────────────────
router.put('/reset-password/:resetToken', async (req, res, next) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    user.password            = req.body.password;
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;