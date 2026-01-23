import { Redis as UpstashRedis } from '@upstash/redis';

/**
 * Redis client configuration
 *
 * Supports three modes:
 * 1. Upstash REST API (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) - Edge compatible
 * 2. Vercel KV (KV_REST_API_URL + KV_REST_API_TOKEN) - Edge compatible
 * 3. Local Redis (REDIS_URL) - Server-side only (not Edge compatible)
 *
 * Priority: Upstash REST > Vercel KV > Local Redis
 *
 * Note: Local Redis requires ioredis which uses Node.js APIs not available in Edge runtime.
 * For middleware (Edge runtime), only Upstash/Vercel KV is supported.
 */

export type RedisMode = 'upstash' | 'local' | 'none';

// Detect which Redis mode to use
export function getRedisMode(): RedisMode {
  // Check for Upstash REST API
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return 'upstash';
  }

  // Check for Vercel KV (same as Upstash)
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return 'upstash';
  }

  // Check for local Redis
  if (process.env.REDIS_URL) {
    return 'local';
  }

  return 'none';
}

// Create Upstash Redis client (Edge-compatible)
export function createUpstashClient(): UpstashRedis {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';

  return new UpstashRedis({ url, token });
}

// Export info about configuration
export function getRedisInfo(): {
  mode: RedisMode;
  isConfigured: boolean;
  isEdgeCompatible: boolean;
} {
  const mode = getRedisMode();
  return {
    mode,
    isConfigured: mode !== 'none',
    isEdgeCompatible: mode === 'upstash',
  };
}
