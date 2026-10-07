/**
 * Central domain constants.
 *
 * Every enum used by the schemas, validators and services is declared exactly
 * once here so models, validation and business logic can never drift apart.
 */

const ROLES = Object.freeze({
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  ADMIN: 'admin',
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

const REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

const REQUEST_STATUS_VALUES = Object.freeze(Object.values(REQUEST_STATUS));

/** Statuses from which a request can no longer be modified. */
const TERMINAL_STATUSES = Object.freeze([
  REQUEST_STATUS.APPROVED,
  REQUEST_STATUS.REJECTED,
  REQUEST_STATUS.CANCELLED,
  REQUEST_STATUS.EXPIRED,
]);

/**
 * Allowed status transitions. Enforced in requestService — never in the UI.
 * pending -> approved | rejected | cancelled | expired
 */
const STATUS_TRANSITIONS = Object.freeze({
  [REQUEST_STATUS.PENDING]: [
    REQUEST_STATUS.APPROVED,
    REQUEST_STATUS.REJECTED,
    REQUEST_STATUS.CANCELLED,
    REQUEST_STATUS.EXPIRED,
  ],
  [REQUEST_STATUS.APPROVED]: [REQUEST_STATUS.EXPIRED],
  [REQUEST_STATUS.REJECTED]: [],
  [REQUEST_STATUS.CANCELLED]: [],
  [REQUEST_STATUS.EXPIRED]: [],
});

const PRIORITY = Object.freeze({
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
});

const PRIORITY_VALUES = Object.freeze(Object.values(PRIORITY));

const ACCESS_LEVEL = Object.freeze({
  VIEWER: 'Viewer',
  MEMBER: 'Member',
  DEVELOPER: 'Developer',
  ADMIN: 'Admin',
  CUSTOM: 'Custom',
});

const ACCESS_LEVEL_VALUES = Object.freeze(Object.values(ACCESS_LEVEL));

const SYSTEMS = Object.freeze([
  'GitHub',
  'Jira',
  'Slack',
  'AWS',
  'VPN',
  'Google Workspace',
  'Database',
  'Internal Tool',
  'CRM',
  'Analytics Platform',
  'Other',
]);

/** Systems that are considered privileged and always require an admin decision. */
const PRIVILEGED_SYSTEMS = Object.freeze(['AWS', 'Database', 'VPN']);

const ACCESS_LEVELS = ACCESS_LEVEL_VALUES;

/**
 * Duration options. `days` is used to compute the expiry timestamp when a
 * request is approved; `null` means the access does not expire.
 */
const DURATIONS = Object.freeze([
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '180 days', days: 180 },
  { label: '1 year', days: 365 },
  { label: 'Permanent', days: null },
]);

const DURATION_VALUES = Object.freeze(DURATIONS.map((d) => d.label));

const DEPARTMENTS = Object.freeze([
  'Engineering',
  'IT Operations',
  'Data & Analytics',
  'Finance',
  'Human Resources',
  'Sales',
  'Marketing',
  'Customer Success',
]);

const NOTIFICATION_TYPE = Object.freeze({
  REQUEST_SUBMITTED: 'request_submitted',
  REQUEST_REVIEW_REQUIRED: 'request_review_required',
  REQUEST_APPROVED: 'request_approved',
  REQUEST_REJECTED: 'request_rejected',
  REQUEST_CANCELLED: 'request_cancelled',
  REQUEST_EXPIRED: 'request_expired',
  USER_ROLE_CHANGED: 'user_role_changed',
  USER_ACTIVATED: 'user_activated',
  USER_DEACTIVATED: 'user_deactivated',
  USER_CREATED: 'user_created',
});

const NOTIFICATION_TYPE_VALUES = Object.freeze(Object.values(NOTIFICATION_TYPE));

const AUDIT_ACTION = Object.freeze({
  REQUEST_CREATED: 'REQUEST_CREATED',
  REQUEST_APPROVED: 'REQUEST_APPROVED',
  REQUEST_REJECTED: 'REQUEST_REJECTED',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
  REQUEST_EXPIRED: 'REQUEST_EXPIRED',
  USER_CREATED: 'USER_CREATED',
  USER_LOGIN: 'USER_LOGIN',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_UPDATED: 'USER_UPDATED',
});

const AUDIT_ACTION_VALUES = Object.freeze(Object.values(AUDIT_ACTION));

const ENTITY_TYPE = Object.freeze({
  ACCESS_REQUEST: 'AccessRequest',
  USER: 'User',
});

module.exports = {
  ROLES,
  ROLE_VALUES,
  REQUEST_STATUS,
  REQUEST_STATUS_VALUES,
  TERMINAL_STATUSES,
  STATUS_TRANSITIONS,
  PRIORITY,
  PRIORITY_VALUES,
  ACCESS_LEVEL,
  ACCESS_LEVEL_VALUES,
  ACCESS_LEVELS,
  SYSTEMS,
  PRIVILEGED_SYSTEMS,
  DURATIONS,
  DURATION_VALUES,
  DEPARTMENTS,
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_VALUES,
  AUDIT_ACTION,
  AUDIT_ACTION_VALUES,
  ENTITY_TYPE,
};
