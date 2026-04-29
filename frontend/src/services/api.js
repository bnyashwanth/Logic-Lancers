import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const loginUser = (email, password) => api.post('/auth/login', { email, password });
export const registerUser = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

// Incidents
export const getIncidents = (params) => api.get('/incidents', { params });
export const getIncident = (id) => api.get(`/incidents/${id}`);
export const createIncident = (data) => api.post('/incidents', data);
export const volunteerForIncident = (id) => api.put(`/incidents/${id}/volunteer`);
export const resolveIncident = (id) => api.put(`/incidents/${id}/resolve`);

// Volunteers
export const getNearbyVolunteers = () => api.get('/volunteers/nearby');
export const toggleAvailability = () => api.put('/volunteers/availability');
export const updateLocation = (lat, lng) => api.put('/volunteers/location', { lat, lng });

// Admin API
export const getAdminStats = () => api.get('/admin/stats');
export const verifyIncident = (id) => api.put(`/admin/incidents/${id}/verify`);
export const mergeIncidents = (sourceIds, targetId) => api.post('/admin/incidents/merge', { sourceIds, targetId });
export const updateUserRole = (id, role) => api.put(`/admin/users/${id}/role`, { role });
export const banUser = (id) => api.put(`/admin/users/${id}/ban`);
export const broadcastAlert = (message, type = 'info') => api.post('/admin/broadcast', { message, type });

export default api;
