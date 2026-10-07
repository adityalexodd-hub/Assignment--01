/**
 * Wraps async controllers so rejected promises reach the central error
 * middleware instead of producing an unhandled rejection.
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
