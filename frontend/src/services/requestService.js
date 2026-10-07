import { apiClient } from './apiClient';

export const requestService = {
  getRequests: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    const endpoint = `/requests${queryString ? `?${queryString}` : ''}`;
    const res = await apiClient(endpoint, { method: 'GET' });
    return res;
  },

  getRequestMeta: async () => {
    const res = await apiClient('/requests/meta', { method: 'GET' });
    return res.data;
  },

  getRequestById: async (id) => {
    const res = await apiClient(`/requests/${id}`, { method: 'GET' });
    return res.data;
  },

  createRequest: async (requestData) => {
    const res = await apiClient('/requests', {
      method: 'POST',
      body: requestData,
    });
    return res.data?.request;
  },

  cancelRequest: async (id, reason) => {
    const res = await apiClient(`/requests/${id}/cancel`, {
      method: 'PATCH',
      body: { reason },
    });
    return res.data?.request;
  },

  approveRequest: async (id, note) => {
    const res = await apiClient(`/requests/${id}/approve`, {
      method: 'PATCH',
      body: { note },
    });
    return res.data?.request;
  },

  rejectRequest: async (id, rejectionReason) => {
    const res = await apiClient(`/requests/${id}/reject`, {
      method: 'PATCH',
      body: { rejectionReason },
    });
    return res.data?.request;
  },
};
