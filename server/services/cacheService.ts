/**
 * Cache Service
 * Provides in-memory caching for expensive database operations
 * to significantly improve API response times
 */

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  
  /**
   * Get an item from the cache
   * @param key The cache key
   * @returns The cached item or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }
    
    // Check if the item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.data as T;
  }
  
  /**
   * Set an item in the cache
   * @param key The cache key
   * @param data The data to cache
   * @param ttlSeconds Time to live in seconds (default: 60)
   */
  set<T>(key: string, data: T, ttlSeconds = 60): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }
  
  /**
   * Remove an item from the cache
   * @param key The cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Invalidate cache entries that match a prefix pattern
   * This is essential for maintaining data isolation in multi-tenant systems
   * @param prefix The cache key prefix to invalidate
   */
  invalidate(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        console.log(`🔄 Invalidating cache for key: ${key}`);
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get or set an item from/to the cache
   * If the item is not in the cache, the factory function is called
   * to generate the item, which is then cached and returned
   * 
   * @param key The cache key
   * @param factory A function that returns the item to cache if not found
   * @param ttlSeconds Time to live in seconds
   * @returns The cached or newly generated item
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttlSeconds = 60
  ): Promise<T> {
    const cachedItem = this.get<T>(key);
    
    if (cachedItem !== undefined) {
      console.log(`🔄 Cache HIT for key: ${key}`);
      return cachedItem;
    }
    
    console.log(`🔄 Cache MISS for key: ${key}`);
    const data = await factory();
    this.set(key, data, ttlSeconds);
    return data;
  }
}

// Export a singleton instance
export const cacheService = new CacheService();