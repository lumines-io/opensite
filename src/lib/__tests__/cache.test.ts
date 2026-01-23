import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Redis client instance
const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  scan: vi.fn(),
  hincrby: vi.fn(),
  hgetall: vi.fn(),
  hset: vi.fn(),
};

// Mock the redis module before importing cache
const mockGetRedisMode = vi.fn(() => 'none');
const mockCreateUpstashClient = vi.fn(() => mockRedisClient);
const mockGetRedisInfo = vi.fn();

vi.mock('../redis', () => ({
  getRedisMode: () => mockGetRedisMode(),
  createUpstashClient: () => mockCreateUpstashClient(),
  getRedisInfo: () => mockGetRedisInfo(),
}));

// Mock the feature flags
const mockIsFeatureEnabled = vi.fn(() => false);

vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: (flag: string) => mockIsFeatureEnabled(flag),
  FEATURE_FLAGS: {
    FEATURE_CACHING: 'FEATURE_CACHING',
  },
}));

// Now import after mocks
import {
  CACHE_TTL,
  CACHE_KEYS,
  isCacheEnabled,
  generateLocationHash,
  getNearbySearchCacheKey,
  getSearchCacheKey,
  getConstructionCacheKey,
  getFromCache,
  setInCache,
  deleteFromCache,
  invalidateCachePattern,
  invalidateConstructionCache,
  invalidateAllCaches,
  incrementCacheMiss,
  getCacheStats,
  resetCacheStats,
  withCache,
} from '../cache';

describe('Cache Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CACHE_TTL', () => {
    it('should have correct TTL values', () => {
      expect(CACHE_TTL.MAP_DATA).toBe(5 * 60); // 5 minutes
      expect(CACHE_TTL.CONSTRUCTION_DETAIL).toBe(10 * 60); // 10 minutes
      expect(CACHE_TTL.SEARCH_RESULTS).toBe(2 * 60); // 2 minutes
      expect(CACHE_TTL.NEARBY_SEARCH).toBe(2 * 60); // 2 minutes
    });
  });

  describe('CACHE_KEYS', () => {
    it('should have correct key prefixes', () => {
      expect(CACHE_KEYS.MAP_DATA).toBe('cache:map:constructions');
      expect(CACHE_KEYS.CONSTRUCTION).toBe('cache:construction:');
      expect(CACHE_KEYS.SEARCH).toBe('cache:search:');
      expect(CACHE_KEYS.NEARBY).toBe('cache:nearby:');
      expect(CACHE_KEYS.STATS).toBe('cache:stats');
    });
  });

  describe('generateLocationHash', () => {
    it('should generate consistent hash for same coordinates', () => {
      const hash1 = generateLocationHash(106.700, 10.800, 5);
      const hash2 = generateLocationHash(106.700, 10.800, 5);
      expect(hash1).toBe(hash2);
    });

    it('should round coordinates to 3 decimal places (~111m precision)', () => {
      const hash = generateLocationHash(106.7001234, 10.8005678, 5);
      expect(hash).toBe('106.700:10.801:5');
    });

    it('should round radius to whole numbers', () => {
      const hash1 = generateLocationHash(106.7, 10.8, 5.4);
      const hash2 = generateLocationHash(106.7, 10.8, 5.6);
      expect(hash1).toBe('106.700:10.800:5');
      expect(hash2).toBe('106.700:10.800:6');
    });

    it('should generate different hashes for different coordinates', () => {
      const hash1 = generateLocationHash(106.7, 10.8, 5);
      const hash2 = generateLocationHash(106.8, 10.9, 5);
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different radii', () => {
      const hash1 = generateLocationHash(106.7, 10.8, 5);
      const hash2 = generateLocationHash(106.7, 10.8, 10);
      expect(hash1).not.toBe(hash2);
    });

    it('should handle negative coordinates', () => {
      const hash = generateLocationHash(-106.7, -10.8, 5);
      expect(hash).toBe('-106.700:-10.800:5');
    });

    it('should handle zero values', () => {
      const hash = generateLocationHash(0, 0, 0);
      expect(hash).toBe('0.000:0.000:0');
    });

    it('should handle large coordinates', () => {
      const hash = generateLocationHash(179.999, 89.999, 50);
      expect(hash).toBe('179.999:89.999:50');
    });
  });

  describe('getNearbySearchCacheKey', () => {
    it('should generate key with nearby prefix', () => {
      const key = getNearbySearchCacheKey(106.7, 10.8, 5);
      expect(key).toBe('cache:nearby:106.700:10.800:5');
    });

    it('should use generateLocationHash internally', () => {
      const locationHash = generateLocationHash(106.7, 10.8, 5);
      const key = getNearbySearchCacheKey(106.7, 10.8, 5);
      expect(key).toBe(`${CACHE_KEYS.NEARBY}${locationHash}`);
    });

    it('should round coordinates consistently', () => {
      const key1 = getNearbySearchCacheKey(106.7001, 10.8001, 5);
      const key2 = getNearbySearchCacheKey(106.7004, 10.8004, 5);
      expect(key1).toBe(key2);
    });
  });

  describe('getSearchCacheKey', () => {
    it('should generate key with search prefix', () => {
      const key = getSearchCacheKey('test query');
      expect(key).toBe('cache:search:test_query');
    });

    it('should normalize query to lowercase', () => {
      const key = getSearchCacheKey('TEST QUERY');
      expect(key).toBe('cache:search:test_query');
    });

    it('should replace spaces with underscores', () => {
      const key = getSearchCacheKey('multiple words here');
      expect(key).toBe('cache:search:multiple_words_here');
    });

    it('should normalize multiple spaces to single underscore', () => {
      const key = getSearchCacheKey('multiple   spaces   here');
      expect(key).toBe('cache:search:multiple_spaces_here');
    });

    it('should trim whitespace', () => {
      const key = getSearchCacheKey('  trimmed query  ');
      expect(key).toBe('cache:search:trimmed_query');
    });

    it('should handle empty query', () => {
      const key = getSearchCacheKey('');
      expect(key).toBe('cache:search:');
    });

    it('should handle Vietnamese characters', () => {
      const key = getSearchCacheKey('đường cao tốc');
      expect(key).toBe('cache:search:đường_cao_tốc');
    });

    it('should handle special characters', () => {
      const key = getSearchCacheKey('query-with-dashes');
      expect(key).toBe('cache:search:query-with-dashes');
    });
  });

  describe('getConstructionCacheKey', () => {
    it('should generate key with construction prefix', () => {
      const key = getConstructionCacheKey('metro-line-1');
      expect(key).toBe('cache:construction:metro-line-1');
    });

    it('should preserve slug as-is', () => {
      const key = getConstructionCacheKey('Construction-Name-2024');
      expect(key).toBe('cache:construction:Construction-Name-2024');
    });

    it('should handle empty slug', () => {
      const key = getConstructionCacheKey('');
      expect(key).toBe('cache:construction:');
    });

    it('should handle slugs with special characters', () => {
      const key = getConstructionCacheKey('slug_with_underscores');
      expect(key).toBe('cache:construction:slug_with_underscores');
    });
  });

  describe('cache key uniqueness', () => {
    it('should generate unique keys for different coordinate variations', () => {
      const keys = new Set<string>();

      // Generate 100 different location cache keys
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          const key = getNearbySearchCacheKey(106.7 + i * 0.01, 10.8 + j * 0.01, 5);
          keys.add(key);
        }
      }

      expect(keys.size).toBe(100);
    });

    it('should generate unique keys for different search queries', () => {
      const queries = [
        'metro',
        'bridge',
        'highway',
        'construction',
        'road work',
        'building site',
      ];

      const keys = queries.map(q => getSearchCacheKey(q));
      const uniqueKeys = new Set(keys);

      expect(uniqueKeys.size).toBe(queries.length);
    });
  });

  describe('isCacheEnabled', () => {
    // Note: The cache module caches the redis mode on first call,
    // so we test based on the initial mock state (redis mode = 'none')

    it('should return false when feature flag is disabled', () => {
      mockIsFeatureEnabled.mockReturnValue(false);
      // Redis mode is already cached as 'none' from initial load
      expect(isCacheEnabled()).toBe(false);
    });

    it('should return false when redis mode is none (cached value)', () => {
      mockIsFeatureEnabled.mockReturnValue(true);
      // Redis mode is cached as 'none' from module initialization
      // This tests the cached path where redis mode is checked
      expect(isCacheEnabled()).toBe(false);
    });

    it('should check feature flag first before redis mode', () => {
      // When feature flag is disabled, should return false regardless of redis mode
      mockIsFeatureEnabled.mockReturnValue(false);
      expect(isCacheEnabled()).toBe(false);

      // Call it again to verify consistent behavior
      mockIsFeatureEnabled.mockReturnValue(false);
      expect(isCacheEnabled()).toBe(false);
    });
  });

  describe('getFromCache', () => {
    it('should return null when redis client is not available', async () => {
      mockGetRedisMode.mockReturnValue('none');

      const result = await getFromCache<string>('test-key');

      expect(result).toBeNull();
    });
  });

  describe('setInCache', () => {
    it('should return false when redis client is not available', async () => {
      mockGetRedisMode.mockReturnValue('none');

      const result = await setInCache('test-key', { data: 'test' }, 300);

      expect(result).toBe(false);
    });
  });

  describe('deleteFromCache', () => {
    it('should return false when redis client is not available', async () => {
      mockGetRedisMode.mockReturnValue('none');

      const result = await deleteFromCache('test-key');

      expect(result).toBe(false);
    });
  });

  describe('deleteFromCache with Redis available', () => {
    beforeEach(() => {
      // Reset module cache to allow upstash mode
      vi.resetModules();
    });

    it('should call redis.del and return true on success', async () => {
      // For this test we need a fresh import with upstash mode
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn().mockResolvedValue(1),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { deleteFromCache: freshDeleteFromCache } = await import('../cache');
      const result = await freshDeleteFromCache('test-key');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should return false and log error when redis.del throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { deleteFromCache: freshDeleteFromCache } = await import('../cache');
      const result = await freshDeleteFromCache('test-key');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[Cache] Error deleting from cache:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('invalidateCachePattern', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should return 0 when redis client is not available', async () => {
      const result = await invalidateCachePattern('cache:*');
      expect(result).toBe(0);
    });

    it('should scan and delete matching keys', async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn().mockResolvedValue(2),
        scan: vi.fn()
          .mockResolvedValueOnce(['0', ['cache:key1', 'cache:key2']]), // cursor 0 means done
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { invalidateCachePattern: freshInvalidate } = await import('../cache');
      const result = await freshInvalidate('cache:*');

      expect(result).toBe(2);
      expect(mockRedis.scan).toHaveBeenCalledWith('0', { match: 'cache:*', count: 100 });
      expect(mockRedis.del).toHaveBeenCalledWith('cache:key1', 'cache:key2');
    });

    it('should handle multiple scan iterations', async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn().mockResolvedValue(1),
        scan: vi.fn()
          .mockResolvedValueOnce(['123', ['cache:key1']]) // First batch, cursor 123
          .mockResolvedValueOnce(['0', ['cache:key2']]),  // Second batch, cursor 0 means done
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { invalidateCachePattern: freshInvalidate } = await import('../cache');
      const result = await freshInvalidate('cache:*');

      expect(result).toBe(2);
      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
    });

    it('should handle empty scan results', async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn().mockResolvedValueOnce(['0', []]),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { invalidateCachePattern: freshInvalidate } = await import('../cache');
      const result = await freshInvalidate('nonexistent:*');

      expect(result).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should return 0 and log error when scan throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn().mockRejectedValue(new Error('Scan failed')),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { invalidateCachePattern: freshInvalidate } = await import('../cache');
      const result = await freshInvalidate('cache:*');

      expect(result).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('invalidateConstructionCache', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should do nothing when redis client is not available', async () => {
      // With default mocks (redis mode = none), should exit early
      await invalidateConstructionCache('test-slug');
      // No error should be thrown
    });

    it('should invalidate map data cache and specific construction cache when slug provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn().mockResolvedValue(1),
        scan: vi.fn().mockResolvedValue(['0', []]),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { invalidateConstructionCache: freshInvalidate } = await import('../cache');
      await freshInvalidate('metro-line-1');

      expect(mockRedis.del).toHaveBeenCalledWith('cache:map:constructions');
      expect(mockRedis.del).toHaveBeenCalledWith('cache:construction:metro-line-1');
      expect(consoleSpy).toHaveBeenCalledWith('[Cache] Invalidated construction caches', 'for slug: metro-line-1');
      consoleSpy.mockRestore();
    });

    it('should invalidate all caches when slug not provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn().mockResolvedValue(1),
        scan: vi.fn().mockResolvedValue(['0', []]),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { invalidateConstructionCache: freshInvalidate } = await import('../cache');
      await freshInvalidate();

      expect(mockRedis.del).toHaveBeenCalledWith('cache:map:constructions');
      expect(consoleSpy).toHaveBeenCalledWith('[Cache] Invalidated construction caches', '(all)');
      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn().mockRejectedValue(new Error('Delete failed')),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { invalidateConstructionCache: freshInvalidate } = await import('../cache');
      await freshInvalidate('test-slug');

      // The error could be from deleteFromCache or invalidateCachePattern
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('invalidateAllCaches', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should do nothing when redis client is not available', async () => {
      await invalidateAllCaches();
      // No error should be thrown
    });

    it('should invalidate all cache keys', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn().mockResolvedValue(5),
        scan: vi.fn().mockResolvedValue(['0', ['cache:key1', 'cache:key2']]),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { invalidateAllCaches: freshInvalidate } = await import('../cache');
      await freshInvalidate();

      expect(mockRedis.scan).toHaveBeenCalledWith('0', { match: 'cache:*', count: 100 });
      expect(consoleSpy).toHaveBeenCalledWith('[Cache] Invalidated all caches');
      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn().mockRejectedValue(new Error('Scan failed')),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { invalidateAllCaches: freshInvalidate } = await import('../cache');
      await freshInvalidate();

      // Error is logged from invalidateCachePattern
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('incrementCacheMiss', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should do nothing when redis client is not available', async () => {
      await incrementCacheMiss();
      // No error should be thrown
    });

    it('should increment misses counter', async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn().mockResolvedValue(1),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { incrementCacheMiss: freshIncrement } = await import('../cache');
      await freshIncrement();

      expect(mockRedis.hincrby).toHaveBeenCalledWith('cache:stats', 'misses', 1);
    });

    it('should silently fail when hincrby throws', async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn().mockRejectedValue(new Error('Redis error')),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { incrementCacheMiss: freshIncrement } = await import('../cache');
      // Should not throw
      await freshIncrement();
    });
  });

  describe('getCacheStats', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should return null when redis client is not available', async () => {
      const result = await getCacheStats();
      expect(result).toBeNull();
    });

    it('should return stats from redis', async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn().mockResolvedValue({
          hits: '100',
          misses: '25',
          lastReset: '2024-01-01T00:00:00.000Z',
        }),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { getCacheStats: freshGetStats } = await import('../cache');
      const result = await freshGetStats();

      expect(result).toEqual({
        hits: 100,
        misses: 25,
        lastReset: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should return default stats when hash does not exist', async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn().mockResolvedValue(null),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { getCacheStats: freshGetStats } = await import('../cache');
      const result = await freshGetStats();

      expect(result).toEqual({
        hits: 0,
        misses: 0,
        lastReset: expect.any(String),
      });
    });

    it('should handle missing fields in stats', async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn().mockResolvedValue({}),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { getCacheStats: freshGetStats } = await import('../cache');
      const result = await freshGetStats();

      expect(result).toEqual({
        hits: 0,
        misses: 0,
        lastReset: expect.any(String),
      });
    });

    it('should return null and log error when hgetall throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn().mockRejectedValue(new Error('Redis error')),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { getCacheStats: freshGetStats } = await import('../cache');
      const result = await freshGetStats();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('[Cache] Error getting cache stats:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('resetCacheStats', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should do nothing when redis client is not available', async () => {
      await resetCacheStats();
      // No error should be thrown
    });

    it('should reset stats to zero', async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn().mockResolvedValue('OK'),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { resetCacheStats: freshReset } = await import('../cache');
      await freshReset();

      expect(mockRedis.hset).toHaveBeenCalledWith('cache:stats', {
        hits: '0',
        misses: '0',
        lastReset: expect.any(String),
      });
    });

    it('should log error when hset throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn().mockRejectedValue(new Error('Redis error')),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { resetCacheStats: freshReset } = await import('../cache');
      await freshReset();

      expect(consoleSpy).toHaveBeenCalledWith('[Cache] Error resetting cache stats:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('withCache', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should return cached data when available', async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue({ data: 'cached' }),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { withCache: freshWithCache } = await import('../cache');
      const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });

      const result = await freshWithCache('test-key', 300, fetcher);

      expect(result.data).toEqual({ data: 'cached' });
      expect(result.fromCache).toBe(true);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch and cache data when not in cache', async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { withCache: freshWithCache } = await import('../cache');
      const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });

      const result = await freshWithCache('test-key', 300, fetcher);

      expect(result.data).toEqual({ data: 'fresh' });
      expect(result.fromCache).toBe(false);
      expect(fetcher).toHaveBeenCalled();
      expect(mockRedis.hincrby).toHaveBeenCalledWith('cache:stats', 'misses', 1);
    });

    it('should increment cache hit when data found', async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue({ data: 'cached' }),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { withCache: freshWithCache } = await import('../cache');
      await freshWithCache('test-key', 300, vi.fn());

      expect(mockRedis.hincrby).toHaveBeenCalledWith('cache:stats', 'hits', 1);
    });

    it('should handle cache set failure silently', async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockRejectedValue(new Error('Set failed')),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { withCache: freshWithCache } = await import('../cache');
      const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });

      // Should not throw even if cache set fails
      const result = await freshWithCache('test-key', 300, fetcher);

      expect(result.data).toEqual({ data: 'fresh' });
      expect(result.fromCache).toBe(false);
    });

    it('should work when redis is not available', async () => {
      // With default mocks (redis mode = none), cache should be bypassed
      const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });

      const result = await withCache('test-key', 300, fetcher);

      expect(result.data).toEqual({ data: 'fresh' });
      expect(result.fromCache).toBe(false);
      expect(fetcher).toHaveBeenCalled();
    });
  });

  describe('getFromCache with Redis available', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should return data and increment hits when found', async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue({ test: 'data' }),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { getFromCache: freshGet } = await import('../cache');
      const result = await freshGet<{ test: string }>('test-key');

      expect(result).toEqual({ test: 'data' });
      expect(mockRedis.hincrby).toHaveBeenCalledWith('cache:stats', 'hits', 1);
    });

    it('should return null when key not found', async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { getFromCache: freshGet } = await import('../cache');
      const result = await freshGet('nonexistent-key');

      expect(result).toBeNull();
      expect(mockRedis.hincrby).not.toHaveBeenCalled();
    });

    it('should return null and log error when get throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRedis = {
        get: vi.fn().mockRejectedValue(new Error('Get failed')),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { getFromCache: freshGet } = await import('../cache');
      const result = await freshGet('test-key');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('[Cache] Error getting from cache:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('setInCache with Redis available', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should set data with TTL and return true', async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn().mockResolvedValue('OK'),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { setInCache: freshSet } = await import('../cache');
      const result = await freshSet('test-key', { data: 'test' }, 300);

      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith('test-key', { data: 'test' }, { ex: 300 });
    });

    it('should return false and log error when set throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn().mockRejectedValue(new Error('Set failed')),
        del: vi.fn(),
        scan: vi.fn(),
        hincrby: vi.fn(),
        hgetall: vi.fn(),
        hset: vi.fn(),
      };

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => mockRedis,
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_CACHING: 'FEATURE_CACHING' },
      }));

      const { setInCache: freshSet } = await import('../cache');
      const result = await freshSet('test-key', { data: 'test' }, 300);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[Cache] Error setting cache:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('generateLocationHash should handle NaN values', () => {
      const hash = generateLocationHash(NaN, NaN, NaN);
      expect(hash).toBe('NaN:NaN:NaN');
    });

    it('generateLocationHash should handle Infinity', () => {
      const hash = generateLocationHash(Infinity, -Infinity, Infinity);
      expect(hash).toBe('Infinity:-Infinity:Infinity');
    });

    it('getSearchCacheKey should handle whitespace-only query', () => {
      const key = getSearchCacheKey('   ');
      expect(key).toBe('cache:search:');
    });

    it('getSearchCacheKey should handle tabs and newlines', () => {
      const key = getSearchCacheKey('test\tquery\nhere');
      expect(key).toBe('cache:search:test_query_here');
    });
  });
});
