const mongoose = require('mongoose');
const { AUDIT_ACTION_VALUES } = require('../utils/constants');

/**
 * AuditLog — append-only record of every security-relevant action.
 * Written exclusively by auditService so the trail stays consistent.
 */
const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: {
        values: AUDIT_ACTION_VALUES,
        message: '{VALUE} is not an auditable action',
      },
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ['AccessRequest', 'User', 'System'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    /** Free-form contextual payload (previous/new values, ip, user agent...). */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
