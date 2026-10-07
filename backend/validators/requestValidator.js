const { body, query, param } = require('express-validator');
const {
  SYSTEMS,
  ACCESS_LEVEL_VALUES,
  PRIORITY_VALUES,
  DURATION_VALUES,
  REQUEST_STATUS_VALUES,
} = require('../utils/constants');

/** Validation chains for /api/requests. */

const mongoId = (name, location) =>
  location === 'param'
    ? param(name).isMongoId().withMessage('Invalid id supplied')
    : body(name).isMongoId().withMessage('Invalid id supplied');

const createRequestValidator = [
  body('system')
    .trim()
    .notEmpty()
    .withMessage('System is required')
    .isIn(SYSTEMS)
    .withMessage(`System must be one of: ${SYSTEMS.join(', ')}`),
  body('accessLevel')
    .trim()
    .notEmpty()
    .withMessage('Access level is required')
    .isIn(ACCESS_LEVEL_VALUES)
    .withMessage(`Access level must be one of: ${ACCESS_LEVEL_VALUES.join(', ')}`),
  body('accessLevelNote')
    .if(body('accessLevel').equals('Custom'))
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage('Describe the custom access level (3-120 characters)'),
  body('businessJustification')
    .trim()
    .notEmpty()
    .withMessage('Business justification is required')
    .isLength({ min: 20, max: 1000 })
    .withMessage('Business justification must be between 20 and 1000 characters'),
  body('duration')
    .trim()
    .notEmpty()
    .withMessage('Duration is required')
    .isIn(DURATION_VALUES)
    .withMessage(`Duration must be one of: ${DURATION_VALUES.join(', ')}`),
  body('priority')
    .optional()
    .trim()
    .isIn(PRIORITY_VALUES)
    .withMessage(`Priority must be one of: ${PRIORITY_VALUES.join(', ')}`),
];

const listRequestsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('status')
    .optional()
    .custom((value) => {
      const parts = String(value).split(',').map((v) => v.trim());
      const invalid = parts.filter((p) => !REQUEST_STATUS_VALUES.includes(p));
      if (invalid.length) throw new Error(`Invalid status filter: ${invalid.join(', ')}`);
      return true;
    }),
  query('priority')
    .optional()
    .custom((value) => {
      const parts = String(value).split(',').map((v) => v.trim());
      const invalid = parts.filter((p) => !PRIORITY_VALUES.includes(p));
      if (invalid.length) throw new Error(`Invalid priority filter: ${invalid.join(', ')}`);
      return true;
    }),
  query('system')
    .optional()
    .custom((value) => {
      const parts = String(value).split(',').map((v) => v.trim());
      const invalid = parts.filter((p) => !SYSTEMS.includes(p));
      if (invalid.length) throw new Error(`Invalid system filter: ${invalid.join(', ')}`);
      return true;
    }),
  query('from').optional().isISO8601().withMessage('from must be a valid date (YYYY-MM-DD)'),
  query('to').optional().isISO8601().withMessage('to must be a valid date (YYYY-MM-DD)'),
  query('employee').optional().isMongoId().withMessage('employee must be a valid id'),
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search term is too long'),
];

const approveRequestValidator = [
  mongoId('id', 'param'),
  body('note').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).withMessage('Note cannot exceed 300 characters'),
];

const rejectRequestValidator = [
  mongoId('id', 'param'),
  body('rejectionReason')
    .trim()
    .notEmpty()
    .withMessage('A rejection reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters'),
];

const cancelRequestValidator = [
  mongoId('id', 'param'),
  body('reason').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).withMessage('Reason cannot exceed 300 characters'),
];

const requestIdValidator = [mongoId('id', 'param')];

module.exports = {
  createRequestValidator,
  listRequestsValidator,
  approveRequestValidator,
  rejectRequestValidator,
  cancelRequestValidator,
  requestIdValidator,
};
