const User = require('../models/User');
const AccessRequest = require('../models/AccessRequest');
const ApiError = require('../utils/ApiError');
const { parsePagination, parseSort, escapesRegex, buildPaginationMeta } = require('../utils/pagination');
const { record } = require('./auditService');
const { createNotification } = require('./notificationService');
const {
  ROLES,
  ROLE_VALUES,
  AUDIT_ACTION,
  ENTITY_TYPE,
  NOTIFICATION_TYPE,
  DEPARTMENTS,
} = require('../utils/constants');

/**
 * userService — directory management, role changes and account activation.
 * Every mutation writes an audit record and notifies the affected user.
 */

const SORTABLE_FIELDS = ['name', 'email', 'department', 'role', 'createdAt', 'lastLoginAt'];

/** Directory listing available to managers and admins. */
const listUsers = async (query = {}, currentUser) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.role) {
    if (!ROLE_VALUES.includes(query.role)) throw ApiError.badRequest('Invalid role filter');
    filter.role = query.role;
  }

  if (query.department) {
    if (!DEPARTMENTS.includes(query.department)) throw ApiError.badRequest('Invalid department filter');
    filter.department = query.department;
  }

  // Managers only browse their own department unless an admin explicitly asks for all.
  if (query.isActive !== undefined && query.isActive !== '') {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }

  if (currentUser.role === ROLES.MANAGER && query.scope === 'team') {
    filter.$or = [{ department: currentUser.department }, { manager: currentUser._id }];
  }

  if (query.search) {
    const safe = escapesRegex(query.search.trim());
    filter.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
      { department: { $regex: safe, $options: 'i' } },
    ];
  }

  const sort = parseSort(query.sort, SORTABLE_FIELDS, { name: 1 });

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .populate('manager', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map((u) => ({ ...u, initials: initialsFrom(u.name) })),
    meta: buildPaginationMeta(total, page, limit),
  };
};

const getUserById = async (id, currentUser) => {
  const user = await User.findById(id).select('-password').populate('manager', 'name email');
  if (!user) throw ApiError.notFound('User not found');

  const isSelf = String(currentUser._id) === String(user._id);
  const isPrivileged = currentUser.role === ROLES.ADMIN;

  if (!isSelf && !isPrivileged) {
    throw ApiError.forbidden('You can only view your own profile');
  }

  const stats = await AccessRequest.aggregate([
    { $match: { employee: user._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  return {
    user: user.toJSON(),
    requestSummary: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
  };
};

/**
 * Profile update. An employee may edit their own non-security fields;
 * role, status and password are never settable from here.
 */
const updateUser = async (id, payload, currentUser, req) => {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  const isSelf = String(currentUser._id) === String(user._id);
  if (!isSelf && currentUser.role !== ROLES.ADMIN) {
    throw ApiError.forbidden('You can only update your own profile');
  }

  const editable = isSelf && currentUser.role !== ROLES.ADMIN
    ? ['name', 'jobTitle', 'avatar']
    : ['name', 'jobTitle', 'avatar', 'department'];

  const changes = {};
  editable.forEach((field) => {
    if (payload[field] !== undefined) {
      changes[field] = payload[field];
      user[field] = payload[field];
    }
  });

  if (!Object.keys(changes).length) {
    throw ApiError.badRequest('No editable fields were supplied');
  }

  await user.save();

  await record({
    user: currentUser._id,
    action: AUDIT_ACTION.USER_UPDATED,
    entityType: ENTITY_TYPE.USER,
    entityId: user._id,
    description: `Profile updated for ${user.email}`,
    metadata: { changes, ip: req?.ip, userAgent: req?.get?.('user-agent') },
  });

  return user.toJSON();
};

/**
 * Admin-only role change. Guards against an admin demoting themselves out of
 * the last admin seat, which would lock the system's administration out.
 */
const changeUserRole = async (id, role, currentUser, req) => {
  if (!ROLE_VALUES.includes(role)) {
    throw ApiError.badRequest('Role must be one of: employee, manager, admin');
  }

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  if (String(user._id) === String(currentUser._id) && role !== ROLES.ADMIN) {
    throw ApiError.badRequest('You cannot remove your own administrator role');
  }

  if (user.role === role) {
    throw ApiError.badRequest(`${user.name} already has the ${role} role`);
  }

  if (user.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
    const adminCount = await User.countDocuments({ role: ROLES.ADMIN, isActive: true });
    if (adminCount <= 1) {
      throw ApiError.badRequest('At least one active administrator must remain in the system');
    }
  }

  const previousRole = user.role;
  user.role = role;
  await user.save({ validateBeforeSave: false });

  await record({
    user: currentUser._id,
    action: AUDIT_ACTION.USER_ROLE_CHANGED,
    entityType: ENTITY_TYPE.USER,
    entityId: user._id,
    description: `Role changed for ${user.email}: ${previousRole} -> ${role}`,
    metadata: { previousRole, newRole: role, ip: req?.ip, userAgent: req?.get?.('user-agent') },
  });

  await createNotification({
    user: user._id,
    title: 'Your role has changed',
    message: `${currentUser.name} changed your role from ${previousRole} to ${role}. Sign in again to see your updated permissions.`,
    type: NOTIFICATION_TYPE.USER_ROLE_CHANGED,
  });

  return user.toJSON();
};

/** Admin-only activation toggle with a last-admin safeguard. */
const changeUserStatus = async (id, isActive, currentUser, req) => {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  if (String(user._id) === String(currentUser._id)) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }

  if (user.isActive === isActive) {
    throw ApiError.badRequest(`${user.name} is already ${isActive ? 'active' : 'inactive'}`);
  }

  if (!isActive && user.role === ROLES.ADMIN) {
    const adminCount = await User.countDocuments({ role: ROLES.ADMIN, isActive: true });
    if (adminCount <= 1) {
      throw ApiError.badRequest('At least one active administrator must remain in the system');
    }
  }

  user.isActive = isActive;
  await user.save({ validateBeforeSave: false });

  await record({
    user: currentUser._id,
    action: isActive ? AUDIT_ACTION.USER_ACTIVATED : AUDIT_ACTION.USER_DEACTIVATED,
    entityType: ENTITY_TYPE.USER,
    entityId: user._id,
    description: `Account ${isActive ? 'activated' : 'deactivated'} for ${user.email}`,
    metadata: { isActive, ip: req?.ip, userAgent: req?.get?.('user-agent') },
  });

  await createNotification({
    user: user._id,
    title: isActive ? 'Account reactivated' : 'Account deactivated',
    message: isActive
      ? 'Your account has been reactivated. You can submit and track access requests again.'
      : 'Your account has been deactivated by an administrator. You will not be able to sign in.',
    type: isActive ? NOTIFICATION_TYPE.USER_ACTIVATED : NOTIFICATION_TYPE.USER_DEACTIVATED,
  });

  return user.toJSON();
};

/** Admin-only: create a user directly (onboarding a new joiner). */
const createUser = async (payload, currentUser, req) => {
  const existing = await User.findOne({ email: payload.email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists', [
      { field: 'email', message: 'Email is already registered' },
    ]);
  }

  const user = await User.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    password: payload.password,
    department: payload.department,
    jobTitle: payload.jobTitle || '',
    role: payload.role || ROLES.EMPLOYEE,
    manager: payload.manager || null,
  });

  await record({
    user: currentUser._id,
    action: AUDIT_ACTION.USER_CREATED,
    entityType: ENTITY_TYPE.USER,
    entityId: user._id,
    description: `Account created for ${user.email} with role ${user.role}`,
    metadata: { createdBy: currentUser.email, role: user.role, ip: req?.ip },
  });

  return user.toJSON();
};

/** Lightweight picker data for manager dropdowns. */
const listReviewers = async () =>
  User.find({ isActive: true, role: { $in: [ROLES.MANAGER, ROLES.ADMIN] } })
    .select('name email role department')
    .sort({ name: 1 })
    .lean();

const initialsFrom = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

module.exports = {
  listUsers,
  getUserById,
  updateUser,
  changeUserRole,
  changeUserStatus,
  createUser,
  listReviewers,
};
