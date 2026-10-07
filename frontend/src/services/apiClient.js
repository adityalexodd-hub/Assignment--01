const BASE_URL = 'https://assignment-01-t2a0.onrender.com';

/**
 * Universal API client for standard JSON requests
 */
export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  if (
    config.body &&
    typeof config.body === 'object' &&
    !(config.body instanceof FormData)
  ) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  let data;

  try {
    data = await response.json();
  } catch (err) {
    data = {
      success: false,
      message: 'Invalid response from server',
    };
  }

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      data?.errors?.[0]?.message ||
      'An error occurred';

    const error = new Error(errorMsg);
    error.status = response.status;
    error.errors = data?.errors || [];

    throw error;
  }

  return data;
};