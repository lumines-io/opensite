import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { withApiHandler, createErrorResponse } from '@/lib/api-utils';
import {
  withCache,
  getNearbySearchCacheKey,
  CACHE_TTL,
  isCacheEnabled,
} from '@/lib/cache';

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Get centroid from geometry
function getCentroid(geometry: GeoJSON.Geometry | null, centroid: [number, number] | null): [number, number] | null {
  if (centroid && Array.isArray(centroid) && centroid.length === 2) {
    return centroid;
  }

  if (!geometry) return null;

  switch (geometry.type) {
    case 'Point':
      return geometry.coordinates as [number, number];
    case 'LineString': {
      // Return middle point of LineString
      const midIndex = Math.floor(geometry.coordinates.length / 2);
      return geometry.coordinates[midIndex] as [number, number];
    }
    case 'Polygon': {
      // Return centroid of first ring (simple average)
      const ring = geometry.coordinates[0];
      const avgLng = ring.reduce((sum, c) => sum + c[0], 0) / ring.length;
      const avgLat = ring.reduce((sum, c) => sum + c[1], 0) / ring.length;
      return [avgLng, avgLat];
    }
    default:
      return null;
  }
}

interface NearbyConstruction {
  id: number;
  title: string;
  slug: string;
  constructionStatus: string;
  constructionType: string;
  progress: number;
  distance: number;
  center: [number, number];
}

interface NearbySearchResult {
  center: [number, number];
  radius: number;
  count: number;
  constructions: NearbyConstruction[];
}

// Fetch nearby constructions from database
async function fetchNearbyConstructions(
  lng: number,
  lat: number,
  radius: number
): Promise<NearbySearchResult> {
  const payload = await getPayload({ config });

  // Fetch all published constructions
  const { docs: constructions } = await payload.find({
    collection: 'constructions',
    limit: 1000,
    where: {
      _status: {
        equals: 'published',
      },
    },
  });

  // Calculate distances and filter by radius
  const nearbyConstructions = constructions
    .map((c) => {
      const point = getCentroid(
        c.geometry as GeoJSON.Geometry | null,
        c.centroid as [number, number] | null
      );

      if (!point) return null;

      const distance = calculateDistance(lat, lng, point[1], point[0]);

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        constructionStatus: c.constructionStatus,
        constructionType: c.constructionType,
        progress: c.progress,
        distance,
        center: point,
      };
    })
    .filter((c): c is NearbyConstruction => c !== null && c.distance <= radius)
    .sort((a, b) => a.distance - b.distance);

  return {
    center: [lng, lat],
    radius,
    count: nearbyConstructions.length,
    constructions: nearbyConstructions,
  };
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const lng = parseFloat(searchParams.get('lng') || '');
  const lat = parseFloat(searchParams.get('lat') || '');
  const radius = parseFloat(searchParams.get('radius') || '10'); // Default 10km

  if (isNaN(lng) || isNaN(lat)) {
    return createErrorResponse('Invalid coordinates. Required: lng, lat', 400, {
      code: 'INVALID_PARAMS',
    });
  }

  // Generate cache key based on location hash (rounds coordinates for cache grouping)
  const cacheKey = getNearbySearchCacheKey(lng, lat, radius);

  const { data: result, fromCache } = await withCache<NearbySearchResult>(
    cacheKey,
    CACHE_TTL.NEARBY_SEARCH,
    () => fetchNearbyConstructions(lng, lat, radius)
  );

  // Create response with cache headers
  const response = NextResponse.json(result);

  // Add cache indicator header
  if (isCacheEnabled() && fromCache) {
    response.headers.set('X-Cache', 'HIT');
  } else {
    response.headers.set('X-Cache', 'MISS');
  }

  // Short cache for CDN/browser (location-sensitive)
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=30, stale-while-revalidate=120'
  );

  return response;
});
