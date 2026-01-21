// src/services/api.js
// REST API Service Layer for QMS App

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Token management
let authToken = localStorage.getItem('qms_token');

export const setToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('qms_token', token);
  } else {
    localStorage.removeItem('qms_token');
  }
};

export const getToken = () => authToken;

export const clearToken = () => {
  authToken = null;
  localStorage.removeItem('qms_token');
};

// Base fetch wrapper
const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      clearToken();
      window.location.reload();
      throw new Error('Session expired. Please log in again.');
    }

    // Handle 204 No Content (common for DELETE)
    if (response.status === 204) {
      return { success: true };
    }

    // Only parse JSON if there's content
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP error ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
    throw error;
  }
};

// Generic CRUD factory
const createCrudApi = (resource) => ({
  getAll: () => apiFetch(`/${resource}`),
  getOne: (id) => apiFetch(`/${resource}/${id}`),
  create: (data) => apiFetch(`/${resource}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiFetch(`/${resource}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiFetch(`/${resource}/${id}`, {
    method: 'DELETE',
  }),
});

// Auth API
export const authApi = {
  login: async (email, password) => {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.token) {
      setToken(response.token);
    }
    return response;
  },
  
  register: async (email, password, displayName) => {
    const response = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
    if (response.token) {
      setToken(response.token);
    }
    return response;
  },
  
  logout: () => {
    clearToken();
  },
  
  me: () => apiFetch('/auth/me'),
};

// Resource APIs
export const partTypesApi = createCrudApi('part-types');
export const inspectionPlansApi = createCrudApi('inspection-plans');
export const shipmentsApi = createCrudApi('shipments');
export const inspectionsApi = createCrudApi('inspections');
export const quarantineApi = createCrudApi('quarantine');
export const warrantyApi = createCrudApi('warranty');
export const gagesApi = createCrudApi('gages');
export const drawingsApi = createCrudApi('drawings');
export const notificationsApi = createCrudApi('notifications');
export const usersApi = createCrudApi('users');

// File upload API
export const filesApi = {
  upload: async (file, folder = 'uploads') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const url = `${API_BASE}/files/upload`;
    
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    // Don't set Content-Type for FormData - browser will set it with boundary

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },

  delete: async (fileUrl) => {
    return apiFetch('/files/delete', {
      method: 'POST',
      body: JSON.stringify({ fileUrl }),
    });
  },
};

// Health check
export const healthApi = {
  check: () => apiFetch('/health'),
};

// Utility function
export const isAuthenticated = () => !!authToken;

export default {
  authApi,
  partTypesApi,
  inspectionPlansApi,
  shipmentsApi,
  inspectionsApi,
  quarantineApi,
  warrantyApi,
  gagesApi,
  drawingsApi,
  notificationsApi,
  usersApi,
  filesApi,
  healthApi,
  setToken,
  getToken,
  clearToken,
  isAuthenticated,
};
