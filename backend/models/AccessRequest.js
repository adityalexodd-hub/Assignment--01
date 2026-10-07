const mongoose = require('mongoose');
const {
  SYSTEMS,
  ACCESS_LEVEL_VALUES,
  PRIORITY_VALUES,
  REQUEST_STATUS,
  REQUEST_STATUS_VALUES,
  DURATION_VALUES,
  DURATIONS,
  STATUS_TRANSITIONS,
} = require('../utils/constants');

/**
 * AccessRequest — the core domain document.
 *
 * Owned by an employee, reviewed by a manager or admin. Every status change is
 * performed by requestService which also writes the audit + notification trail.
 */
const accessRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Denormalised department so manager/team filters stay cheap. */
    department: {
      type: String,
      trim: true,
      default: '',
    },
    system: {
      type: String,
      required: [true, 'System is required'],
      enum: {
        values: SYSTEMS,
        message: '{VALUE} is not a supported system',
      },
      index: true,
    },
    accessLevel: {
      type: String,
      required: [true, 'Access level is required'],
      enum: {
        values: ACCESS_LEVEL_VALUES,
        message: '{VALUE} is not a valid access level',
      },
    },
    /** Required when accessLevel === 'Custom'. */
    accessLevelNote: {
      type: String,
      trim: true,
      maxlength: [120, 'Custom access description cannot exceed 120 characters'],
      default: '',
    },
    businessJustification: {
      type: String,
      required: [true, 'Business justification is required'],
      trim: true,
      minlength: [20, 'Business justification must be at least 20 characters'],
      maxlength: [1000, 'Business justification cannot exceed 1000 characters'],
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'],
      enum: {
        values: DURATION_VALUES,
        message: '{VALUE} is not a valid duration',
      },
    },
    priority: {
      type: String,
      enum: {
        values: PRIORITY_VALUES,
        message: '{VALUE} is not a valid priority',
      },
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: REQUEST_STATUS_VALUES,
        message: '{VALUE} is not a valid status',
      },
      default: REQUEST_STATUS.PENDING,
      index: true,
    },
    /**
     * Derived sort key (Urgent=4 ... Low=1). Kept as a real field so the review
     * queue can be sorted by priority in MongoDB instead of in the browser,
     * where alphabetical order would put "High" before "Low" and "Urgent" last.
     */
    priorityWeight: {
      type: Number,
      default: 2,
      select: false,
    },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    /** Set when the request is approved so access can expire automatically. */
    expiresAt: { type: Date, default: null },

    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },

    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

/** Supports the very common "my requests, newest first" list. */
accessRequestSchema.index({ employee: 1, status: 1, createdAt: -1 });
/** Supports the manager review queue (open items, most urgent first). */
accessRequestSchema.index({ status: 1, priorityWeight: -1, createdAt: -1 });
/** Full-text search over the human readable fields. */
accessRequestSchema.index({ requestNumber: 'text', businessJustification: 'text', system: 'text' });

const PRIORITY_WEIGHTS = { Low: 1, Medium: 2, High: 3, Urgent: 4 };

/** Keeps the derived sort key in sync without leaking it into API responses. */
accessRequestSchema.pre('validate', function syncPriorityWeight(next) {
  this.priorityWeight = PRIORITY_WEIGHTS[this.priority] ?? 2;
  next();
});

accessRequestSchema.virtual('isOpen').get(function isOpen() {
  return this.status === REQUEST_STATUS.PENDING;
});

accessRequestSchema.virtual('isOverdue').get(function isOverdue() {
  if (this.status !== REQUEST_STATUS.PENDING) return false;
  const hours = (Date.now() - new Date(this.createdAt).getTime()) / 36e5;
  return hours > 48;
});

/** Business-rule guard: is `nextStatus` reachable from the current status? */
accessRequestSchema.methods.canTransitionTo = function canTransitionTo(nextStatus) {
  const allowed = STATUS_TRANSITIONS[this.status] || [];
  return allowed.includes(nextStatus);
};

/**
 * Computes the expiry timestamp for this request based on its duration.
 * Returns null for 'Permanent'.
 */
accessRequestSchema.methods.calculateExpiryDate = function calculateExpiryDate(from = new Date()) {
  const match = DURATIONS.find((d) => d.label === this.duration);
  if (!match || match.days === null) return null;
  const expiry = new Date(from);
  expiry.setDate(expiry.getDate() + match.days);
  return expiry;
};

/** Human friendly SLA expectation used by the UI. */
accessRequestSchema.methods.slaHours = function slaHours() {
  return { Low: 120, Medium: 72, High: 48, Urgent: 4 }[this.priority] || 72;
};

module.exports = mongoose.model('AccessRequest', accessRequestSchema);
