const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const ROLES     = ['superadmin', 'admin', 'supervisor', 'cashier'];
const ROLE_RANK = { superadmin: 4, admin: 3, supervisor: 2, cashier: 1 };

const userSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Name is required'],
      trim:      true,
      maxlength: [60, 'Name too long'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select:    false,
    },
    role: {
      type:    String,
      enum:    { values: ROLES, message: 'Invalid role: {VALUE}' },
      default: 'cashier',
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    // ── Avatar stored as base64 data URL ──────────────────────────────────────
    avatarUrl: {
      type:    String,
      default: null,
    },
    lastLogin: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* ── Indexes ── */
userSchema.index({ role: 1, isActive: 1 });

/* ── Hash password before save ── */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password          = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date();
});

/* ── Strip sensitive fields from JSON output ── */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordChangedAt;
  return obj;
};

/* ── Compare plain password to hash ── */
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

/* ── Alias so authController.js works without changes ── */
userSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

/* ── Generate signed JWT ── */
userSchema.methods.getSignedToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role, name: this.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/* ── Role rank helper ── */
userSchema.statics.getRoleRank = (role) => ROLE_RANK[role] ?? 0;

/* ── Find by email + validate password ── */
userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email, isActive: true }).select('+password');
  if (!user) throw new Error('Invalid credentials');
  const ok = await user.comparePassword(password);
  if (!ok)   throw new Error('Invalid credentials');
  return user;
};

module.exports           = mongoose.model('User', userSchema);
module.exports.ROLE_RANK = ROLE_RANK;
module.exports.ROLES     = ROLES;