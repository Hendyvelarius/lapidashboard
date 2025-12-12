// Centralized API base URL for all backend calls
// Use import { API_BASE_URL } from './api' in your components

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Default timeout for API requests (60 seconds - increased for heavy queries)
export const DEFAULT_TIMEOUT = 60000;

export function apiUrl(path) {
  // Ensures no double slashes
  return `${API_BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Fetch with timeout support
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 60000)
 * @returns {Promise<Response>} - The fetch response
 */
export async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000} seconds`);
    }
    throw error;
  }
}

/**
 * Retry fetch with exponential backoff
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} timeout - Timeout per attempt in milliseconds (default: 60000)
 * @returns {Promise<Response>} - The fetch response
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 3, timeout = DEFAULT_TIMEOUT) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      
      // If we get a 5xx error (server error), retry
      if (response.status >= 500 && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // Don't retry on timeout or abort errors if it's the last attempt
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`API request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch after multiple retries');
}

/**
 * Build API URL with optional cache bypass for manual refresh
 * @param {string} path - The API path
 * @param {boolean} skipCache - If true, adds ?refresh=true to bypass server cache
 * @returns {string} - The full API URL
 */
export function apiUrlWithRefresh(path, skipCache = false) {
  const baseUrl = apiUrl(path);
  if (!skipCache) return baseUrl;
  
  // Add refresh=true parameter to bypass server cache
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}refresh=true`;
}
