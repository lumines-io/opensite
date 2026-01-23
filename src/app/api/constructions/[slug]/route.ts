import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { REST_DELETE, REST_PATCH, REST_PUT } from '@payloadcms/next/routes';
import { withApiHandler, createErrorResponse } from '@/lib/api-utils';
import {
  withCache,
  getConstructionCacheKey,
  CACHE_TTL,
  isCacheEnabled,
} from '@/lib/cache';

interface ChangelogEntry {
  id: string | number;
  title: string;
  changeType: string;
  eventDate: string;
}

interface ConstructionWithChangelog {
  [key: string]: unknown;
  recentChangelog: ChangelogEntry[];
}

/**
 * Check if the slug parameter looks like a Payload document ID (numeric or UUID)
 * This helps differentiate between:
 * - /api/constructions/my-construction-slug (human-readable slug)
 * - /api/constructions/123 (Payload ID for admin operations)
 */
function isPayloadId(slug: string): boolean {
  // Numeric IDs
  if (/^\d+$/.test(slug)) {
    return true;
  }
  // UUID format (used by some Payload setups)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
    return true;
  }
  return false;
}

// Fetch construction details from database
async function fetchConstructionBySlug(slug: string): Promise<ConstructionWithChangelog | null> {
  const payload = await getPayload({ config });

  // Find the construction by slug
  const { docs: constructions } = await payload.find({
    collection: 'constructions',
    where: {
      slug: {
        equals: slug,
      },
      _status: {
        equals: 'published',
      },
    },
    limit: 1,
    depth: 2, // Include related data
  });

  if (constructions.length === 0) {
    return null;
  }

  const construction = constructions[0];

  // Fetch recent changelog entries
  const { docs: recentChangelog } = await payload.find({
    collection: 'construction-changelog',
    where: {
      construction: {
        equals: construction.id,
      },
    },
    sort: '-eventDate',
    limit: 5,
  });

  return {
    ...construction,
    recentChangelog: recentChangelog.map((entry) => ({
      id: entry.id,
      title: entry.title,
      changeType: entry.changeType,
      eventDate: entry.eventDate,
    })),
  };
}

type RouteContext = { params: Promise<{ slug: string }> };

export const GET = withApiHandler<RouteContext>(async (
  request: NextRequest,
  context: RouteContext
) => {
  const { slug } = await context.params;

  // If it looks like a Payload ID, let Payload handle it by fetching directly
  if (isPayloadId(slug)) {
    const payload = await getPayload({ config });
    try {
      const construction = await payload.findByID({
        collection: 'constructions',
        id: slug,
        depth: 2,
      });
      return NextResponse.json(construction);
    } catch {
      return createErrorResponse('Construction not found', 404, { code: 'NOT_FOUND' });
    }
  }

  const cacheKey = getConstructionCacheKey(slug);

  const { data: construction, fromCache } = await withCache<ConstructionWithChangelog | null>(
    cacheKey,
    CACHE_TTL.CONSTRUCTION_DETAIL,
    () => fetchConstructionBySlug(slug)
  );

  if (!construction) {
    return createErrorResponse('Construction not found', 404, { code: 'NOT_FOUND' });
  }

  // Create response with cache headers
  const response = NextResponse.json(construction);

  // Add cache indicator header
  if (isCacheEnabled() && fromCache) {
    response.headers.set('X-Cache', 'HIT');
  } else {
    response.headers.set('X-Cache', 'MISS');
  }

  // Public cache for CDN/browser caching
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=120, stale-while-revalidate=600'
  );

  return response;
});

/**
 * Forward PATCH requests to Payload's REST API handler
 * This allows PayloadCMS admin to update constructions through this route
 */
export const PATCH = REST_PATCH(config);

/**
 * Forward PUT requests to Payload's REST API handler
 * This allows PayloadCMS admin to update constructions through this route
 */
export const PUT = REST_PUT(config);

/**
 * Forward DELETE requests to Payload's REST API handler
 * This allows PayloadCMS admin to delete constructions through this route
 */
export const DELETE = REST_DELETE(config);
