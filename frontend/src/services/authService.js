import { apiClient } from './apiClient';

export const authService = {
  login: async (email, password) => {
    const res = await apiClient('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
    }
    return res.data;
  },

  register: async (userData) => {
    const res = await apiClient('/auth/register', {
      method: 'POST',
      body: userData,
    });
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
    }
    return res.data;
  },

  getMe: async () => {
    const res = await apiClient('/auth/me', {
      method: 'GET',
    });
    return res.data?.user;
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await apiClient('/auth/password', {
      method: 'PATCH',
      body: { currentPassword, newPassword },
    });
    return res;
  },

  logout: () => {
    localStorage.removeItem('token');
  },
};
