const express = require('express');
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { param } = require('express-validator');
const { runValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

/** /api/notifications — every query is scoped to req.user in the service layer. */

// GET /api/notifications?page=&limit=&unreadOnly=
router.get('/', notificationController.getNotifications);

// GET /api/notifications/summary — bell dropdown payload
router.get('/summary', notificationController.getSummary);

// PATCH /api/notifications/read-all — declared before /:id/read on purpose
router.patch('/read-all', notificationController.markAllAsRead);

// PATCH /api/notifications/:id/read
router.patch(
  '/:id/read',
  [param('id').isMongoId().withMessage('Invalid notification id')],
  runValidation,
  notificationController.markAsRead
);

module.exports = router;
