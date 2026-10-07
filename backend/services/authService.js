const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { generateToken } = require('../utils/generateToken');
const { record } = require('./auditService');
const { AUDIT_ACTION, ENTITY_TYPE, ROLES } = require('../utils/constants');

/**
 * authService — registration, credential verification and identity lookup.
 * Password hashing happens in the User model (pre-save hook); this service
 * never sees or stores a plaintext password.
 */

const PUBLIC_FIELDS = 'name email department jobTitle role avatar isActive manager createdAt lastLoginAt';

/**
 * Self-registration is deliberately restricted to the `employee` role:
 * elevated roles can only be granted by an admin through PATCH /api/users/:id/role.
 * This prevents privilege escalation through the public sign-up form.
 */
const registerUser = async ({ name, email, department, jobTitle, password }) => {
  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    throw ApiError.conflict('An account with this email already exists', [
      { field: 'email', message: 'Email is already registered' },
    ]);
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    department,
    jobTitle: jobTitle || '',
    role: ROLES.EMPLOYEE,
  });

  await record({
    user: user._id,
    action: AUDIT_ACTION.USER_CREATED,
    entityType: ENTITY_TYPE.USER,
    entityId: user._id,
    description: `Account self-registered for ${user.email}`,
    metadata: { source: 'self-registration', department: user.department, role: user.role },
  });

  const token = generateToken(user._id, user.role);
  return { user: user.toJSON(), token };
};

/**
 * Verifies credentials, rejects deactivated accounts and stamps lastLoginAt.
 */
const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  // Same message for "no such user" and "wrong password" to avoid user enumeration.
  if (!user || !(await user.matchPassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Contact your administrator.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  await record({
    user: user._id,
    action: AUDIT_ACTION.USER_LOGIN,
    entityType: ENTITY_TYPE.USER,
    entityId: user._id,
    description: `${user.name} signed in`,
    metadata: { role: user.role },
  });

  const token = generateToken(user._id, user.role);
  return { user: user.toJSON(), token };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).select(PUBLIC_FIELDS).populate('manager', 'name email');

  if (!user) {
    throw ApiError.notFound('User account no longer exists');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Contact your administrator.');
  }

  return user;
};

const changeOwnPassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  const matches = await user.matchPassword(currentPassword);
  if (!matches) throw ApiError.badRequest('Current password is incorrect');

  user.password = newPassword;
  await user.save();

  await record({
    user: user._id,
    action: AUDIT_ACTION.USER_UPDATED,
    entityType: ENTITY_TYPE.USER,
    entityId: user._id,
    description: `${user.name} changed their password`,
    metadata: {},
  });

  return { id: user._id };
};

module.exports = { registerUser, loginUser, getCurrentUser, changeOwnPassword };
