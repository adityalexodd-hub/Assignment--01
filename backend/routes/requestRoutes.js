const express = require('express');
const requestController = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { runValidation, sanitize } = require('../middleware/validationMiddleware');
const { writeLimiter } = require('../middleware/rateLimitMiddleware');
const {
  createRequestValidator,
  listRequestsValidator,
  approveRequestValidator,
  rejectRequestValidator,
  cancelRequestValidator,
  requestIdValidator,
} = require('../validators/requestValidator');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Every request route requires a valid session.
router.use(protect);

/**
 * /api/requests
 * Role-based visibility is applied inside requestService.buildVisibilityFilter,
 * so a manager only ever receives their department's rows and an employee only
 * their own — enforcement lives on the server, not in the UI.
 */

// GET /api/requests  — search, filter, sort, paginate (all executed in MongoDB)
router.get('/', listRequestsValidator, runValidation, requestController.getRequests);

// GET /api/requests/meta — dropdown dictionaries for the request form
router.get('/meta', requestController.getRequestMeta);

// POST /api/requests — employees, managers and admins may all raise requests
router.post(
  '/',
  writeLimiter,
  createRequestValidator,
  runValidation,
  sanitize([
    'system',
    'accessLevel',
    'accessLevelNote',
    'businessJustification',
    'duration',
    'priority',
  ]),
  requestController.createRequest
);

// GET /api/requests/:id — ownership / department / admin scoped
router.get('/:id', requestIdValidator, runValidation, requestController.getRequest);

// PATCH /api/requests/:id/cancel — requester or admin, pending requests only
router.patch(
  '/:id/cancel',
  writeLimiter,
  cancelRequestValidator,
  runValidation,
  sanitize(['reason']),
  requestController.cancelRequest
);

// PATCH /api/requests/:id/approve — manager/admin, pending requests only
router.patch(
  '/:id/approve',
  writeLimiter,
  authorize(ROLES.MANAGER, ROLES.ADMIN),
  approveRequestValidator,
  runValidation,
  sanitize(['note']),
  requestController.approveRequest
);

// PATCH /api/requests/:id/reject — manager/admin, reason mandatory
router.patch(
  '/:id/reject',
  writeLimiter,
  authorize(ROLES.MANAGER, ROLES.ADMIN),
  rejectRequestValidator,
  runValidation,
  sanitize(['rejectionReason']),
  requestController.rejectRequest
);

module.exports = router;
