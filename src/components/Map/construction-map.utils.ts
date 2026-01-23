/**
 * Utility functions for ConstructionMap component
 */

import {
  TYPE_COLORS,
  TYPE_THICKNESS,
  TYPE_RADIUS,
  TYPE_LABELS,
  TYPE_SHORT_LABELS,
  TYPE_ICON_NAMES,
  STATUS_LABELS,
  STATUS_LABELS_SHORT,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_LABELS_SHORT,
  PRIVATE_TYPE_COLORS,
  PRIVATE_TYPE_LABELS,
  MAJOR_TYPES,
  ZOOM_LEVELS,
  SCALE_FACTORS,
} from './construction-map.constants';
import type { MapBounds, Coordinates } from './construction-map.types';

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
 * Get short Vietnamese label for construction status (for legend)
 */
export function getStatusLabelShort(status: string): string {
  return STATUS_LABELS_SHORT[status] || status;
}

/**
 * Get Vietnamese label for construction category
 */
export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || CATEGORY_LABELS['public'];
}

/**
 * Get short Vietnamese label for construction category (for legend)
 */
export function getCategoryLabelShort(category: string): string {
  return CATEGORY_LABELS_SHORT[category] || CATEGORY_LABELS_SHORT['public'];
}

/**
 * Get color for construction category
 */
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['public'];
}

/**
 * Get Vietnamese label for private construction type
 */
export function getPrivateTypeLabel(privateType: string): string {
  return PRIVATE_TYPE_LABELS[privateType] || PRIVATE_TYPE_LABELS['other'];
}

/**
 * Get color for private construction type
 */
export function getPrivateTypeColor(privateType: string): string {
  return PRIVATE_TYPE_COLORS[privateType] || PRIVATE_TYPE_COLORS['other'];
}

/**
 * Get color for construction type
 */
export function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || TYPE_COLORS['other'];
}

/**
 * Get short label for construction type (for map badges)
 */
export function getTypeShortLabel(type: string): string {
  return TYPE_SHORT_LABELS[type] || TYPE_SHORT_LABELS['other'];
}

/**
 * Separate GeoJSON features by geometry type
 * Also separates detail markers (metro stations, freeway exits) from regular points
 */
export function separateFeaturesByGeometry(features: GeoJSON.Feature[]): {
  points: GeoJSON.Feature[];
  lines: GeoJSON.Feature[];
  polygons: GeoJSON.Feature[];
  detailMarkers: GeoJSON.Feature[];
} {
  const points: GeoJSON.Feature[] = [];
  const lines: GeoJSON.Feature[] = [];
  const polygons: GeoJSON.Feature[] = [];
  const detailMarkers: GeoJSON.Feature[] = [];

  for (const feature of features) {
    if (!feature.geometry) continue;

    // Check if this is a detail marker (metro station or freeway exit)
    const isDetailMarker = feature.properties?.isDetailMarker === true;

    switch (feature.geometry.type) {
      case 'Point':
      case 'MultiPoint':
        if (isDetailMarker) {
          detailMarkers.push(feature);
        } else {
          points.push(feature);
        }
        break;
      case 'LineString':
      case 'MultiLineString':
        lines.push(feature);
        break;
      case 'Polygon':
      case 'MultiPolygon':
        polygons.push(feature);
        break;
    }
  }

  return { points, lines, polygons, detailMarkers };
}

/**
 * Calculate bounds from coordinates
 */
export function calculateBounds(coords: Coordinates[]): MapBounds {
  return coords.reduce(
    (acc, coord) => ({
      minLng: Math.min(acc.minLng, coord[0]),
      maxLng: Math.max(acc.maxLng, coord[0]),
      minLat: Math.min(acc.minLat, coord[1]),
      maxLat: Math.max(acc.maxLat, coord[1]),
    }),
    { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity }
  );
}

/**
 * Format date for Vietnamese locale
 */
export function formatDateVN(dateString: string): string {
  return new Date(dateString).toLocaleDateString('vi-VN');
}

/**
 * Build Mapbox expression for type-based colors
 */
export function buildTypeColorExpression(): mapboxgl.Expression {
  const typeKeys = Object.keys(TYPE_COLORS);
  const matchArgs: (string | mapboxgl.Expression)[] = [
    'match',
    ['get', 'constructionType'],
  ];

  for (const type of typeKeys) {
    matchArgs.push(type, TYPE_COLORS[type]);
  }
  matchArgs.push(TYPE_COLORS['other']); // default

  return matchArgs as mapboxgl.Expression;
}

/**
 * Build Mapbox expression for type-based line width with zoom scaling
 */
export function buildLineWidthExpression(): mapboxgl.Expression {
  const buildMatchExpr = (scale: number): mapboxgl.Expression => {
    const matchArgs: (string | number | mapboxgl.Expression)[] = [
      'match',
      ['get', 'constructionType'],
    ];
    for (const [type, thickness] of Object.entries(TYPE_THICKNESS)) {
      matchArgs.push(type, thickness * scale);
    }
    matchArgs.push(TYPE_THICKNESS['other'] * scale);
    return matchArgs as mapboxgl.Expression;
  };

  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    ZOOM_LEVELS.MIN_SCALE, buildMatchExpr(SCALE_FACTORS.MIN),
    ZOOM_LEVELS.SHOW_ALL, buildMatchExpr(SCALE_FACTORS.NORMAL),
    ZOOM_LEVELS.MAX_SCALE, buildMatchExpr(SCALE_FACTORS.MAX),
  ] as mapboxgl.Expression;
}

/**
 * Build Mapbox expression for type-based point radius with zoom scaling
 */
export function buildRadiusExpression(): mapboxgl.Expression {
  const buildMatchExpr = (scale: number): mapboxgl.Expression => {
    const matchArgs: (string | number | mapboxgl.Expression)[] = [
      'match',
      ['get', 'constructionType'],
    ];
    for (const [type, radius] of Object.entries(TYPE_RADIUS)) {
      matchArgs.push(type, radius * scale);
    }
    matchArgs.push(TYPE_RADIUS['other'] * scale);
    return matchArgs as mapboxgl.Expression;
  };

  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    ZOOM_LEVELS.MIN_SCALE, buildMatchExpr(SCALE_FACTORS.RADIUS_MIN),
    ZOOM_LEVELS.SHOW_ALL, buildMatchExpr(SCALE_FACTORS.NORMAL),
    ZOOM_LEVELS.MAX_SCALE, buildMatchExpr(SCALE_FACTORS.RADIUS_MAX),
  ] as mapboxgl.Expression;
}

/**
 * Build Mapbox filter expression for major construction types
 */
export function buildMajorTypesFilter(): mapboxgl.Expression {
  return [
    'in',
    ['get', 'constructionType'],
    ['literal', [...MAJOR_TYPES]],
  ] as mapboxgl.Expression;
}

/**
 * Build Mapbox filter expression that shows all at high zoom or major types at low zoom
 */
export function buildZoomBasedFilter(): mapboxgl.Expression {
  return [
    'any',
    ['>=', ['zoom'], ZOOM_LEVELS.SHOW_ALL],
    buildMajorTypesFilter(),
  ] as mapboxgl.Expression;
}

/**
 * Build zoom-based opacity expression
 */
export function buildOpacityExpression(minOpacity: number, maxOpacity: number): mapboxgl.Expression {
  const midOpacity = minOpacity + (maxOpacity - minOpacity) * 0.6;
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    ZOOM_LEVELS.MIN_SCALE, minOpacity,
    ZOOM_LEVELS.SHOW_ALL, midOpacity,
    ZOOM_LEVELS.MAX_SCALE, maxOpacity,
  ] as mapboxgl.Expression;
}

/**
 * Build zoom-based stroke width expression
 */
export function buildStrokeWidthExpression(): mapboxgl.Expression {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    ZOOM_LEVELS.MIN_SCALE, 1,
    ZOOM_LEVELS.SHOW_ALL, 2,
    ZOOM_LEVELS.MAX_SCALE, 3,
  ] as mapboxgl.Expression;
}

/**
 * Build Mapbox expression for type-based short labels (badges)
 */
export function buildTypeShortLabelExpression(): mapboxgl.Expression {
  const typeKeys = Object.keys(TYPE_SHORT_LABELS);
  const matchArgs: (string | mapboxgl.Expression)[] = [
    'match',
    ['get', 'constructionType'],
  ];

  for (const type of typeKeys) {
    matchArgs.push(type, TYPE_SHORT_LABELS[type]);
  }
  matchArgs.push(TYPE_SHORT_LABELS['other']); // default

  return matchArgs as mapboxgl.Expression;
}

/**
 * Build Mapbox expression for type-based icon images
 */
export function buildTypeIconExpression(): mapboxgl.Expression {
  const typeKeys = Object.keys(TYPE_ICON_NAMES);
  const matchArgs: (string | mapboxgl.Expression)[] = [
    'match',
    ['get', 'constructionType'],
  ];

  for (const type of typeKeys) {
    matchArgs.push(type, TYPE_ICON_NAMES[type]);
  }
  matchArgs.push(TYPE_ICON_NAMES['other']); // default

  return matchArgs as mapboxgl.Expression;
}

/**
 * Build zoom-based text size expression for labels
 */
export function buildLabelTextSizeExpression(): mapboxgl.Expression {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    ZOOM_LEVELS.MIN_SCALE, 8,
    ZOOM_LEVELS.SHOW_ALL, 11,
    ZOOM_LEVELS.MAX_SCALE, 14,
  ] as mapboxgl.Expression;
}

/**
 * Build zoom-based icon size expression
 */
export function buildIconSizeExpression(): mapboxgl.Expression {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    ZOOM_LEVELS.MIN_SCALE, 0.6,
    ZOOM_LEVELS.SHOW_ALL, 0.9,
    ZOOM_LEVELS.MAX_SCALE, 1.2,
  ] as mapboxgl.Expression;
}
