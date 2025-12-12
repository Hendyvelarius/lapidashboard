/**
 * Simple in-memory cache with TTL (Time To Live)
 * This helps reduce database load by caching frequently accessed data
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  /**
   * Delete a specific key from the cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cached items
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Clear expired items from the cache
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    let validCount = 0;
    let expiredCount = 0;
    const now = Date.now();

    for (const [, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries: validCount,
      expiredEntries: expiredCount
    };
  }
}

// Singleton instance
const cache = new MemoryCache();

// Clear expired items every 5 minutes
setInterval(() => {
  cache.clearExpired();
}, 5 * 60 * 1000);

// Cache TTL constants (in milliseconds)
const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute - for rapidly changing data
  MEDIUM: 5 * 60 * 1000,     // 5 minutes - default for most data
  LONG: 15 * 60 * 1000,      // 15 minutes - for slow-changing data
  VERY_LONG: 60 * 60 * 1000  // 1 hour - for static/reference data
};

module.exports = { cache, CACHE_TTL };
