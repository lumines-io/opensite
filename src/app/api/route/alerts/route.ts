import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { withApiHandler, createErrorResponse } from '@/lib/api-utils';
import { createLogger, logCategories } from '@/lib/logger';

const logger = createLogger(logCategories.API);

// Calculate distance from a point to a line segment
function pointToSegmentDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const [px, py] = point;
  const [ax, ay] = lineStart;
  const [bx, by] = lineEnd;

  const ABx = bx - ax;
  const ABy = by - ay;
  const APx = px - ax;
  const APy = py - ay;

  const AB_AB = ABx * ABx + ABy * ABy;
  const AP_AB = APx * ABx + APy * ABy;

  let t = AB_AB !== 0 ? AP_AB / AB_AB : 0;
  t = Math.max(0, Math.min(1, t));

  const closestX = ax + t * ABx;
  const closestY = ay + t * ABy;

  // Convert to meters using Haversine approximation
  return haversineDistance(py, px, closestY, closestX);
}

// Haversine distance in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Get minimum distance from a point to a route (LineString)
function pointToRouteDistance(point: [number, number], routeCoords: [number, number][]): number {
  let minDistance = Infinity;

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const dist = pointToSegmentDistance(point, routeCoords[i], routeCoords[i + 1]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance;
}

// Get minimum distance from a geometry to a route
function geometryToRouteDistance(
  geometry: GeoJSON.Geometry,
  routeCoords: [number, number][]
): number {
  switch (geometry.type) {
    case 'Point': {
      const point = geometry.coordinates as [number, number];
      return pointToRouteDistance(point, routeCoords);
    }

    case 'LineString': {
      const coords = geometry.coordinates as [number, number][];
      let minDist = Infinity;
      // Check distance from each point on the construction line to the route
      for (const coord of coords) {
        const dist = pointToRouteDistance(coord, routeCoords);
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    }

    case 'Polygon': {
      const ring = geometry.coordinates[0] as [number, number][];
      let minDist = Infinity;
      for (const coord of ring) {
        const dist = pointToRouteDistance(coord, routeCoords);
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    }

    case 'MultiPoint': {
      const points = geometry.coordinates as [number, number][];
      let minDist = Infinity;
      for (const point of points) {
        const dist = pointToRouteDistance(point, routeCoords);
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    }

    case 'MultiLineString': {
      const lines = geometry.coordinates as [number, number][][];
      let minDist = Infinity;
      for (const line of lines) {
        for (const coord of line) {
          const dist = pointToRouteDistance(coord, routeCoords);
          if (dist < minDist) minDist = dist;
        }
      }
      return minDist;
    }

    case 'MultiPolygon': {
      const polygons = geometry.coordinates as [number, number][][][];
      let minDist = Infinity;
      for (const polygon of polygons) {
        const ring = polygon[0];
        for (const coord of ring) {
          const dist = pointToRouteDistance(coord, routeCoords);
          if (dist < minDist) minDist = dist;
        }
      }
      return minDist;
    }

    default:
      return Infinity;
  }
}

// Helper to check if geometry is valid
function isValidGeometry(geometry: unknown): geometry is GeoJSON.Geometry {
  if (!geometry || typeof geometry !== 'object') return false;
  const geo = geometry as Record<string, unknown>;
  if (!geo.type || !geo.coordinates) return false;
  const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
  if (!validTypes.includes(geo.type as string)) return false;
  if (!Array.isArray(geo.coordinates)) return false;
  return true;
}

// Helper to check if centroid is valid
function isValidCentroid(centroid: unknown): centroid is [number, number] {
  if (!Array.isArray(centroid)) return false;
  if (centroid.length !== 2) return false;
  if (typeof centroid[0] !== 'number' || typeof centroid[1] !== 'number') return false;
  return true;
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { route, bufferMeters = 200 } = body;

  if (!route || route.type !== 'LineString' || !Array.isArray(route.coordinates)) {
    return createErrorResponse('Invalid route geometry. Expected LineString.', 400, {
      code: 'INVALID_GEOMETRY',
    });
  }

  const routeCoords = route.coordinates as [number, number][];

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

  // Find constructions within buffer distance of the route
  const alertConstructions = [];

  for (const construction of constructions) {
    let distance: number | null = null;

    // First try to use the geometry field
    if (isValidGeometry(construction.geometry)) {
      distance = geometryToRouteDistance(construction.geometry, routeCoords);
    }
    // Otherwise, use centroid as a Point
    else if (isValidCentroid(construction.centroid)) {
      distance = pointToRouteDistance(construction.centroid, routeCoords);
    }

    // Skip if no valid geometry or outside buffer
    if (distance === null || distance > bufferMeters) {
      continue;
    }

    alertConstructions.push({
      id: construction.id,
      title: construction.title,
      slug: construction.slug,
      constructionStatus: construction.constructionStatus,
      constructionType: construction.constructionType,
      progress: construction.progress,
      distance: Math.round(distance),
    });
  }

  // Sort by distance
  alertConstructions.sort((a, b) => a.distance - b.distance);

  logger.info(
    { alertsCount: alertConstructions.length, bufferMeters, totalChecked: constructions.length },
    'Route alerts computed'
  );

  // Create response with cache headers
  const response = NextResponse.json({
    constructions: alertConstructions,
    bufferMeters,
    totalChecked: constructions.length,
  });

  // Allow CDN to cache POST responses for short periods
  response.headers.set('X-Cache', 'MISS');
  response.headers.set(
    'Cache-Control',
    'private, max-age=30, stale-while-revalidate=60'
  );

  return response;
});
