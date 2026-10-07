const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const userService = require('../services/userService');
const { DEPARTMENTS, ROLE_VALUES } = require('../utils/constants');

/** /api/users */

// GET /api/users
const getUsers = asyncHandler(async (req, res) => {
  const { users, meta } = await userService.listUsers(req.query, req.user);
  return sendSuccess(res, 200, 'Users loaded', { users }, meta);
});

// GET /api/users/reviewers — picker data for admin forms
const getReviewers = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, 'Reviewers loaded', {
    reviewers: await userService.listReviewers(),
    departments: DEPARTMENTS,
    roles: ROLE_VALUES,
  })
);

// GET /api/users/:id
const getUser = asyncHandler(async (req, res) => {
  const { user, requestSummary } = await userService.getUserById(req.params.id, req.user);
  return sendSuccess(res, 200, 'User loaded', { user, requestSummary });
});

// PATCH /api/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user, req);
  return sendSuccess(res, 200, 'Profile updated successfully', { user });
});

// PATCH /api/users/:id/role  (admin only)
const changeRole = asyncHandler(async (req, res) => {
  const user = await userService.changeUserRole(req.params.id, req.body.role, req.user, req);
  return sendSuccess(res, 200, `Role updated to ${user.role}`, { user });
});

// PATCH /api/users/:id/status  (admin only)
const changeStatus = asyncHandler(async (req, res) => {
  const user = await userService.changeUserStatus(req.params.id, req.body.isActive, req.user, req);
  return sendSuccess(res, 200, `Account ${user.isActive ? 'activated' : 'deactivated'} successfully`, { user });
});

// POST /api/users  (admin only)
const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user, req);
  return sendSuccess(res, 201, `Account created for ${user.email}`, { user });
});

module.exports = { getUsers, getReviewers, getUser, updateUser, changeRole, changeStatus, createUser };
