const { body } = require('express-validator');
const { DEPARTMENTS } = require('../utils/constants');

/** Validation chains for /api/auth. Field names match the React form inputs. */

const registerValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Work email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required')
    .isIn(DEPARTMENTS)
    .withMessage(`Department must be one of: ${DEPARTMENTS.join(', ')}`),
  body('jobTitle')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 })
    .withMessage('Job title cannot exceed 80 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('confirmPassword')
    .optional({ checkFalsy: true })
    .custom((value, { req }) => {
      if (value !== undefined && value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

const loginValidator = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8, max: 72 })
    .withMessage('New password must be at least 8 characters')
    .matches(/[A-Za-z]/)
    .withMessage('New password must contain at least one letter')
    .matches(/\d/)
    .withMessage('New password must contain at least one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) throw new Error('New password must differ from the current password');
      return true;
    }),
];

module.exports = { registerValidator, loginValidator, changePasswordValidator };
