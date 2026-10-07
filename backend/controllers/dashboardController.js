const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const dashboardService = require('../services/dashboardService');

/** /api/dashboard — all figures are aggregated from MongoDB, none are mocked. */

// GET /api/dashboard/employee
const getEmployeeDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getEmployeeDashboard(req.user);
  return sendSuccess(res, 200, 'Employee dashboard loaded', data);
});

// GET /api/dashboard/manager
const getManagerDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getManagerDashboard(req.user);
  return sendSuccess(res, 200, 'Manager dashboard loaded', data);
});

// GET /api/dashboard/admin
const getAdminDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getAdminDashboard();
  return sendSuccess(res, 200, 'Admin dashboard loaded', data);
});

module.exports = { getEmployeeDashboard, getManagerDashboard, getAdminDashboard };
