const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const notificationService = require('../services/notificationService');

/** /api/notifications — always scoped to the authenticated user. */

// GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const { notifications, unreadCount, meta } = await notificationService.listNotifications(req.user._id, req.query);
  return sendSuccess(res, 200, 'Notifications loaded', { notifications, unreadCount }, meta);
});

// GET /api/notifications/summary
const getSummary = asyncHandler(async (req, res) => {
  const summary = await notificationService.getNotificationSummary(req.user._id);
  return sendSuccess(res, 200, 'Notification summary loaded', summary);
});

// PATCH /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user._id);
  return sendSuccess(res, 200, 'Notification marked as read', { notification });
});

// PATCH /api/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  const { modifiedCount } = await notificationService.markAllAsRead(req.user._id);
  return sendSuccess(res, 200, `${modifiedCount} notification(s) marked as read`, { modifiedCount });
});

module.exports = { getNotifications, getSummary, markAsRead, markAllAsRead };
