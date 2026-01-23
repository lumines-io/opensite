import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { isFeatureEnabled, FEATURE_FLAGS } from '@/lib/feature-flags';

// Google Directions API response types
interface GoogleDirectionsRoute {
  overview_polyline: {
    points: string;
  };
  legs: Array<{
    distance: { value: number; text: string };
    duration: { value: number; text: string };
    start_location: { lat: number; lng: number };
    end_location: { lat: number; lng: number };
  }>;
}

interface GoogleDirectionsResponse {
  status: string;
  routes: GoogleDirectionsRoute[];
  error_message?: string;
}

// Decode Google's encoded polyline format
function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    // Decode latitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    // Decode longitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    // Google uses [lat, lng] but GeoJSON uses [lng, lat]
    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

// Calculate distance from a point to a line segment using Haversine
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

// Get centroid from geometry
function getCentroidFromGeometry(geometry: GeoJSON.Geometry): [number, number] | null {
  switch (geometry.type) {
    case 'Point':
      return geometry.coordinates as [number, number];

    case 'LineString': {
      const coords = geometry.coordinates as [number, number][];
      if (coords.length === 0) return null;
      const midIndex = Math.floor(coords.length / 2);
      return coords[midIndex];
    }

    case 'Polygon': {
      const ring = geometry.coordinates[0] as [number, number][];
      if (ring.length === 0) return null;
      let sumLng = 0, sumLat = 0;
      for (const [lng, lat] of ring) {
        sumLng += lng;
        sumLat += lat;
      }
      return [sumLng / ring.length, sumLat / ring.length];
    }

    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  // Check if routing feature is enabled
  if (!isFeatureEnabled(FEATURE_FLAGS.FEATURE_ROUTING)) {
    return NextResponse.json(
      {
        error: 'Feature Disabled',
        message: 'Routing feature is currently disabled. Please try again later.',
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { origin, destination, bufferMeters = 200 } = body;

    // Validate input
    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination coordinates are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(origin) || origin.length !== 2 ||
        !Array.isArray(destination) || destination.length !== 2) {
      return NextResponse.json(
        { error: 'Origin and destination must be [lng, lat] coordinate arrays' },
        { status: 400 }
      );
    }

    const [originLng, originLat] = origin;
    const [destLng, destLat] = destination;

    // Get Google Directions API key
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // Fetch route from Google Directions API
    const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
    directionsUrl.searchParams.set('origin', `${originLat},${originLng}`);
    directionsUrl.searchParams.set('destination', `${destLat},${destLng}`);
    directionsUrl.searchParams.set('mode', 'driving');
    directionsUrl.searchParams.set('key', googleApiKey);

    const directionsResponse = await fetch(directionsUrl.toString());
    if (!directionsResponse.ok) {
      throw new Error(`Google Directions API error: ${directionsResponse.status}`);
    }

    const directionsData: GoogleDirectionsResponse = await directionsResponse.json();

    if (directionsData.status !== 'OK') {
      return NextResponse.json(
        { error: `Directions API error: ${directionsData.status}`, details: directionsData.error_message },
        { status: 400 }
      );
    }

    if (!directionsData.routes || directionsData.routes.length === 0) {
      return NextResponse.json(
        { error: 'No route found between origin and destination' },
        { status: 404 }
      );
    }

    const route = directionsData.routes[0];
    const routeCoords = decodePolyline(route.overview_polyline.points);

    // Create GeoJSON LineString from decoded polyline
    const routeGeometry: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: routeCoords,
    };

    // Calculate total distance and duration from legs
    const totalDistance = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
    const totalDuration = route.legs.reduce((sum, leg) => sum + leg.duration.value, 0);

    // Fetch all published constructions
    const payload = await getPayload({ config });
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
    const affectedConstructions = [];

    for (const construction of constructions) {
      let distance: number | null = null;
      let center: [number, number] | null = null;

      // First try to use the geometry field
      if (isValidGeometry(construction.geometry)) {
        distance = geometryToRouteDistance(construction.geometry, routeCoords);
        center = getCentroidFromGeometry(construction.geometry);
      }
      // Otherwise, use centroid as a Point
      else if (isValidCentroid(construction.centroid)) {
        distance = pointToRouteDistance(construction.centroid, routeCoords);
        center = construction.centroid;
      }

      // Skip if no valid geometry or outside buffer
      if (distance === null || distance > bufferMeters) {
        continue;
      }

      affectedConstructions.push({
        id: construction.id,
        title: construction.title,
        slug: construction.slug,
        constructionStatus: construction.constructionStatus,
        constructionType: construction.constructionType,
        progress: construction.progress,
        distance: Math.round(distance),
        center,
        startDate: construction.startDate,
        expectedEndDate: construction.expectedEndDate,
      });
    }

    // Sort by distance
    affectedConstructions.sort((a, b) => a.distance - b.distance);

    console.log(`Found ${affectedConstructions.length} constructions within ${bufferMeters}m of route`);

    return NextResponse.json({
      route: {
        geometry: routeGeometry,
        distance: totalDistance,
        duration: totalDuration,
      },
      constructions: affectedConstructions,
      bufferMeters,
      totalChecked: constructions.length,
    });
  } catch (error) {
    console.error('Route constructions error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate route and find constructions' },
      { status: 500 }
    );
  }
}
