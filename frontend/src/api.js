import axios from 'axios';

export function getOrCreateUserId() {
  let userId = localStorage.getItem('studymate_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('studymate_user_id', userId);
  }
  return userId;
}

export function getStoredAccessPassword() {
  return sessionStorage.getItem('studymate_access_code') || '';
}

export function setStoredAccessPassword(passcode) {
  if (passcode) {
    sessionStorage.setItem('studymate_access_code', passcode);
  } else {
    sessionStorage.removeItem('studymate_access_code');
  }
}

export function clearStoredAccessPassword() {
  sessionStorage.removeItem('studymate_access_code');
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Inject X-User-Id and X-Access-Password headers into every outgoing request
api.interceptors.request.use((config) => {
  config.headers['X-User-Id'] = getOrCreateUserId();

  const accessCode = getStoredAccessPassword();
  if (accessCode) {
    config.headers['X-Access-Password'] = accessCode;
  }

  return config;
});

// Intercept 401 Unauthorized to trigger lock screen automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAccessPassword();
      window.dispatchEvent(new CustomEvent('studymate_unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
