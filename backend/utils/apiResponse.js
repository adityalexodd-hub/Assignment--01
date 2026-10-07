/**
 * Uniform API envelope.
 *
 *   success -> { success: true,  message, data }
 *   error   -> { success: false, message, errors: [] }
 */
const sendSuccess = (res, statusCode = 200, message = 'OK', data = null, meta = null) => {
  const payload = { success: true, message, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

const sendError = (res, statusCode = 500, message = 'Something went wrong', errors = []) =>
  res.status(statusCode).json({ success: false, message, errors });

module.exports = { sendSuccess, sendError };
