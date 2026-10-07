const AuditLog = require('../models/AuditLog');
const { parsePagination, parseSort, escapesRegex, buildPaginationMeta } = require('../utils/pagination');
const { AUDIT_ACTION_VALUES } = require('../utils/constants');

/**
 * auditService — single writer for the audit trail.
 *
 * Every workflow service calls `record()` instead of touching the AuditLog
 * model directly, which keeps the shape of audit records consistent.
 */

/**
 * Persist an audit record.
 * Deliberately non-throwing: a failed audit write must never break a workflow
 * that has already succeeded, but it is logged loudly.
 */
const record = async ({ user = null, action, entityType, entityId = null, description, metadata = {} }) => {
  try {
    if (!AUDIT_ACTION_VALUES.includes(action)) {
      throw new Error(`Unknown audit action: ${action}`);
    }
    return await AuditLog.create({
      user,
      action,
      entityType,
      entityId,
      description,
      metadata,
    });
  } catch (error) {
    console.error(`[audit] failed to record ${action}: ${error.message}`);
    return null;
  }
};

/** Convenience wrapper that also captures request context (ip / user agent). */
const recordFromRequest = (req, payload) =>
  record({
    ...payload,
    metadata: {
      ...(payload.metadata || {}),
      ip: req.ip,
      userAgent: req.get('user-agent') || null,
    },
  });

const SORTABLE_FIELDS = ['createdAt', 'action', 'entityType'];

/**
 * Paginated audit listing.
 * Admin-only endpoint. Optional filters: action, entityType, entityId, userId,
 * free-text search and a date range.
 */
const listAuditLogs = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.action) filter.action = query.action;
  if (query.entityType) filter.entityType = query.entityType;
  if (query.entityId) filter.entityId = query.entityId;
  if (query.userId) filter.user = query.userId;

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) {
      const to = new Date(query.to);
      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }

  if (query.search) {
    const safe = escapesRegex(query.search.trim());
    filter.$or = [
      { description: { $regex: safe, $options: 'i' } },
      { action: { $regex: safe, $options: 'i' } },
    ];
  }

  const sort = parseSort(query.sort, SORTABLE_FIELDS);

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email role department')
      .lean({ virtuals: true }),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, meta: buildPaginationMeta(total, page, limit) };
};

/** Latest N audit entries — used by the admin dashboard activity feed. */
const getRecentActivity = async (limit = 8) =>
  AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email role')
    .lean();

module.exports = { record, recordFromRequest, listAuditLogs, getRecentActivity };
