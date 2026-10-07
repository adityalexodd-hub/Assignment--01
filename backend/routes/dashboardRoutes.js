const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect);

/**
 * /api/dashboard
 * Each endpoint returns aggregates computed in MongoDB for the caller's scope.
 * An admin is allowed to open the employee and manager views as well.
 */

router.get('/employee', authorize(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN), dashboardController.getEmployeeDashboard);

router.get('/manager', authorize(ROLES.MANAGER, ROLES.ADMIN), dashboardController.getManagerDashboard);

router.get('/admin', authorize(ROLES.ADMIN), dashboardController.getAdminDashboard);

module.exports = router;
