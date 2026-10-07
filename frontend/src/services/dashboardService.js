import { apiClient } from './apiClient';

export const dashboardService = {
  getEmployeeDashboard: async () => {
    const res = await apiClient('/dashboard/employee', { method: 'GET' });
    return res.data;
  },

  getManagerDashboard: async () => {
    const res = await apiClient('/dashboard/manager', { method: 'GET' });
    return res.data;
  },

  getAdminDashboard: async () => {
    const res = await apiClient('/dashboard/admin', { method: 'GET' });
    return res.data;
  },
};

export const auditService = {
  getAuditLogs: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    const endpoint = `/audit-logs${queryString ? `?${queryString}` : ''}`;
    const res = await apiClient(endpoint, { method: 'GET' });
    return res;
  },
};
