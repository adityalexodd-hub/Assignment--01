/**
 * seed.js — inserts a realistic demo dataset into MongoDB through Mongoose.
 *
 *   npm run seed          (idempotent: clears the collections it owns, then re-inserts)
 *   npm run seed:fresh    (same, but also drops the collections first)
 *
 * Every account uses the password: Password123!
 */
require('dotenv').config();

const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const AccessRequest = require('../models/AccessRequest');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const {
  ROLES,
  REQUEST_STATUS,
  NOTIFICATION_TYPE,
  AUDIT_ACTION,
  ENTITY_TYPE,
} = require('../utils/constants');

const DEMO_PASSWORD = 'Password123!';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const daysAgo = (days, hour = 10, minute = 20) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const line = (label = '') =>
  console.log(`  ${label}${label ? ' ' : ''}${'─'.repeat(Math.max(0, 58 - label.length))}`);

/**
 * Backdates a document's timestamps.
 *
 * Mongoose re-stamps `updatedAt` (and `createdAt` when the update omits them)
 * even when `{ timestamps: false }` is passed to `updateOne`, so the write goes
 * through the native collection to keep the seeded history historically accurate.
 */
const backdate = (Model, id, fields) => Model.collection.updateOne({ _id: id }, { $set: fields });

/* ------------------------------------------------------------------ */
/* 1. Users                                                            */
/* ------------------------------------------------------------------ */

const USERS = [
  {
    key: 'admin',
    name: 'Rohan Kapoor',
    email: 'admin@example.com',
    department: 'IT Operations',
    jobTitle: 'Head of Identity & Access Management',
    role: ROLES.ADMIN,
    createdDaysAgo: 540,
    lastLoginDaysAgo: 0,
  },
  {
    key: 'manager',
    name: 'Meera Iyer',
    email: 'manager@example.com',
    department: 'Engineering',
    jobTitle: 'Engineering Manager — Platform',
    role: ROLES.MANAGER,
    createdDaysAgo: 480,
    lastLoginDaysAgo: 0,
  },
  {
    key: 'employee',
    name: 'Aarav Sharma',
    email: 'employee@example.com',
    department: 'Engineering',
    jobTitle: 'Backend Engineer',
    role: ROLES.EMPLOYEE,
    managerKey: 'manager',
    createdDaysAgo: 300,
    lastLoginDaysAgo: 0,
  },
  {
    key: 'priya',
    name: 'Priya Nair',
    email: 'priya.nair@example.com',
    department: 'Engineering',
    jobTitle: 'Senior Frontend Engineer',
    role: ROLES.EMPLOYEE,
    managerKey: 'manager',
    createdDaysAgo: 400,
    lastLoginDaysAgo: 1,
  },
  {
    key: 'karan',
    name: 'Karan Mehta',
    email: 'karan.mehta@example.com',
    department: 'Engineering',
    jobTitle: 'Site Reliability Engineer',
    role: ROLES.EMPLOYEE,
    managerKey: 'manager',
    createdDaysAgo: 260,
    lastLoginDaysAgo: 2,
  },
  {
    key: 'sneha',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@example.com',
    department: 'Data & Analytics',
    jobTitle: 'Analytics Manager',
    role: ROLES.MANAGER,
    createdDaysAgo: 430,
    lastLoginDaysAgo: 1,
  },
  {
    key: 'daniel',
    name: 'Daniel Fernandes',
    email: 'daniel.fernandes@example.com',
    department: 'Data & Analytics',
    jobTitle: 'Data Engineer',
    role: ROLES.EMPLOYEE,
    managerKey: 'sneha',
    createdDaysAgo: 210,
    lastLoginDaysAgo: 3,
  },
  {
    key: 'ananya',
    name: 'Ananya Desai',
    email: 'ananya.desai@example.com',
    department: 'Finance',
    jobTitle: 'Financial Analyst',
    role: ROLES.EMPLOYEE,
    createdDaysAgo: 190,
    lastLoginDaysAgo: 4,
  },
  {
    key: 'vikram',
    name: 'Vikram Malhotra',
    email: 'vikram.malhotra@example.com',
    department: 'IT Operations',
    jobTitle: 'IT Operations Manager',
    role: ROLES.MANAGER,
    createdDaysAgo: 470,
    lastLoginDaysAgo: 1,
  },
  {
    key: 'ishaan',
    name: 'Ishaan Verma',
    email: 'ishaan.verma@example.com',
    department: 'Sales',
    jobTitle: 'Account Executive',
    role: ROLES.EMPLOYEE,
    createdDaysAgo: 150,
    lastLoginDaysAgo: 40,
    isActive: false,
  },
];

const seedUsers = async () => {
  const map = {};
  const created = [];

  for (const spec of USERS) {
    const user = await User.create({
      name: spec.name,
      email: spec.email,
      password: DEMO_PASSWORD,
      department: spec.department,
      jobTitle: spec.jobTitle,
      role: spec.role,
      isActive: spec.isActive === undefined ? true : spec.isActive,
      manager: spec.managerKey ? map[spec.managerKey]._id : null,
      lastLoginAt: daysAgo(spec.lastLoginDaysAgo, 9, 5),
    });

    await backdate(User, user._id, {
      createdAt: daysAgo(spec.createdDaysAgo),
      updatedAt: daysAgo(spec.createdDaysAgo),
      lastLoginAt: daysAgo(spec.lastLoginDaysAgo, 9, 5),
    });

    map[spec.key] = user;
    created.push(user);
  }

  // Second pass so managers point at the right people (e.g. Vikram over IT Ops reports to Rohan).
  await backdate(User, map.vikram._id, { manager: map.admin._id });

  return { map, created };
};

/* ------------------------------------------------------------------ */
/* 2. Access requests                                                  */
/* ------------------------------------------------------------------ */

/**
 * status      : the terminal/current state
 * submittedDaysAgo : when the employee raised it
 * decidedDaysAgo   : when it was approved/rejected/cancelled
 * decidedByKey     : who acted on it (must satisfy the department + privileged-system rules)
 */
const REQUESTS = [
  // ---- Aarav Sharma (demo employee, Engineering) ----
  {
    employeeKey: 'employee', system: 'GitHub', accessLevel: 'Developer', duration: '90 days', priority: 'High',
    justification: 'Need write access to the internal platform repositories to ship the billing service migration scheduled for next sprint.',
    status: REQUEST_STATUS.PENDING, submittedDaysAgo: 2,
  },
  {
    employeeKey: 'employee', system: 'AWS', accessLevel: 'Admin', duration: '30 days', priority: 'Urgent',
    justification: 'Production incident on-call rotation requires elevated console access to diagnose the EU-WEST-1 latency regression.',
    status: REQUEST_STATUS.PENDING, submittedDaysAgo: 1, hour: 8,
  },
  {
    employeeKey: 'employee', system: 'Jira', accessLevel: 'Member', duration: '1 year', priority: 'Medium',
    justification: 'Project tracking for the payments workstream; required to create and groom tickets in the PLAT board.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 16, decidedDaysAgo: 15, decidedByKey: 'manager',
  },
  {
    employeeKey: 'employee', system: 'Database', accessLevel: 'Viewer', duration: '30 days', priority: 'High',
    justification: 'Read-only access to the reporting replica to validate the nightly reconciliation figures with Finance.',
    status: REQUEST_STATUS.REJECTED, submittedDaysAgo: 24, decidedDaysAgo: 23, decidedByKey: 'admin',
    rejectionReason: 'Production database access requires a dedicated secure workstation. Please raise the request after the security training on 12 September.',
  },
  {
    employeeKey: 'employee', system: 'Slack', accessLevel: 'Member', duration: 'Permanent', priority: 'Low',
    justification: 'Permanent membership of the #platform-oncall and #release-coordination channels for incident communication.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 62, decidedDaysAgo: 61, decidedByKey: 'manager',
  },
  {
    employeeKey: 'employee', system: 'VPN', accessLevel: 'Member', duration: '90 days', priority: 'Medium',
    justification: 'Remote on-call support for the release window; corporate VPN profile required to reach staging infrastructure.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 30, decidedDaysAgo: 29, decidedByKey: 'admin',
  },
  {
    employeeKey: 'employee', system: 'Google Workspace', accessLevel: 'Member', duration: '30 days', priority: 'Low',
    justification: 'Shared mailbox and calendar access for the vendor management pilot running through the current quarter.',
    status: REQUEST_STATUS.CANCELLED, submittedDaysAgo: 11, decidedDaysAgo: 9,
  },
  {
    employeeKey: 'employee', system: 'Analytics Platform', accessLevel: 'Viewer', duration: '30 days', priority: 'Medium',
    justification: 'Query product usage funnels while drafting the retention section of the quarterly service review deck.',
    status: REQUEST_STATUS.EXPIRED, submittedDaysAgo: 90, decidedDaysAgo: 89, decidedByKey: 'manager', expiredDaysAgo: 59,
  },

  // ---- Priya Nair (Engineering) ----
  {
    employeeKey: 'priya', system: 'GitHub', accessLevel: 'Member', duration: '30 days', priority: 'Medium',
    justification: 'Contributing to the design-system repository as part of the accessibility remediation backlog.',
    status: REQUEST_STATUS.PENDING, submittedDaysAgo: 3, decidedByKey: 'manager',
  },
  {
    employeeKey: 'priya', system: 'CRM', accessLevel: 'Member', duration: '1 year', priority: 'Low',
    justification: 'Supporting the enterprise customer console which reads account data from the CRM sandbox tenant.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 45, decidedDaysAgo: 44, decidedByKey: 'manager',
  },
  {
    employeeKey: 'priya', system: 'AWS', accessLevel: 'Developer', duration: '90 days', priority: 'High',
    justification: 'Deploying the marketing site infrastructure through Terraform; requires scoped developer credentials.',
    status: REQUEST_STATUS.PENDING, submittedDaysAgo: 5,
  },
  {
    employeeKey: 'priya', system: 'Internal Tool', accessLevel: 'Developer', duration: '180 days', priority: 'Medium',
    justification: 'Ownership of the release dashboard service including its deployment pipeline and alerting rules.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 74, decidedDaysAgo: 72, decidedByKey: 'manager',
  },

  // ---- Karan Mehta (Engineering) ----
  {
    employeeKey: 'karan', system: 'AWS', accessLevel: 'Admin', duration: '30 days', priority: 'Urgent',
    justification: 'Leading the disaster-recovery drill; administrator rights required to exercise the failover runbook.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 20, decidedDaysAgo: 19, decidedByKey: 'admin',
  },
  {
    employeeKey: 'karan', system: 'Database', accessLevel: 'Developer', duration: '90 days', priority: 'High',
    justification: 'Schema migration for the eventing tables; needs DDL permissions on the staging cluster only.',
    status: REQUEST_STATUS.PENDING, submittedDaysAgo: 6,
  },
  {
    employeeKey: 'karan', system: 'VPN', accessLevel: 'Member', duration: '1 year', priority: 'Medium',
    justification: 'Participation in the 24x7 platform on-call rotation which requires network access from outside the office.',
    status: REQUEST_STATUS.REJECTED, submittedDaysAgo: 35, decidedDaysAgo: 34, decidedByKey: 'admin',
    rejectionReason: 'A valid VPN profile already exists for this account from June. Please reuse it instead of requesting a duplicate.',
  },

  // ---- Sneha Reddy (Data & Analytics manager) ----
  {
    employeeKey: 'sneha', system: 'Analytics Platform', accessLevel: 'Admin', duration: '180 days', priority: 'High',
    justification: 'Administering workspace permissions for the analytics team including row-level security policies.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 55, decidedDaysAgo: 54, decidedByKey: 'admin',
  },

  // ---- Daniel Fernandes (Data & Analytics) ----
  {
    employeeKey: 'daniel', system: 'Analytics Platform', accessLevel: 'Developer', duration: '90 days', priority: 'Medium',
    justification: 'Building the ingestion pipeline for the customer health score model; requires warehouse write access.',
    status: REQUEST_STATUS.PENDING, submittedDaysAgo: 1, hour: 14,
  },
  {
    employeeKey: 'daniel', system: 'Database', accessLevel: 'Viewer', duration: '30 days', priority: 'Low',
    justification: 'Read-only inspection of the marketing attribution tables for the quarterly funnel analysis.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 28, decidedDaysAgo: 27, decidedByKey: 'admin',
  },
  {
    employeeKey: 'daniel', system: 'Slack', accessLevel: 'Member', duration: '1 year', priority: 'Low',
    justification: 'Channel access for the data platform guild and the weekly metrics review working group.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 88, decidedDaysAgo: 87, decidedByKey: 'sneha',
  },

  // ---- Ananya Desai (Finance) ----
  {
    employeeKey: 'ananya', system: 'CRM', accessLevel: 'Member', duration: '1 year', priority: 'Medium',
    justification: 'Reconciling booked revenue against the CRM opportunity pipeline during the monthly close.',
    status: REQUEST_STATUS.PENDING, submittedDaysAgo: 2, hour: 11,
  },
  {
    employeeKey: 'ananya', system: 'Google Workspace', accessLevel: 'Viewer', duration: '30 days', priority: 'Low',
    justification: 'Read access to the vendor contract drive to complete the annual software spend audit.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 33, decidedDaysAgo: 32, decidedByKey: 'admin',
  },
  {
    employeeKey: 'ananya', system: 'Internal Tool', accessLevel: 'Member', duration: '90 days', priority: 'Medium',
    justification: 'Purchase-order approvals for the departmental spend tool during the budget reforecasting cycle.',
    status: REQUEST_STATUS.REJECTED, submittedDaysAgo: 52, decidedDaysAgo: 51, decidedByKey: 'admin',
    rejectionReason: 'The purchasing tool grants approvals based on cost-centre ownership. Ask the Finance systems owner to add you to the approver group instead.',
  },

  // ---- Vikram Malhotra (IT Operations manager) ----
  {
    employeeKey: 'vikram', system: 'Database', accessLevel: 'Admin', duration: '30 days', priority: 'Urgent',
    justification: 'Emergency index maintenance on the identity store during the maintenance window approved by the CAB.',
    status: REQUEST_STATUS.PENDING, submittedDaysAgo: 6, hour: 9,
  },
  {
    employeeKey: 'vikram', system: 'AWS', accessLevel: 'Viewer', duration: '90 days', priority: 'Medium',
    justification: 'Cost and inventory review of the shared services accounts ahead of the annual capacity plan.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 40, decidedDaysAgo: 39, decidedByKey: 'admin',
  },

  // ---- Decided in the current month, so the "this month" metrics are populated ----
  {
    employeeKey: 'employee', system: 'Slack', accessLevel: 'Member', duration: '1 year', priority: 'Low',
    justification: 'Membership of the payments squad channel for day-to-day delivery coordination.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 4, decidedDaysAgo: 3, decidedByKey: 'manager',
  },
  {
    employeeKey: 'priya', system: 'Jira', accessLevel: 'Member', duration: '90 days', priority: 'Medium',
    justification: 'Board access for the accessibility remediation epic currently being planned.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 5, decidedDaysAgo: 4, decidedByKey: 'manager',
  },
  {
    employeeKey: 'karan', system: 'CRM', accessLevel: 'Member', duration: '30 days', priority: 'Low',
    justification: 'Reviewing the customer escalation records for the reliability improvement programme.',
    status: REQUEST_STATUS.REJECTED, submittedDaysAgo: 7, decidedDaysAgo: 6, decidedByKey: 'admin',
    rejectionReason: 'CRM records contain customer personal data that is unrelated to reliability work. Use the anonymised escalation export instead.',
  },

  // ---- Older history (4–6 months ago) so the six-month trend has volume ----
  {
    employeeKey: 'priya', system: 'Jira', accessLevel: 'Member', duration: '1 year', priority: 'Low',
    justification: 'Standing board access for the design system backlog and the monthly grooming sessions.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 160, decidedDaysAgo: 159, decidedByKey: 'manager',
  },
  {
    employeeKey: 'ananya', system: 'Database', accessLevel: 'Viewer', duration: '30 days', priority: 'Medium',
    justification: 'Read-only queries against the billing ledger tables during the quarterly revenue audit.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 152, decidedDaysAgo: 151, decidedByKey: 'admin',
  },
  {
    employeeKey: 'daniel', system: 'Google Workspace', accessLevel: 'Member', duration: '90 days', priority: 'Low',
    justification: 'Shared analytics mailbox for inbound reporting requests from the regional business teams.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 145, decidedDaysAgo: 144, decidedByKey: 'sneha',
  },
  {
    employeeKey: 'employee', system: 'Analytics Platform', accessLevel: 'Viewer', duration: '1 year', priority: 'Medium',
    justification: 'Service health dashboards for the payments domain, used during the weekly reliability review.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 138, decidedDaysAgo: 137, decidedByKey: 'manager',
  },
  {
    employeeKey: 'karan', system: 'Internal Tool', accessLevel: 'Developer', duration: '180 days', priority: 'Medium',
    justification: 'Operational ownership of the incident timeline tool including its alert routing configuration.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 132, decidedDaysAgo: 131, decidedByKey: 'manager',
  },
  {
    employeeKey: 'priya', system: 'VPN', accessLevel: 'Member', duration: '90 days', priority: 'Medium',
    justification: 'Remote access for the accessibility audit workshops being run from the Bangalore office.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 126, decidedDaysAgo: 125, decidedByKey: 'admin',
  },
  {
    employeeKey: 'ananya', system: 'CRM', accessLevel: 'Member', duration: '1 year', priority: 'Low',
    justification: 'Access to the renewal pipeline view required for the fortnightly revenue forecasting pack.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 120, decidedDaysAgo: 119, decidedByKey: 'admin',
  },
  {
    employeeKey: 'employee', system: 'Slack', accessLevel: 'Member', duration: 'Permanent', priority: 'Low',
    justification: 'Membership of the engineering-wide incident and release coordination channels.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 115, decidedDaysAgo: 114, decidedByKey: 'manager',
  },
  {
    employeeKey: 'daniel', system: 'AWS', accessLevel: 'Viewer', duration: '30 days', priority: 'Low',
    justification: 'Read access to the S3 analytics bucket structure while scoping the ingestion migration.',
    status: REQUEST_STATUS.REJECTED, submittedDaysAgo: 108, decidedDaysAgo: 107, decidedByKey: 'admin',
    rejectionReason: 'The scoping exercise can be completed with the exported dataset already provided. Re-raise if raw bucket access becomes necessary.',
  },

  // ---- Ishaan Verma (Sales, account now deactivated) ----
  {
    employeeKey: 'ishaan', system: 'CRM', accessLevel: 'Developer', duration: '180 days', priority: 'High',
    justification: 'Building the territory reporting integration between the CRM and the sales forecasting workbook.',
    status: REQUEST_STATUS.APPROVED, submittedDaysAgo: 120, decidedDaysAgo: 119, decidedByKey: 'admin',
  },
  {
    employeeKey: 'ishaan', system: 'Slack', accessLevel: 'Member', duration: 'Permanent', priority: 'Low',
    justification: 'Membership of the regional sales channels for the enterprise account pursuit in the eastern region.',
    status: REQUEST_STATUS.REJECTED, submittedDaysAgo: 130, decidedDaysAgo: 129, decidedByKey: 'admin',
    rejectionReason: 'The requester is already a member of all requested channels through the Sales department group policy.',
  },
];

const durationDays = { '7 days': 7, '30 days': 30, '90 days': 90, '180 days': 180, '1 year': 365, Permanent: null };

const seedRequests = async (userMap) => {
  const created = [];
  let sequence = 1;

  // Oldest first so request numbers follow chronological order.
  const ordered = [...REQUESTS].sort((a, b) => b.submittedDaysAgo - a.submittedDaysAgo);

  for (const spec of ordered) {
    const employee = userMap[spec.employeeKey];
    const submittedAt = daysAgo(spec.submittedDaysAgo, spec.hour || 10);
    const decidedAt = spec.decidedDaysAgo !== undefined ? daysAgo(spec.decidedDaysAgo, 15, 45) : null;
    const approver = spec.decidedByKey ? userMap[spec.decidedByKey] : null;

    const request = await AccessRequest.create({
      requestNumber: `REQ-${submittedAt.getFullYear()}-${String(sequence).padStart(4, '0')}`,
      employee: employee._id,
      department: employee.department,
      system: spec.system,
      accessLevel: spec.accessLevel,
      accessLevelNote: spec.accessLevel === 'Custom' ? 'Business-object CRUD on the reporting schema' : '',
      businessJustification: spec.justification,
      duration: spec.duration,
      priority: spec.priority,
      status: spec.status,
      approvedBy: spec.status === REQUEST_STATUS.APPROVED || spec.status === REQUEST_STATUS.EXPIRED ? approver?._id || null : null,
      approvedAt: spec.status === REQUEST_STATUS.APPROVED || spec.status === REQUEST_STATUS.EXPIRED ? decidedAt : null,
      expiresAt:
        (spec.status === REQUEST_STATUS.APPROVED || spec.status === REQUEST_STATUS.EXPIRED) && decidedAt
          ? durationDays[spec.duration] === null
            ? null
            : addDays(decidedAt, durationDays[spec.duration])
          : null,
      rejectedBy: spec.status === REQUEST_STATUS.REJECTED ? approver?._id || null : null,
      rejectedAt: spec.status === REQUEST_STATUS.REJECTED ? decidedAt : null,
      rejectionReason: spec.status === REQUEST_STATUS.REJECTED ? spec.rejectionReason || '' : '',
      cancelledBy: spec.status === REQUEST_STATUS.CANCELLED ? employee._id : null,
      cancelledAt: spec.status === REQUEST_STATUS.CANCELLED ? decidedAt : null,
    });

    // Backdate the record so the history is chronologically believable.
    await backdate(AccessRequest, request._id, {
      createdAt: submittedAt,
      updatedAt: decidedAt || submittedAt,
      // An expired request was last touched when the grant lapsed.
      ...(spec.expiredDaysAgo !== undefined
        ? { expiresAt: daysAgo(spec.expiredDaysAgo, 15, 45), updatedAt: daysAgo(spec.expiredDaysAgo, 15, 45) }
        : {}),
    });

    created.push({ ...request.toObject(), spec, submittedAt, decidedAt, approver });
    sequence += 1;
  }

  return created;
};

/* ------------------------------------------------------------------ */
/* 3. Notifications                                                    */
/* ------------------------------------------------------------------ */

const seedNotifications = async (userMap, requests) => {
  const docs = [];

  for (const item of requests) {
    const employee = userMap[item.spec.employeeKey];
    const relatedRequest = item._id;

    // Requester: submission acknowledgement.
    docs.push({
      user: employee._id,
      title: 'Access request submitted',
      message: `Your request ${item.requestNumber} for ${item.system} access was submitted and is awaiting review.`,
      type: NOTIFICATION_TYPE.REQUEST_SUBMITTED,
      isRead: true,
      readAt: item.submittedAt,
      relatedRequest,
      createdAt: item.submittedAt,
      updatedAt: item.submittedAt,
    });

    if (item.spec.status === REQUEST_STATUS.PENDING) {
      // Reviewers of the relevant department (excluding the requester) get an unread alert.
      const reviewers = Object.values(userMap).filter(
        (u) =>
          u.isActive &&
          String(u._id) !== String(employee._id) &&
          (u.role === ROLES.ADMIN || (u.role === ROLES.MANAGER && u.department === employee.department))
      );

      reviewers.forEach((reviewer) => {
        docs.push({
          user: reviewer._id,
          title: 'New access request awaiting review',
          message: `${employee.name} (${employee.department}) requested ${item.accessLevel} access to ${item.system}. Priority: ${item.priority}.`,
          type: NOTIFICATION_TYPE.REQUEST_REVIEW_REQUIRED,
          isRead: false,
          relatedRequest,
          createdAt: item.submittedAt,
          updatedAt: item.submittedAt,
        });
      });
      continue;
    }

    const decisionDate = item.decidedAt || item.submittedAt;

    if (item.spec.status === REQUEST_STATUS.APPROVED) {
      docs.push({
        user: employee._id,
        title: 'Access request approved',
        message: `Your request ${item.requestNumber} for ${item.accessLevel} access to ${item.system} was approved by ${item.approver.name}.`,
        type: NOTIFICATION_TYPE.REQUEST_APPROVED,
        isRead: true,
        readAt: decisionDate,
        relatedRequest,
        createdAt: decisionDate,
        updatedAt: decisionDate,
      });
    }

    if (item.spec.status === REQUEST_STATUS.REJECTED) {
      docs.push({
        user: employee._id,
        title: 'Access request rejected',
        message: `Your request ${item.requestNumber} for ${item.system} was rejected by ${item.approver.name}. Reason: ${item.spec.rejectionReason}`,
        type: NOTIFICATION_TYPE.REQUEST_REJECTED,
        isRead: false,
        relatedRequest,
        createdAt: decisionDate,
        updatedAt: decisionDate,
      });
    }

    if (item.spec.status === REQUEST_STATUS.CANCELLED) {
      docs.push({
        user: employee._id,
        title: 'Access request cancelled',
        message: `Request ${item.requestNumber} for ${item.system} was cancelled.`,
        type: NOTIFICATION_TYPE.REQUEST_CANCELLED,
        isRead: true,
        readAt: decisionDate,
        relatedRequest,
        createdAt: decisionDate,
        updatedAt: decisionDate,
      });
    }

    if (item.spec.status === REQUEST_STATUS.EXPIRED) {
      const expiryDate = daysAgo(item.spec.expiredDaysAgo, 15, 45);
      docs.push({
        user: employee._id,
        title: 'Access expired',
        message: `Your approved access for ${item.system} (${item.requestNumber}) has expired. Submit a new request if you still need it.`,
        type: NOTIFICATION_TYPE.REQUEST_EXPIRED,
        isRead: false,
        relatedRequest,
        createdAt: expiryDate,
        updatedAt: expiryDate,
      });
    }
  }

  // A couple of administrative notices to round out the inbox.
  docs.push({
    user: userMap.manager._id,
    title: 'Your role has changed',
    message: 'Rohan Kapoor changed your role from employee to manager. You can now review access requests for the Engineering department.',
    type: NOTIFICATION_TYPE.USER_ROLE_CHANGED,
    isRead: true,
    readAt: daysAgo(60),
    createdAt: daysAgo(60),
    updatedAt: daysAgo(60),
  });

  docs.push({
    user: userMap.ishaan._id,
    title: 'Account deactivated',
    message: 'Your account has been deactivated because the employment record was closed. Contact IT Operations if this is unexpected.',
    type: NOTIFICATION_TYPE.USER_DEACTIVATED,
    isRead: false,
    createdAt: daysAgo(35),
    updatedAt: daysAgo(35),
  });

  const inserted = await Notification.insertMany(docs);
  return inserted;
};

/* ------------------------------------------------------------------ */
/* 4. Audit logs                                                       */
/* ------------------------------------------------------------------ */

const seedAuditLogs = async (userMap, requests) => {
  const docs = [];

  for (const item of requests) {
    const employee = userMap[item.spec.employeeKey];

    docs.push({
      user: employee._id,
      action: AUDIT_ACTION.REQUEST_CREATED,
      entityType: ENTITY_TYPE.ACCESS_REQUEST,
      entityId: item._id,
      description: `${employee.name} created access request ${item.requestNumber} for ${item.system} (${item.accessLevel})`,
      metadata: {
        requestNumber: item.requestNumber,
        system: item.system,
        accessLevel: item.accessLevel,
        priority: item.priority,
        duration: item.duration,
        ip: '10.24.8.14',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      },
      createdAt: item.submittedAt,
      updatedAt: item.submittedAt,
    });

    if (!item.decidedAt) continue;

    if (item.spec.status === REQUEST_STATUS.APPROVED || item.spec.status === REQUEST_STATUS.EXPIRED) {
      docs.push({
        user: item.approver._id,
        action: AUDIT_ACTION.REQUEST_APPROVED,
        entityType: ENTITY_TYPE.ACCESS_REQUEST,
        entityId: item._id,
        description: `${item.approver.name} approved ${item.requestNumber} (${item.system})`,
        metadata: { requestNumber: item.requestNumber, system: item.system, duration: item.duration, ip: '10.24.8.4' },
        createdAt: item.decidedAt,
        updatedAt: item.decidedAt,
      });
    }

    if (item.spec.status === REQUEST_STATUS.REJECTED) {
      docs.push({
        user: item.approver._id,
        action: AUDIT_ACTION.REQUEST_REJECTED,
        entityType: ENTITY_TYPE.ACCESS_REQUEST,
        entityId: item._id,
        description: `${item.approver.name} rejected ${item.requestNumber} (${item.system})`,
        metadata: { requestNumber: item.requestNumber, rejectionReason: item.spec.rejectionReason, ip: '10.24.8.4' },
        createdAt: item.decidedAt,
        updatedAt: item.decidedAt,
      });
    }

    if (item.spec.status === REQUEST_STATUS.CANCELLED) {
      docs.push({
        user: employee._id,
        action: AUDIT_ACTION.REQUEST_CANCELLED,
        entityType: ENTITY_TYPE.ACCESS_REQUEST,
        entityId: item._id,
        description: `${employee.name} cancelled ${item.requestNumber} (${item.system})`,
        metadata: { requestNumber: item.requestNumber, reason: 'Access no longer required', ip: '10.24.8.14' },
        createdAt: item.decidedAt,
        updatedAt: item.decidedAt,
      });
    }

    if (item.spec.status === REQUEST_STATUS.EXPIRED) {
      const expiryDate = daysAgo(item.spec.expiredDaysAgo, 15, 45);
      docs.push({
        user: null,
        action: AUDIT_ACTION.REQUEST_EXPIRED,
        entityType: ENTITY_TYPE.ACCESS_REQUEST,
        entityId: item._id,
        description: `${item.requestNumber} (${item.system}) expired automatically`,
        metadata: { automated: true },
        createdAt: expiryDate,
        updatedAt: expiryDate,
      });
    }
  }

  // Administrative actions.
  docs.push({
    user: userMap.admin._id,
    action: AUDIT_ACTION.USER_ROLE_CHANGED,
    entityType: ENTITY_TYPE.USER,
    entityId: userMap.manager._id,
    description: `Role changed for ${userMap.manager.email}: employee -> manager`,
    metadata: { previousRole: ROLES.EMPLOYEE, newRole: ROLES.MANAGER, ip: '10.24.8.4' },
    createdAt: daysAgo(60, 11, 30),
    updatedAt: daysAgo(60, 11, 30),
  });

  docs.push({
    user: userMap.admin._id,
    action: AUDIT_ACTION.USER_DEACTIVATED,
    entityType: ENTITY_TYPE.USER,
    entityId: userMap.ishaan._id,
    description: `Account deactivated for ${userMap.ishaan.email}`,
    metadata: { isActive: false, reason: 'Employment record closed', ip: '10.24.8.4' },
    createdAt: daysAgo(35, 16, 5),
    updatedAt: daysAgo(35, 16, 5),
  });

  docs.push({
    user: userMap.admin._id,
    action: AUDIT_ACTION.USER_CREATED,
    entityType: ENTITY_TYPE.USER,
    entityId: userMap.daniel._id,
    description: `Account created for ${userMap.daniel.email} with role employee`,
    metadata: { createdBy: userMap.admin.email, role: ROLES.EMPLOYEE },
    createdAt: daysAgo(210, 9, 15),
    updatedAt: daysAgo(210, 9, 15),
  });

  // Recent sign-ins so the dashboard activity feed has fresh entries.
  Object.values(userMap)
    .filter((u) => u.isActive && u.lastLoginAt)
    .forEach((user, index) => {
      docs.push({
        user: user._id,
        action: AUDIT_ACTION.USER_LOGIN,
        entityType: ENTITY_TYPE.USER,
        entityId: user._id,
        description: `${user.name} signed in`,
        metadata: { role: user.role, ip: `10.24.9.${20 + index}` },
        createdAt: user.lastLoginAt,
        updatedAt: user.lastLoginAt,
      });
    });

  return AuditLog.insertMany(docs);
};

/* ------------------------------------------------------------------ */
/* runner                                                              */
/* ------------------------------------------------------------------ */

const clearCollections = async (drop) => {
  if (drop) {
    await Promise.all([
      AccessRequest.collection.drop().catch(() => {}),
      Notification.collection.drop().catch(() => {}),
      AuditLog.collection.drop().catch(() => {}),
      User.collection.drop().catch(() => {}),
    ]);
    return;
  }

  await Promise.all([
    AccessRequest.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    User.deleteMany({}),
  ]);
};

/**
 * verifySeed — asserts the inserted dataset is internally consistent.
 * Guards against the classic seed bug where timestamps are re-stamped, which
 * would make "average decision time" and the six-month trend meaningless.
 */
const verifySeed = async () => {
  const checks = [];
  const add = (label, ok, detail = '') => checks.push({ label, ok, detail });

  const [users, requests, notifications, logs] = await Promise.all([
    User.countDocuments({}),
    AccessRequest.countDocuments({}),
    Notification.countDocuments({}),
    AuditLog.countDocuments({}),
  ]);

  add('users inserted', users === USERS.length, `${users}/${USERS.length}`);
  add('access requests inserted', requests === REQUESTS.length, `${requests}/${REQUESTS.length}`);
  add('notifications inserted', notifications > 0, `${notifications}`);
  add('audit records inserted', logs > 0, `${logs}`);

  const demoAccounts = await User.find({
    email: { $in: ['employee@example.com', 'manager@example.com', 'admin@example.com'] },
  }).select('+password');

  add('three demo accounts present', demoAccounts.length === 3);
  const passwordOk = await Promise.all(demoAccounts.map((u) => u.matchPassword(DEMO_PASSWORD)));
  add('passwords are bcrypt hashes of Password123!', passwordOk.every(Boolean));

  const plaintext = demoAccounts.some((u) => u.password === DEMO_PASSWORD);
  add('no plaintext password stored', !plaintext);

  const decisions = await AccessRequest.find({ approvedAt: { $ne: null } })
    .select('requestNumber createdAt approvedAt')
    .lean();

  const negative = decisions.filter(
    (r) => new Date(r.approvedAt).getTime() < new Date(r.createdAt).getTime()
  );
  add('every approval happened after its submission', negative.length === 0, `${negative.length} out of order`);

  const spread = await AccessRequest.aggregate([
    { $group: { _id: null, oldest: { $min: '$createdAt' }, newest: { $max: '$createdAt' } } },
  ]);

  const daysSpanned =
    spread.length && spread[0].oldest
      ? Math.round((spread[0].newest - spread[0].oldest) / 864e5)
      : 0;
  add('request history spans several months', daysSpanned > 60, `${daysSpanned} days`);

  const decided = decisions.length;
  const avgHours =
    decided === 0
      ? 0
      : decisions.reduce((acc, r) => acc + (new Date(r.approvedAt) - new Date(r.createdAt)) / 36e5, 0) / decided;
  add('average decision time is a positive number', avgHours > 0, `${avgHours.toFixed(1)}h`);

  const statuses = await AccessRequest.distinct('status');
  add('multiple statuses represented', statuses.length >= 4, statuses.join(', '));

  const failures = checks.filter((c) => !c.ok);

  checks.forEach((c) =>
    console.log(`         ${c.ok ? '\u001b[32mOK\u001b[0m  ' : '\u001b[31mFAIL\u001b[0m'} ${c.label}${c.detail ? ` (${c.detail})` : ''}`)
  );

  return failures.length;
};

const run = async () => {
  const drop = process.argv.includes('--drop');

  console.log('\n  Corporate Access Request & Approval System — database seed');
  console.log(`  Target  : ${process.env.MONGO_URI || 'mongodb://localhost:27017/corporate_access'}`);
  console.log(`  Mode    : ${drop ? 'fresh (drop collections)' : 'reset (delete documents)'}\n`);

  await connectDB(process.env.MONGO_URI);

  line('Clearing existing collections');
  await clearCollections(drop);

  line('Inserting users');
  const { map: userMap } = await seedUsers();
  console.log(`         ${USERS.length} users (3 admins/managers of note: admin@, manager@, sneha@)`);

  line('Inserting access requests');
  const requests = await seedRequests(userMap);
  const byStatus = requests.reduce((acc, r) => ({ ...acc, [r.spec.status]: (acc[r.spec.status] || 0) + 1 }), {});
  console.log(`         ${requests.length} requests -> ${JSON.stringify(byStatus)}`);

  line('Inserting notifications');
  const notifications = await seedNotifications(userMap, requests);
  console.log(`         ${notifications.length} notifications`);

  line('Inserting audit logs');
  const logs = await seedAuditLogs(userMap, requests);
  console.log(`         ${logs.length} audit records`);

  line('Verifying dataset');
  const failures = await verifySeed();

  console.log(
    failures
      ? `\n  \u001b[31mSeed completed with ${failures} verification failure(s).\u001b[0m`
      : '\n  \u001b[32mSeed complete and verified.\u001b[0m'
  );
  console.log('\n  Demo credentials (password for all accounts):');
  console.log(`    employee@example.com         ${DEMO_PASSWORD}   -> Aarav Sharma, Engineering (employee)`);
  console.log(`    manager@example.com          ${DEMO_PASSWORD}   -> Meera Iyer, Engineering (manager)`);
  console.log(`    admin@example.com            ${DEMO_PASSWORD}   -> Rohan Kapoor, IT Operations (admin)`);
  console.log(`    sneha.reddy@example.com      ${DEMO_PASSWORD}   -> Data & Analytics (manager)\n`);

  await disconnectDB();
  process.exit(failures ? 1 : 0);
};

run().catch(async (error) => {
  console.error(`\n  Seed failed: ${error.message}\n`);
  console.error(error.stack);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
