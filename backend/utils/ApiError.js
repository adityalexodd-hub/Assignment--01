/**
 * Operational error type. Anything thrown as an ApiError is considered a
 * predictable, client-safe error and is passed to the error middleware with
 * its own status code. Unknown errors become 500s with no internals leaked.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Invalid request', errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists', errors = []) {
    return new ApiError(409, message, errors);
  }

  static unprocessable(message = 'Validation failed', errors = []) {
    return new ApiError(422, message, errors);
  }
}

module.exports = ApiError;
