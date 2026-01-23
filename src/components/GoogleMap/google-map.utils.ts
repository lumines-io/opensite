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
 * Marker style options for customization
 */
export interface MarkerStyleOptions {
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
  opacity?: number;
  pulseSpeed?: 'slow' | 'normal' | 'fast';
  pulseScale?: number;
  shadow?: boolean;
  glow?: boolean;
  glowColor?: string;
  shape?: 'circle' | 'square' | 'diamond' | 'pin';
}

const PULSE_DURATIONS = {
  slow: '2.5s',
  normal: '1.5s',
  fast: '0.8s',
};

/**
 * Create SVG marker icon for Google Maps with customization options
 */
export function createMarkerIcon(
  color: string,
  options: MarkerStyleOptions = {}
): google.maps.Icon {
  const {
    size = 24,
    strokeWidth = 2,
    strokeColor = 'white',
    opacity = 1,
    shadow = false,
    glow = false,
    glowColor,
    shape = 'circle',
  } = options;

  const actualGlowColor = glowColor || color;
  const shadowFilter = shadow
    ? `<filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/>
       </filter>`
    : '';
  const glowFilter = glow
    ? `<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
       </filter>`
    : '';

  const filterAttr = shadow ? 'filter="url(#shadow)"' : glow ? 'filter="url(#glow)"' : '';

  let shapeElement: string;
  switch (shape) {
    case 'square':
      shapeElement = `<rect x="4" y="4" width="16" height="16" rx="2" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${opacity}" ${filterAttr}/>`;
      break;
    case 'diamond':
      shapeElement = `<polygon points="12,2 22,12 12,22 2,12" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${opacity}" ${filterAttr}/>`;
      break;
    case 'pin':
      shapeElement = `<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth * 0.5}" opacity="${opacity}" ${filterAttr}/>`;
      break;
    default: // circle
      shapeElement = `<circle cx="12" cy="12" r="10" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${opacity}" ${filterAttr}/>`;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <defs>${shadowFilter}${glowFilter}</defs>
      ${shapeElement}
    </svg>
  `;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, shape === 'pin' ? size : size / 2),
  };
}

/**
 * Create pulsing marker icon (for in-progress constructions) with customization
 */
export function createPulsingMarkerIcon(
  color: string,
  options: MarkerStyleOptions = {}
): google.maps.Icon {
  const {
    size = 24,
    strokeWidth = 2,
    strokeColor = 'white',
    pulseSpeed = 'normal',
    pulseScale = 1.25,
    glow = true,
    glowColor,
    shape = 'circle',
  } = options;

  const duration = PULSE_DURATIONS[pulseSpeed];
  const actualGlowColor = glowColor || color;

  // Calculate animation values based on shape
  const baseRadius = 8;
  const maxRadius = baseRadius * pulseScale;

  let shapeElement: string;
  let pulseRing: string;

  switch (shape) {
    case 'square':
      pulseRing = `
        <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="${actualGlowColor}" stroke-width="2" opacity="0.5">
          <animate attributeName="width" values="16;20;16" dur="${duration}" repeatCount="indefinite"/>
          <animate attributeName="height" values="16;20;16" dur="${duration}" repeatCount="indefinite"/>
          <animate attributeName="x" values="4;2;4" dur="${duration}" repeatCount="indefinite"/>
          <animate attributeName="y" values="4;2;4" dur="${duration}" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.5;0.2;0.5" dur="${duration}" repeatCount="indefinite"/>
        </rect>
      `;
      shapeElement = `<rect x="4" y="4" width="16" height="16" rx="2" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
      break;
    case 'diamond':
      pulseRing = `
        <polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="${actualGlowColor}" stroke-width="2" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.2;0.5" dur="${duration}" repeatCount="indefinite"/>
        </polygon>
      `;
      shapeElement = `
        <polygon points="12,2 22,12 12,22 2,12" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}">
          <animateTransform attributeName="transform" type="scale" values="1;${pulseScale};1" dur="${duration}" repeatCount="indefinite" additive="sum"/>
        </polygon>
      `;
      break;
    default: // circle
      pulseRing = `
        <circle cx="12" cy="12" r="${maxRadius}" fill="none" stroke="${actualGlowColor}" stroke-width="2" opacity="0">
          <animate attributeName="r" values="${baseRadius};${maxRadius + 2};${baseRadius}" dur="${duration}" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0;0.6" dur="${duration}" repeatCount="indefinite"/>
        </circle>
      `;
      shapeElement = `
        <circle cx="12" cy="12" r="${baseRadius}" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}">
          <animate attributeName="r" values="${baseRadius};${baseRadius * 1.1};${baseRadius}" dur="${duration}" repeatCount="indefinite"/>
        </circle>
      `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      ${pulseRing}
      ${shapeElement}
    </svg>
  `;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

/**
 * Create a status-based marker with appropriate styling
 */
export function createStatusMarkerIcon(
  color: string,
  status: string,
  constructionType: string,
  options: MarkerStyleOptions = {}
): google.maps.Icon {
  const isPulsing = status === 'in-progress';

  // Customize based on construction type
  const typeOptions: MarkerStyleOptions = {
    ...options,
    shape: getShapeForType(constructionType),
    size: getSizeForType(constructionType, options.size),
  };

  if (isPulsing) {
    return createPulsingMarkerIcon(color, {
      ...typeOptions,
      pulseSpeed: 'normal',
      glow: true,
    });
  }

  // Completed constructions get a subtle glow
  if (status === 'completed') {
    return createMarkerIcon(color, {
      ...typeOptions,
      glow: true,
      opacity: 0.9,
    });
  }

  // Paused constructions are dimmed
  if (status === 'paused') {
    return createMarkerIcon(color, {
      ...typeOptions,
      opacity: 0.6,
    });
  }

  return createMarkerIcon(color, typeOptions);
}

/**
 * Get marker shape based on construction type
 */
function getShapeForType(type: string): MarkerStyleOptions['shape'] {
  switch (type) {
    case 'metro':
    case 'station':
      return 'square';
    case 'interchange':
      return 'diamond';
    default:
      return 'circle';
  }
}

/**
 * Get marker size based on construction type
 */
function getSizeForType(type: string, defaultSize?: number): number {
  const baseSize = defaultSize || 20;
  switch (type) {
    case 'highway':
    case 'metro':
      return baseSize * 1.2;
    case 'bridge':
    case 'interchange':
      return baseSize * 1.1;
    default:
      return baseSize;
  }
}

/**
 * Line style options for customization
 */
export interface LineStyleOptions {
  strokeWeight?: number;
  strokeOpacity?: number;
  dashPattern?: number[];
  zIndex?: number;
  animated?: boolean;
  animationSpeed?: 'slow' | 'normal' | 'fast';
}

/**
 * Animation intervals in milliseconds for animated polylines
 */
const LINE_ANIMATION_SPEEDS = {
  slow: 100,
  normal: 50,
  fast: 25,
};

/**
 * Create an animated polyline with moving dash pattern
 * Returns a cleanup function to stop the animation
 */
export function createAnimatedPolyline(
  map: google.maps.Map,
  path: google.maps.LatLngLiteral[],
  color: string,
  options: {
    strokeWeight?: number;
    zIndex?: number;
    animationSpeed?: 'slow' | 'normal' | 'fast';
  } = {}
): { polyline: google.maps.Polyline; cleanup: () => void } {
  const { strokeWeight = 5, zIndex = 100, animationSpeed = 'normal' } = options;

  // Create the animated line symbol
  const lineSymbol: google.maps.Symbol = {
    path: 'M 0,-1 0,1',
    strokeOpacity: 1,
    strokeWeight: strokeWeight,
    scale: 4,
  };

  // Create the polyline with repeating symbols
  const polyline = new google.maps.Polyline({
    path,
    strokeOpacity: 0, // Hide the base line
    strokeColor: color,
    strokeWeight: strokeWeight,
    icons: [
      {
        icon: lineSymbol,
        offset: '0',
        repeat: '20px',
      },
    ],
    map,
    zIndex,
  });

  // Animate the line by moving the icon offset
  let offset = 0;
  const interval = LINE_ANIMATION_SPEEDS[animationSpeed];

  const animationId = setInterval(() => {
    offset = (offset + 1) % 200;
    const icons = polyline.get('icons');
    if (icons && icons[0]) {
      icons[0].offset = offset / 2 + '%';
      polyline.set('icons', icons);
    }
  }, interval);

  const cleanup = () => {
    clearInterval(animationId);
    polyline.setMap(null);
  };

  return { polyline, cleanup };
}

/**
 * Create a pulsing glow polyline effect
 * Returns a cleanup function to stop the animation
 */
export function createPulsingPolyline(
  map: google.maps.Map,
  path: google.maps.LatLngLiteral[],
  color: string,
  options: {
    strokeWeight?: number;
    zIndex?: number;
    animationSpeed?: 'slow' | 'normal' | 'fast';
  } = {}
): { polylines: google.maps.Polyline[]; cleanup: () => void } {
  const { strokeWeight = 5, zIndex = 100, animationSpeed = 'normal' } = options;

  // Create base polyline
  const basePolyline = new google.maps.Polyline({
    path,
    strokeColor: color,
    strokeWeight: strokeWeight,
    strokeOpacity: 1,
    map,
    zIndex,
  });

  // Create glow polyline (wider, semi-transparent)
  const glowPolyline = new google.maps.Polyline({
    path,
    strokeColor: color,
    strokeWeight: strokeWeight * 2.5,
    strokeOpacity: 0.3,
    map,
    zIndex: zIndex - 1,
  });

  // Animate opacity
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
  };

  return { polylines: [basePolyline, glowPolyline], cleanup };
}

/**
 * Polygon style options for customization
 */
export interface PolygonStyleOptions {
  fillOpacity?: number;
  strokeWeight?: number;
  strokeOpacity?: number;
  zIndex?: number;
}

/**
 * Get Data Layer style for a construction feature
 */
export function getFeatureStyle(
  feature: google.maps.Data.Feature,
  customOptions?: {
    marker?: MarkerStyleOptions;
    line?: LineStyleOptions;
    polygon?: PolygonStyleOptions;
  }
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
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';

  // Style based on geometry type
  switch (geometryType) {
    case 'Point':
      return {
        icon: createStatusMarkerIcon(color, status, type, customOptions?.marker),
        clickable: true,
        zIndex: isPulsing ? 100 : isCompleted ? 50 : 75,
      };

    case 'LineString': {
      const lineOptions = customOptions?.line || {};
      // Base width varies by type
      const baseWeight = getLineWeightForType(type);
      const weight = isPulsing ? baseWeight * 1.2 : baseWeight;
      const opacity = isPaused ? 0.5 : isPulsing ? 0.85 : 1;

      return {
        strokeColor: color,
        strokeWeight: lineOptions.strokeWeight ?? weight,
        strokeOpacity: lineOptions.strokeOpacity ?? opacity,
        clickable: true,
        zIndex: lineOptions.zIndex ?? (isPulsing ? 100 : 50),
      };
    }

    case 'Polygon': {
      const polygonOptions = customOptions?.polygon || {};
      const fillOpacity = isPaused ? 0.1 : isPulsing ? 0.35 : isCompleted ? 0.25 : 0.2;
      const strokeOpacity = isPaused ? 0.5 : 1;

      return {
        fillColor: color,
        fillOpacity: polygonOptions.fillOpacity ?? fillOpacity,
        strokeColor: color,
        strokeWeight: polygonOptions.strokeWeight ?? 2,
        strokeOpacity: polygonOptions.strokeOpacity ?? strokeOpacity,
        clickable: true,
        zIndex: polygonOptions.zIndex ?? (isPulsing ? 100 : 50),
      };
    }

    default:
      return {
        clickable: true,
      };
  }
}

/**
 * Get line weight based on construction type
 */
function getLineWeightForType(type: string): number {
  switch (type) {
    case 'highway':
      return 6;
    case 'metro':
      return 5;
    case 'bridge':
    case 'tunnel':
      return 5;
    case 'interchange':
      return 4;
    default:
      return 4;
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
