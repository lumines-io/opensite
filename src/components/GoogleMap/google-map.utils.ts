/**
 * Utility functions for Google Maps components
 */

import type { LatLng, Construction, ConstructionFeature } from './google-map.types';
import {
  TYPE_COLORS,
  STATUS_COLORS,
  CATEGORY_COLORS,
  PRIVATE_TYPE_COLORS,
  TYPE_LABELS,
  STATUS_LABELS,
  CATEGORY_LABELS,
  PRIVATE_TYPE_LABELS,
} from './google-map.constants';

/**
 * Convert GeoJSON coordinates [lng, lat] to Google Maps LatLng { lat, lng }
 */
export function geoJsonToLatLng(coordinates: [number, number]): LatLng {
  return { lat: coordinates[1], lng: coordinates[0] };
}

/**
 * Convert Google Maps LatLng to GeoJSON coordinates
 */
export function latLngToGeoJson(latLng: LatLng): [number, number] {
  return [latLng.lng, latLng.lat];
}

/**
 * Convert array of GeoJSON coordinates to Google Maps LatLngLiteral array
 */
export function geoJsonPathToLatLngPath(
  coordinates: [number, number][]
): google.maps.LatLngLiteral[] {
  return coordinates.map(([lng, lat]) => ({ lat, lng }));
}

/**
 * Get the center point of a GeoJSON geometry
 */
export function getGeometryCenter(geometry: GeoJSON.Geometry): LatLng {
  switch (geometry.type) {
    case 'Point':
      return geoJsonToLatLng(geometry.coordinates as [number, number]);

    case 'LineString': {
      const coords = geometry.coordinates as [number, number][];
      const midIdx = Math.floor(coords.length / 2);
      return geoJsonToLatLng(coords[midIdx]);
    }

    case 'Polygon': {
      const coords = geometry.coordinates[0] as [number, number][];
      // Calculate centroid
      let latSum = 0;
      let lngSum = 0;
      for (const [lng, lat] of coords) {
        latSum += lat;
        lngSum += lng;
      }
      return {
        lat: latSum / coords.length,
        lng: lngSum / coords.length,
      };
    }

    default:
      return { lat: 10.8231, lng: 106.6297 }; // Default to HCMC
  }
}

/**
 * Convert GeoJSON FeatureCollection to ConstructionFeatures
 */
export function featureCollectionToConstructionFeatures(
  geojson: GeoJSON.FeatureCollection
): ConstructionFeature[] {
  return geojson.features
    .filter((f) => f.geometry && f.properties)
    .map((feature) => ({
      id: feature.properties!.id as string,
      geometry: feature.geometry!,
      properties: feature.properties as Construction,
      center: getGeometryCenter(feature.geometry!),
    }));
}

/**
 * Get color for construction type
 */
export function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || TYPE_COLORS['other'];
}

/**
 * Get color for construction status
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || STATUS_COLORS['planned'];
}

/**
 * Get color for construction category
 */
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['public'];
}

/**
 * Get color for private construction type
 */
export function getPrivateTypeColor(privateType: string): string {
  return PRIVATE_TYPE_COLORS[privateType] || PRIVATE_TYPE_COLORS['other'];
}

/**
 * Get Vietnamese label for construction type
 */
export function getTypeLabel(type: string): string {
  return TYPE_LABELS[type] || TYPE_LABELS['other'];
}

/**
 * Get Vietnamese label for construction status
 */
export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

/**
 * Get Vietnamese label for category
 */
export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

/**
 * Get Vietnamese label for private construction type
 */
export function getPrivateTypeLabel(privateType: string): string {
  return PRIVATE_TYPE_LABELS[privateType] || PRIVATE_TYPE_LABELS['other'];
}

/**
 * Format date in Vietnamese format
 */
export function formatDateVN(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Get marker color based on construction properties
 */
export function getMarkerColor(construction: Construction): string {
  if (construction.constructionCategory === 'private') {
    return construction.privateType
      ? getPrivateTypeColor(construction.privateType)
      : CATEGORY_COLORS['private'];
  }
  return getTypeColor(construction.constructionType);
}

/**
 * Create SVG marker icon for Google Maps
 */
export function createMarkerIcon(
  color: string,
  size: number = 24
): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
    </svg>
  `;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

/**
 * Create pulsing marker icon (for in-progress constructions)
 */
export function createPulsingMarkerIcon(
  color: string,
  size: number = 24
): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2">
        <animate attributeName="r" values="8;10;8" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.7;1" dur="1.5s" repeatCount="indefinite"/>
      </circle>
    </svg>
  `;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

/**
 * Get Data Layer style for a construction feature
 */
export function getFeatureStyle(
  feature: google.maps.Data.Feature
): google.maps.Data.StyleOptions {
  const type = feature.getProperty('constructionType') as string;
  const status = feature.getProperty('constructionStatus') as string;
  const category = feature.getProperty('constructionCategory') as string;
  const privateType = feature.getProperty('privateType') as string;
  const geometryType = feature.getGeometry()?.getType();

  // Determine color based on category and type
  let color: string;
  if (category === 'private') {
    color = privateType
      ? getPrivateTypeColor(privateType)
      : CATEGORY_COLORS['private'];
  } else {
    color = getTypeColor(type);
  }

  // Determine if it should pulse (in-progress)
  const isPulsing = status === 'in-progress';

  // Style based on geometry type
  switch (geometryType) {
    case 'Point':
      return {
        icon: isPulsing
          ? createPulsingMarkerIcon(color, 20)
          : createMarkerIcon(color, 20),
        clickable: true,
      };

    case 'LineString':
      return {
        strokeColor: color,
        strokeWeight: isPulsing ? 5 : 4,
        strokeOpacity: isPulsing ? 0.8 : 1,
        clickable: true,
      };

    case 'Polygon':
      return {
        fillColor: color,
        fillOpacity: isPulsing ? 0.3 : 0.2,
        strokeColor: color,
        strokeWeight: 2,
        strokeOpacity: 1,
        clickable: true,
      };

    default:
      return {
        clickable: true,
      };
  }
}

/**
 * Check if a feature passes visibility filters
 */
export function featurePassesFilters(
  feature: ConstructionFeature,
  visibleTypes: Set<string>,
  visibleStatuses: Set<string>,
  visibleCategories: Set<string>
): boolean {
  const { constructionType, constructionStatus, constructionCategory } =
    feature.properties;
  const category = constructionCategory || 'public';

  return (
    visibleTypes.has(constructionType) &&
    visibleStatuses.has(constructionStatus) &&
    visibleCategories.has(category)
  );
}

/**
 * Check if a point is within map bounds
 */
export function isInBounds(
  point: LatLng,
  bounds: google.maps.LatLngBounds
): boolean {
  return bounds.contains(point);
}

/**
 * Check if a geometry is within map bounds
 */
export function isGeometryInBounds(
  geometry: GeoJSON.Geometry,
  bounds: google.maps.LatLngBounds
): boolean {
  switch (geometry.type) {
    case 'Point': {
      const [lng, lat] = geometry.coordinates as [number, number];
      return bounds.contains({ lat, lng });
    }

    case 'LineString': {
      const coords = geometry.coordinates as [number, number][];
      return coords.some(([lng, lat]) => bounds.contains({ lat, lng }));
    }

    case 'Polygon': {
      const coords = geometry.coordinates[0] as [number, number][];
      return coords.some(([lng, lat]) => bounds.contains({ lat, lng }));
    }

    default:
      return false;
  }
}

/**
 * Calculate bounds that contain all features
 */
export function calculateFeaturesBounds(
  features: ConstructionFeature[]
): google.maps.LatLngBounds | null {
  if (features.length === 0) return null;

  const bounds = new google.maps.LatLngBounds();

  for (const feature of features) {
    switch (feature.geometry.type) {
      case 'Point': {
        const [lng, lat] = feature.geometry.coordinates as [number, number];
        bounds.extend({ lat, lng });
        break;
      }

      case 'LineString': {
        const coords = feature.geometry.coordinates as [number, number][];
        for (const [lng, lat] of coords) {
          bounds.extend({ lat, lng });
        }
        break;
      }

      case 'Polygon': {
        const coords = feature.geometry.coordinates[0] as [number, number][];
        for (const [lng, lat] of coords) {
          bounds.extend({ lat, lng });
        }
        break;
      }
    }
  }

  return bounds;
}

/**
 * Convert route GeoJSON LineString to Google Maps path
 */
export function routeToGooglePath(
  route: GeoJSON.LineString
): google.maps.LatLngLiteral[] {
  return geoJsonPathToLatLngPath(route.coordinates as [number, number][]);
}
