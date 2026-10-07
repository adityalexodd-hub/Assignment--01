const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLE_VALUES, ROLES, DEPARTMENTS } = require('../utils/constants');

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[\w.+-]+@[\w-]+\.[\w.-]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned by default
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: {
        values: DEPARTMENTS,
        message: 'Invalid department',
      },
      trim: true,
    },
    /** Job title — used on the profile screen and the audit trail. */
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [80, 'Job title cannot exceed 80 characters'],
      default: '',
    },
    role: {
      type: String,
      enum: {
        values: ROLE_VALUES,
        message: 'Role must be one of: employee, manager, admin',
      },
      default: ROLES.EMPLOYEE,
      index: true,
    },
    /** Populated for employees/managers so "my team" queries are possible. */
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    avatar: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

/** Compound index backing manager/team and admin user listings. */
userSchema.index({ role: 1, isActive: 1, name: 1 });

/** Two-letter initials for the avatar chip in the UI. */
userSchema.virtual('initials').get(function initials() {
  if (!this.name) return '';
  return this.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
});

/** Hash the password whenever it is set or changed. */
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

/** Schema method used by authService. Passwords never leave the model in plaintext. */
userSchema.methods.matchPassword = function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/** Schema method used by userService when an admin resets a password. */
userSchema.methods.setPassword = async function setPassword(newPassword) {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(newPassword, salt);
  return this.password;
};

userSchema.methods.isAdmin = function isAdmin() {
  return this.role === ROLES.ADMIN;
};

userSchema.methods.isManager = function isManager() {
  return this.role === ROLES.MANAGER;
};

userSchema.methods.canReviewRequests = function canReviewRequests() {
  return this.role === ROLES.ADMIN || this.role === ROLES.MANAGER;
};

module.exports = mongoose.model('User', userSchema);
