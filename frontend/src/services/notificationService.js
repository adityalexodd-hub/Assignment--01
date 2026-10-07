import { apiClient } from './apiClient';

export const notificationService = {
  getNotifications: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    const endpoint = `/notifications${queryString ? `?${queryString}` : ''}`;
    const res = await apiClient(endpoint, { method: 'GET' });
    return res;
  },

  getSummary: async () => {
    const res = await apiClient('/notifications/summary', { method: 'GET' });
    return res.data;
  },

  markAsRead: async (id) => {
    const res = await apiClient(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
    return res.data?.notification;
  },

  markAllAsRead: async () => {
    const res = await apiClient('/notifications/read-all', {
      method: 'PATCH',
    });
    return res.data;
  },
};
