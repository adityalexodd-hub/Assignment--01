const { body, query, param } = require('express-validator');
const { ROLE_VALUES, DEPARTMENTS } = require('../utils/constants');

/** Validation chains for /api/users. */

const listUsersValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('role').optional().isIn(ROLE_VALUES).withMessage(`role must be one of: ${ROLE_VALUES.join(', ')}`),
  query('department').optional().isIn(DEPARTMENTS).withMessage('Invalid department filter'),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false'),
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search term is too long'),
];

const updateUserValidator = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
  body('jobTitle').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Job title cannot exceed 80 characters'),
  body('department').optional().isIn(DEPARTMENTS).withMessage('Invalid department'),
  body('avatar').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).withMessage('Avatar URL is too long'),
  // Explicitly reject security-sensitive fields if a client tries to send them.
  body('role').not().exists().withMessage('Role cannot be changed through this endpoint'),
  body('password').not().exists().withMessage('Password cannot be changed through this endpoint'),
  body('isActive').not().exists().withMessage('Account status cannot be changed through this endpoint'),
];

const changeRoleValidator = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .isIn(ROLE_VALUES)
    .withMessage(`Role must be one of: ${ROLE_VALUES.join(', ')}`),
];

const changeStatusValidator = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('isActive').exists().withMessage('isActive is required').isBoolean().withMessage('isActive must be a boolean'),
];

const createUserValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
  body('email').trim().isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('department').isIn(DEPARTMENTS).withMessage(`Department must be one of: ${DEPARTMENTS.join(', ')}`),
  body('jobTitle').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Job title cannot exceed 80 characters'),
  body('role').optional().isIn(ROLE_VALUES).withMessage(`Role must be one of: ${ROLE_VALUES.join(', ')}`),
  body('manager').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid manager id'),
  body('password')
    .notEmpty()
    .withMessage('Temporary password is required')
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
];

module.exports = {
  listUsersValidator,
  updateUserValidator,
  changeRoleValidator,
  changeStatusValidator,
  createUserValidator,
};
