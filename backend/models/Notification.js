const mongoose = require('mongoose');
const { NOTIFICATION_TYPE_VALUES } = require('../utils/constants');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: {
        values: NOTIFICATION_TYPE_VALUES,
        message: '{VALUE} is not a valid notification type',
      },
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    /** Optional link back to the request that triggered the notification. */
    relatedRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccessRequest',
      default: null,
    },
    readAt: { type: Date, default: null },
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

/** Backs the bell dropdown: unread first, newest first. */
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

notificationSchema.methods.markAsRead = function markAsRead() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
  }
  return this;
};

module.exports = mongoose.model('Notification', notificationSchema);
