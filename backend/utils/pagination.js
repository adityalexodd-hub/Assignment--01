/**
 * Query helpers shared by list endpoints (requests, users, audit logs).
 * Filtering / sorting / pagination are executed by MongoDB, never in the browser.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const parsePagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || DEFAULT_PAGE, 1);
  const rawLimit = parseInt(query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
};

/**
 * Converts `sort=-createdAt` style input into a Mongoose sort object.
 * Only whitelisted fields can be sorted to prevent index misuse.
 */
const parseSort = (sortRaw, allowedFields, fallback = { createdAt: -1 }) => {
  if (!sortRaw || typeof sortRaw !== 'string') return fallback;

  return sortRaw
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .reduce((acc, token) => {
      const direction = token.startsWith('-') ? -1 : 1;
      const field = token.replace(/^-/, '');
      if (allowedFields.includes(field)) acc[field] = direction;
      return acc;
    }, {});
};

const escapesRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Builds the `meta` block returned with every paginated response. */
const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.max(Math.ceil(total / limit), 1),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

module.exports = {
  parsePagination,
  parseSort,
  escapesRegex,
  buildPaginationMeta,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
