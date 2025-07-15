// Centralized API base URL for all backend calls
// Use import { API_BASE_URL } from './api' in your components

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4002';

export function apiUrl(path) {
  // Ensures no double slashes
  return `${API_BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}
