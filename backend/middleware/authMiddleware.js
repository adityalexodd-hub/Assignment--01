const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');

/**
 * protect — resolves the bearer token into `req.user`.
 *
 * The token is re-hydrated from MongoDB on every request (rather than trusting
 * the JWT payload) so that role changes and deactivations take effect
 * immediately instead of when the token happens to expire.
 */
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (!token || !/^Bearer$/i.test(scheme)) {
    throw ApiError.unauthorized('Authentication required. Provide a Bearer token.');
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    throw ApiError.unauthorized(expired ? 'Your session has expired. Please sign in again.' : 'Invalid authentication token');
  }

  const user = await User.findById(decoded.id).select('-password');

  if (!user) throw ApiError.unauthorized('The account linked to this session no longer exists');
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated. Contact your administrator.');

  req.user = user;
  return next();
});

module.exports = { protect };
