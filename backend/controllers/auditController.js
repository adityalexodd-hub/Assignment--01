const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const auditService = require('../services/auditService');
const { AUDIT_ACTION_VALUES } = require('../utils/constants');

/** /api/audit-logs — administrator only (enforced in the route layer). */

// GET /api/audit-logs
const getAuditLogs = asyncHandler(async (req, res) => {
  const { logs, meta } = await auditService.listAuditLogs(req.query);
  return sendSuccess(res, 200, 'Audit logs loaded', { logs, actions: AUDIT_ACTION_VALUES }, meta);
});

module.exports = { getAuditLogs };
