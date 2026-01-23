import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { withApiHandler } from '@/lib/api-utils';
import { createLogger, logCategories } from '@/lib/logger';
import {
  withCache,
  CACHE_KEYS,
  CACHE_TTL,
  isCacheEnabled,
} from '@/lib/cache';

const logger = createLogger(logCategories.API);

// Helper to extract plain text excerpt from richText
function extractExcerpt(richText: unknown, maxLength = 120): string | undefined {
  if (!richText || typeof richText !== 'object') return undefined;

  // Handle Lexical richText format
  const rt = richText as { root?: { children?: unknown[] } };
  if (rt.root?.children) {
    const texts: string[] = [];

    function extractText(node: unknown): void {
      if (!node || typeof node !== 'object') return;
      const n = node as Record<string, unknown>;

      if (n.text && typeof n.text === 'string') {
        texts.push(n.text);
      }

      if (Array.isArray(n.children)) {
        for (const child of n.children) {
          extractText(child);
        }
      }
    }

    for (const child of rt.root.children) {
      extractText(child);
    }

    const fullText = texts.join(' ').trim();
    if (!fullText) return undefined;

    if (fullText.length <= maxLength) return fullText;
    return fullText.substring(0, maxLength).trim() + '...';
  }

  return undefined;
}

// Helper to check if geometry is valid GeoJSON
function isValidGeometry(
  geometry: unknown
): geometry is GeoJSON.Geometry {
  if (!geometry || typeof geometry !== 'object') return false;
  const geo = geometry as Record<string, unknown>;
  if (!geo.type || !geo.coordinates) return false;
  const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
  if (!validTypes.includes(geo.type as string)) return false;
  if (!Array.isArray(geo.coordinates)) return false;
  return true;
}

// Helper to check if centroid is a valid coordinate array
function isValidCentroid(centroid: unknown): centroid is [number, number] {
  if (!Array.isArray(centroid)) return false;
  if (centroid.length !== 2) return false;
  if (typeof centroid[0] !== 'number' || typeof centroid[1] !== 'number') return false;
  // Basic coordinate range validation (longitude: -180 to 180, latitude: -90 to 90)
  if (centroid[0] < -180 || centroid[0] > 180) return false;
  if (centroid[1] < -90 || centroid[1] > 90) return false;
  return true;
}

// Fetch constructions from database and convert to GeoJSON
async function fetchConstructionsGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  const payload = await getPayload({ config });

  // Fetch public constructions (published) and private constructions (published approval status)
  const { docs: constructions } = await payload.find({
    collection: 'constructions',
    limit: 1000,
    depth: 1, // Include organization data
    where: {
      or: [
        // Public constructions - must be published
        {
          and: [
            { constructionCategory: { not_equals: 'private' } },
            { _status: { equals: 'published' } },
          ],
        },
        // Private constructions - must have published approval status
        {
          and: [
            { constructionCategory: { equals: 'private' } },
            { approvalStatus: { equals: 'published' } },
          ],
        },
      ],
    },
  });

  // Convert to GeoJSON FeatureCollection
  const features: GeoJSON.Feature[] = [];

  for (const c of constructions) {
    let geometry: GeoJSON.Geometry | null = null;

    // First try to use the geometry field if it's valid GeoJSON
    if (isValidGeometry(c.geometry)) {
      geometry = c.geometry;
    }
    // Otherwise, try to create a Point from centroid
    else if (isValidCentroid(c.centroid)) {
      geometry = {
        type: 'Point',
        coordinates: c.centroid,
      };
    }

    // Skip constructions without valid geometry
    if (!geometry) {
      continue;
    }

    // Get organization name for private constructions
    let organizationName: string | undefined;
    if (c.constructionCategory === 'private' && c.organization) {
      const org = c.organization as { name?: string } | string | number;
      if (typeof org === 'object' && org !== null && 'name' in org) {
        organizationName = org.name;
      }
    }

    features.push({
      type: 'Feature',
      id: c.id,
      geometry,
      properties: {
        id: c.id,
        slug: c.slug,
        title: c.title,
        excerpt: extractExcerpt(c.description),
        constructionStatus: c.constructionStatus,
        progress: c.progress,
        constructionType: c.constructionType,
        constructionCategory: c.constructionCategory || 'public',
        privateType: c.privateType,
        organizationName,
        startDate: c.startDate,
        expectedEndDate: c.expectedEndDate,
      },
    });
  }

  logger.info({ featuresCount: features.length, totalDocs: constructions.length }, 'Map constructions fetched');

  return {
    type: 'FeatureCollection',
    features,
  };
}

export const GET = withApiHandler(async () => {
  const { data: geojson, fromCache } = await withCache<GeoJSON.FeatureCollection>(
    CACHE_KEYS.MAP_DATA,
    CACHE_TTL.MAP_DATA,
    fetchConstructionsGeoJSON
  );

  // Create response with cache headers
  const response = NextResponse.json(geojson);

  // Add cache control headers
  if (isCacheEnabled() && fromCache) {
    response.headers.set('X-Cache', 'HIT');
  } else {
    response.headers.set('X-Cache', 'MISS');
  }

  // Public cache for CDN/browser caching (shorter than server cache)
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );

  return response;
});
