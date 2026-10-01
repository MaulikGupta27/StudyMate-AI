import axios from 'axios';

export function getOrCreateUserId() {
  let userId = localStorage.getItem('studymate_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('studymate_user_id', userId);
  }
  return userId;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  config.headers['X-User-Id'] = getOrCreateUserId();
  return config;
});

export default api;
