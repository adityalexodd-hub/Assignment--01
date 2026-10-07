/**
 * apiSmokeTest.js — end-to-end verification of the running API.
 *
 *   Terminal 1: cd backend && npm run dev
 *   Terminal 2: cd backend && npm run smoke
 *
 * Exercises authentication, authorization, the request state machine,
 * notifications, audit logging and the dashboards against a real MongoDB.
 * Prints PASS / FAIL per check and exits non-zero on any failure.
 */
const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:5000';
const PASSWORD = 'Password123!';

let passed = 0;
let failed = 0;
const failures = [];

const check = (name, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  \u001b[32mPASS\u001b[0m  ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  \u001b[31mFAIL\u001b[0m  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const section = (title) => console.log(`\n\u001b[1m${title}\u001b[0m`);

const api = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { status: res.status, json };
};

const login = async (email) => {
  const { status, json } = await api('POST', '/api/auth/login', { body: { email, password: PASSWORD } });
  if (status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(json)}`);
  return json.data.token;
};

const run = async () => {
  console.log(`\nCorporate Access Request & Approval System — API smoke test`);
  console.log(`Target: ${BASE_URL}\n${'─'.repeat(64)}`);

  /* ---------------------------------------------------------------- */
  section('1. Health & authentication');

  const health = await api('GET', '/api/health');
  check('GET /api/health returns 200 and a connected database', health.status === 200 && health.json.data.database === 'connected');

  const employeeToken = await login('employee@example.com');
  const managerToken = await login('manager@example.com');
  const adminToken = await login('admin@example.com');
  check('Seeded employee / manager / admin accounts can sign in', !!(employeeToken && managerToken && adminToken));

  const badLogin = await api('POST', '/api/auth/login', { body: { email: 'employee@example.com', password: 'nope' } });
  check('Invalid credentials are rejected with 401', badLogin.status === 401);

  const noToken = await api('GET', '/api/requests');
  check('Protected route rejects a missing token with 401', noToken.status === 401);

  const badToken = await api('GET', '/api/requests', { token: 'not.a.jwt' });
  check('Protected route rejects a malformed token with 401', badToken.status === 401);

  const me = await api('GET', '/api/auth/me', { token: employeeToken });
  check('GET /api/auth/me resolves the current user', me.status === 200 && me.json.data.user.email === 'employee@example.com');
  check('Password hash is never returned by the API', !JSON.stringify(me.json).includes('$2a$') && !JSON.stringify(me.json).includes('"password"'));

  /* ---------------------------------------------------------------- */
  section('2. Access request creation & validation');

  const meta = await api('GET', '/api/requests/meta', { token: employeeToken });
  check('GET /api/requests/meta returns systems and access levels', meta.status === 200 && meta.json.data.systems.length === 11);

  const invalid = await api('POST', '/api/requests', {
    token: employeeToken,
    body: { system: 'GitHub', accessLevel: 'Developer', businessJustification: 'too short', duration: '30 days' },
  });
  check('Short business justification is rejected with 422', invalid.status === 422, `got ${invalid.status}`);
  check('Validation errors are returned per field', Array.isArray(invalid.json.errors) && invalid.json.errors[0].field === 'businessJustification');

  const badSystem = await api('POST', '/api/requests', {
    token: employeeToken,
    body: { system: 'MySQL', accessLevel: 'Developer', businessJustification: 'Trying to request an unsupported system value entirely.', duration: '30 days' },
  });
  check('Unsupported system value is rejected with 422', badSystem.status === 422);

  const created = await api('POST', '/api/requests', {
    token: employeeToken,
    body: {
      system: 'GitHub',
      accessLevel: 'Developer',
      businessJustification: 'Smoke test: need repository write access for the release automation workstream.',
      duration: '90 days',
      priority: 'High',
    },
  });
  const createdRequest = created.json?.data?.request;
  check('Employee can create a request (201)', created.status === 201);
  check('Request number is generated (REQ-YYYY-NNNN)', /^REQ-\d{4}-\d{4}$/.test(createdRequest?.requestNumber || ''), createdRequest?.requestNumber);
  check('New request starts in pending status', createdRequest?.status === 'pending');

  const massAssign = await api('POST', '/api/requests', {
    token: employeeToken,
    body: {
      system: 'Slack',
      accessLevel: 'Member',
      businessJustification: 'Smoke test: attempting to mass-assign workflow fields on creation.',
      duration: '30 days',
      status: 'approved',
      approvedBy: '000000000000000000000000',
    },
  });
  check('Mass assignment of status/approvedBy is ignored', massAssign.json?.data?.request?.status === 'pending');

  /* ---------------------------------------------------------------- */
  section('3. Ownership & separation of duties');

  const otherPeoplesRequest = (
    await api('GET', '/api/requests?status=pending&limit=50', { token: adminToken })
  ).json.data.requests.find((r) => r.employee.email !== 'employee@example.com');

  const crossRead = await api('GET', `/api/requests/${otherPeoplesRequest._id}`, { token: employeeToken });
  check('Employee cannot read another employee\'s request (404)', crossRead.status === 404, `got ${crossRead.status}`);

  const employeeApprove = await api('PATCH', `/api/requests/${createdRequest._id}/approve`, { token: employeeToken, body: {} });
  check('Employee cannot approve a request (403)', employeeApprove.status === 403, `got ${employeeApprove.status}`);

  const employeeReject = await api('PATCH', `/api/requests/${createdRequest._id}/reject`, {
    token: employeeToken,
    body: { rejectionReason: 'Attempting to reject as an employee' },
  });
  check('Employee cannot reject a request (403)', employeeReject.status === 403);

  const managerList = await api('GET', '/api/users', { token: managerToken });
  check('Manager can browse the user directory', managerList.status === 200);

  const employeeListUsers = await api('GET', '/api/users', { token: employeeToken });
  check('Employee cannot browse the user directory (403)', employeeListUsers.status === 403);

  const employeeAudit = await api('GET', '/api/audit-logs', { token: employeeToken });
  const managerAudit = await api('GET', '/api/audit-logs', { token: managerToken });
  check('Employee cannot read audit logs (403)', employeeAudit.status === 403);
  check('Manager cannot read the unrestricted audit trail (403)', managerAudit.status === 403);

  /* ---------------------------------------------------------------- */
  section('4. Manager approval workflow');

  const managerOwnRequest = await api('POST', '/api/requests', {
    token: managerToken,
    body: {
      system: 'Jira',
      accessLevel: 'Member',
      businessJustification: 'Smoke test: manager raising their own request to verify separation of duties.',
      duration: '30 days',
    },
  });
  const selfApprove = await api('PATCH', `/api/requests/${managerOwnRequest.json.data.request._id}/approve`, {
    token: managerToken,
    body: {},
  });
  check('A manager cannot approve their own request (403, separation of duties)', selfApprove.status === 403);

  const deptBreach = await api('GET', '/api/requests?status=pending&limit=50', { token: adminToken });
  const otherDeptRequest = deptBreach.json.data.requests.find((r) => r.department === 'Data & Analytics');
  const crossDeptApprove = await api('PATCH', `/api/requests/${otherDeptRequest._id}/approve`, { token: managerToken, body: {} });
  check('Manager cannot decide on another department\'s request (403)', crossDeptApprove.status === 403, `got ${crossDeptApprove.status}`);

  const privileged = deptBreach.json.data.requests.find((r) => r.department === 'Engineering' && r.system === 'AWS');
  const managerPrivileged = await api('PATCH', `/api/requests/${privileged._id}/approve`, { token: managerToken, body: {} });
  check('Manager cannot approve a privileged (AWS) request (403)', managerPrivileged.status === 403);

  const approved = await api('PATCH', `/api/requests/${createdRequest._id}/approve`, {
    token: managerToken,
    body: { note: 'Approved during smoke test' },
  });
  check('Manager approves a same-department request (200)', approved.status === 200, JSON.stringify(approved.json?.message));
  check('Approved request records approver and timestamp', !!approved.json?.data?.request?.approvedBy && !!approved.json?.data?.request?.approvedAt);
  check('Approved request computes an expiry date from its duration', !!approved.json?.data?.request?.expiresAt);

  const doubleApprove = await api('PATCH', `/api/requests/${createdRequest._id}/approve`, { token: managerToken, body: {} });
  check('An already approved request cannot be approved again (400)', doubleApprove.status === 400, `got ${doubleApprove.status}`);

  const cancelApproved = await api('PATCH', `/api/requests/${createdRequest._id}/cancel`, { token: employeeToken, body: {} });
  check('An approved request cannot be cancelled by the employee (400)', cancelApproved.status === 400);

  /* ---------------------------------------------------------------- */
  section('5. Rejection workflow');

  const toReject = await api('POST', '/api/requests', {
    token: employeeToken,
    body: {
      system: 'Internal Tool',
      accessLevel: 'Custom',
      accessLevelNote: 'Read-only finance reporting widgets',
      businessJustification: 'Smoke test: temporary dashboard access while the migration is being validated.',
      duration: '7 days',
      priority: 'Low',
    },
  });
  const rejectId = toReject.json.data.request._id;

  const shortReason = await api('PATCH', `/api/requests/${rejectId}/reject`, { token: managerToken, body: { rejectionReason: 'no' } });
  check('Rejection without a substantive reason is rejected (422)', shortReason.status === 422);

  const rejected = await api('PATCH', `/api/requests/${rejectId}/reject`, {
    token: managerToken,
    body: { rejectionReason: 'Access is already covered by the existing finance reporting group membership.' },
  });
  check('Manager rejects a pending request (200)', rejected.status === 200);
  check('Rejected request stores the reason and reviewer', !!rejected.json?.data?.request?.rejectionReason && !!rejected.json?.data?.request?.rejectedBy);

  const managerTriesToCancelRejected = await api('PATCH', `/api/requests/${rejectId}/cancel`, { token: managerToken, body: {} });
  check('Someone else\'s request cannot be cancelled by a manager (403)', managerTriesToCancelRejected.status === 403);

  /* ---------------------------------------------------------------- */
  section('6. Cancellation workflow');

  const toCancel = await api('POST', '/api/requests', {
    token: employeeToken,
    body: {
      system: 'Slack',
      accessLevel: 'Member',
      businessJustification: 'Smoke test: request raised purely to be cancelled by its owner immediately.',
      duration: '30 days',
    },
  });
  const cancelId = toCancel.json.data.request._id;
  const cancelled = await api('PATCH', `/api/requests/${cancelId}/cancel`, { token: employeeToken, body: { reason: 'Requirement removed' } });
  check('Employee can cancel their own pending request (200)', cancelled.status === 200);
  check('Cancelled request is marked cancelled', cancelled.json?.data?.request?.status === 'cancelled');

  const cancelTwice = await api('PATCH', `/api/requests/${cancelId}/cancel`, { token: employeeToken, body: {} });
  check('A cancelled request cannot be cancelled again (400)', cancelTwice.status === 400);

  /* ---------------------------------------------------------------- */
  section('7. Admin capabilities');

  const adminList = await api('GET', '/api/requests?limit=100', { token: adminToken });
  check('Admin sees every request in the system', adminList.status === 200 && adminList.json.meta.total >= 26);

  const pendingAws = adminList.json.data.requests.find((r) => r.system === 'AWS' && r.status === 'pending');
  const adminApprovesPrivileged = await api('PATCH', `/api/requests/${pendingAws._id}/approve`, { token: adminToken, body: {} });
  check('Admin can approve a privileged AWS request (200)', adminApprovesPrivileged.status === 200);

  const targetUser = adminList.json.data.requests.find((r) => r.employee.email === 'priya.nair@example.com').employee;
  const roleChange = await api('PATCH', `/api/users/${targetUser._id}/role`, { token: adminToken, body: { role: 'manager' } });
  check('Admin can change a user role (200)', roleChange.status === 200 && roleChange.json.data.user.role === 'manager');
  const roleRevert = await api('PATCH', `/api/users/${targetUser._id}/role`, { token: adminToken, body: { role: 'employee' } });
  check('Admin can revert the role change', roleRevert.json?.data?.user?.role === 'employee');

  const adminSelf = (await api('GET', '/api/auth/me', { token: adminToken })).json.data.user;
  const selfDemote = await api('PATCH', `/api/users/${adminSelf._id}/role`, { token: adminToken, body: { role: 'employee' } });
  check('Admin cannot demote themselves (400)', selfDemote.status === 400);

  const selfDeactivate = await api('PATCH', `/api/users/${adminSelf._id}/status`, { token: adminToken, body: { isActive: false } });
  check('Admin cannot deactivate their own account (400)', selfDeactivate.status === 400);

  const deactivate = await api('PATCH', `/api/users/${targetUser._id}/status`, { token: adminToken, body: { isActive: false } });
  check('Admin can deactivate a user (200)', deactivate.status === 200 && deactivate.json.data.user.isActive === false);
  const reactivate = await api('PATCH', `/api/users/${targetUser._id}/status`, { token: adminToken, body: { isActive: true } });
  check('Admin can reactivate a user (200)', reactivate.json?.data?.user?.isActive === true);

  const managerRoleChange = await api('PATCH', `/api/users/${targetUser._id}/role`, { token: managerToken, body: { role: 'admin' } });
  check('Manager cannot change roles (403)', managerRoleChange.status === 403);

  const createUser = await api('POST', '/api/users', {
    token: adminToken,
    body: { name: 'Smoke Test Joiner', email: 'smoke.joiner@example.com', department: 'Finance', jobTitle: 'Analyst', role: 'employee', password: 'Password123!' },
  });
  check('Admin can onboard a new user (201)', createUser.status === 201);
  const duplicateUser = await api('POST', '/api/users', {
    token: adminToken,
    body: { name: 'Smoke Test Joiner', email: 'smoke.joiner@example.com', department: 'Finance', password: 'Password123!' },
  });
  check('Duplicate email is rejected with 409', duplicateUser.status === 409);

  const deactivatedLogin = await api('POST', '/api/auth/login', { body: { email: 'ishaan.verma@example.com', password: PASSWORD } });
  check('Deactivated accounts cannot sign in (403)', deactivatedLogin.status === 403, `got ${deactivatedLogin.status}`);

  /* ---------------------------------------------------------------- */
  section('8. Notifications');

  const employeeNotifications = await api('GET', '/api/notifications', { token: employeeToken });
  check('Employee has persisted notifications', employeeNotifications.status === 200 && employeeNotifications.json.data.notifications.length > 0);
  check('Notification payload includes an unread count', typeof employeeNotifications.json.data.unreadCount === 'number');

  const managerSummary = await api('GET', '/api/notifications/summary', { token: managerToken });
  check('Manager received a "review required" notification', managerSummary.json.data.latest.some((n) => n.type === 'request_review_required'));

  const approvalNotification = employeeNotifications.json.data.notifications.find(
    (n) => n.relatedRequest?._id === createdRequest._id && n.type === 'request_approved'
  );
  check('Approval generated a notification for the requester', !!approvalNotification);

  const unread = employeeNotifications.json.data.notifications.find((n) => !n.isRead);
  if (unread) {
    const markRead = await api('PATCH', `/api/notifications/${unread._id}/read`, { token: employeeToken });
    check('A notification can be marked as read', markRead.status === 200 && markRead.json.data.notification.isRead === true);
  }

  const markAll = await api('PATCH', '/api/notifications/read-all', { token: employeeToken });
  check('All notifications can be marked as read', markAll.status === 200);
  const afterMarkAll = await api('GET', '/api/notifications/summary', { token: employeeToken });
  check('Unread count is zero after read-all', afterMarkAll.json.data.unreadCount === 0);

  const crossUserNotification = await api('PATCH', `/api/notifications/${managerSummary.json.data.latest[0]._id}/read`, { token: employeeToken });
  check('A user cannot mark another user\'s notification as read (404)', crossUserNotification.status === 404);

  /* ---------------------------------------------------------------- */
  section('9. Audit trail');

  const auditLogs = await api('GET', '/api/audit-logs?limit=100', { token: adminToken });
  const actions = auditLogs.json?.data?.logs?.map((l) => l.action) || [];
  check('Admin can read the audit trail', auditLogs.status === 200 && actions.length > 0);
  ['REQUEST_CREATED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_CANCELLED', 'USER_ROLE_CHANGED', 'USER_DEACTIVATED', 'USER_CREATED'].forEach((action) => {
    check(`Audit trail contains ${action}`, actions.includes(action));
  });
  check('Audit entries are attributable to a user', auditLogs.json.data.logs.every((l) => l.user === null || typeof l.user === 'object'));

  const auditForRequest = await api('GET', `/api/audit-logs?entityId=${createdRequest._id}`, { token: adminToken });
  const requestActions = auditForRequest.json.data.logs.map((l) => l.action);
  check('Audit trail can be filtered by entity id', requestActions.includes('REQUEST_CREATED') && requestActions.includes('REQUEST_APPROVED'));

  const filteredAudit = await api('GET', '/api/audit-logs?action=REQUEST_APPROVED', { token: adminToken });
  check('Audit trail can be filtered by action', filteredAudit.json.data.logs.every((l) => l.action === 'REQUEST_APPROVED'));

  /* ---------------------------------------------------------------- */
  section('10. Search, filtering, sorting & pagination');

  const paged = await api('GET', '/api/requests?page=2&limit=5', { token: adminToken });
  check('Pagination returns the requested page size in MongoDB', paged.json.data.requests.length <= 5 && paged.json.meta.page === 2);
  check('Pagination meta is complete', ['total', 'page', 'limit', 'totalPages', 'hasNextPage', 'hasPrevPage'].every((k) => k in paged.json.meta));

  const byStatus = await api('GET', '/api/requests?status=pending&limit=100', { token: adminToken });
  check('Status filter is honoured', byStatus.json.data.requests.every((r) => r.status === 'pending'));

  const multiStatus = await api('GET', '/api/requests?status=rejected,cancelled&limit=100', { token: adminToken });
  check('Multiple statuses can be filtered at once', multiStatus.json.data.requests.every((r) => ['rejected', 'cancelled'].includes(r.status)));

  const bySystem = await api('GET', '/api/requests?system=GitHub&limit=100', { token: adminToken });
  check('System filter is honoured', bySystem.json.data.requests.every((r) => r.system === 'GitHub'));

  const byPriority = await api('GET', '/api/requests?priority=Urgent&limit=100', { token: adminToken });
  check('Priority filter is honoured', byPriority.json.data.requests.every((r) => r.priority === 'Urgent'));

  const search = await api('GET', '/api/requests?search=VPN&limit=100', { token: adminToken });
  check('Free-text search matches system names', search.json.data.requests.length > 0 && search.json.data.requests.every((r) => JSON.stringify(r).includes('VPN')));

  const searchByName = await api('GET', '/api/requests?search=Priya&limit=100', { token: adminToken });
  check('Free-text search also matches the requester name', searchByName.json.data.requests.every((r) => r.employee.name.includes('Priya')));

  const sorted = await api('GET', '/api/requests?status=pending&sort=-priority&limit=100', { token: adminToken });
  const weights = { Low: 1, Medium: 2, High: 3, Urgent: 4 };
  const sortedOk = sorted.json.data.requests.every((r, i, arr) => i === 0 || weights[arr[i - 1].priority] >= weights[r.priority]);
  check('Sorting by priority puts Urgent first', sortedOk);

  const dateFiltered = await api('GET', `/api/requests?from=${new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10)}`, { token: adminToken });
  check('Date range filtering works', dateFiltered.status === 200 && dateFiltered.json.data.requests.length > 0);

  const managerQueue = await api('GET', '/api/requests?scope=pending-review&limit=100', { token: managerToken });
  check('Manager review queue excludes their own submissions', managerQueue.json.data.requests.every((r) => r.employee.email !== 'manager@example.com'));
  check('Manager review queue is limited to open items', managerQueue.json.data.requests.every((r) => r.status === 'pending'));

  const invalidFilter = await api('GET', '/api/requests?status=not-a-status', { token: adminToken });
  check('An invalid filter value returns 422', invalidFilter.status === 422);

  /* ---------------------------------------------------------------- */
  section('11. Dashboards');

  const employeeDash = await api('GET', '/api/dashboard/employee', { token: employeeToken });
  check('Employee dashboard returns aggregated metrics', employeeDash.status === 200 && employeeDash.json.data.metrics.totalRequests > 0);
  check('Employee dashboard includes a status breakdown and a trend', employeeDash.json.data.statusBreakdown.length === 5 && employeeDash.json.data.monthlyTrend.length === 6);

  const managerDash = await api('GET', '/api/dashboard/manager', { token: managerToken });
  check('Manager dashboard returns a review queue', managerDash.status === 200 && Array.isArray(managerDash.json.data.reviewQueue));
  check('Manager dashboard is scoped to their department', managerDash.json.data.department === 'Engineering');
  check('Manager metrics include an average decision time', typeof managerDash.json.data.metrics.averageDecisionHours === 'number');

  const adminDash = await api('GET', '/api/dashboard/admin', { token: adminToken });
  check('Admin dashboard returns system-wide metrics', adminDash.status === 200 && adminDash.json.data.metrics.totalUsers >= 10);
  check('Admin dashboard includes the recent audit activity feed', adminDash.json.data.recentActivity.length > 0);
  check('Admin dashboard includes department breakdown', adminDash.json.data.departmentBreakdown.length > 0);

  const managerAdminDash = await api('GET', '/api/dashboard/admin', { token: managerToken });
  check('Manager cannot open the admin dashboard (403)', managerAdminDash.status === 403);

  /* ---------------------------------------------------------------- */
  section('12. Malformed input & hardening');

  const badId = await api('GET', '/api/requests/not-an-id', { token: adminToken });
  check(
    'Malformed ObjectId is rejected with a field-level validation error',
    badId.status === 422 && badId.json.errors[0].field === 'id',
    `got ${badId.status}`
  );

  const unknownRoute = await api('GET', '/api/does-not-exist');
  check('Unknown route returns the standard 404 envelope', unknownRoute.status === 404 && unknownRoute.json.success === false);

  const injection = await api('POST', '/api/auth/login', { body: { email: { $ne: null }, password: { $ne: null } } });
  check('NoSQL operator injection in login is rejected', injection.status !== 200, `got ${injection.status}`);

  const stackLeak = await api('GET', '/api/requests?page=abc', { token: adminToken });
  check('Error responses do not leak stack traces', !JSON.stringify(stackLeak.json).includes('at Object.'));

  console.log(`\n${'─'.repeat(64)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed) console.log(`  Failures: ${failures.join(' | ')}`);
  console.log('');

  process.exit(failed ? 1 : 0);
};

run().catch((error) => {
  console.error(`\nSmoke test aborted: ${error.message}`);
  process.exit(1);
});
