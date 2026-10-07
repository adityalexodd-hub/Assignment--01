const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { runValidation, sanitize } = require('../middleware/validationMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const {
  registerValidator,
  loginValidator,
  changePasswordValidator,
} = require('../validators/authValidator');

const router = express.Router();

/**
 * /api/auth
 * Public: register, login.  Protected: me, password.
 */
router.post(
  '/register',
  authLimiter,
  registerValidator,
  runValidation,
  sanitize(['name', 'email', 'department', 'jobTitle', 'password']),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  loginValidator,
  runValidation,
  sanitize(['email', 'password']),
  authController.login
);

router.get('/me', protect, authController.getMe);

router.patch(
  '/password',
  protect,
  changePasswordValidator,
  runValidation,
  sanitize(['currentPassword', 'newPassword']),
  authController.changePassword
);

module.exports = router;
