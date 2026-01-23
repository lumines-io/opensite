import { describe, it, expect } from 'vitest';
import {
  getTypeLabel,
  getStatusLabel,
  getSourceCollectionLabel,
  getDevelopmentTypeLabel,
  getDevelopmentStatusLabel,
  getPointTypeLabel,
  getTypeColor,
  getStatusColor,
  getSourceCollectionColor,
  getDevelopmentTypeColor,
  getDevelopmentStatusColor,
  formatDateVN,
  geoJsonToLatLng,
  latLngToGeoJson,
  getGeometryCenter,
} from '../google-map.utils';
import {
  TYPE_COLORS,
  TYPE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  SOURCE_COLLECTION_COLORS,
  SOURCE_COLLECTION_LABELS,
  DEVELOPMENT_TYPE_COLORS,
  DEVELOPMENT_TYPE_LABELS,
  DEVELOPMENT_STATUS_COLORS,
  DEVELOPMENT_STATUS_LABELS,
  POINT_TYPE_LABELS,
} from '../google-map.constants';
import { isConstruction, isDevelopment } from '../google-map.types';
import type { Construction, Development, MapFeature } from '../google-map.types';

describe('Google Maps Utilities', () => {
  describe('Type guards', () => {
    it('should identify construction features correctly', () => {
      const construction: Construction = {
        id: '1',
        title: 'Test Construction',
        sourceCollection: 'constructions',
        constructionStatus: 'in-progress',
        progress: 50,
        constructionType: 'road',
      };

      expect(isConstruction(construction)).toBe(true);
      expect(isDevelopment(construction)).toBe(false);
    });

    it('should identify development features correctly', () => {
      const development: Development = {
        id: 'dev-1',
        title: 'Test Development',
        sourceCollection: 'developments',
        developmentStatus: 'selling',
        developmentType: 'apartment_complex',
      };

      expect(isDevelopment(development)).toBe(true);
      expect(isConstruction(development)).toBe(false);
    });
  });

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

  describe('getSourceCollectionLabel', () => {
    it('should return correct Vietnamese labels for source collections', () => {
      expect(getSourceCollectionLabel('constructions')).toBe(SOURCE_COLLECTION_LABELS['constructions']);
      expect(getSourceCollectionLabel('developments')).toBe(SOURCE_COLLECTION_LABELS['developments']);
    });

    it('should return the source itself for unknown collections', () => {
      expect(getSourceCollectionLabel('unknown')).toBe('unknown');
    });
  });

  describe('getDevelopmentTypeLabel', () => {
    it('should return correct Vietnamese labels for development types', () => {
      expect(getDevelopmentTypeLabel('apartment_complex')).toBe(DEVELOPMENT_TYPE_LABELS['apartment_complex']);
      expect(getDevelopmentTypeLabel('resort')).toBe(DEVELOPMENT_TYPE_LABELS['resort']);
      expect(getDevelopmentTypeLabel('office_building')).toBe(DEVELOPMENT_TYPE_LABELS['office_building']);
    });

    it('should return "other" label for unknown development types', () => {
      expect(getDevelopmentTypeLabel('unknown')).toBe(DEVELOPMENT_TYPE_LABELS['other']);
      expect(getDevelopmentTypeLabel('')).toBe(DEVELOPMENT_TYPE_LABELS['other']);
    });
  });

  describe('getDevelopmentStatusLabel', () => {
    it('should return correct Vietnamese labels for development statuses', () => {
      expect(getDevelopmentStatusLabel('selling')).toBe(DEVELOPMENT_STATUS_LABELS['selling']);
      expect(getDevelopmentStatusLabel('upcoming')).toBe(DEVELOPMENT_STATUS_LABELS['upcoming']);
      expect(getDevelopmentStatusLabel('completed')).toBe(DEVELOPMENT_STATUS_LABELS['completed']);
    });

    it('should return the status itself for unknown statuses', () => {
      expect(getDevelopmentStatusLabel('unknown_status')).toBe('unknown_status');
    });
  });

  describe('getPointTypeLabel', () => {
    it('should return correct Vietnamese labels for point types', () => {
      expect(getPointTypeLabel('station')).toBe(POINT_TYPE_LABELS['station']);
      expect(getPointTypeLabel('exit')).toBe(POINT_TYPE_LABELS['exit']);
      expect(getPointTypeLabel('interchange')).toBe(POINT_TYPE_LABELS['interchange']);
    });

    it('should return "other" label for unknown point types', () => {
      expect(getPointTypeLabel('unknown')).toBe(POINT_TYPE_LABELS['other']);
    });
  });

  describe('Color functions', () => {
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

    describe('getStatusColor', () => {
      it('should return correct colors for statuses', () => {
        expect(getStatusColor('in-progress')).toBe(STATUS_COLORS['in-progress']);
        expect(getStatusColor('completed')).toBe(STATUS_COLORS['completed']);
      });

      it('should return planned color for unknown statuses', () => {
        expect(getStatusColor('unknown')).toBe(STATUS_COLORS['planned']);
      });
    });

    describe('getSourceCollectionColor', () => {
      it('should return correct colors for source collections', () => {
        expect(getSourceCollectionColor('constructions')).toBe(SOURCE_COLLECTION_COLORS['constructions']);
        expect(getSourceCollectionColor('developments')).toBe(SOURCE_COLLECTION_COLORS['developments']);
      });

      it('should return constructions color for unknown sources', () => {
        expect(getSourceCollectionColor('unknown')).toBe(SOURCE_COLLECTION_COLORS['constructions']);
      });
    });

    describe('getDevelopmentTypeColor', () => {
      it('should return correct colors for development types', () => {
        expect(getDevelopmentTypeColor('apartment_complex')).toBe(DEVELOPMENT_TYPE_COLORS['apartment_complex']);
        expect(getDevelopmentTypeColor('resort')).toBe(DEVELOPMENT_TYPE_COLORS['resort']);
      });

      it('should return "other" color for unknown development types', () => {
        expect(getDevelopmentTypeColor('unknown')).toBe(DEVELOPMENT_TYPE_COLORS['other']);
      });
    });

    describe('getDevelopmentStatusColor', () => {
      it('should return correct colors for development statuses', () => {
        expect(getDevelopmentStatusColor('selling')).toBe(DEVELOPMENT_STATUS_COLORS['selling']);
        expect(getDevelopmentStatusColor('upcoming')).toBe(DEVELOPMENT_STATUS_COLORS['upcoming']);
      });

      it('should return upcoming color for unknown statuses', () => {
        expect(getDevelopmentStatusColor('unknown')).toBe(DEVELOPMENT_STATUS_COLORS['upcoming']);
      });
    });
  });

  describe('Coordinate conversion', () => {
    describe('geoJsonToLatLng', () => {
      it('should convert GeoJSON coordinates to Google Maps LatLng', () => {
        const coords: [number, number] = [106.7, 10.8];
        const result = geoJsonToLatLng(coords);
        expect(result.lat).toBe(10.8);
        expect(result.lng).toBe(106.7);
      });
    });

    describe('latLngToGeoJson', () => {
      it('should convert Google Maps LatLng to GeoJSON coordinates', () => {
        const latLng = { lat: 10.8, lng: 106.7 };
        const result = latLngToGeoJson(latLng);
        expect(result[0]).toBe(106.7);
        expect(result[1]).toBe(10.8);
      });
    });

    describe('getGeometryCenter', () => {
      it('should return center of Point geometry', () => {
        const geometry: GeoJSON.Point = {
          type: 'Point',
          coordinates: [106.7, 10.8],
        };
        const center = getGeometryCenter(geometry);
        expect(center.lat).toBe(10.8);
        expect(center.lng).toBe(106.7);
      });

      it('should return midpoint of LineString geometry', () => {
        const geometry: GeoJSON.LineString = {
          type: 'LineString',
          coordinates: [
            [106.6, 10.7],
            [106.7, 10.8],
            [106.8, 10.9],
          ],
        };
        const center = getGeometryCenter(geometry);
        // Should return middle coordinate
        expect(center.lat).toBe(10.8);
        expect(center.lng).toBe(106.7);
      });

      it('should return centroid of Polygon geometry', () => {
        const geometry: GeoJSON.Polygon = {
          type: 'Polygon',
          coordinates: [
            [
              [106.6, 10.6],
              [106.8, 10.6],
              [106.8, 10.8],
              [106.6, 10.8],
              [106.6, 10.6],
            ],
          ],
        };
        const center = getGeometryCenter(geometry);
        // Centroid should be average of coordinates (excluding last which is same as first)
        expect(center.lat).toBeCloseTo(10.68, 1);
        expect(center.lng).toBeCloseTo(106.68, 1);
      });

      it('should return default HCMC center for unknown geometry types', () => {
        const geometry = {
          type: 'GeometryCollection',
          geometries: [],
        } as unknown as GeoJSON.Geometry;
        const center = getGeometryCenter(geometry);
        expect(center.lat).toBe(10.8231);
        expect(center.lng).toBe(106.6297);
      });
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

    it('should return original string for invalid dates', () => {
      const dateString = 'invalid-date';
      const formatted = formatDateVN(dateString);
      expect(formatted).toBe(dateString);
    });
  });
});

describe('Constants consistency', () => {
  describe('Construction type colors and labels', () => {
    it('should have matching keys in TYPE_COLORS and TYPE_LABELS', () => {
      const colorKeys = Object.keys(TYPE_COLORS);
      const labelKeys = Object.keys(TYPE_LABELS);
      expect(colorKeys.sort()).toEqual(labelKeys.sort());
    });

    it('should have all expected construction types', () => {
      const expectedTypes = ['road', 'highway', 'metro', 'bridge', 'tunnel', 'interchange', 'station', 'other'];
      for (const type of expectedTypes) {
        expect(TYPE_COLORS).toHaveProperty(type);
        expect(TYPE_LABELS).toHaveProperty(type);
      }
    });
  });

  describe('Development type colors and labels', () => {
    it('should have matching keys in DEVELOPMENT_TYPE_COLORS and DEVELOPMENT_TYPE_LABELS', () => {
      const colorKeys = Object.keys(DEVELOPMENT_TYPE_COLORS);
      const labelKeys = Object.keys(DEVELOPMENT_TYPE_LABELS);
      expect(colorKeys.sort()).toEqual(labelKeys.sort());
    });

    it('should have all expected development types', () => {
      const expectedTypes = [
        'apartment_complex',
        'condominium',
        'villa_project',
        'townhouse_project',
        'resort',
        'hotel',
        'serviced_apartment',
        'commercial_center',
        'shopping_mall',
        'office_building',
        'industrial_park',
        'mixed_use',
        'township',
        'healthcare',
        'educational',
        'other',
      ];
      for (const type of expectedTypes) {
        expect(DEVELOPMENT_TYPE_COLORS).toHaveProperty(type);
        expect(DEVELOPMENT_TYPE_LABELS).toHaveProperty(type);
      }
    });
  });

  describe('Development status colors and labels', () => {
    it('should have matching keys in DEVELOPMENT_STATUS_COLORS and DEVELOPMENT_STATUS_LABELS', () => {
      const colorKeys = Object.keys(DEVELOPMENT_STATUS_COLORS);
      const labelKeys = Object.keys(DEVELOPMENT_STATUS_LABELS);
      expect(colorKeys.sort()).toEqual(labelKeys.sort());
    });

    it('should have all expected development statuses', () => {
      const expectedStatuses = [
        'upcoming',
        'pre_launch',
        'selling',
        'limited',
        'sold_out',
        'under_construction',
        'completed',
      ];
      for (const status of expectedStatuses) {
        expect(DEVELOPMENT_STATUS_COLORS).toHaveProperty(status);
        expect(DEVELOPMENT_STATUS_LABELS).toHaveProperty(status);
      }
    });
  });

  describe('Source collection colors and labels', () => {
    it('should have matching keys in SOURCE_COLLECTION_COLORS and SOURCE_COLLECTION_LABELS', () => {
      const colorKeys = Object.keys(SOURCE_COLLECTION_COLORS);
      const labelKeys = Object.keys(SOURCE_COLLECTION_LABELS);
      expect(colorKeys.sort()).toEqual(labelKeys.sort());
    });

    it('should have constructions and developments', () => {
      expect(SOURCE_COLLECTION_COLORS).toHaveProperty('constructions');
      expect(SOURCE_COLLECTION_COLORS).toHaveProperty('developments');
      expect(SOURCE_COLLECTION_LABELS).toHaveProperty('constructions');
      expect(SOURCE_COLLECTION_LABELS).toHaveProperty('developments');
    });
  });

  describe('Point type labels', () => {
    it('should have all expected point types', () => {
      const expectedTypes = [
        'station',
        'depot',
        'transfer',
        'exit',
        'interchange',
        'toll',
        'rest_area',
        'bridge_section',
        'tunnel_portal',
        'milestone',
        'other',
      ];
      for (const type of expectedTypes) {
        expect(POINT_TYPE_LABELS).toHaveProperty(type);
      }
    });
  });
});
