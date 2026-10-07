import { apiClient } from './apiClient';

export const userService = {
  getUsers: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
    const res = await apiClient(endpoint, { method: 'GET' });
    return res;
  },

  getReviewers: async () => {
    const res = await apiClient('/users/reviewers', { method: 'GET' });
    return res.data;
  },

  getUserById: async (id) => {
    const res = await apiClient(`/users/${id}`, { method: 'GET' });
    return res.data;
  },

  updateUser: async (id, data) => {
    const res = await apiClient(`/users/${id}`, {
      method: 'PATCH',
      body: data,
    });
    return res.data?.user;
  },

  changeRole: async (id, role) => {
    const res = await apiClient(`/users/${id}/role`, {
      method: 'PATCH',
      body: { role },
    });
    return res.data?.user;
  },

  changeStatus: async (id, isActive) => {
    const res = await apiClient(`/users/${id}/status`, {
      method: 'PATCH',
      body: { isActive },
    });
    return res.data?.user;
  },

  createUser: async (userData) => {
    const res = await apiClient('/users', {
      method: 'POST',
      body: userData,
    });
    return res.data?.user;
  },
};
