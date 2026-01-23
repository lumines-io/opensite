import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock functions to control behavior
const mockGetRedisMode = vi.fn(() => 'none');
const mockIsFeatureEnabled = vi.fn(() => false);
const mockCreateUpstashClient = vi.fn();

// Mock the redis module
vi.mock('../redis', () => ({
  getRedisMode: () => mockGetRedisMode(),
  createUpstashClient: () => mockCreateUpstashClient(),
  getRedisInfo: vi.fn(),
}));

// Mock the feature flags
vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: (flag: string) => mockIsFeatureEnabled(flag),
  FEATURE_FLAGS: {
    FEATURE_RATE_LIMITING: 'FEATURE_RATE_LIMITING',
  },
}));

import {
  rateLimitConfigs,
  getClientIdentifier,
  createRateLimitHeaders,
  checkRateLimit,
  createRateLimitErrorResponse,
  withRateLimit,
  rateLimitedHandler,
  type RateLimitResult,
} from '../rate-limit';

// Helper to create a mock NextRequest
function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const headerObj = new Headers(headers);
  return {
    headers: headerObj,
  } as unknown as NextRequest;
}

describe('Rate Limit Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rateLimitConfigs', () => {
    it('should have standard tier configuration', () => {
      expect(rateLimitConfigs.standard.requests).toBe(60);
      expect(rateLimitConfigs.standard.window).toBe('1m');
      expect(rateLimitConfigs.standard.prefix).toBe('ratelimit:standard');
    });

    it('should have scraper tier configuration', () => {
      expect(rateLimitConfigs.scraper.requests).toBe(10);
      expect(rateLimitConfigs.scraper.window).toBe('1m');
      expect(rateLimitConfigs.scraper.prefix).toBe('ratelimit:scraper');
    });

    it('should have admin tier configuration', () => {
      expect(rateLimitConfigs.admin.requests).toBe(100);
      expect(rateLimitConfigs.admin.window).toBe('1m');
      expect(rateLimitConfigs.admin.prefix).toBe('ratelimit:admin');
    });

    it('should have search tier configuration', () => {
      expect(rateLimitConfigs.search.requests).toBe(30);
      expect(rateLimitConfigs.search.window).toBe('1m');
      expect(rateLimitConfigs.search.prefix).toBe('ratelimit:search');
    });

    it('should have map tier configuration', () => {
      expect(rateLimitConfigs.map.requests).toBe(120);
      expect(rateLimitConfigs.map.window).toBe('1m');
      expect(rateLimitConfigs.map.prefix).toBe('ratelimit:map');
    });

    it('should have appropriate request limits by tier', () => {
      // Most restrictive
      expect(rateLimitConfigs.scraper.requests).toBeLessThan(rateLimitConfigs.search.requests);

      // Standard is moderate
      expect(rateLimitConfigs.search.requests).toBeLessThan(rateLimitConfigs.standard.requests);

      // Admin has higher limits
      expect(rateLimitConfigs.standard.requests).toBeLessThan(rateLimitConfigs.admin.requests);

      // Map has highest limits (cached)
      expect(rateLimitConfigs.admin.requests).toBeLessThan(rateLimitConfigs.map.requests);
    });
  });

  describe('getClientIdentifier', () => {
    it('should return API key identifier when x-api-key header is present', () => {
      const request = createMockRequest({
        'x-api-key': 'test-api-key-123',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('api:test-api-key-123');
    });

    it('should return user ID identifier when x-user-id header is present', () => {
      const request = createMockRequest({
        'x-user-id': 'user-456',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('user:user-456');
    });

    it('should prioritize API key over user ID', () => {
      const request = createMockRequest({
        'x-api-key': 'test-api-key',
        'x-user-id': 'user-123',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('api:test-api-key');
    });

    it('should return IP identifier from x-forwarded-for header', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('ip:192.168.1.1');
    });

    it('should handle x-forwarded-for with whitespace', () => {
      const request = createMockRequest({
        'x-forwarded-for': '  192.168.1.1  , 10.0.0.1',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('ip:192.168.1.1');
    });

    it('should return IP identifier from x-real-ip header', () => {
      const request = createMockRequest({
        'x-real-ip': '10.0.0.5',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('ip:10.0.0.5');
    });

    it('should prioritize x-forwarded-for over x-real-ip', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '10.0.0.5',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('ip:192.168.1.1');
    });

    it('should return unknown IP when no identifying headers present', () => {
      const request = createMockRequest({});

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('ip:unknown');
    });

    it('should prioritize API key over all other identifiers', () => {
      const request = createMockRequest({
        'x-api-key': 'api-key',
        'x-user-id': 'user-id',
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '10.0.0.1',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('api:api-key');
    });

    it('should prioritize user ID over IP', () => {
      const request = createMockRequest({
        'x-user-id': 'user-id',
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '10.0.0.1',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('user:user-id');
    });
  });

  describe('createRateLimitHeaders', () => {
    it('should create headers with correct limit value', () => {
      const result: RateLimitResult = {
        success: true,
        limit: 60,
        remaining: 59,
        reset: 1700000000000,
      };

      const headers = createRateLimitHeaders(result);
      expect(headers.get('X-RateLimit-Limit')).toBe('60');
    });

    it('should create headers with correct remaining value', () => {
      const result: RateLimitResult = {
        success: true,
        limit: 60,
        remaining: 45,
        reset: 1700000000000,
      };

      const headers = createRateLimitHeaders(result);
      expect(headers.get('X-RateLimit-Remaining')).toBe('45');
    });

    it('should create headers with correct reset value', () => {
      const resetTime = 1700000000000;
      const result: RateLimitResult = {
        success: true,
        limit: 60,
        remaining: 59,
        reset: resetTime,
      };

      const headers = createRateLimitHeaders(result);
      expect(headers.get('X-RateLimit-Reset')).toBe(resetTime.toString());
    });

    it('should create headers with zero remaining', () => {
      const result: RateLimitResult = {
        success: false,
        limit: 60,
        remaining: 0,
        reset: 1700000000000,
      };

      const headers = createRateLimitHeaders(result);
      expect(headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should create headers regardless of success state', () => {
      const successResult: RateLimitResult = {
        success: true,
        limit: 60,
        remaining: 59,
        reset: 1700000000000,
      };

      const failResult: RateLimitResult = {
        success: false,
        limit: 60,
        remaining: 0,
        reset: 1700000000000,
      };

      const successHeaders = createRateLimitHeaders(successResult);
      const failHeaders = createRateLimitHeaders(failResult);

      expect(successHeaders.get('X-RateLimit-Limit')).toBe('60');
      expect(failHeaders.get('X-RateLimit-Limit')).toBe('60');
    });
  });

  describe('rate limit tier ordering', () => {
    it('should have scraper as most restrictive tier', () => {
      const tiers = Object.entries(rateLimitConfigs);
      const scraperTier = rateLimitConfigs.scraper;

      tiers.forEach(([name, config]) => {
        if (name !== 'scraper') {
          expect(scraperTier.requests).toBeLessThanOrEqual(config.requests);
        }
      });
    });

    it('should have map as least restrictive tier', () => {
      const tiers = Object.entries(rateLimitConfigs);
      const mapTier = rateLimitConfigs.map;

      tiers.forEach(([name, config]) => {
        if (name !== 'map') {
          expect(mapTier.requests).toBeGreaterThanOrEqual(config.requests);
        }
      });
    });
  });

  describe('identifier format consistency', () => {
    it('should always return identifier with prefix:value format', () => {
      const testCases = [
        { headers: { 'x-api-key': 'key' }, expectedPrefix: 'api:' },
        { headers: { 'x-user-id': 'user' }, expectedPrefix: 'user:' },
        { headers: { 'x-forwarded-for': '1.2.3.4' }, expectedPrefix: 'ip:' },
        { headers: { 'x-real-ip': '5.6.7.8' }, expectedPrefix: 'ip:' },
        { headers: {}, expectedPrefix: 'ip:' },
      ];

      testCases.forEach(({ headers, expectedPrefix }) => {
        const request = createMockRequest(headers);
        const identifier = getClientIdentifier(request);
        expect(identifier.startsWith(expectedPrefix)).toBe(true);
      });
    });
  });

  describe('checkRateLimit', () => {
    it('should return success when rate limiting is not configured', async () => {
      mockIsFeatureEnabled.mockReturnValue(false);
      mockGetRedisMode.mockReturnValue('none');

      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const result = await checkRateLimit(request, 'standard');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(rateLimitConfigs.standard.requests);
      expect(result.remaining).toBe(rateLimitConfigs.standard.requests);
    });

    it('should return success for different tiers when not configured', async () => {
      mockIsFeatureEnabled.mockReturnValue(false);
      mockGetRedisMode.mockReturnValue('none');

      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });

      const scraperResult = await checkRateLimit(request, 'scraper');
      expect(scraperResult.success).toBe(true);
      expect(scraperResult.limit).toBe(rateLimitConfigs.scraper.requests);

      const adminResult = await checkRateLimit(request, 'admin');
      expect(adminResult.success).toBe(true);
      expect(adminResult.limit).toBe(rateLimitConfigs.admin.requests);

      const searchResult = await checkRateLimit(request, 'search');
      expect(searchResult.success).toBe(true);
      expect(searchResult.limit).toBe(rateLimitConfigs.search.requests);

      const mapResult = await checkRateLimit(request, 'map');
      expect(mapResult.success).toBe(true);
      expect(mapResult.limit).toBe(rateLimitConfigs.map.requests);
    });

    it('should use standard tier by default', async () => {
      mockIsFeatureEnabled.mockReturnValue(false);
      mockGetRedisMode.mockReturnValue('none');

      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const result = await checkRateLimit(request);

      expect(result.limit).toBe(rateLimitConfigs.standard.requests);
    });
  });

  describe('createRateLimitErrorResponse', () => {
    it('should create 429 error response', () => {
      const result: RateLimitResult = {
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      };

      const response = createRateLimitErrorResponse(result);

      expect(response.status).toBe(429);
    });

    it('should include rate limit headers in error response', () => {
      const result: RateLimitResult = {
        success: false,
        limit: 60,
        remaining: 0,
        reset: 1700000000000,
      };

      const response = createRateLimitErrorResponse(result);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBe('1700000000000');
    });

    it('should include error message in response body', async () => {
      const result: RateLimitResult = {
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 30000,
      };

      const response = createRateLimitErrorResponse(result);
      const body = await response.json();

      expect(body.error).toBe('Too Many Requests');
      expect(body.message).toContain('Rate limit exceeded');
      expect(body.retryAfter).toBeDefined();
      expect(typeof body.retryAfter).toBe('number');
    });

    it('should calculate retryAfter based on reset time', async () => {
      const resetTime = Date.now() + 45000; // 45 seconds from now
      const result: RateLimitResult = {
        success: false,
        limit: 60,
        remaining: 0,
        reset: resetTime,
      };

      const response = createRateLimitErrorResponse(result);
      const body = await response.json();

      // Should be approximately 45 seconds, allow some variance
      expect(body.retryAfter).toBeGreaterThan(40);
      expect(body.retryAfter).toBeLessThanOrEqual(46);
    });

    it('should handle negative retryAfter when reset is in the past', async () => {
      const resetTime = Date.now() - 5000; // 5 seconds in the past
      const result: RateLimitResult = {
        success: false,
        limit: 60,
        remaining: 0,
        reset: resetTime,
      };

      const response = createRateLimitErrorResponse(result);
      const body = await response.json();

      // Math.ceil of negative number results in negative or 0
      expect(body.retryAfter).toBeLessThanOrEqual(0);
    });
  });

  describe('withRateLimit', () => {
    it('should call handler and add rate limit headers when rate limit passes', async () => {
      mockIsFeatureEnabled.mockReturnValue(false);
      mockGetRedisMode.mockReturnValue('none');

      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ data: 'success' }, { status: 200 })
      );

      const middleware = withRateLimit('standard');
      const response = await middleware(request, mockHandler);

      expect(mockHandler).toHaveBeenCalledWith(request);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('60');
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should return 429 error response when rate limit result is not success', async () => {
      // Test the createRateLimitErrorResponse path directly
      // The withRateLimit middleware uses this when checkRateLimit returns success: false
      const errorResponse = createRateLimitErrorResponse({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      expect(errorResponse.status).toBe(429);
      expect(errorResponse.headers.get('X-RateLimit-Limit')).toBe('60');
      expect(errorResponse.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should work with different rate limit tiers', async () => {
      mockIsFeatureEnabled.mockReturnValue(false);
      mockGetRedisMode.mockReturnValue('none');

      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ data: 'success' })
      );

      // Test with scraper tier
      const scraperMiddleware = withRateLimit('scraper');
      const scraperResponse = await scraperMiddleware(request, mockHandler);
      expect(scraperResponse.headers.get('X-RateLimit-Limit')).toBe('10');

      // Test with admin tier
      const adminMiddleware = withRateLimit('admin');
      const adminResponse = await adminMiddleware(request, mockHandler);
      expect(adminResponse.headers.get('X-RateLimit-Limit')).toBe('100');

      // Test with map tier
      const mapMiddleware = withRateLimit('map');
      const mapResponse = await mapMiddleware(request, mockHandler);
      expect(mapResponse.headers.get('X-RateLimit-Limit')).toBe('120');
    });
  });

  describe('rateLimitedHandler', () => {
    it('should wrap handler and add rate limit headers on success', async () => {
      mockIsFeatureEnabled.mockReturnValue(false);
      mockGetRedisMode.mockReturnValue('none');

      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ data: 'success' }, { status: 200 })
      );

      const wrappedHandler = rateLimitedHandler('standard', mockHandler);
      const response = await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('60');
    });

    it('should return 429 error response structure for rate limited requests', async () => {
      // Test the error response structure that rateLimitedHandler uses
      // when checkRateLimit returns success: false
      const errorResponse = createRateLimitErrorResponse({
        success: false,
        limit: 30,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      expect(errorResponse.status).toBe(429);
      expect(errorResponse.headers.get('X-RateLimit-Limit')).toBe('30');

      const body = await errorResponse.json();
      expect(body.error).toBe('Too Many Requests');
      expect(body.message).toContain('Rate limit exceeded');
    });

    it('should work with different tiers', async () => {
      mockIsFeatureEnabled.mockReturnValue(false);
      mockGetRedisMode.mockReturnValue('none');

      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));

      const scraperHandler = rateLimitedHandler('scraper', mockHandler);
      const response = await scraperHandler(request);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
    });
  });

  describe('getClientIdentifier edge cases', () => {
    it('should handle empty x-forwarded-for header', () => {
      const request = createMockRequest({
        'x-forwarded-for': '',
      });

      const identifier = getClientIdentifier(request);
      // Empty string should fall through to unknown
      expect(identifier).toBe('ip:unknown');
    });

    it('should handle x-forwarded-for with only commas', () => {
      const request = createMockRequest({
        'x-forwarded-for': ', , ,',
      });

      const identifier = getClientIdentifier(request);
      // First element after split is empty, should use x-real-ip or unknown
      expect(identifier).toBe('ip:unknown');
    });

    it('should handle very long API key', () => {
      const longApiKey = 'a'.repeat(1000);
      const request = createMockRequest({
        'x-api-key': longApiKey,
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe(`api:${longApiKey}`);
    });

    it('should handle special characters in user ID', () => {
      const request = createMockRequest({
        'x-user-id': 'user@example.com/path?query=1',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('user:user@example.com/path?query=1');
    });

    it('should handle IPv6 addresses', () => {
      const request = createMockRequest({
        'x-forwarded-for': '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('ip:2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    it('should handle x-forwarded-for with IPv6 and port', () => {
      const request = createMockRequest({
        'x-forwarded-for': '[::1]:8080, 192.168.1.1',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('ip:[::1]:8080');
    });
  });

  describe('checkRateLimit error handling', () => {
    it('should return success when rate limiter throws error', async () => {
      vi.resetModules();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.doMock('@upstash/ratelimit', () => ({
        Ratelimit: vi.fn().mockImplementation(() => ({
          limit: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
        })),
      }));

      vi.doMock('../redis', () => ({
        getRedisMode: () => 'upstash',
        createUpstashClient: () => ({}),
        getRedisInfo: vi.fn(),
      }));

      vi.doMock('@/lib/feature-flags', () => ({
        isFeatureEnabled: () => true,
        FEATURE_FLAGS: { FEATURE_RATE_LIMITING: 'FEATURE_RATE_LIMITING' },
      }));

      const { checkRateLimit: freshCheckRateLimit } = await import('../rate-limit');

      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const result = await freshCheckRateLimit(request, 'standard');

      // Should allow request even when Redis fails
      expect(result.success).toBe(true);
      expect(result.limit).toBe(60);
      expect(consoleSpy).toHaveBeenCalledWith('Rate limit check failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('createRateLimitHeaders edge cases', () => {
    it('should handle very large numbers', () => {
      const result: RateLimitResult = {
        success: true,
        limit: Number.MAX_SAFE_INTEGER,
        remaining: Number.MAX_SAFE_INTEGER - 1,
        reset: Number.MAX_SAFE_INTEGER,
      };

      const headers = createRateLimitHeaders(result);
      expect(headers.get('X-RateLimit-Limit')).toBe(Number.MAX_SAFE_INTEGER.toString());
      expect(headers.get('X-RateLimit-Remaining')).toBe((Number.MAX_SAFE_INTEGER - 1).toString());
    });

    it('should handle zero values', () => {
      const result: RateLimitResult = {
        success: false,
        limit: 0,
        remaining: 0,
        reset: 0,
      };

      const headers = createRateLimitHeaders(result);
      expect(headers.get('X-RateLimit-Limit')).toBe('0');
      expect(headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(headers.get('X-RateLimit-Reset')).toBe('0');
    });
  });
});
