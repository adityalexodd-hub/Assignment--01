const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const requestService = require('../services/requestService');
const {
  SYSTEMS,
  ACCESS_LEVELS,
  PRIORITY_VALUES,
  DURATION_VALUES,
  REQUEST_STATUS_VALUES,
} = require('../utils/constants');

/** /api/requests */

// GET /api/requests
const getRequests = asyncHandler(async (req, res) => {
  const { requests, meta } = await requestService.listRequests(req.query, req.user);
  return sendSuccess(res, 200, 'Access requests loaded', { requests }, meta);
});

// GET /api/requests/meta  (form dictionaries — kept server-side so the UI and API
// can never disagree about the allowed values)
const getRequestMeta = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, 'Request metadata loaded', {
    systems: SYSTEMS,
    accessLevels: ACCESS_LEVELS,
    priorities: PRIORITY_VALUES,
    durations: DURATION_VALUES,
    statuses: REQUEST_STATUS_VALUES,
  })
);

// GET /api/requests/:id
const getRequest = asyncHandler(async (req, res) => {
  const { request, permissions } = await requestService.getRequestById(req.params.id, req.user);
  return sendSuccess(res, 200, 'Access request loaded', { request, permissions });
});

// POST /api/requests
const createRequest = asyncHandler(async (req, res) => {
  const request = await requestService.createRequest(req.body, req.user, req);
  return sendSuccess(res, 201, `Access request ${request.requestNumber} submitted successfully`, { request });
});

// PATCH /api/requests/:id/cancel
const cancelRequest = asyncHandler(async (req, res) => {
  const request = await requestService.cancelRequest(req.params.id, req.user, req.body, req);
  return sendSuccess(res, 200, 'Access request cancelled successfully', { request });
});

// PATCH /api/requests/:id/approve
const approveRequest = asyncHandler(async (req, res) => {
  const request = await requestService.approveRequest(req.params.id, req.user, req.body, req);
  return sendSuccess(res, 200, 'Access request approved successfully', { request });
});

// PATCH /api/requests/:id/reject
const rejectRequest = asyncHandler(async (req, res) => {
  const request = await requestService.rejectRequest(req.params.id, req.user, req.body, req);
  return sendSuccess(res, 200, 'Access request rejected', { request });
});

module.exports = {
  getRequests,
  getRequestMeta,
  getRequest,
  createRequest,
  cancelRequest,
  approveRequest,
  rejectRequest,
};
