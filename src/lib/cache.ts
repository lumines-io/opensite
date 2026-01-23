import { getRedisMode, createUpstashClient, RedisMode } from './redis';
import type { Redis as UpstashRedis } from '@upstash/redis';
import { isFeatureEnabled, FEATURE_FLAGS } from '@/lib/feature-flags';
import { cacheLogger } from '@/lib/persistent-logger';

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  MAP_DATA: 5 * 60,           // 5 minutes for GeoJSON map data
  CONSTRUCTION_DETAIL: 10 * 60, // 10 minutes for individual construction details
  SEARCH_RESULTS: 2 * 60,     // 2 minutes for search results
  NEARBY_SEARCH: 2 * 60,      // 2 minutes for nearby search by location hash
} as const;

// Cache key prefixes
export const CACHE_KEYS = {
  MAP_DATA: 'cache:map:constructions',
  CONSTRUCTION: 'cache:construction:',
  DEVELOPMENT: 'cache:development:',
  SEARCH: 'cache:search:',
  NEARBY: 'cache:nearby:',
  STATS: 'cache:stats',
} as const;

// Cache Redis mode detection
let cachedRedisMode: RedisMode | null = null;
let cachedRedisClient: UpstashRedis | null = null;

function getRedisModeCached(): RedisMode {
  if (cachedRedisMode === null) {
    cachedRedisMode = getRedisMode();
  }
  return cachedRedisMode;
}

// Get Redis client for caching (only Upstash/Vercel KV supported for Edge compatibility)
function getRedisClient(): UpstashRedis | null {
  const mode = getRedisModeCached();

  // Only use Upstash/Vercel KV for caching (Edge-compatible)
  // Local Redis is not used for caching to keep it simple and Edge-compatible
  if (mode !== 'upstash') {
    return null;
  }

  if (!cachedRedisClient) {
    cachedRedisClient = createUpstashClient();
  }

  return cachedRedisClient;
}

// Check if caching is enabled
export function isCacheEnabled(): boolean {
  // Check feature flag first, then Redis availability
  if (!isFeatureEnabled(FEATURE_FLAGS.FEATURE_CACHING)) {
    return false;
  }
  return getRedisModeCached() === 'upstash';
}

// Cache statistics tracking
interface CacheStats {
  hits: number;
  misses: number;
  lastReset: string;
}

// Get cached data with type safety
export async function getFromCache<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const data = await redis.get<T>(key);
    if (data !== null) {
      await incrementCacheHit();
    }
    return data;
  } catch (error) {
    cacheLogger.error('Error getting from cache', error instanceof Error ? error : String(error), { key });
    return null;
  }
}

// Set data in cache with TTL
export async function setInCache<T>(key: string, data: T, ttlSeconds: number): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.set(key, data, { ex: ttlSeconds });
    return true;
  } catch (error) {
    cacheLogger.error('Error setting cache', error instanceof Error ? error : String(error), { key, ttlSeconds });
    return false;
  }
}

// Delete a specific cache key
export async function deleteFromCache(key: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    cacheLogger.error('Error deleting from cache', error instanceof Error ? error : String(error), { key });
    return false;
  }
}

// Delete multiple cache keys by pattern (using scan)
export async function invalidateCachePattern(pattern: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis) {
    return 0;
  }

  try {
    let cursorStr = '0';
    let deletedCount = 0;

    do {
      // Upstash scan returns [string, string[]] where first element is cursor as string
      const scanResult = await redis.scan(cursorStr, { match: pattern, count: 100 });
      cursorStr = String(scanResult[0]);
      const keys: string[] = scanResult[1];

      if (keys.length > 0) {
        await redis.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursorStr !== '0');

    return deletedCount;
  } catch (error) {
    cacheLogger.error('Error invalidating cache pattern', error instanceof Error ? error : String(error), { pattern });
    return 0;
  }
}

// Generate a hash for location-based caching (rounds coordinates to reduce cache variations)
export function generateLocationHash(lng: number, lat: number, radiusKm: number): string {
  // Round coordinates to ~100m precision for cache grouping
  const precision = 3; // ~111m precision
  const roundedLng = lng.toFixed(precision);
  const roundedLat = lat.toFixed(precision);
  const roundedRadius = Math.round(radiusKm);

  return `${roundedLng}:${roundedLat}:${roundedRadius}`;
}

// Generate cache key for nearby search
export function getNearbySearchCacheKey(lng: number, lat: number, radiusKm: number): string {
  const locationHash = generateLocationHash(lng, lat, radiusKm);
  return `${CACHE_KEYS.NEARBY}${locationHash}`;
}

// Generate cache key for search results
export function getSearchCacheKey(query: string): string {
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, '_');
  return `${CACHE_KEYS.SEARCH}${normalizedQuery}`;
}

// Generate cache key for construction details
export function getConstructionCacheKey(slug: string): string {
  return `${CACHE_KEYS.CONSTRUCTION}${slug}`;
}

// Generate cache key for development details
export function getDevelopmentCacheKey(slug: string): string {
  return `${CACHE_KEYS.DEVELOPMENT}${slug}`;
}

// Cache invalidation helpers for PayloadCMS hooks
export async function invalidateConstructionCache(slug?: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    // Always invalidate the map data cache when any construction changes
    await deleteFromCache(CACHE_KEYS.MAP_DATA);

    // Invalidate specific construction cache if slug provided
    if (slug) {
      await deleteFromCache(getConstructionCacheKey(slug));
    }

    // Invalidate nearby search caches (all of them since geometry might have changed)
    await invalidateCachePattern(`${CACHE_KEYS.NEARBY}*`);

    // Invalidate search results (construction might appear in searches)
    await invalidateCachePattern(`${CACHE_KEYS.SEARCH}*`);

    cacheLogger.info('Invalidated construction caches', { slug: slug || 'all' });
  } catch (error) {
    cacheLogger.error('Error invalidating construction cache', error instanceof Error ? error : String(error), { slug });
  }
}

// Cache invalidation for Developments collection
export async function invalidateDevelopmentCache(slug?: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    // Always invalidate the map data cache when any development changes
    await deleteFromCache(CACHE_KEYS.MAP_DATA);

    // Invalidate specific development cache if slug provided
    if (slug) {
      await deleteFromCache(getDevelopmentCacheKey(slug));
    }

    // Invalidate nearby search caches (all of them since geometry might have changed)
    await invalidateCachePattern(`${CACHE_KEYS.NEARBY}*`);

    // Invalidate search results (development might appear in searches)
    await invalidateCachePattern(`${CACHE_KEYS.SEARCH}*`);

    cacheLogger.info('Invalidated development caches', { slug: slug || 'all' });
  } catch (error) {
    cacheLogger.error('Error invalidating development cache', error instanceof Error ? error : String(error), { slug });
  }
}

// Invalidate all caches (useful for admin operations)
export async function invalidateAllCaches(): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await invalidateCachePattern('cache:*');
    cacheLogger.info('Invalidated all caches');
  } catch (error) {
    cacheLogger.error('Error invalidating all caches', error instanceof Error ? error : String(error));
  }
}

// Cache statistics helpers
async function incrementCacheHit(): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.hincrby(CACHE_KEYS.STATS, 'hits', 1);
  } catch {
    // Silently fail stats tracking
  }
}

export async function incrementCacheMiss(): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.hincrby(CACHE_KEYS.STATS, 'misses', 1);
  } catch {
    // Silently fail stats tracking
  }
}

export async function getCacheStats(): Promise<CacheStats | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const stats = await redis.hgetall<{ hits?: string; misses?: string; lastReset?: string }>(CACHE_KEYS.STATS);
    if (!stats) {
      return { hits: 0, misses: 0, lastReset: new Date().toISOString() };
    }
    return {
      hits: parseInt(stats.hits || '0', 10),
      misses: parseInt(stats.misses || '0', 10),
      lastReset: stats.lastReset || new Date().toISOString(),
    };
  } catch (error) {
    cacheLogger.error('Error getting cache stats', error instanceof Error ? error : String(error));
    return null;
  }
}

export async function resetCacheStats(): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.hset(CACHE_KEYS.STATS, {
      hits: '0',
      misses: '0',
      lastReset: new Date().toISOString(),
    });
  } catch (error) {
    cacheLogger.error('Error resetting cache stats', error instanceof Error ? error : String(error));
  }
}

// Helper to wrap API handlers with cache
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<{ data: T; fromCache: boolean }> {
  // Try to get from cache first
  const cached = await getFromCache<T>(key);
  if (cached !== null) {
    return { data: cached, fromCache: true };
  }

  // Track cache miss
  await incrementCacheMiss();

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache (don't await to avoid blocking response)
  setInCache(key, data, ttlSeconds).catch(() => {
    // Silently handle cache write failures
  });

  return { data, fromCache: false };
}

// Export Redis info for diagnostics
export { getRedisMode, getRedisInfo } from './redis';
