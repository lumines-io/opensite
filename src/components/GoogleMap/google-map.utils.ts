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
 * SVG paths for construction type icons
 * Each icon is designed within a 24x24 viewBox
 */
const TYPE_ICON_PATHS: Record<string, string> = {
  // Highway - road with lanes
  highway: 'M4 12h16M4 8h16M4 16h16M8 4v16M16 4v16',
  // Metro - train/subway icon
  metro: 'M8 4h8l2 4v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8l2-4zm0 12h1m6 0h1M9 20l-2 2m8-2l2 2',
  // Bridge - arch bridge structure
  bridge: 'M2 16h20M5 16V8a7 7 0 0114 0v8M5 12h14M8 16v-4m4 4V8m4 8v-4',
  // Tunnel - tunnel entrance
  tunnel: 'M4 20h16M4 20V10a8 8 0 1116 0v10M8 20v-6m8 6v-6M12 8v4',
  // Interchange - complex junction
  interchange: 'M12 2v6m0 8v6M2 12h6m8 0h6M6 6l4 4m4 4l4 4M18 6l-4 4m-4 4l-4 4',
  // Road - simple road
  road: 'M4 4l4 16m8-16l4 16M9 4h6M8 10h8M7 16h10',
  // Station - station building
  station: 'M4 20h16M6 20V8l6-4 6 4v12M10 20v-6h4v6M9 10h.01M15 10h.01',
  // Metro station - platform with train
  metro_station: 'M3 18h18M6 18V9l6-3 6 3v9M10 14h4M12 6v4',
  // Freeway exit - arrow pointing off
  freeway_exit: 'M12 3v12m0 0l-4-4m4 4l4-4M5 21l7-4 7 4',
  // Other - generic marker
  other: 'M12 2a10 10 0 110 20 10 10 0 010-20zm0 5v6m0 4h.01',
};

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
 * Create type-specific SVG marker icon for Google Maps
 * Each construction type has its own distinctive icon
 */
export function createTypeIcon(
  type: string,
  color: string,
  size: number = 28,
  opacity: number = 1
): google.maps.Icon {
  const iconPath = TYPE_ICON_PATHS[type] || TYPE_ICON_PATHS['other'];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" opacity="${opacity}">
      <circle cx="12" cy="12" r="11" fill="${color}" stroke="white" stroke-width="1.5"/>
      <g transform="scale(0.55) translate(9.8, 9.8)" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="${iconPath}"/>
      </g>
    </svg>
  `;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

/**
 * Create animated type-specific SVG marker icon (pulsing for in-progress)
 */
export function createAnimatedTypeIcon(
  type: string,
  color: string,
  size: number = 28
): google.maps.Icon {
  const iconPath = TYPE_ICON_PATHS[type] || TYPE_ICON_PATHS['other'];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="${color}" stroke="white" stroke-width="1.5">
        <animate attributeName="r" values="9;11;9" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.7;1" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <g transform="scale(0.55) translate(9.8, 9.8)" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="${iconPath}"/>
      </g>
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
  let isPlanned = false;
  let isFeatured = false;
  let constructionType = 'other';

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
    constructionType = type;
    isPulsing = status === 'in-progress';
    isPlanned = status === 'planned';
  }

  // Z-index priority: in-progress (100) > completed/paused (50) > planned (10)
  const getZIndex = () => {
    if (isPulsing) return 100;
    if (isPlanned) return 10;
    return 50;
  };

  // Style based on geometry type
  switch (geometryType) {
    case 'Point':
      // Use smaller icons for detail markers (metro stations, freeway exits)
      if (isDetailMarker) {
        const detailType = feature.getProperty('constructionType') as string;
        return {
          icon: isPulsing
            ? createAnimatedTypeIcon(detailType, color, 18)
            : createTypeIcon(detailType, color, 18),
          clickable: true,
          zIndex: getZIndex(),
        };
      }
      // Use sponsored marker for featured developments
      if (isFeatured) {
        return {
          icon: createSponsoredMarkerIcon(color, 28),
          clickable: true,
          zIndex: 80, // Featured developments have high priority
        };
      }
      // Use type-specific icons for constructions
      if (sourceCollection === 'constructions') {
        return {
          icon: isPulsing
            ? createAnimatedTypeIcon(constructionType, color, 24)
            : createTypeIcon(constructionType, color, isPlanned ? 22 : 24),
          clickable: true,
          zIndex: getZIndex(),
        };
      }
      // Default marker for other features (developments without featured status)
      return {
        icon: isPulsing
          ? createPulsingMarkerIcon(color, 20)
          : createMarkerIcon(color, 20),
        clickable: true,
        zIndex: getZIndex(),
      };

    case 'LineString':
      return {
        strokeColor: color,
        strokeWeight: isPulsing ? 5 : isPlanned ? 3 : 4,
        strokeOpacity: isPlanned ? 0.6 : isPulsing ? 0.8 : 1,
        clickable: true,
        zIndex: getZIndex(),
      };

    case 'Polygon':
      return {
        fillColor: color,
        fillOpacity: isPlanned ? 0.12 : isPulsing ? 0.3 : 0.2,
        strokeColor: color,
        strokeWeight: isPlanned ? 1.5 : 2,
        strokeOpacity: isPlanned ? 0.6 : 1,
        clickable: true,
        zIndex: getZIndex(),
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

/**
 * Create a pulsing polyline with glowing effect (for in-progress constructions)
 * Includes a type icon marker at the center of the line
 * Returns the polylines, marker, and a cleanup function
 */
export function createPulsingPolyline(
  map: google.maps.Map,
  path: google.maps.LatLngLiteral[],
  color: string,
  options: {
    strokeWeight?: number;
    zIndex?: number;
    animationSpeed?: 'slow' | 'normal' | 'fast';
    constructionType?: string;
  } = {}
): { polylines: google.maps.Polyline[]; marker?: google.maps.Marker; cleanup: () => void } {
  const { strokeWeight = 5, zIndex = 100, animationSpeed = 'normal', constructionType } = options;

  // Create base polyline (solid line on top)
  // Set clickable: false so mouse events pass through to Data Layer
  const basePolyline = new google.maps.Polyline({
    path,
    strokeColor: color,
    strokeWeight: strokeWeight,
    strokeOpacity: 1,
    map,
    zIndex,
    clickable: false,
  });

  // Create glow polyline (wider, semi-transparent, pulsing)
  // Set clickable: false so mouse events pass through to Data Layer
  const glowPolyline = new google.maps.Polyline({
    path,
    strokeColor: color,
    strokeWeight: strokeWeight * 2.5,
    strokeOpacity: 0.3,
    map,
    zIndex: zIndex - 1,
    clickable: false,
  });

  // Create type icon marker at the center of the line
  let typeMarker: google.maps.Marker | undefined;
  if (constructionType && path.length > 0) {
    const midIdx = Math.floor(path.length / 2);
    const centerPosition = path[midIdx];

    typeMarker = new google.maps.Marker({
      position: centerPosition,
      map,
      icon: createAnimatedTypeIcon(constructionType, color, 28),
      zIndex: zIndex + 1,
      clickable: false, // Let clicks pass through to Data Layer
    });
  }

  // Animate opacity for pulse effect
  let opacity = 0.3;
  let increasing = true;
  const speeds = { slow: 80, normal: 50, fast: 30 };
  const interval = speeds[animationSpeed];

  const animationId = setInterval(() => {
    if (increasing) {
      opacity += 0.02;
      if (opacity >= 0.5) increasing = false;
    } else {
      opacity -= 0.02;
      if (opacity <= 0.15) increasing = true;
    }
    glowPolyline.setOptions({ strokeOpacity: opacity });
  }, interval);

  const cleanup = () => {
    clearInterval(animationId);
    basePolyline.setMap(null);
    glowPolyline.setMap(null);
    if (typeMarker) {
      typeMarker.setMap(null);
    }
  };

  return { polylines: [basePolyline, glowPolyline], marker: typeMarker, cleanup };
}

/**
 * Create pulsing polylines for in-progress LineString features
 * AND type icon markers for ALL visible LineString features
 * Returns cleanup function to remove polylines, markers and stop animations
 */
export function createAnimatedPolylinesForFeatures(
  map: google.maps.Map,
  features: ConstructionFeature[],
  visibleTypes: Set<string>,
  visibleStatuses: Set<string>,
  visibleSourceCollections: Set<string>
): () => void {
  const cleanupFunctions: (() => void)[] = [];
  const typeMarkers: google.maps.Marker[] = [];

  for (const feature of features) {
    // Only process constructions with LineString geometry
    if (
      feature.properties.sourceCollection !== 'constructions' ||
      feature.geometry.type !== 'LineString'
    ) {
      continue;
    }

    const props = feature.properties;
    if (!isConstruction(props)) continue;

    // Check visibility filters
    if (!visibleSourceCollections.has('constructions')) continue;
    if (!visibleTypes.has(props.constructionType)) continue;
    if (!visibleStatuses.has(props.constructionStatus)) continue;

    const coords = feature.geometry.coordinates as [number, number][];
    const path = geoJsonPathToLatLngPath(coords);
    const color = getTypeColor(props.constructionType);
    const isInProgress = props.constructionStatus === 'in-progress';
    const isPlanned = props.constructionStatus === 'planned';

    // For in-progress constructions, create pulsing polyline with icon
    if (isInProgress) {
      const { cleanup } = createPulsingPolyline(map, path, color, {
        strokeWeight: 5,
        zIndex: 100,
        animationSpeed: 'normal',
        constructionType: props.constructionType,
      });
      cleanupFunctions.push(cleanup);
    } else {
      // For non-in-progress LineStrings, just add a type icon marker at center
      if (path.length > 0) {
        const midIdx = Math.floor(path.length / 2);
        const centerPosition = path[midIdx];

        // Planned constructions: smaller icon, lower opacity, lower z-index
        const iconSize = isPlanned ? 20 : 24;
        const iconOpacity = isPlanned ? 0.6 : 1;
        const markerZIndex = isPlanned ? 10 : 50;

        const typeMarker = new google.maps.Marker({
          position: centerPosition,
          map,
          icon: createTypeIcon(props.constructionType, color, iconSize, iconOpacity),
          zIndex: markerZIndex,
          clickable: false, // Let clicks pass through to Data Layer
        });
        typeMarkers.push(typeMarker);
      }
    }
  }

  // Return cleanup function that cleans up all polylines and markers
  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup());
    typeMarkers.forEach((marker) => marker.setMap(null));
  };
}
