const { validationResult, matchedData } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * runValidation — turns express-validator results into a 422 ApiError with a
 * field-level `errors` array that the React forms render inline.
 */
const runValidation = (req, res, next) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const errors = result.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return next(ApiError.unprocessable('Validation failed', errors));
  }

  return next();
};

/**
 * sanitize — copies only explicitly whitelisted, already-validated fields onto
 * `req.body`. Prevents mass-assignment of fields such as `role`, `status`,
 * `approvedBy` or `isActive` through a crafted payload.
 */
const sanitize = (allowedFields) => (req, res, next) => {
  const data = matchedData(req, { locations: ['body'], includeOptionals: true });
  const clean = {};

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) clean[field] = data[field];
  });

  req.body = clean;
  next();
};

/** Strips Mongo operators ($, .) from strings to defuse NoSQL operator injection. */
const stripOperators = (value) => {
  if (Array.isArray(value)) return value.map(stripOperators);
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, val]) => {
      if (key.startsWith('$') || key.includes('.')) return acc;
      acc[key] = stripOperators(val);
      return acc;
    }, {});
  }
  return value;
};

const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body = stripOperators(req.body);
  if (req.params && typeof req.params === 'object') req.params = stripOperators(req.params);
  next();
};

module.exports = { runValidation, sanitize, sanitizeInput };
