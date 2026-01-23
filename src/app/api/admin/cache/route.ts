import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import {
  isCacheEnabled,
  getCacheStats,
  resetCacheStats,
  invalidateAllCaches,
  invalidateConstructionCache,
  CACHE_TTL,
  getRedisInfo,
} from '@/lib/cache';
import { logSecurityEvent, getClientInfo } from '@/lib/security-logger';

/**
 * Verify admin authentication using Payload
 * SECURITY: Properly validate JWT token and check admin role
 */
async function verifyAdminAuth(request: NextRequest): Promise<{ authorized: boolean; userId?: string }> {
  try {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: request.headers as unknown as Headers });

    if (!user) {
      return { authorized: false };
    }

    // Require admin role for cache management
    if (user.role !== 'admin') {
      return { authorized: false };
    }

    return { authorized: true, userId: String(user.id) };
  } catch {
    return { authorized: false };
  }
}

// GET - Get cache status and statistics
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Properly authenticate admin users - no dev mode bypass
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      logSecurityEvent('api_auth_failure', {
        reason: 'Unauthorized access to admin cache endpoint',
        endpoint: '/api/admin/cache',
        method: 'GET',
        ...getClientInfo(request),
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const enabled = isCacheEnabled();
    const redisInfo = getRedisInfo();
    const stats = enabled ? await getCacheStats() : null;

    return NextResponse.json({
      enabled,
      redis: {
        mode: redisInfo.mode,
        isConfigured: redisInfo.isConfigured,
        isEdgeCompatible: redisInfo.isEdgeCompatible,
      },
      config: {
        ttl: {
          mapData: CACHE_TTL.MAP_DATA,
          constructionDetail: CACHE_TTL.CONSTRUCTION_DETAIL,
          searchResults: CACHE_TTL.SEARCH_RESULTS,
          nearbySearch: CACHE_TTL.NEARBY_SEARCH,
        },
        envVars: {
          UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
          UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
          KV_REST_API_URL: !!process.env.KV_REST_API_URL,
          KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
          REDIS_URL: !!process.env.REDIS_URL,
        },
      },
      stats: stats ? {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hits + stats.misses > 0
          ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%'
          : 'N/A',
        lastReset: stats.lastReset,
      } : null,
    });
  } catch (error) {
    console.error('Cache status error:', error);
    return NextResponse.json(
      { error: 'Failed to get cache status' },
      { status: 500 }
    );
  }
}

// POST - Cache management actions
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Properly authenticate admin users - no dev mode bypass
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      logSecurityEvent('api_auth_failure', {
        reason: 'Unauthorized access to admin cache endpoint',
        endpoint: '/api/admin/cache',
        method: 'POST',
        ...getClientInfo(request),
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isCacheEnabled()) {
      return NextResponse.json(
        { error: 'Cache is not enabled. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL and KV_REST_API_TOKEN) environment variables.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, slug } = body;

    switch (action) {
      case 'invalidate-all':
        await invalidateAllCaches();
        return NextResponse.json({ success: true, message: 'All caches invalidated' });

      case 'invalidate-construction':
        if (!slug) {
          return NextResponse.json(
            { error: 'Slug is required for invalidating construction cache' },
            { status: 400 }
          );
        }
        await invalidateConstructionCache(slug);
        return NextResponse.json({ success: true, message: `Cache invalidated for: ${slug}` });

      case 'invalidate-map':
        await invalidateConstructionCache();
        return NextResponse.json({ success: true, message: 'Map data cache invalidated' });

      case 'reset-stats':
        await resetCacheStats();
        return NextResponse.json({ success: true, message: 'Cache statistics reset' });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Cache action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform cache action' },
      { status: 500 }
    );
  }
}
