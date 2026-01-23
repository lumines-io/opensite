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

// Helper to extract coordinates from location (either [lng, lat] or GeoJSON Point)
function getCoordinates(location: unknown): [number, number] | null {
  if (!location) return null;

  // Check if it's a coordinate array [lng, lat]
  if (Array.isArray(location) && location.length === 2) {
    const [lng, lat] = location;
    if (typeof lng === 'number' && typeof lat === 'number') {
      return [lng, lat];
    }
  }

  // Check if it's a GeoJSON Point
  if (typeof location === 'object' && location !== null) {
    const loc = location as Record<string, unknown>;
    if (loc.type === 'Point' && Array.isArray(loc.coordinates)) {
      const coords = loc.coordinates as unknown[];
      if (coords.length === 2) {
        const [lng, lat] = coords;
        if (typeof lng === 'number' && typeof lat === 'number') {
          return [lng, lat];
        }
      }
    }
  }

  return null;
}

// Generic detail point interface (for stations, exits, interchanges, etc.)
interface DetailPoint {
  name?: string;
  location?: unknown;
  order?: number;
  pointType?: string;
  status?: string;
  progress?: number;
  description?: string;
  openedAt?: string;
}

// Legacy metro station interface (for backward compatibility)
interface LegacyMetroStation {
  name?: string;
  location?: unknown;
  stationOrder?: number;
  stationStatus?: string;
  stationProgress?: number;
  openedAt?: string;
}

// Map point types to construction types for styling
const POINT_TYPE_TO_CONSTRUCTION_TYPE: Record<string, string> = {
  station: 'metro_station',
  depot: 'metro_station',
  transfer: 'metro_station',
  exit: 'freeway_exit',
  interchange: 'interchange',
  toll: 'freeway_exit',
  rest_area: 'freeway_exit',
  bridge_section: 'bridge',
  tunnel_portal: 'tunnel',
  milestone: 'other',
  other: 'other',
};

// Fetch constructions and developments from database and convert to GeoJSON
async function fetchMapDataGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  const payload = await getPayload({ config });

  // Fetch published public constructions (infrastructure)
  const { docs: constructions } = await payload.find({
    collection: 'constructions',
    limit: 1000,
    where: {
      _status: { equals: 'published' },
    },
  });

  // Fetch published developments (private/commercial)
  const { docs: developments } = await payload.find({
    collection: 'developments',
    limit: 1000,
    depth: 1, // Include organization data
    where: {
      approvalStatus: { equals: 'published' },
    },
  });

  // Convert to GeoJSON FeatureCollection
  const features: GeoJSON.Feature[] = [];

  // Process constructions (public infrastructure)
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
        sourceCollection: 'constructions', // Identifies the source collection
        startDate: c.startDate,
        expectedEndDate: c.expectedEndDate,
      },
    });

    // Add detail point markers as separate point features (generic approach)
    if (Array.isArray(c.detailPoints) && c.detailPoints.length > 0) {
      for (const point of c.detailPoints as DetailPoint[]) {
        const coords = getCoordinates(point.location);
        if (coords && point.name) {
          const pointType = point.pointType || 'other';
          const constructionType = POINT_TYPE_TO_CONSTRUCTION_TYPE[pointType] || 'other';

          features.push({
            type: 'Feature',
            id: `${c.id}-point-${point.order || 0}`,
            geometry: {
              type: 'Point',
              coordinates: coords,
            },
            properties: {
              id: `${c.id}-point-${point.order || 0}`,
              parentId: c.id,
              slug: c.slug,
              title: point.name,
              parentTitle: c.title,
              constructionStatus: point.status || c.constructionStatus,
              progress: point.progress ?? c.progress,
              constructionType, // Mapped from pointType for styling
              sourceCollection: 'constructions',
              isDetailMarker: true, // Flag to identify these as detail markers
              pointType, // Original point type for specific handling
              pointOrder: point.order,
              pointDescription: point.description,
              openedAt: point.openedAt,
            },
          });
        }
      }
    }
    // Legacy: Add metro station markers from metroStations field (backward compatibility)
    else if (c.constructionType === 'metro' && Array.isArray(c.metroStations) && c.metroStations.length > 0) {
      for (const station of c.metroStations as LegacyMetroStation[]) {
        const coords = getCoordinates(station.location);
        if (coords && station.name) {
          features.push({
            type: 'Feature',
            id: `${c.id}-station-${station.stationOrder || 0}`,
            geometry: {
              type: 'Point',
              coordinates: coords,
            },
            properties: {
              id: `${c.id}-station-${station.stationOrder || 0}`,
              parentId: c.id,
              slug: c.slug,
              title: station.name,
              parentTitle: c.title,
              constructionStatus: station.stationStatus || c.constructionStatus,
              progress: station.stationProgress ?? c.progress,
              constructionType: 'metro_station', // Special type for metro stations
              sourceCollection: 'constructions',
              isDetailMarker: true, // Flag to identify these as detail markers
              pointType: 'station', // Normalized point type
              pointOrder: station.stationOrder,
              openedAt: station.openedAt,
            },
          });
        }
      }
    }
  }

  // Process developments (private/commercial)
  for (const d of developments) {
    let geometry: GeoJSON.Geometry | null = null;

    // First try to use the geometry field if it's valid GeoJSON
    if (isValidGeometry(d.geometry)) {
      geometry = d.geometry;
    }
    // Otherwise, try to create a Point from centroid
    else if (isValidCentroid(d.centroid)) {
      geometry = {
        type: 'Point',
        coordinates: d.centroid,
      };
    }

    // Skip developments without valid geometry
    if (!geometry) {
      continue;
    }

    // Get organization name
    let organizationName: string | undefined;
    if (d.organization) {
      const org = d.organization as { name?: string } | string | number;
      if (typeof org === 'object' && org !== null && 'name' in org) {
        organizationName = org.name;
      }
    }

    // Extract marketing headline if available
    const marketing = d.marketing as { headline?: string; priceRange?: { displayText?: string } } | undefined;
    const headline = marketing?.headline;
    const priceDisplay = marketing?.priceRange?.displayText;

    // Extract display options
    const displayOptions = d.displayOptions as {
      featured?: boolean;
      priority?: number;
      showSponsoredBadge?: boolean;
      useCustomMarker?: boolean;
      markerColor?: string;
    } | undefined;

    features.push({
      type: 'Feature',
      id: `dev-${d.id}`,
      geometry,
      properties: {
        id: `dev-${d.id}`,
        slug: d.slug,
        title: d.title,
        excerpt: extractExcerpt(d.description),
        developmentStatus: d.developmentStatus,
        developmentType: d.developmentType,
        sourceCollection: 'developments', // Identifies the source collection
        organizationName,
        headline,
        priceDisplay,
        // Display options for rendering
        featured: displayOptions?.featured ?? false,
        priority: displayOptions?.priority ?? 0,
        showSponsoredBadge: displayOptions?.showSponsoredBadge ?? true,
        useCustomMarker: displayOptions?.useCustomMarker ?? false,
        markerColor: displayOptions?.markerColor,
        // Timeline
        launchDate: d.launchDate,
        expectedCompletion: d.expectedCompletion,
      },
    });
  }

  logger.info(
    {
      featuresCount: features.length,
      constructionsCount: constructions.length,
      developmentsCount: developments.length,
    },
    'Map data fetched from both collections'
  );

  return {
    type: 'FeatureCollection',
    features,
  };
}

export const GET = withApiHandler(async () => {
  const { data: geojson, fromCache } = await withCache<GeoJSON.FeatureCollection>(
    CACHE_KEYS.MAP_DATA,
    CACHE_TTL.MAP_DATA,
    fetchMapDataGeoJSON
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
