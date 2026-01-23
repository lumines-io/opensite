import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
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
    depth: 2, // Include related data like district
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
