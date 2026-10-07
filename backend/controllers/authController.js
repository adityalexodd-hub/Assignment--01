const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const authService = require('../services/authService');

/** /api/auth — controllers only translate HTTP <-> service calls. */

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.registerUser(req.body);
  return sendSuccess(res, 201, 'Account created successfully', { user, token });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.loginUser(req.body);
  return sendSuccess(res, 200, `Welcome back, ${user.name.split(' ')[0]}`, { user, token });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id);
  return sendSuccess(res, 200, 'Current user loaded', { user });
});

// PATCH /api/auth/password
const changePassword = asyncHandler(async (req, res) => {
  await authService.changeOwnPassword(req.user._id, req.body);
  return sendSuccess(res, 200, 'Password updated successfully', null);
});

module.exports = { register, login, getMe, changePassword };
