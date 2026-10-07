const rateLimit = require('express-rate-limit');

/**
 * Rate limiting.
 *  - authLimiter  : brute-force protection on login/register
 *  - apiLimiter   : broad abuse protection applied to the whole /api surface
 *  - writeLimiter : tighter budget for state-changing endpoints
 *
 * Disabled when NODE_ENV=test so automated checks are deterministic.
 */

/**
 * Rate limiting is skipped for automated checks only. `NODE_ENV=test` covers
 * unit/integration runs; `RATE_LIMIT_DISABLED=true` is provided so the
 * end-to-end smoke test (which signs in repeatedly) can run against a
 * development server. Both must never be set in production.
 */
const skipInTest = () =>
  process.env.NODE_ENV === 'test' || process.env.RATE_LIMIT_DISABLED === 'true';

const handler = (req, res) =>
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please slow down and try again shortly.',
    errors: [{ field: 'rateLimit', message: 'Rate limit exceeded' }],
  });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler,
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler,
});

module.exports = { authLimiter, apiLimiter, writeLimiter };
