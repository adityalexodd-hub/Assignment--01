const mongoose = require('mongoose');
const AccessRequest = require('../models/AccessRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { ROLES, REQUEST_STATUS, SYSTEMS } = require('../utils/constants');
const { getRecentActivity } = require('./auditService');
const requestService = require('./requestService');

/**
 * dashboardService — every number on every dashboard is computed from MongoDB.
 * Nothing is hardcoded on the client.
 */

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

const countsFrom = (rows) => rows.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});

/** Monthly submission trend for the last `months` months (charts). */
const getMonthlyTrend = async (filter, months = 6) => {
  const from = new Date();
  from.setMonth(from.getMonth() - (months - 1));
  from.setDate(1);
  from.setHours(0, 0, 0, 0);

  const rows = await AccessRequest.aggregate([
    { $match: { ...filter, createdAt: { $gte: from } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        submitted: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.APPROVED] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.REJECTED] }, 1, 0] } },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const keyed = rows.reduce(
    (acc, r) => ({
      ...acc,
      [`${r._id.year}-${String(r._id.month).padStart(2, '0')}`]: {
        submitted: r.submitted,
        approved: r.approved,
        rejected: r.rejected,
      },
    }),
    {}
  );

  return Array.from({ length: months }).map((_, index) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (months - 1 - index));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short' });
    return {
      key,
      label,
      submitted: keyed[key]?.submitted || 0,
      approved: keyed[key]?.approved || 0,
      rejected: keyed[key]?.rejected || 0,
    };
  });
};

/** { system: n } breakdown for the "top systems" panel. */
const getSystemBreakdown = async (filter, limit = 6) => {
  const rows = await AccessRequest.aggregate([
    { $match: filter },
    { $group: { _id: '$system', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => ({ system: r._id, count: r.count }));
};

/** Average (createdAt -> approvedAt/rejectedAt) decision time in hours. */
const getAverageDecisionHours = async (filter) => {
  const [row] = await AccessRequest.aggregate([
    { $match: { ...filter, $or: [{ approvedAt: { $ne: null } }, { rejectedAt: { $ne: null } }] } },
    {
      $project: {
        decidedAt: { $ifNull: ['$approvedAt', '$rejectedAt'] },
        createdAt: 1,
      },
    },
    {
      $project: {
        hours: { $divide: [{ $subtract: ['$decidedAt', '$createdAt'] }, 36e5] },
      },
    },
    { $group: { _id: null, avgHours: { $avg: '$hours' } } },
  ]);

  return row ? Math.round(row.avgHours * 10) / 10 : 0;
};

const getPriorityBreakdown = async (filter) => {
  const rows = await AccessRequest.aggregate([
    { $match: filter },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);
  const counts = countsFrom(rows);
  return ['Low', 'Medium', 'High', 'Urgent'].map((p) => ({ priority: p, count: counts[p] || 0 }));
};

/* ------------------------------------------------------------------ *
 * Employee dashboard
 * ------------------------------------------------------------------ */

const getEmployeeDashboard = async (user) => {
  await requestService.expireOverdueRequests().catch(() => {});

  const scope = { employee: toObjectId(user._id) };

  const [statusRows, total, unreadNotifications, recentRequests, trend, systemBreakdown, priorityBreakdown] =
    await Promise.all([
      requestService.getStatusCounts(scope),
      AccessRequest.countDocuments(scope),
      Notification.countDocuments({ user: user._id, isRead: false }),
      AccessRequest.find(scope)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('approvedBy', 'name')
        .lean(),
      getMonthlyTrend(scope, 6),
      getSystemBreakdown(scope, 5),
      getPriorityBreakdown(scope),
    ]);

  const counts = countsFrom(statusRows);
  const approvedCount = counts[REQUEST_STATUS.APPROVED] || 0;
  const decided = approvedCount + (counts[REQUEST_STATUS.REJECTED] || 0);

  const [avgHours, pendingOverSla] = await Promise.all([
    getAverageDecisionHours(scope),
    AccessRequest.countDocuments({
      ...scope,
      status: REQUEST_STATUS.PENDING,
      createdAt: { $lte: new Date(Date.now() - 48 * 36e5) },
    }),
  ]);

  return {
    role: ROLES.EMPLOYEE,
    metrics: {
      totalRequests: total,
      pending: counts[REQUEST_STATUS.PENDING] || 0,
      approved: approvedCount,
      rejected: counts[REQUEST_STATUS.REJECTED] || 0,
      cancelled: counts[REQUEST_STATUS.CANCELLED] || 0,
      expired: counts[REQUEST_STATUS.EXPIRED] || 0,
      unreadNotifications,
      approvalRate: decided ? Math.round((approvedCount / decided) * 100) : 0,
      averageDecisionHours: avgHours,
      awaitingOver48h: pendingOverSla,
      activeAccess: await AccessRequest.countDocuments({
        ...scope,
        status: REQUEST_STATUS.APPROVED,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      }),
    },
    statusBreakdown: Object.values(REQUEST_STATUS).map((s) => ({ status: s, count: counts[s] || 0 })),
    priorityBreakdown,
    systemBreakdown,
    monthlyTrend: trend,
    recentRequests,
  };
};

/* ------------------------------------------------------------------ *
 * Manager dashboard
 * ------------------------------------------------------------------ */

const getManagerDashboard = async (user) => {
  await requestService.expireOverdueRequests().catch(() => {});

  const departmentScope = { department: user.department };
  const decidedByMe = { $or: [{ approvedBy: user._id }, { rejectedBy: user._id }] };

  const [statusRows, total, myDecisions, teamSize, recentRequests, trend, systemBreakdown, priorityBreakdown] =
    await Promise.all([
      requestService.getStatusCounts(departmentScope),
      AccessRequest.countDocuments(departmentScope),
      AccessRequest.aggregate([
        { $match: decidedByMe },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      User.countDocuments({ department: user.department, role: ROLES.EMPLOYEE, isActive: true }),
      // The reviewer's own submissions are excluded: separation of duties means
      // they can never decide on them, so surfacing them in the queue would be
      // misleading. This mirrors `scope=pending-review` on the list endpoint.
      AccessRequest.find({
        ...departmentScope,
        status: REQUEST_STATUS.PENDING,
        employee: { $ne: user._id },
      })
        .sort({ priorityWeight: -1, createdAt: 1 })
        .limit(6)
        .populate('employee', 'name email department')
        .select('+priorityWeight')
        .lean(),
      getMonthlyTrend(departmentScope, 6),
      getSystemBreakdown(departmentScope, 5),
      getPriorityBreakdown(departmentScope),
    ]);

  const counts = countsFrom(statusRows);
  const myCounts = countsFrom(myDecisions);
  const decided = (myCounts.approved || 0) + (myCounts.rejected || 0);

  const [avgHours, breaches, pendingReview] = await Promise.all([
    getAverageDecisionHours(departmentScope),
    AccessRequest.countDocuments({
      ...departmentScope,
      status: REQUEST_STATUS.PENDING,
      createdAt: { $lte: new Date(Date.now() - 48 * 36e5) },
    }),
    AccessRequest.countDocuments({
      ...departmentScope,
      status: REQUEST_STATUS.PENDING,
      employee: { $ne: user._id },
    }),
  ]);

  return {
    role: ROLES.MANAGER,
    department: user.department,
    metrics: {
      pendingReview,
      awaitingDecisionOver48h: breaches,
      approvedThisMonth: await AccessRequest.countDocuments({
        ...departmentScope,
        status: REQUEST_STATUS.APPROVED,
        approvedAt: { $gte: startOfMonth() },
      }),
      rejectedThisMonth: await AccessRequest.countDocuments({
        ...departmentScope,
        status: REQUEST_STATUS.REJECTED,
        rejectedAt: { $gte: startOfMonth() },
      }),
      teamSize,
      totalDepartmentRequests: total,
      decidedByMe: decided,
      myApprovalRate: decided ? Math.round(((myCounts.approved || 0) / decided) * 100) : 0,
      averageDecisionHours: avgHours,
      urgentOpen: await AccessRequest.countDocuments({
        ...departmentScope,
        status: REQUEST_STATUS.PENDING,
        priority: 'Urgent',
      }),
    },
    statusBreakdown: Object.values(REQUEST_STATUS).map((s) => ({ status: s, count: counts[s] || 0 })),
    priorityBreakdown,
    systemBreakdown,
    monthlyTrend: trend,
    reviewQueue: recentRequests,
  };
};

/* ------------------------------------------------------------------ *
 * Admin dashboard
 * ------------------------------------------------------------------ */

const getAdminDashboard = async () => {
  await requestService.expireOverdueRequests().catch(() => {});

  const [
    statusRows,
    totalRequests,
    userRows,
    totalUsers,
    recentRequests,
    trend,
    systemBreakdown,
    priorityBreakdown,
    recentActivity,
  ] = await Promise.all([
    requestService.getStatusCounts({}),
    AccessRequest.countDocuments({}),
    User.aggregate([{ $group: { _id: { role: '$role', isActive: '$isActive' }, count: { $sum: 1 } } }]),
    User.countDocuments({}),
    AccessRequest.find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('employee', 'name email department')
      .populate('approvedBy rejectedBy', 'name')
      .lean(),
    getMonthlyTrend({}, 6),
    getSystemBreakdown({}, 8),
    getPriorityBreakdown({}),
    getRecentActivity(8),
  ]);

  const counts = countsFrom(statusRows);
  const approved = counts[REQUEST_STATUS.APPROVED] || 0;
  const decided = approved + (counts[REQUEST_STATUS.REJECTED] || 0);
  const byRole = { employee: 0, manager: 0, admin: 0 };
  let activeUsers = 0;

  userRows.forEach((row) => {
    if (row._id.isActive) {
      byRole[row._id.role] = (byRole[row._id.role] || 0) + row.count;
      activeUsers += row.count;
    }
  });

  const [avgHours, departmentRows, activeSessions] = await Promise.all([
    getAverageDecisionHours({}),
    AccessRequest.aggregate([
      { $group: { _id: '$department', total: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.PENDING] }, 1, 0] } } } },
      { $sort: { total: -1 } },
    ]),
    User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 36e5) }, isActive: true }),
  ]);

  return {
    role: ROLES.ADMIN,
    metrics: {
      totalRequests,
      pending: counts[REQUEST_STATUS.PENDING] || 0,
      approved,
      rejected: counts[REQUEST_STATUS.REJECTED] || 0,
      cancelled: counts[REQUEST_STATUS.CANCELLED] || 0,
      expired: counts[REQUEST_STATUS.EXPIRED] || 0,
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      activeUsersLast30Days: activeSessions,
      managers: byRole.manager || 0,
      admins: byRole.admin || 0,
      employees: byRole.employee || 0,
      approvalRate: decided ? Math.round((approved / decided) * 100) : 0,
      averageDecisionHours: avgHours,
      privilegedSystemRequests: await AccessRequest.countDocuments({
        system: { $in: ['AWS', 'Database', 'VPN'] },
      }),
      departmentsCovered: departmentRows.length,
    },
    statusBreakdown: Object.values(REQUEST_STATUS).map((s) => ({ status: s, count: counts[s] || 0 })),
    priorityBreakdown,
    systemBreakdown,
    supportedSystems: SYSTEMS,
    monthlyTrend: trend,
    departmentBreakdown: departmentRows.map((r) => ({
      department: r._id || 'Unassigned',
      total: r.total,
      pending: r.pending,
    })),
    recentRequests,
    recentActivity,
  };
};

module.exports = { getEmployeeDashboard, getManagerDashboard, getAdminDashboard };
