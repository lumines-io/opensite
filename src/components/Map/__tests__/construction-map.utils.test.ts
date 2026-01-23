import { describe, it, expect } from 'vitest';
import {
  getTypeLabel,
  getStatusLabel,
  getStatusLabelShort,
  getCategoryLabel,
  getCategoryLabelShort,
  getCategoryColor,
  getPrivateTypeLabel,
  getPrivateTypeColor,
  getTypeColor,
  getTypeShortLabel,
  separateFeaturesByGeometry,
  calculateBounds,
  formatDateVN,
} from '../construction-map.utils';
import {
  TYPE_COLORS,
  TYPE_LABELS,
  STATUS_LABELS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_LABELS_SHORT,
  PRIVATE_TYPE_LABELS,
  PRIVATE_TYPE_COLORS,
} from '../construction-map.constants';

describe('Construction Map Utilities', () => {
  describe('getTypeLabel', () => {
    it('should return correct Vietnamese labels for construction types', () => {
      expect(getTypeLabel('road')).toBe(TYPE_LABELS['road']);
      expect(getTypeLabel('metro')).toBe(TYPE_LABELS['metro']);
      expect(getTypeLabel('highway')).toBe(TYPE_LABELS['highway']);
      expect(getTypeLabel('bridge')).toBe(TYPE_LABELS['bridge']);
    });

    it('should return "other" label for unknown types', () => {
      expect(getTypeLabel('unknown_type')).toBe(TYPE_LABELS['other']);
      expect(getTypeLabel('')).toBe(TYPE_LABELS['other']);
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct Vietnamese labels for statuses', () => {
      expect(getStatusLabel('in-progress')).toBe(STATUS_LABELS['in-progress']);
      expect(getStatusLabel('completed')).toBe(STATUS_LABELS['completed']);
      expect(getStatusLabel('planned')).toBe(STATUS_LABELS['planned']);
    });

    it('should return the status itself for unknown statuses', () => {
      expect(getStatusLabel('unknown_status')).toBe('unknown_status');
    });
  });

  describe('getStatusLabelShort', () => {
    it('should return short Vietnamese labels for statuses', () => {
      expect(getStatusLabelShort('in-progress')).toBeDefined();
      expect(getStatusLabelShort('completed')).toBeDefined();
    });

    it('should return the status itself for unknown statuses', () => {
      expect(getStatusLabelShort('unknown_status')).toBe('unknown_status');
    });
  });

  describe('getCategoryLabel', () => {
    it('should return correct Vietnamese labels for categories', () => {
      expect(getCategoryLabel('public')).toBe(CATEGORY_LABELS['public']);
      expect(getCategoryLabel('private')).toBe(CATEGORY_LABELS['private']);
    });

    it('should return public label for unknown categories', () => {
      expect(getCategoryLabel('unknown')).toBe(CATEGORY_LABELS['public']);
      expect(getCategoryLabel('')).toBe(CATEGORY_LABELS['public']);
    });
  });

  describe('getCategoryLabelShort', () => {
    it('should return short Vietnamese labels for categories', () => {
      expect(getCategoryLabelShort('public')).toBe(CATEGORY_LABELS_SHORT['public']);
      expect(getCategoryLabelShort('private')).toBe(CATEGORY_LABELS_SHORT['private']);
    });

    it('should return public short label for unknown categories', () => {
      expect(getCategoryLabelShort('unknown')).toBe(CATEGORY_LABELS_SHORT['public']);
    });
  });

  describe('getCategoryColor', () => {
    it('should return correct colors for categories', () => {
      expect(getCategoryColor('public')).toBe(CATEGORY_COLORS['public']);
      expect(getCategoryColor('private')).toBe(CATEGORY_COLORS['private']);
    });

    it('should return public color for unknown categories', () => {
      expect(getCategoryColor('unknown')).toBe(CATEGORY_COLORS['public']);
    });
  });

  describe('getPrivateTypeLabel', () => {
    it('should return correct Vietnamese labels for private types', () => {
      expect(getPrivateTypeLabel('residential')).toBe(PRIVATE_TYPE_LABELS['residential']);
      expect(getPrivateTypeLabel('commercial')).toBe(PRIVATE_TYPE_LABELS['commercial']);
      expect(getPrivateTypeLabel('mixed_use')).toBe(PRIVATE_TYPE_LABELS['mixed_use']);
      expect(getPrivateTypeLabel('hospitality')).toBe(PRIVATE_TYPE_LABELS['hospitality']);
    });

    it('should return "other" label for unknown private types', () => {
      expect(getPrivateTypeLabel('unknown')).toBe(PRIVATE_TYPE_LABELS['other']);
      expect(getPrivateTypeLabel('')).toBe(PRIVATE_TYPE_LABELS['other']);
    });
  });

  describe('getPrivateTypeColor', () => {
    it('should return correct colors for private types', () => {
      expect(getPrivateTypeColor('residential')).toBe(PRIVATE_TYPE_COLORS['residential']);
      expect(getPrivateTypeColor('commercial')).toBe(PRIVATE_TYPE_COLORS['commercial']);
    });

    it('should return "other" color for unknown private types', () => {
      expect(getPrivateTypeColor('unknown')).toBe(PRIVATE_TYPE_COLORS['other']);
    });
  });

  describe('getTypeColor', () => {
    it('should return correct colors for construction types', () => {
      expect(getTypeColor('road')).toBe(TYPE_COLORS['road']);
      expect(getTypeColor('metro')).toBe(TYPE_COLORS['metro']);
      expect(getTypeColor('highway')).toBe(TYPE_COLORS['highway']);
    });

    it('should return "other" color for unknown types', () => {
      expect(getTypeColor('unknown')).toBe(TYPE_COLORS['other']);
    });
  });

  describe('getTypeShortLabel', () => {
    it('should return short labels for construction types', () => {
      expect(getTypeShortLabel('road')).toBeDefined();
      expect(getTypeShortLabel('metro')).toBeDefined();
    });

    it('should return "other" short label for unknown types', () => {
      const otherShortLabel = getTypeShortLabel('other');
      expect(getTypeShortLabel('unknown')).toBe(otherShortLabel);
    });
  });

  describe('separateFeaturesByGeometry', () => {
    it('should separate features into points, lines, polygons, and detailMarkers', () => {
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [106.7, 10.8] },
          properties: { id: 1 },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [106.7, 10.8],
              [106.8, 10.9],
            ],
          },
          properties: { id: 2 },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [106.7, 10.8],
                [106.8, 10.8],
                [106.8, 10.9],
                [106.7, 10.9],
                [106.7, 10.8],
              ],
            ],
          },
          properties: { id: 3 },
        },
      ];

      const result = separateFeaturesByGeometry(features);

      expect(result.points).toHaveLength(1);
      expect(result.lines).toHaveLength(1);
      expect(result.polygons).toHaveLength(1);
      expect(result.detailMarkers).toHaveLength(0);
    });

    it('should separate detail markers from regular points', () => {
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [106.7, 10.8] },
          properties: { id: 1, isDetailMarker: false },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [106.75, 10.85] },
          properties: { id: 2, isDetailMarker: true, constructionType: 'metro_station' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [106.8, 10.9] },
          properties: { id: 3, isDetailMarker: true, constructionType: 'freeway_exit' },
        },
      ];

      const result = separateFeaturesByGeometry(features);

      expect(result.points).toHaveLength(1);
      expect(result.detailMarkers).toHaveLength(2);
    });

    it('should handle MultiPoint features as points', () => {
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          geometry: {
            type: 'MultiPoint',
            coordinates: [
              [106.7, 10.8],
              [106.8, 10.9],
            ],
          },
          properties: { id: 1 },
        },
      ];

      const result = separateFeaturesByGeometry(features);
      expect(result.points).toHaveLength(1);
      expect(result.detailMarkers).toHaveLength(0);
    });

    it('should handle MultiLineString features as lines', () => {
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [
                [106.7, 10.8],
                [106.8, 10.9],
              ],
              [
                [106.9, 10.9],
                [107.0, 11.0],
              ],
            ],
          },
          properties: { id: 1 },
        },
      ];

      const result = separateFeaturesByGeometry(features);
      expect(result.lines).toHaveLength(1);
    });

    it('should handle MultiPolygon features as polygons', () => {
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [106.7, 10.8],
                  [106.8, 10.8],
                  [106.8, 10.9],
                  [106.7, 10.8],
                ],
              ],
            ],
          },
          properties: { id: 1 },
        },
      ];

      const result = separateFeaturesByGeometry(features);
      expect(result.polygons).toHaveLength(1);
    });

    it('should skip features without geometry', () => {
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          geometry: null as unknown as GeoJSON.Geometry,
          properties: { id: 1 },
        },
      ];

      const result = separateFeaturesByGeometry(features);
      expect(result.points).toHaveLength(0);
      expect(result.lines).toHaveLength(0);
      expect(result.polygons).toHaveLength(0);
      expect(result.detailMarkers).toHaveLength(0);
    });

    it('should return empty arrays for empty input', () => {
      const result = separateFeaturesByGeometry([]);
      expect(result.points).toHaveLength(0);
      expect(result.lines).toHaveLength(0);
      expect(result.polygons).toHaveLength(0);
      expect(result.detailMarkers).toHaveLength(0);
    });
  });

  describe('calculateBounds', () => {
    it('should calculate correct bounds from coordinates', () => {
      const coords: [number, number][] = [
        [106.6, 10.7],
        [106.8, 10.9],
        [106.7, 10.8],
      ];

      const bounds = calculateBounds(coords);

      expect(bounds.minLng).toBe(106.6);
      expect(bounds.maxLng).toBe(106.8);
      expect(bounds.minLat).toBe(10.7);
      expect(bounds.maxLat).toBe(10.9);
    });

    it('should handle single coordinate', () => {
      const coords: [number, number][] = [[106.7, 10.8]];

      const bounds = calculateBounds(coords);

      expect(bounds.minLng).toBe(106.7);
      expect(bounds.maxLng).toBe(106.7);
      expect(bounds.minLat).toBe(10.8);
      expect(bounds.maxLat).toBe(10.8);
    });

    it('should return Infinity values for empty array', () => {
      const bounds = calculateBounds([]);

      expect(bounds.minLng).toBe(Infinity);
      expect(bounds.maxLng).toBe(-Infinity);
      expect(bounds.minLat).toBe(Infinity);
      expect(bounds.maxLat).toBe(-Infinity);
    });
  });

  describe('formatDateVN', () => {
    it('should format date in Vietnamese locale', () => {
      const dateString = '2024-01-15';
      const formatted = formatDateVN(dateString);

      // Vietnamese date format: DD/MM/YYYY
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should handle ISO date strings', () => {
      const dateString = '2024-06-30T00:00:00.000Z';
      const formatted = formatDateVN(dateString);

      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});

describe('Category Filter Integration', () => {
  describe('Category colors and labels consistency', () => {
    it('should have matching keys in CATEGORY_COLORS and CATEGORY_LABELS', () => {
      const colorKeys = Object.keys(CATEGORY_COLORS);
      const labelKeys = Object.keys(CATEGORY_LABELS);

      expect(colorKeys.sort()).toEqual(labelKeys.sort());
    });

    it('should have matching keys in CATEGORY_LABELS and CATEGORY_LABELS_SHORT', () => {
      const labelKeys = Object.keys(CATEGORY_LABELS);
      const shortLabelKeys = Object.keys(CATEGORY_LABELS_SHORT);

      expect(labelKeys.sort()).toEqual(shortLabelKeys.sort());
    });

    it('should have public and private as valid categories', () => {
      expect(CATEGORY_COLORS).toHaveProperty('public');
      expect(CATEGORY_COLORS).toHaveProperty('private');
      expect(CATEGORY_LABELS).toHaveProperty('public');
      expect(CATEGORY_LABELS).toHaveProperty('private');
    });
  });

  describe('Private type colors and labels consistency', () => {
    it('should have matching keys in PRIVATE_TYPE_COLORS and PRIVATE_TYPE_LABELS', () => {
      const colorKeys = Object.keys(PRIVATE_TYPE_COLORS);
      const labelKeys = Object.keys(PRIVATE_TYPE_LABELS);

      expect(colorKeys.sort()).toEqual(labelKeys.sort());
    });

    it('should have all expected private types', () => {
      const expectedTypes = [
        'residential',
        'commercial',
        'mixed_use',
        'industrial',
        'hospitality',
        'other',
      ];

      for (const type of expectedTypes) {
        expect(PRIVATE_TYPE_COLORS).toHaveProperty(type);
        expect(PRIVATE_TYPE_LABELS).toHaveProperty(type);
      }
    });
  });
});
