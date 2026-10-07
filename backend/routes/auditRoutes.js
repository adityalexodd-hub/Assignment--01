const express = require('express');
const auditController = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const { query } = require('express-validator');
const { runValidation } = require('../middleware/validationMiddleware');
const { AUDIT_ACTION_VALUES } = require('../utils/constants');

const router = express.Router();

/**
 * /api/audit-logs — administrator only.
 * Employees and managers never reach the unrestricted audit trail; the backend
 * enforces it here rather than hiding the menu item.
 */
router.get(
  '/',
  protect,
  adminOnly,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    query('action').optional().isIn(AUDIT_ACTION_VALUES).withMessage('Unknown audit action'),
    query('entityType').optional().isIn(['AccessRequest', 'User', 'System']).withMessage('Unknown entity type'),
    query('entityId').optional().isMongoId().withMessage('entityId must be a valid id'),
    query('userId').optional().isMongoId().withMessage('userId must be a valid id'),
    query('from').optional().isISO8601().withMessage('from must be a valid date'),
    query('to').optional().isISO8601().withMessage('to must be a valid date'),
    query('search').optional().trim().isLength({ max: 120 }).withMessage('Search term is too long'),
  ],
  runValidation,
  auditController.getAuditLogs
);

module.exports = router;
