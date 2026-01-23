/**
 * Utility functions for Google Maps components
 */

import type { LatLng, ConstructionFeature, MapFeature, Construction, Development } from './google-map.types';
import { isConstruction, isDevelopment } from './google-map.types';
import {
  TYPE_COLORS,
  STATUS_COLORS,
  SOURCE_COLLECTION_COLORS,
  DEVELOPMENT_TYPE_COLORS,
  DEVELOPMENT_STATUS_COLORS,
  TYPE_LABELS,
  STATUS_LABELS,
  SOURCE_COLLECTION_LABELS,
  DEVELOPMENT_TYPE_LABELS,
  DEVELOPMENT_STATUS_LABELS,
  POINT_TYPE_LABELS,
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
      properties: feature.properties as MapFeature,
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
 * Get color for source collection
 */
export function getSourceCollectionColor(source: string): string {
  return SOURCE_COLLECTION_COLORS[source] || SOURCE_COLLECTION_COLORS['constructions'];
}

/**
 * Get color for development type
 */
export function getDevelopmentTypeColor(developmentType: string): string {
  return DEVELOPMENT_TYPE_COLORS[developmentType] || DEVELOPMENT_TYPE_COLORS['other'];
}

/**
 * Get color for development status
 */
export function getDevelopmentStatusColor(status: string): string {
  return DEVELOPMENT_STATUS_COLORS[status] || DEVELOPMENT_STATUS_COLORS['upcoming'];
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
 * Get Vietnamese label for source collection
 */
export function getSourceCollectionLabel(source: string): string {
  return SOURCE_COLLECTION_LABELS[source] || source;
}

/**
 * Get Vietnamese label for development type
 */
export function getDevelopmentTypeLabel(developmentType: string): string {
  return DEVELOPMENT_TYPE_LABELS[developmentType] || DEVELOPMENT_TYPE_LABELS['other'];
}

/**
 * Get Vietnamese label for development status
 */
export function getDevelopmentStatusLabel(status: string): string {
  return DEVELOPMENT_STATUS_LABELS[status] || status;
}

/**
 * Get Vietnamese label for detail point type
 */
export function getPointTypeLabel(pointType: string): string {
  return POINT_TYPE_LABELS[pointType] || POINT_TYPE_LABELS['other'];
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
 * Get marker color based on feature properties
 */
export function getMarkerColor(feature: MapFeature): string {
  if (isDevelopment(feature)) {
    // For developments, use custom marker color if set, otherwise development type color
    if (feature.useCustomMarker && feature.markerColor) {
      return feature.markerColor;
    }
    return getDevelopmentTypeColor(feature.developmentType);
  }

  // For constructions, use construction type color
  if (isConstruction(feature)) {
    return getTypeColor(feature.constructionType);
  }

  return TYPE_COLORS['other'];
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
 * Create smaller marker icon for detail markers (metro stations, freeway exits)
 */
export function createDetailMarkerIcon(
  color: string,
  size: number = 16
): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2"/>
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
 * Create sponsored marker icon (for featured developments)
 */
export function createSponsoredMarkerIcon(
  color: string,
  size: number = 28
): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="gold" stroke-width="3"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.3"/>
    </svg>
  `;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

/**
 * Check if construction type is a detail marker type
 */
export function isDetailMarkerType(type: string): boolean {
  return type === 'metro_station' || type === 'freeway_exit';
}

/**
 * Get Data Layer style for a map feature
 * @param feature - The Google Maps Data feature
 * @param currentZoom - Current map zoom level (optional, for zoom-based visibility)
 */
export function getFeatureStyle(
  feature: google.maps.Data.Feature,
  currentZoom?: number
): google.maps.Data.StyleOptions {
  const sourceCollection = feature.getProperty('sourceCollection') as string;
  const isDetailMarker = feature.getProperty('isDetailMarker') as boolean;
  const geometryType = feature.getGeometry()?.getType();

  // Hide detail markers at low zoom levels (zoom < 13)
  if (isDetailMarker && currentZoom !== undefined && currentZoom < 13) {
    return { visible: false };
  }

  // Determine color and style based on source collection
  let color: string;
  let isPulsing = false;
  let isFeatured = false;

  if (sourceCollection === 'developments') {
    // Development styling
    const developmentType = feature.getProperty('developmentType') as string;
    const featured = feature.getProperty('featured') as boolean;
    const useCustomMarker = feature.getProperty('useCustomMarker') as boolean;
    const markerColor = feature.getProperty('markerColor') as string;

    if (useCustomMarker && markerColor) {
      color = markerColor;
    } else {
      color = getDevelopmentTypeColor(developmentType);
    }
    isFeatured = featured;
  } else {
    // Construction styling
    const type = feature.getProperty('constructionType') as string;
    const status = feature.getProperty('constructionStatus') as string;

    color = getTypeColor(type);
    isPulsing = status === 'in-progress';
  }

  // Style based on geometry type
  switch (geometryType) {
    case 'Point':
      // Use smaller icons for detail markers (metro stations, freeway exits)
      if (isDetailMarker) {
        return {
          icon: createDetailMarkerIcon(color, 14),
          clickable: true,
        };
      }
      // Use sponsored marker for featured developments
      if (isFeatured) {
        return {
          icon: createSponsoredMarkerIcon(color, 28),
          clickable: true,
        };
      }
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
  visibleSourceCollections: Set<string>,
  visibleDevelopmentTypes?: Set<string>
): boolean {
  const props = feature.properties;
  const sourceCollection = props.sourceCollection;

  // Check source collection filter
  if (!visibleSourceCollections.has(sourceCollection)) {
    return false;
  }

  if (isConstruction(props)) {
    // For constructions, check type and status
    return (
      visibleTypes.has(props.constructionType) &&
      visibleStatuses.has(props.constructionStatus)
    );
  }

  if (isDevelopment(props)) {
    // For developments, check development type if filter is provided
    if (visibleDevelopmentTypes && visibleDevelopmentTypes.size > 0) {
      return visibleDevelopmentTypes.has(props.developmentType);
    }
    return true;
  }

  return true;
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
