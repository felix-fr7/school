/**
 * Simple In-Memory Cache with TTL (Time-to-Live) support
 * Uses JavaScript Map with expiration logic
 * 
 * This is a lightweight alternative to node-cache for caching user data
 * to avoid repeated database queries on every authenticated request.
 */

class MemoryCache {
  constructor(defaultTTL = 300000) { // Default TTL: 5 minutes
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    
    // Optional: Periodically clean up expired entries
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Clean every minute
  }

  /**
   * Get an item from the cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined if not found or expired
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }

    const { value, expiresAt } = item;

    // Check if item has expired
    if (expiresAt && Date.now() > expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return value;
  }

  /**
   * Set an item in the cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttl] - Time-to-live in milliseconds (optional, overrides default)
   */
  set(key, value, ttl) {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete an item from the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if item was deleted, false if not found
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Check if an item exists in the cache (and is not expired)
   * @param {string} key - Cache key
   * @returns {boolean} True if item exists and is not expired
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Clear all items from the cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  stats() {
    let totalItems = 0;
    let expiredItems = 0;
    const now = Date.now();

    this.cache.forEach((item) => {
      totalItems++;
      if (item.expiresAt && now > item.expiresAt) {
        expiredItems++;
      }
    });

    return {
      totalItems,
      expiredItems,
      activeItems: totalItems - expiredItems
    };
  }

  /**
   * Clean up expired entries
   * Called periodically by the cleanup interval
   */
  cleanup() {
    const now = Date.now();
    let deletedCount = 0;

    this.cache.forEach((item, key) => {
      if (item.expiresAt && now > item.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    });

    if (deletedCount > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[Cache] Cleaned up ${deletedCount} expired entries`);
    }
  }

  /**
   * Destroy the cache and clear the cleanup interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Create a singleton instance for user caching
const userCache = new MemoryCache(300000); // 5 minutes TTL

// Export the class and the singleton instance
module.exports = {
  MemoryCache,
  userCache
};