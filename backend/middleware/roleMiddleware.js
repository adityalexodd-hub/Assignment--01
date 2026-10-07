const ApiError = require('../utils/ApiError');
const { ROLES } = require('../utils/constants');

/**
 * authorize('manager', 'admin') — role gate that runs after `protect`.
 *
 * Authorization is enforced here on the server. Hiding a button in React is a
 * usability detail, never a security control.
 */
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(
      ApiError.forbidden(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}. Your role is ${req.user.role}.`
      )
    );
  }

  return next();
};

/** Shorthand guards keep route files readable. */
const adminOnly = authorize(ROLES.ADMIN);
const managerOrAdmin = authorize(ROLES.MANAGER, ROLES.ADMIN);
const anyRole = authorize(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN);

module.exports = { authorize, adminOnly, managerOrAdmin, anyRole };
