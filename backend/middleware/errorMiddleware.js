const ApiError = require('../utils/ApiError');
const { sendError } = require('../utils/apiResponse');

/**
 * Central error handler.
 *
 * Known error shapes are translated into the standard error envelope:
 *  - ApiError          -> its own status code and messages
 *  - Mongoose CastError-> 400 with the offending field
 *  - Mongoose ValidationError -> 422 with per-field messages
 *  - duplicate key     -> 409
 *  - JWT errors        -> 401
 *
 * Stack traces are never sent to the client outside of development.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
    errors = [{ field: err.path, message: `Invalid value "${err.value}"` }];
  }

  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with that ${field} already exists`;
    errors = [{ field, message: `${field} must be unique` }];
  }

  if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid or expired authentication token';
  }

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} -> ${err.stack || err.message}`);
  }

  const isDev = process.env.NODE_ENV !== 'production';
  const stack = isDev && statusCode >= 500 ? [err.stack] : [];

  return sendError(res, statusCode, statusCode >= 500 && isDev === false ? 'Internal server error' : message, [...errors, ...stack].slice(0, 25));
};

module.exports = errorHandler;
