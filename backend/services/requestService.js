const mongoose = require('mongoose');
const AccessRequest = require('../models/AccessRequest');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { parsePagination, parseSort, escapesRegex, buildPaginationMeta } = require('../utils/pagination');
const { record } = require('./auditService');
const { createNotification, notifyReviewers } = require('./notificationService');
const {
  ROLES,
  REQUEST_STATUS,
  PRIORITY,
  PRIVILEGED_SYSTEMS,
  AUDIT_ACTION,
  ENTITY_TYPE,
  NOTIFICATION_TYPE,
} = require('../utils/constants');

/**
 * requestService — all access-request business logic.
 *
 * Responsibilities:
 *  - request numbering
 *  - role/ownership based visibility (row level security in the service layer)
 *  - the state machine (pending -> approved | rejected | cancelled | expired)
 *  - side effects: notifications for the requester/reviewers + audit records
 *
 * Controllers only translate HTTP <-> service calls.
 */

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'priorityWeight', 'requestNumber', 'system', 'status'];
const SORT_ALIASES = { priority: 'priorityWeight' };

const EMPLOYEE_POPULATE = 'name email department jobTitle role';
const REVIEWER_POPULATE = 'name email role';

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

let lastSweepAt = 0;
const SWEEP_INTERVAL_MS = 60 * 1000;

/** Human readable sequence: REQ-2026-0007 */
const generateRequestNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;

  const last = await AccessRequest.findOne({ requestNumber: { $regex: `^${prefix}` } })
    .sort({ requestNumber: -1 })
    .select('requestNumber')
    .lean();

  const nextSequence = last ? parseInt(last.requestNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
};

/**
 * Row level security. Every read path funnels through here so a manager can
 * never see another department's requests and an employee never sees a peer's.
 */
const buildVisibilityFilter = (user) => {
  if (user.role === ROLES.ADMIN) return {};

  if (user.role === ROLES.MANAGER) {
    return {
      $or: [
        { department: user.department },
        { employee: user._id },
      ],
    };
  }

  return { employee: user._id };
};

const populateRequest = (query) =>
  query
    .populate('employee', EMPLOYEE_POPULATE)
    .populate('approvedBy', REVIEWER_POPULATE)
    .populate('rejectedBy', REVIEWER_POPULATE)
    .populate('cancelledBy', REVIEWER_POPULATE);

/**
 * Can `user` approve/reject this request?
 * Rules: must hold a reviewing role, may not review their own request,
 * a manager may only review their own department, and privileged systems
 * (AWS / Database / VPN) require an administrator.
 */
const evaluateReviewPermission = (request, user) => {
  if (![ROLES.MANAGER, ROLES.ADMIN].includes(user.role)) {
    return { allowed: false, reason: 'Only managers and administrators can review access requests' };
  }

  const employeeId = String(request.employee?._id || request.employee);

  if (employeeId === String(user._id)) {
    return { allowed: false, reason: 'You cannot review your own access request (separation of duties)' };
  }

  if (PRIVILEGED_SYSTEMS.includes(request.system) && user.role !== ROLES.ADMIN) {
    return {
      allowed: false,
      reason: `${request.system} is a privileged system and can only be approved by an administrator`,
    };
  }

  if (user.role === ROLES.MANAGER && request.department && request.department !== user.department) {
    return { allowed: false, reason: 'You can only review requests from your own department' };
  }

  return { allowed: true, reason: null };
};

const assertReviewPermission = (request, user) => {
  const { allowed, reason } = evaluateReviewPermission(request, user);
  if (!allowed) throw ApiError.forbidden(reason);
};

const loadRequestOrFail = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid request id');
  }

  const request = await populateRequest(AccessRequest.findById(id));

  if (!request) {
    throw ApiError.notFound('Access request not found');
  }

  return request;
};

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

/**
 * Paginated, filtered, searched list of requests.
 * Executes filtering/sorting/pagination in MongoDB (never in the browser).
 */
const listRequests = async (query = {}, currentUser, { forceScope = null } = {}) => {
  // Housekeeping: flip expired approvals to `expired` (throttled to once/minute).
  if (Date.now() - lastSweepAt > SWEEP_INTERVAL_MS) {
    lastSweepAt = Date.now();
    await expireOverdueRequests().catch((err) =>
      console.error(`[requestService] expiry sweep failed: ${err.message}`)
    );
  }

  const { page, limit, skip } = parsePagination(query);
  const filters = [buildVisibilityFilter(currentUser)];

  /**
   * `scope=pending-review` powers the manager queue: open items only, and
   * never the reviewer's own submissions.
   */
  const scope = forceScope || query.scope;
  if (scope === 'pending-review') {
    filters.push({ status: REQUEST_STATUS.PENDING, employee: { $ne: currentUser._id } });
    if (currentUser.role === ROLES.MANAGER) filters.push({ department: currentUser.department });
    // Privileged systems stay visible to managers (read-only) but admins own the decision.
  }

  if (scope === 'decisioned-by-me') {
    filters.push({ $or: [{ approvedBy: currentUser._id }, { rejectedBy: currentUser._id }] });
  }

  const csv = (value) => String(value).split(',').map((v) => v.trim()).filter(Boolean);

  if (query.status) {
    filters.push({ status: { $in: csv(query.status) } });
  }

  if (query.priority) {
    filters.push({ priority: { $in: csv(query.priority) } });
  }

  if (query.system) {
    filters.push({ system: { $in: csv(query.system) } });
  }

  if (query.accessLevel) {
    filters.push({ accessLevel: { $in: csv(query.accessLevel) } });
  }

  if (query.department && currentUser.role === ROLES.ADMIN) {
    filters.push({ department: query.department });
  }

  if (query.employee && [ROLES.MANAGER, ROLES.ADMIN].includes(currentUser.role)) {
    filters.push({ employee: query.employee });
  }

  if (query.from || query.to) {
    const range = {};
    if (query.from) range.$gte = new Date(query.from);
    if (query.to) {
      const to = new Date(query.to);
      to.setHours(23, 59, 59, 999);
      range.$lte = to;
    }
    filters.push({ createdAt: range });
  }

  if (query.search) {
    const safe = escapesRegex(query.search.trim());

    // Also allow searching by requester name/email by resolving matching users first.
    const matchedUsers = await User.find({
      $or: [{ name: { $regex: safe, $options: 'i' } }, { email: { $regex: safe, $options: 'i' } }],
    })
      .select('_id')
      .limit(50)
      .lean();

    filters.push({
      $or: [
        { requestNumber: { $regex: safe, $options: 'i' } },
        { system: { $regex: safe, $options: 'i' } },
        { businessJustification: { $regex: safe, $options: 'i' } },
        { employee: { $in: matchedUsers.map((u) => u._id) } },
      ],
    });
  }

  const filter = filters.length === 1 ? filters[0] : { $and: filters };

  const requestedSort = String(query.sort || '');
  const normalisedSort = SORT_ALIASES[requestedSort.replace(/^-/, '')];
  const sortInput = normalisedSort
    ? `${requestedSort.startsWith('-') ? '-' : ''}${normalisedSort}`
    : requestedSort;

  const sort = parseSort(sortInput, SORTABLE_FIELDS);

  const [requests, total] = await Promise.all([
    populateRequest(AccessRequest.find(filter))
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    AccessRequest.countDocuments(filter),
  ]);

  return { requests, meta: buildPaginationMeta(total, page, limit) };
};

/** Single request with ownership enforcement. */
const getRequestById = async (id, currentUser) => {
  const request = await loadRequestOrFail(id);

  const employeeId = String(request.employee?._id || request.employee);
  const isOwner = employeeId === String(currentUser._id);
  const isAdmin = currentUser.role === ROLES.ADMIN;
  const isSameDepartmentManager =
    currentUser.role === ROLES.MANAGER && request.department === currentUser.department;

  if (!isOwner && !isAdmin && !isSameDepartmentManager) {
    // 404 (not 403) so a manager cannot probe other departments' request ids.
    throw ApiError.notFound('Access request not found');
  }

  const review = evaluateReviewPermission(request, currentUser);

  return {
    request: request.toJSON(),
    permissions: {
      canCancel: isOwner && request.status === REQUEST_STATUS.PENDING,
      canReview: review.allowed,
      canDecideStatus: review.allowed && request.status === REQUEST_STATUS.PENDING,
      reviewBlockedReason: review.reason,
      isOwner,
    },
  };
};

/* ------------------------------------------------------------------ *
 * Writes
 * ------------------------------------------------------------------ */

/**
 * Employee submits a new access request.
 * Side effects: notification to reviewers + audit record.
 */
const createRequest = async (payload, currentUser, req) => {
  if (!currentUser.isActive) {
    throw ApiError.forbidden('Inactive accounts cannot raise access requests');
  }

  const data = {
    employee: currentUser._id,
    department: currentUser.department,
    system: payload.system,
    accessLevel: payload.accessLevel,
    accessLevelNote: payload.accessLevel === 'Custom' ? payload.accessLevelNote || '' : '',
    businessJustification: payload.businessJustification,
    duration: payload.duration,
    priority: payload.priority || PRIORITY.MEDIUM,
    status: REQUEST_STATUS.PENDING,
  };

  // Retry once in the (rare) event of a concurrent number collision.
  let request;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      request = await AccessRequest.create({ ...data, requestNumber: await generateRequestNumber() });
      break;
    } catch (error) {
      const isDuplicate = error.code === 11000;
      if (!isDuplicate || attempt === 1) throw error;
    }
  }

  await record({
    user: currentUser._id,
    action: AUDIT_ACTION.REQUEST_CREATED,
    entityType: ENTITY_TYPE.ACCESS_REQUEST,
    entityId: request._id,
    description: `${currentUser.name} created access request ${request.requestNumber} for ${request.system} (${request.accessLevel})`,
    metadata: {
      requestNumber: request.requestNumber,
      system: request.system,
      accessLevel: request.accessLevel,
      priority: request.priority,
      duration: request.duration,
      ip: req?.ip,
      userAgent: req?.get?.('user-agent'),
    },
  });

  await createNotification({
    user: currentUser._id,
    title: 'Access request submitted',
    message: `Your request ${request.requestNumber} for ${request.system} access was submitted and is awaiting review.`,
    type: NOTIFICATION_TYPE.REQUEST_SUBMITTED,
    relatedRequest: request._id,
  });

  await notifyReviewers({
    request,
    employee: currentUser,
    title: 'New access request awaiting review',
    message: `${currentUser.name} (${currentUser.department}) requested ${request.accessLevel} access to ${request.system}. Priority: ${request.priority}.`,
    type: NOTIFICATION_TYPE.REQUEST_REVIEW_REQUIRED,
  });

  return populateRequest(AccessRequest.findById(request._id));
};

/**
 * Manager/admin approves a pending request.
 * Sets approver, timestamp and computed expiry, then notifies + audits.
 */
const approveRequest = async (id, currentUser, payload = {}, req) => {
  const request = await loadRequestOrFail(id);

  assertReviewPermission(request, currentUser);

  if (!request.canTransitionTo(REQUEST_STATUS.APPROVED)) {
    throw ApiError.badRequest(
      `A ${request.status} request cannot be approved. Only pending requests can be approved.`
    );
  }

  request.status = REQUEST_STATUS.APPROVED;
  request.approvedBy = currentUser._id;
  request.approvedAt = new Date();
  request.expiresAt = request.calculateExpiryDate(request.approvedAt);
  await request.save();

  await record({
    user: currentUser._id,
    action: AUDIT_ACTION.REQUEST_APPROVED,
    entityType: ENTITY_TYPE.ACCESS_REQUEST,
    entityId: request._id,
    description: `${currentUser.name} approved ${request.requestNumber} (${request.system})`,
    metadata: {
      requestNumber: request.requestNumber,
      system: request.system,
      accessLevel: request.accessLevel,
      duration: request.duration,
      expiresAt: request.expiresAt,
      note: payload.note || '',
      ip: req?.ip,
      userAgent: req?.get?.('user-agent'),
    },
  });

  await createNotification({
    user: request.employee?._id || request.employee,
    title: 'Access request approved',
    message: `Your request ${request.requestNumber} for ${request.accessLevel} access to ${request.system} was approved by ${currentUser.name}.${
      request.expiresAt ? ` Access expires on ${request.expiresAt.toDateString()}.` : ''
    }`,
    type: NOTIFICATION_TYPE.REQUEST_APPROVED,
    relatedRequest: request._id,
  });

  return populateRequest(AccessRequest.findById(request._id));
};

/** Manager/admin rejects a pending request with a mandatory reason. */
const rejectRequest = async (id, currentUser, payload = {}, req) => {
  const reason = (payload.rejectionReason || '').trim();

  if (reason.length < 10) {
    throw ApiError.badRequest('A rejection reason of at least 10 characters is required', [
      { field: 'rejectionReason', message: 'A rejection reason of at least 10 characters is required' },
    ]);
  }

  const request = await loadRequestOrFail(id);

  assertReviewPermission(request, currentUser);

  if (!request.canTransitionTo(REQUEST_STATUS.REJECTED)) {
    throw ApiError.badRequest(
      `A ${request.status} request cannot be rejected. Only pending requests can be rejected.`
    );
  }

  request.status = REQUEST_STATUS.REJECTED;
  request.rejectedBy = currentUser._id;
  request.rejectedAt = new Date();
  request.rejectionReason = reason;
  await request.save();

  await record({
    user: currentUser._id,
    action: AUDIT_ACTION.REQUEST_REJECTED,
    entityType: ENTITY_TYPE.ACCESS_REQUEST,
    entityId: request._id,
    description: `${currentUser.name} rejected ${request.requestNumber} (${request.system})`,
    metadata: {
      requestNumber: request.requestNumber,
      system: request.system,
      rejectionReason: reason,
      ip: req?.ip,
      userAgent: req?.get?.('user-agent'),
    },
  });

  await createNotification({
    user: request.employee?._id || request.employee,
    title: 'Access request rejected',
    message: `Your request ${request.requestNumber} for ${request.system} was rejected by ${currentUser.name}. Reason: ${reason}`,
    type: NOTIFICATION_TYPE.REQUEST_REJECTED,
    relatedRequest: request._id,
  });

  return populateRequest(AccessRequest.findById(request._id));
};

/**
 * The requester (or an admin) cancels a pending request.
 * Any other state — including an already approved request — is refused.
 */
const cancelRequest = async (id, currentUser, payload = {}, req) => {
  const request = await loadRequestOrFail(id);
  const employeeId = String(request.employee?._id || request.employee);
  const isOwner = employeeId === String(currentUser._id);

  if (!isOwner && currentUser.role !== ROLES.ADMIN) {
    throw ApiError.forbidden('You can only cancel your own access requests');
  }

  if (!request.canTransitionTo(REQUEST_STATUS.CANCELLED)) {
    throw ApiError.badRequest(
      request.status === REQUEST_STATUS.PENDING
        ? 'This request cannot be cancelled'
        : `A ${request.status} request cannot be cancelled`
    );
  }

  request.status = REQUEST_STATUS.CANCELLED;
  request.cancelledBy = currentUser._id;
  request.cancelledAt = new Date();
  await request.save();

  await record({
    user: currentUser._id,
    action: AUDIT_ACTION.REQUEST_CANCELLED,
    entityType: ENTITY_TYPE.ACCESS_REQUEST,
    entityId: request._id,
    description: `${currentUser.name} cancelled ${request.requestNumber} (${request.system})`,
    metadata: {
      requestNumber: request.requestNumber,
      reason: payload.reason || '',
      cancelledByAdmin: !isOwner,
      ip: req?.ip,
      userAgent: req?.get?.('user-agent'),
    },
  });

  await createNotification({
    user: employeeId,
    title: 'Access request cancelled',
    message: `Request ${request.requestNumber} for ${request.system} was cancelled.`,
    type: NOTIFICATION_TYPE.REQUEST_CANCELLED,
    relatedRequest: request._id,
  });

  return populateRequest(AccessRequest.findById(request._id));
};

/**
 * Expiry sweep: approved requests whose `expiresAt` has passed move to
 * `expired`. Called (throttled) from list endpoints; also exposed on the
 * dashboard service for admins.
 */
const expireOverdueRequests = async () => {
  const due = await AccessRequest.find({
    status: REQUEST_STATUS.APPROVED,
    expiresAt: { $ne: null, $lte: new Date() },
  })
    .select('_id requestNumber system employee expiresAt')
    .lean();

  if (!due.length) return { expired: 0 };

  for (const item of due) {
    await AccessRequest.updateOne(
      { _id: item._id, status: REQUEST_STATUS.APPROVED },
      { $set: { status: REQUEST_STATUS.EXPIRED } }
    );

    await record({
      user: null,
      action: AUDIT_ACTION.REQUEST_EXPIRED,
      entityType: ENTITY_TYPE.ACCESS_REQUEST,
      entityId: item._id,
      description: `${item.requestNumber} (${item.system}) expired automatically`,
      metadata: { expiresAt: item.expiresAt, automated: true },
    });

    await createNotification({
      user: item.employee,
      title: 'Access expired',
      message: `Your approved access for ${item.system} (${item.requestNumber}) has expired. Submit a new request if you still need it.`,
      type: NOTIFICATION_TYPE.REQUEST_EXPIRED,
      relatedRequest: item._id,
    });
  }

  return { expired: due.length };
};

/** Aggregated counters used by the dashboards (single source of truth). */
const getStatusCounts = async (filter) =>
  AccessRequest.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

module.exports = {
  generateRequestNumber,
  buildVisibilityFilter,
  evaluateReviewPermission,
  listRequests,
  getRequestById,
  createRequest,
  approveRequest,
  rejectRequest,
  cancelRequest,
  expireOverdueRequests,
  getStatusCounts,
};
