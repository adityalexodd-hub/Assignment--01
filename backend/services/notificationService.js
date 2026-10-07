const Notification = require('../models/Notification');
const User = require('../models/User');
const { NOTIFICATION_TYPE, ROLES } = require('../utils/constants');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const ApiError = require('../utils/ApiError');

/**
 * notificationService — persists every workflow notification in MongoDB and
 * resolves the correct audience (requester / reviewers).
 */

/** Create a single notification. Never throws into the caller's workflow. */
const createNotification = async ({ user, title, message, type, relatedRequest = null }) => {
  try {
    return await Notification.create({ user, title, message, type, relatedRequest });
  } catch (error) {
    console.error(`[notification] failed to create notification: ${error.message}`);
    return null;
  }
};

/**
 * Fan-out helper: one document per recipient.
 * Reviewers = every active manager in the requester's department + every admin.
 */
const notifyReviewers = async ({ request, employee, title, message, type }) => {
  const reviewers = await User.find({
    isActive: true,
    $or: [{ role: ROLES.ADMIN }, { role: ROLES.MANAGER, department: employee.department }],
  })
    .select('_id')
    .lean();

  const recipients = reviewers
    .map((r) => String(r._id))
    // A manager reviewing their own request gains nothing from the alert.
    .filter((id) => id !== String(employee._id));

  if (!recipients.length) return [];

  return Notification.insertMany(
    recipients.map((recipientId) => ({
      user: recipientId,
      title,
      message,
      type,
      relatedRequest: request._id,
    }))
  );
};

/** Paginated inbox for the signed-in user. */
const listNotifications = async (userId, query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { user: userId };

  if (query.unreadOnly === 'true' || query.unreadOnly === true) filter.isRead = false;
  if (query.type) filter.type = query.type;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ isRead: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('relatedRequest', 'requestNumber system status')
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);

  return { notifications, unreadCount, meta: buildPaginationMeta(total, page, limit) };
};

/** The bell dropdown: newest 8 with the unread badge count. */
const getNotificationSummary = async (userId) => {
  const [latest, unreadCount] = await Promise.all([
    Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('relatedRequest', 'requestNumber system status')
      .lean(),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);

  return { latest, unreadCount };
};

const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({ _id: notificationId, user: userId });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  notification.markAsRead();
  await notification.save();
  return notification;
};

const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return { modifiedCount: result.modifiedCount };
};

const getUnreadCount = (userId) => Notification.countDocuments({ user: userId, isRead: false });

/** Removes notifications tied to a request (used when a seed run resets data). */
const deleteForUser = (userId) => Notification.deleteMany({ user: userId });

module.exports = {
  createNotification,
  notifyReviewers,
  listNotifications,
  getNotificationSummary,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteForUser,
  NOTIFICATION_TYPE,
};
