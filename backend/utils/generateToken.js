const jwt = require('jsonwebtoken');

/**
 * Signs a short-lived JWT for an authenticated user.
 * The payload intentionally carries only non-sensitive identity claims.
 */
const generateToken = (userId, role, options = {}) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured. Set it in your .env file.');
  }

  return jwt.sign({ id: String(userId), role }, secret, {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || '8h',
    issuer: 'corporate-access-request-system',
  });
};

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return jwt.verify(token, secret);
};

module.exports = { generateToken, verifyToken };
