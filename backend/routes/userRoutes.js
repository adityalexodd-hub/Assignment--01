const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly, managerOrAdmin } = require('../middleware/roleMiddleware');
const { runValidation, sanitize } = require('../middleware/validationMiddleware');
const { writeLimiter } = require('../middleware/rateLimitMiddleware');
const {
  listUsersValidator,
  updateUserValidator,
  changeRoleValidator,
  changeStatusValidator,
  createUserValidator,
} = require('../validators/userValidator');

const router = express.Router();

router.use(protect);

/** /api/users — directory is manager/admin; mutations are admin-only. */

// GET /api/users — searchable, filterable, paginated directory
router.get('/', managerOrAdmin, listUsersValidator, runValidation, userController.getUsers);

// GET /api/users/reviewers — managers/admins + departments + roles (admin forms)
router.get('/reviewers', adminOnly, userController.getReviewers);

// POST /api/users — admin creates a joiner account
router.post(
  '/',
  adminOnly,
  writeLimiter,
  createUserValidator,
  runValidation,
  sanitize(['name', 'email', 'department', 'jobTitle', 'role', 'manager', 'password']),
  userController.createUser
);

// GET /api/users/:id — self or admin
router.get('/:id', userController.getUser);

// PATCH /api/users/:id — profile fields only (role/status/password rejected by the validator)
router.patch(
  '/:id',
  updateUserValidator,
  runValidation,
  sanitize(['name', 'jobTitle', 'department', 'avatar']),
  userController.updateUser
);

// PATCH /api/users/:id/role — admin only
router.patch(
  '/:id/role',
  adminOnly,
  writeLimiter,
  changeRoleValidator,
  runValidation,
  sanitize(['role']),
  userController.changeRole
);

// PATCH /api/users/:id/status — admin only (activate / deactivate)
router.patch(
  '/:id/status',
  adminOnly,
  writeLimiter,
  changeStatusValidator,
  runValidation,
  sanitize(['isActive']),
  userController.changeStatus
);

module.exports = router;
