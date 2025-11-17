import LZString from 'lz-string';

const CACHE_KEY = 'production_dashboard_cache';
const CACHE_KEY_LINEPN1 = 'linepn1_dashboard_cache';
const CACHE_KEY_LINEPN2 = 'linepn2_dashboard_cache';
const CACHE_KEY_QUALITY = 'quality_dashboard_cache';
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

// ============================================
// Generic cache functions for any dashboard
// ============================================

/**
 * Save dashboard data to localStorage with compression (generic)
 */
const saveCacheGeneric = (cacheKey, data) => {
  try {
    const cacheData = {
      data,
      timestamp: new Date().toISOString()
    };
    
    const jsonString = JSON.stringify(cacheData);
    const compressed = LZString.compress(jsonString);
    
    localStorage.setItem(cacheKey, compressed);
    
    return true;
  } catch (error) {
    console.error(`Failed to cache dashboard data (${cacheKey}):`, error);
    if (error.name === 'QuotaExceededError') {
      localStorage.removeItem(cacheKey);
    }
    return false;
  }
};

/**
 * Load dashboard data from localStorage (generic)
 */
const loadCacheGeneric = (cacheKey) => {
  try {
    const compressed = localStorage.getItem(cacheKey);
    
    if (!compressed) {
      return null;
    }
    
    const decompressed = LZString.decompress(compressed);
    const cacheData = JSON.parse(decompressed);
    
    const cacheAge = Date.now() - new Date(cacheData.timestamp).getTime();
    
    if (cacheAge > CACHE_DURATION) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return {
      ...cacheData.data,
      fetchTime: new Date(cacheData.timestamp)
    };
  } catch (error) {
    console.error(`Failed to load cached dashboard data (${cacheKey}):`, error);
    localStorage.removeItem(cacheKey);
    return null;
  }
};

/**
 * Check if cached data is still valid (generic)
 */
const isCacheValidGeneric = (cacheKey) => {
  try {
    const compressed = localStorage.getItem(cacheKey);
    
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

// ============================================
// Line PN1 Dashboard Cache Functions
// ============================================

export const saveLinePN1Cache = (data) => saveCacheGeneric(CACHE_KEY_LINEPN1, data);
export const loadLinePN1Cache = () => loadCacheGeneric(CACHE_KEY_LINEPN1);
export const isLinePN1CacheValid = () => isCacheValidGeneric(CACHE_KEY_LINEPN1);
export const clearLinePN1Cache = () => {
  try {
    localStorage.removeItem(CACHE_KEY_LINEPN1);
  } catch (error) {
    console.error('Failed to clear Line PN1 cache:', error);
  }
};

// ============================================
// Line PN2 Dashboard Cache Functions
// ============================================

export const saveLinePN2Cache = (data) => saveCacheGeneric(CACHE_KEY_LINEPN2, data);
export const loadLinePN2Cache = () => loadCacheGeneric(CACHE_KEY_LINEPN2);
export const isLinePN2CacheValid = () => isCacheValidGeneric(CACHE_KEY_LINEPN2);
export const clearLinePN2Cache = () => {
  try {
    localStorage.removeItem(CACHE_KEY_LINEPN2);
  } catch (error) {
    console.error('Failed to clear Line PN2 cache:', error);
  }
};

// ============================================
// Quality Dashboard Cache Functions
// ============================================

export const saveQualityCache = (data) => saveCacheGeneric(CACHE_KEY_QUALITY, data);
export const loadQualityCache = () => loadCacheGeneric(CACHE_KEY_QUALITY);
export const isQualityCacheValid = () => isCacheValidGeneric(CACHE_KEY_QUALITY);
export const clearQualityCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY_QUALITY);
  } catch (error) {
    console.error('Failed to clear Quality cache:', error);
  }
};
