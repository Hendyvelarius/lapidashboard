import LZString from 'lz-string';

const CACHE_KEY = 'production_dashboard_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Save dashboard data to localStorage with compression
 * @param {Object} data - The data to cache
 * @returns {boolean} - Whether the save was successful
 */
export const saveDashboardCache = (data) => {
  try {
    const cacheData = {
      data,
      timestamp: new Date().toISOString()
    };
    
    const jsonString = JSON.stringify(cacheData);
    const compressed = LZString.compress(jsonString);
    
    localStorage.setItem(CACHE_KEY, compressed);
    
    return true;
  } catch (error) {
    console.error('Failed to cache dashboard data:', error);
    // If localStorage is full, clear the cache and try again
    if (error.name === 'QuotaExceededError') {
      clearDashboardCache();
    }
    return false;
  }
};

/**
 * Load dashboard data from localStorage
 * @returns {Object|null} - The cached data or null if not available/expired
 */
export const loadDashboardCache = () => {
  try {
    const compressed = localStorage.getItem(CACHE_KEY);
    
    if (!compressed) {
      return null;
    }
    
    const decompressed = LZString.decompress(compressed);
    const cacheData = JSON.parse(decompressed);
    
    const cacheAge = Date.now() - new Date(cacheData.timestamp).getTime();
    
    if (cacheAge > CACHE_DURATION) {
      clearDashboardCache();
      return null;
    }
    
    return {
      ...cacheData.data,
      fetchTime: new Date(cacheData.timestamp)
    };
  } catch (error) {
    console.error('Failed to load cached dashboard data:', error);
    clearDashboardCache();
    return null;
  }
};

/**
 * Check if cached data is still valid
 * @returns {boolean} - Whether the cache is valid
 */
export const isCacheValid = () => {
  try {
    const compressed = localStorage.getItem(CACHE_KEY);
    
    if (!compressed) {
      return false;
    }
    
    const decompressed = LZString.decompress(compressed);
    const cacheData = JSON.parse(decompressed);
    
    const cacheAge = Date.now() - new Date(cacheData.timestamp).getTime();
    
    return cacheAge <= CACHE_DURATION;
  } catch (error) {
    return false;
  }
};

/**
 * Clear the dashboard cache
 */
export const clearDashboardCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Failed to clear dashboard cache:', error);
  }
};

/**
 * Get cache metadata (timestamp, age)
 * @returns {Object|null} - Cache metadata or null
 */
export const getCacheMetadata = () => {
  try {
    const compressed = localStorage.getItem(CACHE_KEY);
    
    if (!compressed) {
      return null;
    }
    
    const decompressed = LZString.decompress(compressed);
    const cacheData = JSON.parse(decompressed);
    
    const timestamp = new Date(cacheData.timestamp);
    const age = Date.now() - timestamp.getTime();
    
    return {
      timestamp,
      age,
      ageMinutes: Math.round(age / 1000 / 60),
      isValid: age <= CACHE_DURATION
    };
  } catch (error) {
    return null;
  }
};
