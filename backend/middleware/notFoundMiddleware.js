const { sendError } = require('../utils/apiResponse');

/**
 * 404 handler for unmatched routes. Registered after all routers, before the
 * error middleware, so `/api/unknown` returns the standard error envelope.
 */
const notFound = (req, res) =>
  sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`, [
    { field: 'route', message: 'The requested endpoint does not exist' },
  ]);

module.exports = notFound;
