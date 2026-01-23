import { Ratelimit } from '@upstash/ratelimit';
import { NextRequest, NextResponse } from 'next/server';
import {
  getRedisMode,
  getRedisInfo,
  createUpstashClient,
  RedisMode,
} from './redis';
import { isFeatureEnabled, FEATURE_FLAGS } from '@/lib/feature-flags';

// Rate limit configurations for different tiers
export const rateLimitConfigs = {
  // Standard API endpoints - general public access
  standard: {
    requests: 60,
    window: '1m' as const,
    prefix: 'ratelimit:standard',
  },
  // Scraper endpoints - more restrictive
  scraper: {
    requests: 10,
    window: '1m' as const,
    prefix: 'ratelimit:scraper',
  },
  // Admin endpoints - authenticated users
  admin: {
    requests: 100,
    window: '1m' as const,
    prefix: 'ratelimit:admin',
  },
  // Search endpoints - moderate limits
  search: {
    requests: 30,
    window: '1m' as const,
    prefix: 'ratelimit:search',
  },
  // Map data endpoints - cached, higher limits
  map: {
    requests: 120,
    window: '1m' as const,
    prefix: 'ratelimit:map',
  },
} as const;

export type RateLimitTier = keyof typeof rateLimitConfigs;

// Cache redis mode detection
let cachedRedisMode: RedisMode | null = null;

function getRedisModeCached(): RedisMode {
  if (cachedRedisMode === null) {
    cachedRedisMode = getRedisMode();
  }
  return cachedRedisMode;
}

// Check if rate limiting is configured and enabled
const isRateLimitConfigured = (): boolean => {
  // Check feature flag first, then Redis availability
  if (!isFeatureEnabled(FEATURE_FLAGS.FEATURE_RATE_LIMITING)) {
    return false;
  }
  const mode = getRedisModeCached();
  // If local Redis is configured but we're in Edge runtime, skip rate limiting
  if (mode === 'local' && isEdgeRuntime()) {
    return false;
  }
  return mode !== 'none';
};

// Check if we're in Edge runtime
// Note: We use a different approach since process.versions isn't reliable in all contexts
const isEdgeRuntime = (): boolean => {
  // In Edge runtime, globalThis.EdgeRuntime is defined by Vercel
  // Also check for window (browser) since we shouldn't use ioredis there either
  return typeof globalThis !== 'undefined' &&
    (('EdgeRuntime' in globalThis) || (typeof window !== 'undefined'));
};

// Create rate limiter based on Redis mode
// For Edge runtime (middleware), only Upstash works
// For Node.js runtime (API routes), both Upstash and local Redis work
const createRateLimiter = async (tier: RateLimitTier): Promise<Ratelimit> => {
  const config = rateLimitConfigs[tier];
  const mode = getRedisModeCached();

  if (mode === 'upstash') {
    // Use Upstash REST API (Edge-compatible)
    const redis = createUpstashClient();
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      prefix: config.prefix,
      analytics: true,
    });
  } else if (mode === 'local') {
    // Check if we're in Edge runtime - local Redis not supported
    if (isEdgeRuntime()) {
      throw new Error('Local Redis is not supported in Edge runtime. Use Upstash for middleware.');
    }

    // Dynamically import local Redis module (only works in Node.js runtime)
    const { createLocalRedisClient, LocalRedisAdapter } = await import('./redis-local');
    const ioredis = createLocalRedisClient();
    const adapter = new LocalRedisAdapter(ioredis);
    return new Ratelimit({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      redis: adapter as any,
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      prefix: config.prefix,
      analytics: false, // Analytics not supported with local adapter
    });
  }

  // Should not reach here, but return a dummy that always allows
  throw new Error('No Redis configured for rate limiting');
};

// Cache rate limiter instances
const rateLimiters = new Map<RateLimitTier, Ratelimit>();

export const getRateLimiter = async (tier: RateLimitTier): Promise<Ratelimit> => {
  if (!rateLimiters.has(tier)) {
    const limiter = await createRateLimiter(tier);
    rateLimiters.set(tier, limiter);
  }
  return rateLimiters.get(tier)!;
};

// Extract client identifier from request
export const getClientIdentifier = (request: NextRequest): string => {
  // Priority: API key > User ID > IP address
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return `api:${apiKey}`;
  }

  // Check for user session (would be set by auth middleware)
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  return `ip:${ip}`;
};

// Rate limit check result
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Check rate limit for a request
export const checkRateLimit = async (
  request: NextRequest,
  tier: RateLimitTier = 'standard'
): Promise<RateLimitResult> => {
  // Skip rate limiting if not configured
  if (!isRateLimitConfigured()) {
    return {
      success: true,
      limit: rateLimitConfigs[tier].requests,
      remaining: rateLimitConfigs[tier].requests,
      reset: Date.now() + 60000,
    };
  }

  const identifier = getClientIdentifier(request);

  try {
    const rateLimiter = await getRateLimiter(tier);
    const result = await rateLimiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // SECURITY: Fail-closed - if rate limiting fails, deny the request
    // This prevents attackers from bypassing rate limits by disrupting Redis
    console.error('Rate limit check failed (denying request for security):', error);
    return {
      success: false,
      limit: rateLimitConfigs[tier].requests,
      remaining: 0,
      reset: Date.now() + 60000,
    };
  }
};

// Create rate limit response headers
export const createRateLimitHeaders = (result: RateLimitResult): Headers => {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  return headers;
};

// Rate limit error response
export const createRateLimitErrorResponse = (result: RateLimitResult): NextResponse => {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: createRateLimitHeaders(result),
    }
  );
};

// Middleware wrapper for rate limiting
export const withRateLimit = (
  tier: RateLimitTier = 'standard'
) => {
  return async (
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const result = await checkRateLimit(request, tier);

    if (!result.success) {
      return createRateLimitErrorResponse(result);
    }

    const response = await handler(request);

    // Add rate limit headers to successful responses
    const headers = createRateLimitHeaders(result);
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  };
};

// API route helper for rate limiting
export const rateLimitedHandler = <T>(
  tier: RateLimitTier,
  handler: (request: NextRequest) => Promise<NextResponse<T>>
) => {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = await checkRateLimit(request, tier);

    if (!result.success) {
      return createRateLimitErrorResponse(result);
    }

    const response = await handler(request);

    // Add rate limit headers
    const headers = createRateLimitHeaders(result);
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  };
};

// Export Redis mode info for diagnostics
export { getRedisMode, getRedisInfo };
